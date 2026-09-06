"""Fetching a company's website on the user's behalf.

The browser cannot do this itself: a page on another origin is not readable
from JavaScript, which is the whole reason the first version of this was a
browser extension. Doing it here means the service makes an outbound request to
an address a user chose, and that is a capability worth being careful with.

An unguarded version of this is a server-side request forgery hole. The service
sits inside a hosting provider's network with a metadata endpoint on a
link-local address and, in other deployments, databases on private ones. So the
address is checked before anything is opened: the scheme has to be http(s), the
host has to resolve to public addresses only, and every redirect is checked
again rather than trusted because the first hop passed.

The residual risk is DNS rebinding - a name that resolves to a public address
when checked and a private one when connected. Closing that properly means
pinning the connection to the address that was validated, which httpx does not
expose cleanly; for a service whose only outbound job is reading marketing
pages, validating every hop and capping what comes back is the proportionate
answer, and it is written down here rather than left implied.
"""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import re
import socket
import urllib.error
import urllib.request
from urllib.parse import urljoin, urlparse, urlunparse

log = logging.getLogger("investvcs.fetchpage")

#: Marketing pages are small. Anything larger is not a page we can use, and
#: reading it would only tie up the service.
MAX_BYTES = 3_000_000

#: A site that has not answered by now is not going to help the user.
TIMEOUT_SECONDS = 20.0

#: Redirect chains are normal (http -> https -> www); long ones are not.
MAX_REDIRECTS = 5

#: Enough of a page to screen. The same cap the screener applies.
MAX_TEXT_CHARS = 24_000

#: A plain browser string. An honest custom agent is nicer, and gets 403d by
#: the WAFs a good number of real company sites sit behind - pashabank.az among
#: them. This is a person asking for a public page they could open themselves,
#: so presenting as the browser they would have used is the accurate thing, not
#: a disguise.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

#: Sent with every request. A bare Accept header is itself a bot signal.
BROWSER_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
}


class FetchError(Exception):
    """A page could not be read, with a reason worth showing the user."""


def _public_addresses(host: str) -> list[str]:
    """Resolve a host and refuse anything that is not publicly routable.

    Every address the name resolves to has to be public: a name resolving to
    both a public and a private address is a known way to smuggle a request
    onto an internal network.
    """
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as error:
        raise FetchError(f"That address could not be resolved ({host}).") from error

    addresses = sorted({info[4][0] for info in infos})
    if not addresses:
        raise FetchError(f"That address could not be resolved ({host}).")

    for address in addresses:
        try:
            parsed = ipaddress.ip_address(address)
        except ValueError as error:
            raise FetchError("That address could not be understood.") from error

        if (
            parsed.is_private
            or parsed.is_loopback
            or parsed.is_link_local
            or parsed.is_multicast
            or parsed.is_reserved
            or parsed.is_unspecified
        ):
            raise FetchError(
                "That address is on a private or internal network, so it will not be fetched."
            )

    return addresses


def validate(url: str) -> str:
    """Check a URL is safe to open, and return it normalised."""
    candidate = (url or "").strip()
    if not candidate:
        raise FetchError("No address was given.")

    # A scheme we will not follow has to be rejected as one, not have
    # "https://" pasted in front of it: "data:text/html,..." then parses as a
    # host of `data` with a port of `text`, which raises rather than refuses.
    scheme_match = re.match(r"^([a-zA-Z][a-zA-Z0-9+.\-]*):", candidate)
    if scheme_match:
        if scheme_match.group(1).lower() not in ("http", "https"):
            raise FetchError("Only http and https addresses can be read.")
    else:
        candidate = f"https://{candidate}"

    parsed = urlparse(candidate)

    if parsed.scheme not in ("http", "https"):
        raise FetchError("Only http and https addresses can be read.")

    try:
        hostname, port = parsed.hostname, parsed.port
    except ValueError as error:
        raise FetchError("That does not look like a web address.") from error

    if not hostname:
        raise FetchError("That does not look like a web address.")
    if port is not None and port not in (80, 443):
        raise FetchError("Only the standard web ports can be read.")

    _public_addresses(hostname)

    # Credentials in a URL are never wanted here and should not be forwarded.
    netloc = hostname if port is None else f"{hostname}:{port}"
    return urlunparse((parsed.scheme, netloc, parsed.path or "/", "", parsed.query, ""))


