# VidyaSutra

**No deserving student left searching.**

A scholarship eligibility and application manager. A student fills in a profile once; VidyaSutra checks it
against every scholarship and shows which ones they qualify for, and why. It then guides the application
through documents, deadlines and review.

Built for CBC 2.0, Problem Statement 29, by team FluxWave.

## What it does

| Requirement in the problem statement | Where it is handled |
|---|---|
| Scholarship and eligibility management | Admin adds scholarships with rules built in a form. Rules are stored as data, so a new scheme needs no code change. |
| Student profile matching | The eligibility engine checks every rule and gives a reason for each one. |
| Deadline tracking | Deadlines are enforced on the server. Reminders go out 7, 3 and 1 days before. |
| Document checklist | Each scholarship has its own list. Documents are uploaded once and reused. |
| Application status workflow | Draft, Submitted, Under review, Documents pending, Approved, Rejected, Expired, with a dated timeline. |
| Edge case: student partially meets criteria | Shown under "Almost there" with the exact gap. Applying is blocked until every mandatory rule is met. |
| Edge case: missing required document | Submission is refused and the missing documents are named. The application stays a draft. |
| Edge case: deadline has passed | The scholarship is shown as closed, submission is refused, and open drafts become Expired. |
| Stretch: recommendations and alerts | Auto-Match re-checks everything when a profile or scholarship changes and alerts students who newly qualify. |
| Extra: document mismatch detection | Photographs and scans (JPG, PNG) are read with OCR at upload and compared with the profile. A mismatch is flagged to the student and counted for the reviewer. PDFs are checked manually. |
| Extra: email alerts | Every in-app alert is also emailed when SMTP is set in `backend/.env`; without it the app works normally. |

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router
- **Backend:** Node.js, Express 5, Sequelize
- **Database:** PostgreSQL
- **Auth:** JWT, passwords hashed with bcrypt
- **OCR:** tesseract.js reads JPG and PNG uploads and compares them with the profile
- **Email:** nodemailer sends alerts when SMTP is configured

## Run it on your computer

You need Node.js 20 or newer and PostgreSQL.

1. **Start PostgreSQL** and create a database called `vidyasutra`. If you have Docker, this does both:

   ```bash
   docker compose up -d
   ```

2. **Install the packages:**

   ```bash
   npm run setup
   ```

3. **Create the backend settings file:**

   ```bash
   cp backend/.env.example backend/.env
   ```

   Open `backend/.env` and check that `DATABASE_URL` matches your PostgreSQL user and password.

4. **Start the API** (it creates the tables and loads the demo data on first start):

   ```bash
   npm run dev:api
   ```

5. **Start the web app** in a second terminal:

   ```bash
   npm run dev:web
   ```

6. Open <http://localhost:5173>.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | `student@vidyasutra.test` | `Student@12345` |
| Admin | `admin@vidyasutra.test` | `Admin@12345` |

To wipe the database and load the demo data again, run `npm run seed`.

## Demo script (about three minutes)

1. Sign in as the **student**. The dashboard says "you qualify for 3 scholarships" and groups the rest under
   "Almost there", "Not a match" and "Closed".
2. Open **Means-Based Study Scholarship**. It shows the partial match: income is ₹1,00,000 over the limit.
3. Open **Merit Award for Degree Students** and start the application. Submit is disabled and the missing
   documents are listed. Upload three files and submit. A photo or scan (JPG or PNG) of the marks card is
   read automatically at upload; if the CGPA printed on it differs from the profile, the document is
   flagged and an alert appears.
4. In another browser window sign in as the **admin**. Open Applications, start the review, and reject the marks
   card with a reason.
5. Back as the student, open **Alerts**, replace the document and send it back.
6. As the admin, verify the three documents and approve. The student's timeline shows every step.
7. As the admin, add a new scholarship that the student qualifies for. The student gets an alert without
   doing anything.
8. Open the **Closed** group to show the passed-deadline case.

## How the matching works

A rule is one row of data:

```json
{ "field": "cgpa", "operator": "gte", "value": 7.5, "mandatory": true, "weight": 1 }
```

For each scholarship the engine checks every rule against the profile and records pass, fail or unknown with a
sentence explaining it. The result is:

- **Eligible:** every mandatory rule passes.
- **Partial:** at least half of the mandatory rules pass, but not all.
- **Not eligible:** fewer than half pass.

