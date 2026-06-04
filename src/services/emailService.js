const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendFutureMessage = async ({ message, senderName }) => {
  const recipientLabel = message.recipient_name || message.recipient_email;
  const deliveryDate = new Date(message.deliver_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Georgia, serif; background: #f9f6f1; margin: 0; padding: 40px 20px; }
        .card {
          max-width: 600px; margin: 0 auto; background: #fffdf8;
          border: 1px solid #e8e0d0; border-radius: 8px;
          padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .label { font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .title { font-size: 24px; color: #2c2c2c; margin: 0 0 24px; }
        .meta { color: #888; font-size: 13px; margin-bottom: 32px; border-bottom: 1px solid #eee; padding-bottom: 16px; }
        .body { font-size: 16px; line-height: 1.8; color: #3a3a3a; white-space: pre-wrap; }
        .footer { margin-top: 40px; font-size: 12px; color: #bbb; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="label">A letter from the past</div>
        <h1 class="title">${message.title}</h1>
        <div class="meta">
          Written by <strong>${senderName}</strong> &nbsp;·&nbsp;
          Delivered on ${deliveryDate}
        </div>
        <div class="body">${message.body}</div>
        <div class="footer">
          This message was written in the past and scheduled to reach you today via FutureMail.
        </div>
      </div>
    </body>
    </html>
  `;

  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: message.recipient_email,
    subject: `📬 A letter for you: "${message.title}"`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  return data;
};

module.exports = { sendFutureMessage };