def extract_text(html: str) -> tuple[str, str]:
    """Title and readable text from a page.

    Deliberately regex rather than a parser: the service has four dependencies
    and this is not worth a fifth. It only has to be good enough for a model to
    read, and a stray unclosed tag costs a little noise rather than a failure.
    """
    title = ""
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    if match:
        title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", match.group(1))).strip()[:300]

    # Drop what carries no prose, then everything between angle brackets.
    body = re.sub(
        r"(?is)<(script|style|noscript|svg|head|template|iframe)[^>]*>.*?</\1>", " ", html
    )
    body = re.sub(r"(?s)<!--.*?-->", " ", body)
    body = re.sub(r"(?s)<[^>]+>", " ", body)

    for entity, char in (
        ("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&quot;", '"'), ("&#x27;", "'"), ("&#39;", "'"), ("&mdash;", "-"), ("&ndash;", "-"),
    ):
        body = body.replace(entity, char)

    return title, re.sub(r"\s+", " ", body).strip()[:MAX_TEXT_CHARS]


class _NoRedirects(urllib.request.HTTPErrorProcessor):
    """Hand every response back instead of raising or following.

    Redirects have to be re-validated one hop at a time rather than followed
    by the client, or a public first hop could bounce us onto a private
    address. Overriding the error processor is what stops urllib doing it for
    us: the redirect handlers only run on the error path, and there is no
    error path any more.
    """

    def http_response(self, request, response):
        return response

    https_response = http_response


def _open(url: str) -> tuple[int, dict[str, str], bytes, str]:
    """One request, blocking. Called in a worker thread.

    The stdlib client rather than httpx, which is otherwise the service's HTTP
    library. The reason is empirical: a number of real company sites sit
    behind WAFs that fingerprint the client below the header level and answer
    httpx with 403 while answering this with 200 - pashabank.az among them.
    The headers are identical either way; only the stack differs.
    """
    opener = urllib.request.build_opener(_NoRedirects)
    request = urllib.request.Request(url, headers=BROWSER_HEADERS)

    with opener.open(request, timeout=TIMEOUT_SECONDS) as response:
        # One byte past the cap, so an oversized page is detected rather than
        # silently truncated into something that looks complete.
        payload = response.read(MAX_BYTES + 1)
        headers = {key.lower(): value for key, value in response.headers.items()}
        return response.status, headers, payload, response.geturl()


def _decode(payload: bytes, content_type: str) -> str:
    """Text from bytes, preferring the charset the page declares."""
    charset = ""
    match = re.search(r"charset=([\w-]+)", content_type or "", re.I)
    if match:
        charset = match.group(1)
    if not charset:
        head = payload[:4096].decode("ascii", "replace")
        meta = re.search(r"charset=[\"\']?([\w-]+)", head, re.I)
        if meta:
            charset = meta.group(1)

    for candidate in (charset, "utf-8", "cp1252"):
        if not candidate:
            continue
        try:
            return payload.decode(candidate)
        except (UnicodeDecodeError, LookupError):
            continue
    return payload.decode("utf-8", "replace")


async def fetch(url: str) -> tuple[str, str, str]:
    """Read a page. Returns the final URL, its title and its text."""
    current = validate(url)

    for _ in range(MAX_REDIRECTS + 1):
        try:
            status, headers, payload, final_url = await asyncio.to_thread(_open, current)
        except socket.timeout as error:
            raise FetchError("That site did not respond in time.") from error
        except urllib.error.URLError as error:
            raise FetchError(
                f"That site could not be reached ({getattr(error, 'reason', error)})."
            ) from error
        except Exception as error:  # noqa: BLE001 - any transport failure is the same to the user
            raise FetchError(f"That site could not be read ({type(error).__name__}).") from error

        if status in (301, 302, 303, 307, 308):
            location = headers.get("location")
            if not location:
                raise FetchError("That site redirected without saying where.")
            # Re-validated every hop: passing once does not license the rest
            # of the chain to point anywhere.
            current = validate(urljoin(current, location))
            continue

        if status >= 400:
            raise FetchError(
                f"That page returned {status}. "
                "Some sites block automated readers; try the company's home page."
            )

        content_type = headers.get("content-type", "")
        if content_type and "html" not in content_type.lower():
            raise FetchError(
                f"That address is not a web page ({content_type.split(';')[0]})."
            )

        if len(payload) > MAX_BYTES:
            raise FetchError("That page is too large to read.")

        title, text = extract_text(_decode(payload, content_type))
        if len(text) < 200:
            raise FetchError(
                "There was almost no readable text on that page. Some sites render "
                "entirely in the browser; try the company's home or product page."
            )

        return final_url, title, text

    raise FetchError("That address redirected too many times.")
