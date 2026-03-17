import dotenv from 'dotenv';
dotenv.config();

// ============================================
// EMAIL via Resend
// ============================================
async function sendEmail(to, subject, htmlBody) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'jobs@yourdomain.com',
      to: [to],
      subject,
      html: htmlBody
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

// ============================================
// SMS via Twilio
// ============================================
async function sendSMS(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', to);
  params.append('From', from);
  params.append('Body', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio error: ${err}`);
  }
  return res.json();
}

// ============================================
// FORMAT NOTIFICATION
// ============================================

function formatSMSMessage(summaries) {
  let msg = `🎯 ${summaries.length} new job${summaries.length > 1 ? 's' : ''} matching your profile:\n\n`;
  summaries.forEach((job, i) => {
    msg += `${i + 1}. ${job.title}\n`;
    msg += `   ${job.location} – ${job.salary || 'Salary not listed'}\n`;
    msg += `   ${job.summary}\n\n`;
  });
  msg += 'Reply STOP to unsubscribe.';
  return msg;
}

function formatEmailHTML(summaries) {
  const jobsHTML = summaries.map((job, i) => `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #eee;">
        <div style="font-size: 16px; font-weight: 600; color: #1a1a2e;">${i + 1}. ${job.title}</div>
        <div style="font-size: 13px; color: #666; margin: 4px 0;">${job.company || ''} · ${job.location} · ${job.salary || 'Salary not listed'}</div>
        <div style="font-size: 14px; color: #333; margin-top: 6px;">${job.summary}</div>
      </td>
    </tr>
  `).join('');

  return `
    <div style="max-width: 560px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="padding: 24px 0; border-bottom: 2px solid #1a1a2e;">
        <h1 style="margin: 0; font-size: 22px; color: #1a1a2e;">🎯 Your Daily Job Matches</h1>
        <p style="margin: 6px 0 0; color: #666; font-size: 14px;">${summaries.length} new position${summaries.length > 1 ? 's' : ''} found today</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        ${jobsHTML}
      </table>
      <div style="padding: 20px 0; font-size: 12px; color: #999;">
        Sent by Job Agent · <a href="#" style="color: #999;">Unsubscribe</a>
      </div>
    </div>
  `;
}

// ============================================
// SEND NOTIFICATION
// ============================================
export async function sendNotification(user, jobSummaries) {
  const method = user.notification_method || 'email';
  const results = { email: null, sms: null };

  try {
    if ((method === 'email' || method === 'both') && user.email) {
      const html = formatEmailHTML(jobSummaries);
      results.email = await sendEmail(
        user.email,
        `🎯 ${jobSummaries.length} New Job Matches`,
        html
      );
    }

    if ((method === 'sms' || method === 'both') && user.phone) {
      const msg = formatSMSMessage(jobSummaries);
      results.sms = await sendSMS(user.phone, msg);
    }

    return { success: true, results };
  } catch (err) {
    console.error(`[Notify] Failed for user ${user.id}:`, err.message);
    return { success: false, error: err.message };
  }
}
