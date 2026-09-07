"""Reading a website the user pointed us at.

Moving this from a browser extension into the site means the service now makes
outbound requests to addresses users choose. Unguarded, that is server-side
request forgery: the service runs inside a hosting provider's network, where a
link-local address serves instance metadata and private ranges reach whatever
else is deployed there.

So most of this file is about what must NOT be fetched.
"""

from __future__ import annotations

import pytest

from app import fetchpage
from app.fetchpage import FetchError


def resolves_to(monkeypatch, address: str):
    """Pin DNS so the guard can be tested without depending on real names."""
    family = 10 if ":" in address else 2
    monkeypatch.setattr(
        fetchpage.socket,
        "getaddrinfo",
        lambda *_args, **_kwargs: [(family, 1, 6, "", (address, 0))],
    )


# ── Addresses that must be refused ───────────────────────────────────────


@pytest.mark.parametrize("address", [
    "127.0.0.1",          # loopback
    "::1",                # loopback, v6
    "10.0.0.5",           # private
    "172.16.4.9",         # private
    "192.168.1.1",        # private
    "169.254.169.254",    # cloud instance metadata - the classic target
    "0.0.0.0",            # unspecified
    "224.0.0.1",          # multicast
    "fd00::1",            # unique local, v6
    "fe80::1",            # link-local, v6
])
def test_a_non_public_address_is_refused(monkeypatch, address):
    resolves_to(monkeypatch, address)
    with pytest.raises(FetchError) as raised:
        fetchpage.validate("https://internal.example")
    assert "private or internal" in str(raised.value)


def test_a_name_resolving_to_both_public_and_private_is_refused(monkeypatch):
    """Returning one of each is a known way to smuggle a request inward."""
    monkeypatch.setattr(
        fetchpage.socket,
        "getaddrinfo",
        lambda *_a, **_k: [(2, 1, 6, "", ("93.184.216.34", 0)), (2, 1, 6, "", ("10.1.2.3", 0))],
    )
    with pytest.raises(FetchError):
        fetchpage.validate("https://split-horizon.example")


@pytest.mark.parametrize("url", [
    "file:///etc/passwd",
    "ftp://example.com/x",
    "gopher://example.com",
    "data:text/html,<h1>hi</h1>",
])
def test_only_http_and_https_are_read(monkeypatch, url):
    resolves_to(monkeypatch, "93.184.216.34")
    with pytest.raises(FetchError) as raised:
        fetchpage.validate(url)
    assert "http" in str(raised.value).lower()


def test_a_non_standard_port_is_refused(monkeypatch):
    """A public host on port 6379 is someone's Redis, not a marketing page."""
    resolves_to(monkeypatch, "93.184.216.34")
    with pytest.raises(FetchError):
        fetchpage.validate("https://example.com:6379/")


def test_an_unresolvable_name_says_so(monkeypatch):
    def explode(*_a, **_k):
        raise fetchpage.socket.gaierror("nope")

    monkeypatch.setattr(fetchpage.socket, "getaddrinfo", explode)
    with pytest.raises(FetchError) as raised:
        fetchpage.validate("https://nothing.invalid")
    assert "could not be resolved" in str(raised.value)


def test_an_empty_address_is_refused():
    with pytest.raises(FetchError):
        fetchpage.validate("   ")


# ── Addresses that are fine ──────────────────────────────────────────────


def test_a_public_address_is_accepted(monkeypatch):
    resolves_to(monkeypatch, "93.184.216.34")
    assert fetchpage.validate("https://example.com/about") == "https://example.com/about"


def test_a_bare_domain_is_assumed_to_be_https(monkeypatch):
    """People paste "stripe.com", not "https://stripe.com/"."""
    resolves_to(monkeypatch, "93.184.216.34")
    assert fetchpage.validate("example.com").startswith("https://example.com")


def test_credentials_are_stripped_rather_than_forwarded(monkeypatch):
    resolves_to(monkeypatch, "93.184.216.34")
    cleaned = fetchpage.validate("https://user:secret@example.com/x")
    assert "secret" not in cleaned
    assert "user" not in cleaned


def test_the_query_string_is_kept(monkeypatch):
    resolves_to(monkeypatch, "93.184.216.34")
    assert fetchpage.validate("https://example.com/p?ref=1").endswith("?ref=1")


def test_a_fragment_is_dropped(monkeypatch):
    resolves_to(monkeypatch, "93.184.216.34")
    assert "#" not in fetchpage.validate("https://example.com/p#pricing")


# ── Turning a page into something readable ───────────────────────────────


HTML = """
<!doctype html><html><head><title>Northwind Labs — Payments</title>
<style>.a{color:red}</style><script>var x = "not prose";</script></head>
<body><nav>Home Pricing</nav>
<main><h1>Cross-border payment rails</h1>
<p>Trusted by DSV &amp; Girteka. Pricing from 490 EUR&nbsp;/month.</p></main>
<!-- a comment --><footer>© 2026</footer></body></html>
"""