The match score is the weight of the passed rules divided by the total weight, and is used for ranking.
A missing profile detail counts as "unknown", never as a pass.

The engine is in `backend/src/engine/eligibility.js` and has no database or web code in it.
To add a new profile field, add it to `backend/src/engine/fields.js` and to the `Profile` model. The profile
form and the admin rule builder pick it up from there.

## Project layout

```
backend/
  src/engine/        eligibility rules, profile fields, profile validation
  src/models/        database tables
  src/routes/        auth, student, admin and shared API routes
  src/services/      auto-match, deadlines, status workflow, notifications, OCR, email
  src/seed-data.js   demo accounts and scholarships
  test/              engine, workflow and end-to-end API tests
frontend/
  src/pages/         one file per screen
  src/components/    layout, rule thread, timeline, upload button
  src/lib/           API client, session, formatting
render.yaml          one-click deployment for Render
```

## Tests

```bash
npm test
```

runs the engine and workflow tests. They need no database.

The end-to-end API test covers the whole flow, including the three edge cases. It **wipes** the database it is
given, so point it at a separate one:

```bash
cd backend
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/vidyasutra_test npm run test:api
```

## Deploy on Render

In production the API also serves the built web app, so there is one service and one URL.

1. Push this folder to a GitHub repository.
2. In Render choose **New > Blueprint** and select the repository. `render.yaml` creates the web service and
   the PostgreSQL database and connects them.
3. Wait for the first deploy, then open the service URL.

