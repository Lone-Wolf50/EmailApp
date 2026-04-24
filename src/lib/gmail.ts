export async function sendEmailWithGmailAPI(
  accessToken: string,
  to: string,
  subject: string,
  message: string,
  fromEmail?: string
) {
  // Build a proper RFC 2822 message with all required headers
  const headers = [
    `MIME-Version: 1.0`,
    `Date: ${new Date().toUTCString()}`,
    `To: ${to}`,
    ...(fromEmail ? [`From: ${fromEmail}`] : []),
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
  ];

  const rawEmail = headers.join('\r\n') + '\r\n\r\n' + message;

  // Base64url encode
  const base64UrlEncodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: base64UrlEncodedEmail })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to send email (${response.status})`);
  }

  return response.json();
}
