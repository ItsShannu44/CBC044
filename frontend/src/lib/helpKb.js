// The help assistant's knowledge: one entry per question people ask, written
// from what the platform actually does. `keys` are words or short phrases the
// matcher looks for; `roles` says who sees the topic (guest, STUDENT, ADMIN);
// `links` become buttons; `follow` suggests next questions.
// Answers use a tiny format: **bold**, "- " for bullets, blank line for a new paragraph.

export const TOPICS = [
  // ---------- About ----------
  {
    id: 'about', title: 'What is VidyaSutra?', roles: ['guest', 'STUDENT', 'ADMIN'],
    keys: ['what is vidyasutra', 'about', 'platform', 'what does this do', 'purpose', 'vidyasutra', 'how does it work', 'website', 'site', 'what is this'],
    answer: 'VidyaSutra matches students with scholarships. You fill in your profile once, and every scholarship is checked against it rule by rule, so you can see exactly which ones you qualify for, and why.\n\nIt also keeps your documents in one place, checks scans automatically, reminds you of deadlines, and tracks each application until a decision.',
    follow: ['eligibility', 'signup', 'documents'],
  },
  {
    id: 'cost', title: 'Is it free?', roles: ['guest', 'STUDENT'],
    keys: ['free', 'cost', 'fee', 'pay', 'charge', 'price', 'money to use'],
    answer: 'Yes. Creating an account, checking eligibility and applying through VidyaSutra are free.',
    follow: ['signup'],
  },

  // ---------- Account ----------
  {
    id: 'signup', title: 'How do I create an account?', roles: ['guest'],
    keys: ['sign up', 'signup', 'register', 'create account', 'new account', 'join', 'get started'],
    answer: 'Click **Get started**, then enter your full name, email and a password of at least 8 characters, and accept the terms.\n\nAfter signing up, complete your profile so your matches can be worked out.',
    links: [{ label: 'Create an account', to: '/register' }],
    follow: ['profile', 'eligibility'],
  },
  {
    id: 'reviewer-account', title: 'How do I get a reviewer account?', roles: ['guest', 'STUDENT'],
    keys: ['admin account', 'reviewer account', 'become admin', 'become reviewer', 'admin role', 'register as admin'],
    answer: 'Everyone who signs up gets a **student** account. Reviewer (admin) accounts are created by the platform team, not through sign-up.',
  },
  {
    id: 'login', title: 'I can\'t sign in', roles: ['guest'],
    keys: ['login', 'log in', 'sign in', 'cannot login', 'cant login', 'wrong password', 'incorrect password', 'password not working'],
    answer: 'Check that the email is the one you registered with and that Caps Lock is off. Tap the **eye** icon to see what you typed.\n\nIf the site was idle, the first load can take up to a minute while the server wakes up, so try again after a moment.',
    links: [{ label: 'Go to sign in', to: '/login' }],
    follow: ['forgot'],
  },
  {
    id: 'forgot', title: 'I forgot my password', roles: ['guest', 'STUDENT'],
    keys: ['forgot', 'forgot password', 'reset password', 'change password', 'lost password', 'recover account'],
    answer: 'Password reset by email is not available yet. Please contact the scholarship office (your reviewer) and they can help you get back into your account.',
  },
  {
    id: 'expired', title: 'Why was I signed out?', roles: ['guest', 'STUDENT', 'ADMIN'],
    keys: ['signed out', 'logged out', 'session expired', 'session', 'kicked out'],
    answer: 'For safety, your sign-in expires after a while. Sign in again and you will be taken back to the page you were on.',
  },

  // ---------- Profile ----------
  {
    id: 'profile', title: 'How do I complete my profile?', roles: ['STUDENT', 'guest'],
    keys: ['profile', 'complete profile', 'fill profile', 'my details', 'personal details', 'update profile', 'edit profile'],
    answer: 'Open your profile from the **profile icon at the top left**. It has three short steps:\n- Academic details: level, stream, year, CGPA\n- Family & income: annual family income, category\n- Personal information: gender, state, disability\n\nYour answers are saved each time you press **Next**, and every scholarship is checked again straight away.',
    links: [{ label: 'Open my profile', to: '/profile', roles: ['STUDENT'] }],
    follow: ['accuracy', 'unknown', 'eligibility'],
  },
  {
    id: 'accuracy', title: 'Why must details match my certificates?', roles: ['STUDENT', 'guest'],
    keys: ['accurate', 'accuracy', 'exactly', 'certificate match', 'why match', 'wrong details', 'mistake in profile'],
    answer: 'Reviewers compare your profile with your uploaded documents. Photos and scans are also read automatically, and a value that differs (for example a different CGPA) is flagged. Entering details exactly as printed avoids delays.',
    follow: ['ocr', 'mismatch'],
  },
  {
    id: 'cgpa', title: 'What CGPA should I enter?', roles: ['STUDENT', 'guest'],
    keys: ['cgpa', 'gpa', 'percentage', 'marks', 'grade', 'sgpa', 'convert percentage'],
    answer: 'Enter your **CGPA on a 10-point scale**, exactly as on your latest marks card (for example 8.2). It must be between 0 and 10.',
  },
  {
    id: 'income', title: 'What income should I enter?', roles: ['STUDENT', 'guest'],
    keys: ['income', 'family income', 'annual income', 'salary', 'earning'],
    answer: 'Enter your family\'s **total annual income in rupees**, as shown on your income certificate (for example 320000). Many scholarships have an income limit, so this decides several matches.',
  },

  // ---------- Eligibility ----------
  {
    id: 'eligibility', title: 'How is eligibility worked out?', roles: ['guest', 'STUDENT', 'ADMIN'],
    keys: ['eligibility', 'eligible', 'qualify', 'how matching works', 'rules', 'criteria', 'match', 'how do you decide'],
    answer: 'Each scholarship has rules, such as "CGPA is at least 7.5" or "Category is OBC, SC or ST". Every rule is checked against your profile and comes back as:\n- **Met**: your value satisfies the rule\n- **Not met**: it does not, with the exact gap\n- **Cannot check yet**: a profile detail is missing\n\nYou are **eligible** when every mandatory rule is met. If you meet at least half, the scholarship shows as **within reach** with what is missing.',
    links: [{ label: 'See my matches', to: '/scholarships', roles: ['STUDENT'] }],
    follow: ['score', 'partial', 'unknown'],
  },
  {
    id: 'score', title: 'What does the match % mean?', roles: ['guest', 'STUDENT', 'ADMIN'],
    keys: ['match score', 'percentage match', 'match percent', 'score', '% match', 'what is 90'],
    answer: 'The match % is the share of a scholarship\'s rules you meet, weighted by how important each rule is. It is used to rank results. Being eligible still depends on meeting every **mandatory** rule, so a high score with one mandatory rule unmet is "within reach", not eligible.',
  },
  {
    id: 'partial', title: 'What does "within reach" mean?', roles: ['STUDENT', 'guest'],
    keys: ['within reach', 'almost', 'partial', 'almost there', 'close', 'nearly eligible'],
    answer: 'You meet at least half of the mandatory rules but not all. Open the scholarship to see exactly which rule is not met and by how much. The **Recovery** page lists the changes that would unlock the most scholarships.',
    links: [{ label: 'Open Recovery', to: '/recovery', roles: ['STUDENT'] }],
  },
  {
    id: 'unknown', title: 'Why does a rule say "cannot check yet"?', roles: ['STUDENT', 'guest'],
    keys: ['cannot check', 'unknown', 'cant check', 'missing detail', 'not checked', 'question mark'],
    answer: 'The rule needs a profile detail you have not filled in yet. A missing detail never counts as a pass. Add it to your profile and the rule is checked immediately.',
    links: [{ label: 'Complete my profile', to: '/profile', roles: ['STUDENT'] }],
  },
  {
    id: 'cannot-apply', title: 'Why can\'t I start an application?', roles: ['STUDENT'],
    keys: ['cannot apply', 'cant apply', 'apply button', 'not allowed to apply', 'start application', 'apply disabled'],
    answer: 'You can start an application only when you meet every mandatory rule and the deadline has not passed. The scholarship page lists the rules still to be met. Ask me "why am I not eligible for" followed by the scholarship name for your exact gaps.',
  },

  // ---------- Documents ----------
  {
    id: 'documents', title: 'How do I upload documents?', roles: ['STUDENT', 'guest'],
    keys: ['upload', 'document', 'documents', 'add file', 'attach', 'certificate upload', 'how to upload'],
    answer: 'Go to **Documents** and press **Upload** next to a document, or use **Upload document** at the top.\n- Formats: **PDF, JPG or PNG**\n- Size: up to **2 MB**\n\nEach document is uploaded once and reused for every scholarship that asks for it.',
    links: [{ label: 'Open Documents', to: '/documents', roles: ['STUDENT'] }],
    follow: ['ocr', 'which-docs', 'replace'],
  },
  {
    id: 'file-size', title: 'My file is too large', roles: ['STUDENT', 'guest'],
    keys: ['too large', 'too big', 'file size', 'big file', 'big', 'large', '2 mb', 'size limit', 'compress', 'reduce size'],
    answer: 'The limit is **2 MB** per file. Try a photo at a lower resolution, crop to the document, or export the scan as JPG instead of PDF. Make sure the text is still clear enough to read.',
  },
  {
    id: 'which-docs', title: 'Which documents will I need?', roles: ['STUDENT', 'guest'],
    keys: ['which documents', 'what documents', 'required documents', 'document list', 'list of documents'],
    answer: 'Each scholarship lists its own documents. Common ones are the latest marks card, income certificate, government ID proof, caste certificate, bonafide certificate, domicile certificate and bank passbook front page.\n\nSigned in? Ask me "which documents am I missing?" for your personal list.',
    links: [{ label: 'Open Documents', to: '/documents', roles: ['STUDENT'] }],
  },
  {
    id: 'ocr', title: 'What is the automatic document check?', roles: ['STUDENT', 'guest', 'ADMIN'],
    keys: ['ocr', 'automatic check', 'scan', 'read document', 'verify document', 'matched', 'ocr matched'],
    answer: 'When you upload a **photo or scan (JPG or PNG)**, its text is read automatically and compared with your profile:\n- Marks card → CGPA\n- Income certificate → family income\n- ID proof → gender\n- Caste certificate → category\n- Domicile certificate → state\n\n**PDFs** are not read automatically; the reviewer checks them by hand.',
    follow: ['mismatch', 'unreadable'],
  },
  {
    id: 'mismatch', title: 'My document shows a mismatch', roles: ['STUDENT'],
    keys: ['mismatch', 'does not match', 'doesnt match', 'flagged', 'wrong value', 'red flag', 'different value'],
    answer: 'A mismatch means a value read from the document differs from your profile. Open **Documents → Review** to see both values side by side. Then either:\n- correct your **profile** if it was wrong, or\n- **Replace** the file if you uploaded the wrong document.',
    links: [{ label: 'Open Documents', to: '/documents' }, { label: 'Edit profile', to: '/profile' }],
  },
  {
    id: 'unreadable', title: 'My document is "unreadable"', roles: ['STUDENT'],
    keys: ['unreadable', 'could not read', 'blurry', 'not readable', 'manual review', 'pending review'],
    answer: 'The text could not be read, often because the photo is blurry, dark or at an angle. Retake it flat, in good light and in focus, then press **Replace**. If it still cannot be read, the reviewer will check it by hand.',
  },
  {
    id: 'replace', title: 'How do I replace a document?', roles: ['STUDENT'],
    keys: ['replace', 'reupload', 're-upload', 'change document', 'update document', 'wrong file'],
    answer: 'On **Documents**, press **Replace** next to the document and choose the new file. The new file is used everywhere. A document a reviewer has already verified on an application cannot be replaced from that application.',
    links: [{ label: 'Open Documents', to: '/documents' }],
  },
  {
    id: 'privacy', title: 'Who can see my documents?', roles: ['guest', 'STUDENT'],
    keys: ['privacy', 'who can see', 'safe', 'secure', 'security', 'share my documents', 'data'],
    answer: 'Only **you** and the platform\'s **reviewers** can open your documents. Other students cannot. Passwords are stored only in a scrambled (hashed) form.',
  },

  // ---------- Applications ----------
  {
    id: 'apply', title: 'How do I apply?', roles: ['STUDENT', 'guest'],
    keys: ['how to apply', 'apply', 'application', 'submit application', 'start application', 'steps to apply'],
    answer: 'Open a scholarship you qualify for and:\n- press **Start application**\n- upload every required document on the **Required documents** tab\n- press **Submit application**\n\nYou can follow its progress on **Applications**.',
    links: [{ label: 'Find scholarships', to: '/scholarships', roles: ['STUDENT'] }],
    follow: ['submit-blocked', 'statuses'],
  },
  {
    id: 'submit-blocked', title: 'Why can\'t I submit?', roles: ['STUDENT'],
    keys: ['cannot submit', 'cant submit', 'submit disabled', 'submit button', 'submission blocked', 'not submitting'],
    answer: 'Submit stays disabled until every **mandatory document** is uploaded, and the page names the missing ones. Applications also cannot be submitted after the deadline.',
  },
  {
    id: 'statuses', title: 'What do the application statuses mean?', roles: ['STUDENT', 'ADMIN', 'guest'],
    keys: ['status', 'statuses', 'under review', 'submitted', 'approved', 'rejected', 'draft', 'what does status mean', 'track application'],
    answer: '- **Draft**: started, not yet submitted\n- **Submitted**: sent, waiting for a reviewer\n- **Under review**: a reviewer is checking it\n- **Documents pending**: a document was not accepted, so replace it and send it back\n- **Approved** / **Rejected**: the decision, with a reason for rejections\n- **Expired**: the deadline passed while it was still a draft',
    links: [{ label: 'My applications', to: '/applications', roles: ['STUDENT'] }],
  },
  {
    id: 'docs-pending', title: 'My application says "Documents pending"', roles: ['STUDENT'],
    keys: ['documents pending', 'document rejected', 'not accepted', 'send back', 'resubmit'],
    answer: 'A reviewer did not accept one of your documents and gave a reason. Open the application, **Replace** that document, then press **Send back for review**.',
    links: [{ label: 'My applications', to: '/applications' }],
  },
  {
    id: 'deadline', title: 'What happens at the deadline?', roles: ['STUDENT', 'guest'],
    keys: ['deadline', 'last date', 'closing date', 'closed', 'missed deadline', 'expired', 'late'],
    answer: 'After the deadline a scholarship shows as **closed** and new applications or submissions are refused. Drafts that were not submitted become **Expired**.\n\nYou get reminders **7, 3 and 1 days** before a deadline for scholarships you qualify for but have not submitted.',
    follow: ['alerts'],
  },
  {
    id: 'alerts', title: 'How do alerts work?', roles: ['STUDENT'],
    keys: ['alert', 'alerts', 'notification', 'notifications', 'bell', 'reminder', 'email'],
    answer: 'The **bell** at the top shows alerts for new matches, closing deadlines, document checks and status changes. If the platform has email set up, each alert is also emailed to you.',
    links: [{ label: 'Open alerts', to: '/alerts' }],
  },
  {
    id: 'new-scholarships', title: 'Will I hear about new scholarships?', roles: ['STUDENT', 'guest'],
    keys: ['new scholarship', 'auto match', 'automatic', 'notify new', 'future scholarships'],
    answer: 'Yes. When a new scholarship is added, or you update your profile, every scholarship is checked again and you get an alert for any new one you qualify for.',
  },
  {
    id: 'recovery', title: 'What is the Recovery page?', roles: ['STUDENT'],
    keys: ['recovery', 'improve', 'unlock', 'what should i do', 'next steps', 'action plan'],
    answer: 'Recovery lists everything standing between you and more scholarships (missing documents, missing profile details, mismatches and rule gaps), ranked by how many scholarships fixing each one unlocks.',
    links: [{ label: 'Open Recovery', to: '/recovery' }],
  },
  {
    id: 'saved', title: 'How do I save a scholarship?', roles: ['STUDENT'],
    keys: ['save', 'saved', 'bookmark', 'save for later', 'favourite', 'favorite'],
    answer: 'Open a scholarship and press **Save for later**. Then on **Scholarships**, choose **Match → Saved for later** to see only those. Saved items are kept in this browser.',
  },
  {
    id: 'mobile', title: 'Can I use it on my phone?', roles: ['guest', 'STUDENT', 'ADMIN'],
    keys: ['phone', 'mobile', 'android', 'iphone', 'menu', 'app', 'on mobile', 'on phone'],
    answer: 'Yes, it works in any phone browser. On small screens, open the menu with the **three-line button** at the top right. You can take photos of documents straight from your phone when uploading.',
  },
  {
    id: 'contact', title: 'How do I contact someone?', roles: ['guest', 'STUDENT'],
    keys: ['contact', 'support', 'help desk', 'talk to human', 'email support', 'call', 'complaint'],
    answer: 'For questions about a specific application or decision, contact the scholarship office that reviews applications on this platform. Rejections always include the reviewer\'s reason.',
  },

  // ---------- Reviewers ----------
  {
    id: 'admin-add', title: 'How do I add a scholarship?', roles: ['ADMIN'],
    keys: ['add scholarship', 'new scholarship', 'create scholarship', 'rules builder', 'add rule', 'edit scholarship'],
    answer: 'Go to **Scholarships → Add scholarship**. Enter the name, provider, amount and deadline, then build the rules (field, comparison, value, mandatory or preferred, weight) and pick the required documents. On saving, every student is checked again and those who now qualify are alerted.',
    links: [{ label: 'Scholarships', to: '/admin/scholarships' }],
  },
  {
    id: 'admin-review', title: 'How do I review an application?', roles: ['ADMIN'],
    keys: ['review', 'review application', 'verify', 'approve', 'reject', 'decision', 'queue'],
    answer: 'Open **Applications**, pick one, and press **Start review**. For each document, **Verify** it or **Reject** it with a reason; a rejected document moves the application to Documents pending. You can **Approve** once every mandatory document is verified. Rejecting an application requires a note to the student.',
    links: [{ label: 'Applications', to: '/admin/applications' }],
  },
  {
    id: 'admin-users', title: 'How do I find a student?', roles: ['ADMIN'],
    keys: ['users', 'find student', 'search student', 'student list', 'user list', 'search user'],
    answer: 'Open **Users** and search by name or email. You can filter by role, profile completeness, activity (applied, in progress, flagged documents), category and state, then click a user for their profile, applications and documents.',
    links: [{ label: 'Users', to: '/admin/users' }],
  },
  {
    id: 'admin-flags', title: 'What does a flagged document mean?', roles: ['ADMIN'],
    keys: ['flagged', 'flag', 'ocr mismatch', 'auto check', 'mismatch'],
    answer: 'The automatic check read a value on the student\'s photo or scan (CGPA, income, gender, category or state) that differs from their profile. Look at the document before verifying it.',
  },

  // ---------- Small talk ----------
  {
    id: 'hello', title: 'Hello', roles: ['guest', 'STUDENT', 'ADMIN'], hidden: true,
    keys: ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening'],
    answer: 'Hello! Ask me anything about scholarships, eligibility, documents or applications.',
  },
  {
    id: 'thanks', title: 'Thanks', roles: ['guest', 'STUDENT', 'ADMIN'], hidden: true,
    keys: ['thanks', 'thank you', 'thx', 'great', 'helpful', 'ok thanks'],
    answer: 'You\'re welcome! Anything else I can help with?',
  },
];

