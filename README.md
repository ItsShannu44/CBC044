# VidyaSutra

**No deserving student left searching.**

VidyaSutra is a scholarship eligibility and application manager. A student fills in a profile once. VidyaSutra
checks it against every scholarship, shows which ones they qualify for and why, and then guides the application
through documents, deadlines and review.

Built for CBC 2.0, Problem Statement 29, by team FluxWave.

**Live site:** <https://vidyasutra.onrender.com/>
**Repository:** <https://github.com/ItsShannu44/CBC044>

> The site runs on Render's free plan. If it has been idle it sleeps, and the first visit can take about a minute
> to load.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | `student@vidyasutra.test` | `Student@12345` |
| Reviewer (admin) | `admin@vidyasutra.test` | `Admin@12345` |

These are public demo accounts. Do not upload real identity or bank documents to the live demo.

## Test-user documents

The `test-user/` folder in this repository contains a sample set of documents for a test student, **K N Keerti**.
Use them to try uploading documents, the OCR checks and the review flow without using anyone's real documents.

| File | Document type in the app |
|---|---|
| `K_N_Keerti_1_Latest_marks_card.png` | Latest marks card |
| `K_N_Keerti_2_Income_certificate.png` | Income certificate |
| `K_N_Keerti_3_Government_ID_proof.png` | Government ID proof |
| `K_N_Keerti_4_Caste_certificate.png` | Caste certificate |
| `K_N_Keerti_5_Bonafide_certificate.png` | Bonafide certificate |
| `K_N_Keerti_6_Domicile_certificate.png` | Domicile certificate |
| `K_N_Keerti_7_Bank_passbook_front_page.png` | Bank passbook front page (mandatory for every scholarship) |
| `K_N_Keerti_8_Recommendation_letter.png` | Recommendation letter |

These are **made-up specimens for testing only**. They are marked SPECIMEN and are not real certificates.

How to test with them:

1. Register a new student account, or sign in with the demo student.
2. Fill in the profile to match the details printed on the documents (name, marks, income, category, state).
3. Open a scholarship you qualify for, start an application, and upload the files from `test-user/` under the
   matching document types.
4. Submit, then sign in as the reviewer to verify or reject each document.

The JPG and PNG uploads are read by OCR. If a value in the profile differs from what's printed on a document,
the document is flagged as a mismatch. Changing one profile value is an easy way to see that check work.

## Features

| Requirement | How VidyaSutra handles it |
|---|---|
| Scholarship and eligibility management | Reviewers add scholarships and build their rules in a form. Rules are stored as data, so a new scheme needs no code change. |
| Student profile matching | The eligibility engine checks every rule and gives a reason for each one. |
| Deadline tracking | The server enforces deadlines. Reminders go out 7, 3 and 1 days before. |
| Document checklist | Each scholarship has its own list. A document is uploaded once and reused. |
| Bank passbook | The bank passbook is mandatory for every scholarship. Reviewers can't make it optional. |
| Application status workflow | Draft, Submitted, Under review, Documents pending, Approved, Rejected and Expired, with a dated timeline. |
| Student partly meets the criteria | Shown under "Almost there" with the exact gap. Applying stays blocked until every mandatory rule is met. |
| Missing required document | Submission is refused, the missing documents are named, and the application stays a draft. |
| Deadline has passed | The scholarship shows as closed, submission is refused, and open drafts become Expired. |
| Recommendations and alerts | Auto-Match re-checks everything when a profile or scholarship changes and alerts students who newly qualify. |
| Document mismatch detection | JPG and PNG uploads are read with OCR and compared with the profile. A mismatch is flagged to the student and the reviewer. PDFs are checked by hand. |
| Email alerts | Every in-app alert is also emailed when SMTP is set up. Without SMTP, alerts stay in the app. |
| Help assistant | A help icon beside the alerts bell answers questions about the platform. For signed-in students it also answers from their own data, such as their matches, missing documents, deadlines and application status. It is rule-based and uses no AI or outside service. |
| User management | Reviewers can search, filter and sort all registered users, then open a user's profile, applications and documents. |

### Screens

- **Students:** dashboard, scholarship search with filters, scholarship details, applications, Document Centre,
  alerts, recovery suggestions, analytics, and a profile opened from the icon at the top left.