def test_the_title_is_pulled_out():
    title, _ = fetchpage.extract_text(HTML)
    assert title == "Northwind Labs — Payments"


def test_script_and_style_contents_never_reach_the_model():
    _, text = fetchpage.extract_text(HTML)
    assert "not prose" not in text
    assert "color:red" not in text


def test_comments_are_dropped():
    _, text = fetchpage.extract_text(HTML)
    assert "a comment" not in text


def test_the_prose_survives_with_entities_decoded():
    _, text = fetchpage.extract_text(HTML)
    assert "Cross-border payment rails" in text
    assert "DSV & Girteka" in text
    assert "490 EUR /month" in text or "490 EUR/month" in text


def test_text_is_capped():
    _, text = fetchpage.extract_text("<html><body>" + ("word " * 200_000) + "</body></html>")
    assert len(text) <= fetchpage.MAX_TEXT_CHARS


def test_a_page_with_no_title_still_yields_text():
    title, text = fetchpage.extract_text("<html><body><p>Just prose here.</p></body></html>")
    assert title == ""
    assert "Just prose here." in text


# ── Saying why a page had nothing to read ────────────────────────────────
#
# Reported as "it returns 400". It does, correctly: the address was the user's
# own site, a React app whose server response is a 2KB shell with zero prose.
# The old message told them to try the home page, which is where they already
# were, so the reason stayed hidden.


SPA_SHELL = (
    '<!doctype html><html lang="en"><head><title>InvestVCs</title></head>'
    '<body><div id="root"></div><script src="/assets/index.js"></script></body></html>'
)


def test_a_client_rendered_shell_is_recognised():
    assert fetchpage.looks_client_rendered(SPA_SHELL) is True


def test_other_mount_points_are_recognised_too():
    for shell in (
        "<div id='root'></div>",
        '<div id="app"></div>',
        '<div id="__next"></div>',
        '<div id="__nuxt"></div>',
        '<div data-reactroot></div>',
        '<app-root ng-version="17.0"></app-root>',
    ):
        assert fetchpage.looks_client_rendered(shell) is True, shell


def test_a_server_rendered_page_is_not_mistaken_for_one():
    """Otherwise a genuinely thin page would be blamed on rendering."""
    assert fetchpage.looks_client_rendered(
        "<html><body><h1>Acme</h1><p>We sell things.</p></body></html>"
    ) is False


def test_the_shell_yields_no_text_at_all():
    _, text = fetchpage.extract_text(SPA_SHELL)
    assert len(text) < 200


# ── Reading a single-page app's metadata ─────────────────────────────────
#
# Refusing outright was correct but useless: the user's own site is a React
# app, and "your page has no text" is not something they can act on. The shell
# does carry the metadata link previews are built from, and that is the site
# describing itself - thin, but real.

SHELL_WITH_META = (
    '<!doctype html><html><head>'
    '<title>InvestVCs - Startup Evaluation Platform</title>'
    '<meta name="description" content="Evaluate your startup with Berkus, Scorecard, '
    'and Risk Factor methods. Track financials and readiness levels.">'
    '<meta property="og:title" content="InvestVCs - Startup Evaluation Platform">'
    '<meta property="og:description" content="Evaluate your startup with Berkus, Scorecard, '
    'and Risk Factor methods. Track financials and readiness levels.">'
    '</head><body><div id="root"></div></body></html>'
)


def test_the_title_and_description_are_read_from_the_shell():
    meta = fetchpage.extract_metadata(SHELL_WITH_META)
    assert meta["Title"] == "InvestVCs - Startup Evaluation Platform"
    assert "Berkus" in meta["Description"]


def test_a_repeated_value_is_not_listed_twice():
    """og:title and twitter:title normally say the same thing."""
    meta = fetchpage.extract_metadata(SHELL_WITH_META)
    assert list(meta.values()).count(meta["Title"]) == 1


def test_the_block_says_where_it_came_from():
    """Without this the screener would read the absence of customers, pricing
    and team as facts about the company rather than as how the site is built."""
    block = fetchpage.metadata_block(fetchpage.extract_metadata(SHELL_WITH_META))
    assert "renders its content in the browser" in block
    assert "unknown rather than absent" in block
    assert "Berkus" in block


def test_a_shell_with_no_metadata_yields_nothing_to_screen():
    meta = fetchpage.extract_metadata('<html><head></head><body><div id="root"></div></body></html>')
    assert fetchpage.metadata_block(meta) == ""


def test_a_title_alone_is_not_enough_to_screen_a_company():
    """A bare title is a brand name, not a description of a business."""
    meta = fetchpage.extract_metadata("<html><head><title>Acme</title></head><body></body></html>")
    assert meta == {"Title": "Acme"}
    assert "Description" not in meta