// Suggested questions for the page the person is on.
export function suggestionsFor(pathname, role) {
  const r = role || 'guest';
  if (r === 'ADMIN') {
    if (pathname.startsWith('/admin/users')) return ['admin-users', 'admin-flags', 'admin-review'];
    if (pathname.startsWith('/admin/scholarships')) return ['admin-add', 'eligibility', 'score'];
    return ['admin-review', 'admin-add', 'admin-users'];
  }
  if (r === 'guest') return ['about', 'eligibility', 'signup', 'documents'];
  if (pathname.startsWith('/documents')) return ['@missing', 'ocr', 'mismatch', 'file-size'];
  if (pathname.startsWith('/profile')) return ['accuracy', 'cgpa', 'income', 'unknown'];
  if (pathname.startsWith('/applications')) return ['@status', 'statuses', 'docs-pending'];
  if (pathname.startsWith('/scholarships/')) return ['@why', 'apply', 'submit-blocked', 'score'];
  if (pathname.startsWith('/scholarships')) return ['@eligible', 'eligibility', 'partial', 'saved'];
  if (pathname.startsWith('/recovery')) return ['recovery', '@missing', 'partial'];
  return ['@eligible', '@missing', '@deadline', 'eligibility'];
}

// The personal questions (answered from the student's own data).
export const PERSONAL = {
  '@eligible': 'Which scholarships do I qualify for?',
  '@missing': 'Which documents am I missing?',
  '@deadline': 'What are my next deadlines?',
  '@status': 'Where are my applications?',
  '@profile': 'What is missing from my profile?',
  '@why': 'Why am I not eligible for this one?',
};