- **Reviewers:** overview, scholarships with a rule builder, the application review queue, and users.
- **Everyone:** a landing page with a 3D hero, plus sign-in and sign-up with show/hide password.

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Framer Motion, three.js, Lenis, and selected
  [React Bits](https://reactbits.dev) components
- **Backend:** Node.js 20+, Express 5, Sequelize
- **Database:** PostgreSQL
- **Auth:** JWT, with passwords hashed by bcrypt
- **OCR:** tesseract.js
- **Email:** nodemailer (optional)
- **Hosting:** Render (one web service and one PostgreSQL database)

## Run it locally

You need Node.js 20 or newer and PostgreSQL.

```bash
git clone https://github.com/ItsShannu44/CBC044.git
cd CBC044

# 1. Start PostgreSQL with a database called "vidyasutra" (or use Docker)
docker compose up -d

# 2. Install the packages
npm run setup

# 3. Create the backend settings file, then check DATABASE_URL in it
cp backend/.env.example backend/.env

# 4. Start the API (creates the tables and the demo data on first start)
npm run dev:api

# 5. In a second terminal, start the web app
npm run dev:web
```

Then open <http://localhost:5173>.

To wipe the database and load the demo data again, run `npm run seed`.

### Environment variables (`backend/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | A long random string used to sign login tokens |
| `DATABASE_SSL` | No | Set to `true` for databases that need SSL, such as Neon, Supabase or a Render external URL |
| `PORT` | No | API port (default `4000`) |
| `CLIENT_ORIGIN` | No | Development only: the address of the Vite dev server |
| `SEED_DEMO` | No | Set to `false` to stop the demo accounts and scholarships being created |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No | Turn on email alerts |

Never commit `.env`.

## Deployment (Render)

The live site is deployed from this repository with the Render Blueprint in `render.yaml`. In production the
Express API also serves the built React app, so everything runs as one service at one URL.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Start command | `npm start` |
| Health check | `/api/health` |
| Environment | `NODE_ENV=production`, `DATABASE_URL` (from the Render database), `JWT_SECRET` (generated) |

To deploy your own copy, go to Render, choose **New → Blueprint**, and select the repository. Every push to the
main branch redeploys the site.

When the server starts, it creates any missing tables and adds the mandatory bank passbook to every scholarship
that doesn't have it yet. The deploy log shows a line like this:

```
Bank passbook now required: added to N scholarship(s), made mandatory on M.
```

Notes on the free plan:

- The service sleeps after about 15 minutes without traffic.
- Free Render databases expire after a set period. Check the Render dashboard for the date, and upgrade or back
  up before then.
- Uploaded files are stored in PostgreSQL, so they survive redeploys.

## How matching works

Each eligibility rule is one row of data:

```json
{ "field": "cgpa", "operator": "gte", "value": 7.5, "mandatory": true, "weight": 1 }
```

For each scholarship, the engine checks every rule against the student's profile. It records pass, fail or
unknown, with a sentence explaining each result.

- **Eligible:** every mandatory rule passes.
- **Partial:** at least half of the mandatory rules pass, but not all.
- **Not eligible:** fewer than half pass.

The match score is the weight of the passed rules divided by the total weight, and it is used to rank the
results. A missing profile detail counts as unknown, never as a pass.

The engine lives in `backend/src/engine/eligibility.js` and has no database or web code in it. To add a profile
field, add it to `backend/src/engine/fields.js` and to the `Profile` model. The profile form and the rule builder
pick it up from there.

## Project layout

```
backend/
  src/engine/        eligibility rules, profile fields, always-required documents
  src/models/        database tables
  src/routes/        auth, student, admin and shared API routes
  src/services/      auto-match, deadlines, workflow, notifications, OCR, email, required documents
  src/seed-data.js   demo accounts and scholarships
  test/              engine, workflow, OCR and end-to-end API tests
frontend/
  src/pages/         one file per screen
  src/components/    layout, help assistant, 3D hero, guards, React Bits components
  src/lib/           API client, session, navigation loader, help topics, insights
test-user/           sample SPECIMEN documents for testing uploads and OCR
render.yaml          Render Blueprint
docker-compose.yml   local PostgreSQL
```

## Tests

```bash
npm test
```

This runs the engine, workflow and OCR tests, which need no database.

The end-to-end API test **wipes** the database it is given, so point it at a separate one:

```bash
cd backend
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/vidyasutra_test npm run test:api
```

## Before real use

- The demo scholarships are made up. Replace them with criteria from each scheme's official guidelines.
- Set `SEED_DEMO=false` and create your own reviewer account, because the demo passwords are public.
- Tables are created with `sequelize.sync()`, which never drops data but also doesn't change existing columns.
  Switch to migrations before changing the schema of a database you want to keep.

## Not built yet

- SMS alerts
- Bulk import of scholarships from a spreadsheet
- Password reset

## Credits

The components in `frontend/src/components/bits/` are adapted from React Bits by David Haz and used under the
licence in `LICENSE-react-bits.md` (MIT + Commons Clause).
