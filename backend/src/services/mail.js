// Email alerts. Every in-app notification is mirrored to the student's inbox.
// When SMTP is not configured the app keeps working exactly as before: the
// message simply stays in the notification centre and one line is logged.
import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transport = null;
let announced = false;

function getTransport() {
  if (!config.smtp.host) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transport;
}

export function mailEnabled() {
  return Boolean(config.smtp.host);
}

const SUBJECTS = {
  NEW_MATCH: 'You qualify for a new scholarship',
  DEADLINE: 'A scholarship deadline is close',
  DOCUMENT_REJECTED: 'A document needs your attention',
  DOCUMENT_MISMATCH: 'Please check one of your documents',
  STATUS: 'Application status update',
  ELIGIBILITY_LOST: 'Your eligibility changed',
};

function emailHtml({ message, url }) {
  const styles = {
    body: 'margin:0;padding:32px 16px;background:#071A3D;font-family:Arial,Helvetica,sans-serif;',
    card: 'max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;',
    head: 'background:#071A3D;padding:28px 32px;',
    brand: 'color:#FFC21A;font-size:20px;font-weight:bold;letter-spacing:0.5px;',
    tag: 'color:#8FA6CE;font-size:12px;margin-top:6px;',
    thread: 'height:3px;background:linear-gradient(90deg,#FFC21A,#1F6FEB);margin:0 32px;border-radius:2px;',
    msg: 'padding:28px 32px;color:#1b2452;font-size:16px;line-height:1.6;',
    btn: 'display:inline-block;margin:0 32px 32px;background:#1F6FEB;color:#ffffff;text-decoration:none;' +
      'padding:12px 24px;border-radius:10px;font-weight:bold;',
    foot: 'text-align:center;color:#8FA6CE;font-size:12px;padding:20px;',
  };
  return `<!doctype html><html><body style="${styles.body}">
    <div style="${styles.card}">
      <div style="${styles.head}">
        <div style="${styles.brand}">VidyaSutra</div>
        <div style="${styles.tag}">The thread that leads every student to their scholarship</div>
      </div>
      <div style="${styles.thread}"></div>
      <div style="${styles.msg}">${message}</div>
      <a href="${url}" style="${styles.btn}">Open VidyaSutra</a>
      <div style="${styles.foot}">You receive this because of an event on your VidyaSutra account.</div>
    </div>
  </body></html>`;
}

// Sends one notification as email. Returns true when the mail went out.
export async function sendNotificationEmail(user, { type, message, link = null }) {
  const mailer = getTransport();
  if (!mailer) {
    if (!announced) {
      console.log('Email alerts: SMTP is not configured, so notifications stay inside the app.');
      announced = true;
    }
    return false;
  }
  const url = `${config.clientOrigin}${link || ''}`;
  try {
    await mailer.sendMail({
      from: config.smtp.from,
      to: user.email,
      subject: SUBJECTS[type] || 'You have a new notification',
      html: emailHtml({ message, url }),
      text: `${message}\n\nOpen VidyaSutra: ${url}`,
    });
    return true;
  } catch (err) {
    console.warn(`Email to ${user.email} could not be sent: ${err.message}`);
    return false;
  }
}