// ---------- Matching ----------

const STOP = new Set(('a an the i me my mine is am are was were be to of for in on at do does did can could would should will '
  + 'it this that these those and or how what why when where which who please pls tell know about with from get got you your '
  + 'there here have has had any some')
  .split(' '));

const SYNONYMS = {
  doc: 'document', docs: 'document', certificate: 'document', certificates: 'document', cert: 'document', file: 'document', files: 'document',
  qualify: 'eligible', qualifies: 'eligible', qualified: 'eligible', eligibility: 'eligible',
  scholarships: 'scholarship', scheme: 'scholarship', schemes: 'scholarship',
  signin: 'login', logon: 'login', pwd: 'password', pass: 'password',
  reupload: 'replace', notifications: 'notification', alerts: 'alert',
  gpa: 'cgpa', marksheet: 'marks', markscard: 'marks',
};

const GENERIC = new Set(['document', 'upload', 'application', 'apply', 'scholarship', 'profile', 'eligible', 'status', 'review']);

export function normalize(text) {
  return String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const stem = (w) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w);

export function tokens(text) {
  return normalize(text).split(' ').filter((w) => w && !STOP.has(w)).map((w) => SYNONYMS[w] || w).map(stem);
}

function close(a, b) {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  // Two neighbouring letters swapped ("documnet").
  if (a.length === b.length) {
    const diff = [...a].map((c, i) => (c === b[i] ? -1 : i)).filter((i) => i >= 0);
    if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return true;
  }
  // One edit apart (typo tolerance).
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue; }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1; else if (b.length > a.length) j += 1; else { i += 1; j += 1; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Scores every topic against the question; returns the best few.
export function rank(question, role) {
  const r = role || 'guest';
  const text = normalize(question);
  const words = tokens(question);
  const scored = TOPICS.filter((t) => t.roles.includes(r)).map((t) => {
    let score = 0;
    const counted = new Set();
    for (const key of t.keys) {
      const k = normalize(key);
      if (k.includes(' ')) {
        if (text.includes(k)) score += 4;
        else {
          // Out of order or with typos: only for phrases that keep 2+ meaningful words.
          const parts = tokens(k);
          const hit = parts.filter((p) => words.some((w) => close(w, p))).length;
          if (parts.length >= 2 && hit === parts.length) score += 3;
        }
      } else {
        const kk = stem(SYNONYMS[k] || k);
        if (counted.has(kk)) continue;
        counted.add(kk);
        // Common words ("document", "apply"...) say less about the topic than specific ones.
        const weight = GENERIC.has(kk) ? 1 : 2;
        if (words.includes(kk)) score += weight;
        else if (words.some((w) => close(w, kk))) score += weight / 2;
      }
    }
    return { topic: t, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

// The answer to give, if any: a strong match, or a weaker one that clearly beats the rest.
export function pick(ranked) {
  const [best, second] = ranked;
  if (!best) return null;
  if (best.score >= 2) return best;
  if (best.score >= 1 && (!second || second.score < best.score)) return best;
  return null;
}
