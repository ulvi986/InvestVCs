// Opens the Gmail compose window pre-addressed to the given email.
// Falls back gracefully in any browser since it's just a Gmail web URL.
export function gmailComposeUrl(email: string, subject = "", body = ""): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", to: email });
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