To set it up by hand instead: create a PostgreSQL database and a Node web service with build command
`npm run build` and start command `npm start`, and add the environment variables `NODE_ENV=production`,
`DATABASE_URL` (the database's internal URL) and `JWT_SECRET` (any long random string).

`render.yaml` has not been run on Render yet. If the Blueprint reports a problem, use the manual steps.

Things to know on the free plan:

- The service sleeps after 15 minutes without traffic and takes about a minute to wake. Open the site a few
  minutes before a demo.
- The free database expires 30 days after it is created.
- Uploaded files are stored in PostgreSQL, so they survive redeploys without a paid disk.
- If you use a database outside Render (Neon, Supabase), also set `DATABASE_SSL=true`.

## Before real use

- **The demo scholarships are invented.** Replace them with criteria copied from each scheme's official
  guideline, and note the source and year.
- **The demo accounts have public passwords.** On an empty database they are created automatically. Set
  `SEED_DEMO=false` to stop that, and create your own admin.
- **Do not upload real identity documents to a demo deployment.**
- Tables are created with `sequelize.sync()`, which never drops data but also does not alter existing columns.
  Move to migrations before changing the schema of a database you want to keep.

## Not built yet

- SMS alerts. Email alerts work when SMTP is configured in `backend/.env`; without it alerts stay in-app.
- Bulk import of scholarships from a spreadsheet.
- Password reset and admin account management.

## UI redesign (VidyaSutra theme)

The frontend was restyled to the deep-teal and gold VidyaSutra design. The backend and API are unchanged.

- **Theme:** colour tokens in `frontend/src/index.css` (teal structure, gold thread, mint highlights, cream guidance
  cards). Fonts: Plus Jakarta Sans, Fraunces italic accents, Mukta for Devanagari.
- **Landing page:** night-sky hero with layered parallax (pointer and scroll), horizontal slide-in headline and
  stats, a live scholarship ticker, a scroll-pinned horizontal feature rail (swipeable on phones), and an
  "About" section on the name (विद्या = knowledge, सूत्र = thread). Respects reduced-motion settings.
- **Sign in / sign up:** two panels with Login and Sign up tabs, a show/hide password button, a strength meter, a
  confirm-password check and a terms checkbox.
- **New student screens:** Dashboard (`/`), Recovery (`/recovery`), Analytics (`/analytics`). Scholarship
  discovery moved to `/scholarships` and gained filters and paging.
- **Scholarship detail:** tabs for overview, eligibility criteria, required documents and important dates, plus a
  "Save for later" bookmark kept in the browser.
- **Profile:** a step-by-step form that saves automatically on each step and shows why each field is needed.
- **Document Centre:** filter tabs, how many scholarships need each document, an upload dialog, and a review panel
  that shows the file next to what OCR read from it, with mismatches highlighted.
- Derived numbers (missing documents, recovery actions, progress) come from `frontend/src/lib/insights.js` and
  are calculated from the existing API responses.

### Polish pass: logo, loading and edge cases

- **Logo:** an open book (vidya) with a gold thread (sutra) rising from its spine as an "S". Used in the app,
  the favicon and the loaders (`frontend/src/components/Art.jsx`, `frontend/public/favicon.svg`).
- **Loading:** a splash in `index.html` shows the logo before the JavaScript loads; the app start-up shows the
  animated logo; each page shows a skeleton shaped like its final layout; buttons show spinners while working.
- **Motion:** smooth page-to-page transitions, momentum scrolling on the landing page (Lenis), and every
  animation respects the system "reduce motion" setting.
- **Edge cases handled** (`frontend/src/components/Guards.jsx`):
  - an expired session goes to sign-in with a notice, then returns to the page you were on;
  - an offline banner appears, then a "back online" note;
  - a crash in one screen shows a recovery screen instead of a blank page;
  - unknown addresses show a 404 page, and a missing scholarship offers a way back;
  - a start-up failure (API or database down) shows a retry screen;
  - profile values are checked as you type (CGPA 0–10, whole-number year, sensible income), Next is blocked
    while anything is invalid, and unsaved changes are saved when you leave the page and protected from an
    accidental tab close;
  - scholarship filters live in the address, so Back keeps them, and you can filter by saved scholarships;
  - the alert bell updates at once after any change, and when you return to the tab;
  - the page scrolls to the top on navigation, and long names wrap instead of breaking layouts;
  - double submits are blocked; emails are trimmed and lower-cased; passwords are capped at 72 characters
    (the bcrypt limit).

### Visual refresh: 3D hero and React Bits

- **3D hero** (`frontend/src/components/Hero3D.jsx`): a three.js scene of books and a graduation cap, with
  the gold thread winding around them and drawing itself in. It follows the pointer and scroll, pauses when off
  screen, renders a still frame for reduced motion, and falls back to the flat drawing without WebGL. three.js
  is split into its own file and loaded only on the landing and sign-in pages.
- **React Bits** (`frontend/src/components/bits/`, with its licence): Threads background, BlurText page titles,
  RotatingText, ShinyText, CountUp numbers, SpotlightCard stat and scheme cards, and Magnet buttons. Feature
  cards use a 3D tilt (`frontend/src/components/Tilt.jsx`).
- **Text cleanup:** shorter page intros, and the repeated explainer boxes and fine print are removed.

New packages: `three` and `lenis`. Run `npm run setup` once after updating.

### Navigation loader, Poppins, profile entry and phone menu

- **2-second loader** (`frontend/src/lib/navGate.jsx`): every page reload and every move to a different page
  shows the animated logo for 2 seconds. Tabs, filters and #anchors do not trigger it. Inside the app the
  sidebar stays and the loader fills the content area. Behind the loader the next page loads its data, and a
  4-second read cache (cleared by any save) means it appears ready. The page mounts after the loader, so its
  own entrance animations play in full.
- **Font:** Poppins for all text (Fraunces italic accents and Mukta for Devanagari are unchanged).
- **Profile:** removed from the sidebar and phone navigation. Students open it from the profile icon at the
  top left of the top bar.
- **Phone menu (under 500px):** a three-line menu button that folds into an X opens a slide-in menu; the pill
  navigation is used from 500px up. The landing page's menu button uses the same animated icon.
- Fixed: the rotating word in the hero could stay invisible between swaps.

### Reviewer user list and password visibility

- **Users (reviewer panel, `/admin/users`):** everyone registered, with totals, profile completeness,
  applications, documents and OCR flags. Search by name or email (debounced, case-insensitive; matches are
  highlighted) and filter by role, profile, activity, category and state, with sorting and paging. Click a user
  for their profile, applications (linking to the review screen) and documents. Search, filters, page and the
  open user are kept in the address.
- **API:** `GET /api/admin/users` (query: `q`, `role`, `profile`, `activity`, `category`, `state`, `level`,
  `sort`, `page`, `pageSize`) and `GET /api/admin/users/:id`. Reviewer-only and read-only; password hashes are
  never returned. Covered by a new test in `backend/test/api.test.js`.
- **Show password:** the eye button on the Login, Password and Confirm password fields is larger, turns teal
  when the password is visible, animates between states, and keeps the cursor in the field.
