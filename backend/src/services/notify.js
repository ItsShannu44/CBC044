import { Notification, User } from '../models/index.js';
import { sendNotificationEmail } from './mail.js';

// Creates an in-app notification. With a dedupeKey the same message is never created twice.
export async function notify(userId, { type, message, link = null, dedupeKey = null }) {
  let created;
  if (dedupeKey) {
    const [, wasCreated] = await Notification.findOrCreate({
      where: { userId, dedupeKey },
      defaults: { type, message, link },
    });
    created = wasCreated;
  } else {
    await Notification.create({ userId, type, message, link });
    created = true;
  }

  // Mirror the notification to the student's inbox. Sent in the background on purpose:
  // a slow or missing mail server must never hold up the request that caused the message.
  if (created) {
    User.findByPk(userId, { attributes: ['name', 'email'] })
      .then((user) => user && sendNotificationEmail(user, { type, message, link }))
      .catch(() => {});
  }
  return created;
}
