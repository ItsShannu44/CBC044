VidyaSutra 🎓

No deserving student left searching.

VidyaSutra is a scholarship eligibility and application management platform that helps students discover relevant scholarships, understand eligibility criteria, manage documents, and track applications from submission to review.

Built by Team FluxWave for CBC 2.0 · Problem Statement 29.

🌐 Live Demo: https://vidyasutra.onrender.com/

«The live demo runs on Render's free plan. Initial loading may take up to a minute after inactivity.»

✨ Key Features

- Smart Eligibility Matching — Match student profiles against scholarship criteria with clear explanations.
- Centralized Scholarship Discovery — Search scholarships, explore requirements, and identify eligibility gaps.
- Document Management — Upload and reuse documents with scholarship-specific checklists.
- OCR Verification — Detect mismatches between uploaded JPG/PNG documents and student profiles.
- Application Tracking — Track application status, review decisions, and status history.
- Deadline Alerts — Receive reminders 7, 3, and 1 day before scholarship deadlines.
- Reviewer Dashboard — Manage scholarships, configure eligibility rules, review applications, and verify documents.
- Help Assistant — Get rule-based guidance about platform features and personal application information.

🔐 Demo Accounts

Role| Email| Password
Student| "student@vidyasutra.test"| "Student@12345"
Reviewer| "admin@vidyasutra.test"| "Admin@12345"

These are public demo credentials. Do not upload real identity documents or bank details.

🧪 Test Documents

The "test-user/" directory contains fictional specimen documents for testing uploads, OCR verification, and the review workflow.

Test student: Suresh Patil

Document| File
Marks Card| "Suresh_Patil_1_Latest_marks_card.png"
Income Certificate| "Suresh_Patil_2_Income_certificate.png"
Government ID| "Suresh_Patil_3_Government_ID_proof.png"
Caste Certificate| "Suresh_Patil_4_Caste_certificate.png"
Bonafide Certificate| "Suresh_Patil_5_Bonafide_certificate.png"
Domicile Certificate| "Suresh_Patil_6_Domicile_certificate.png"
Bank Passbook| "Suresh_Patil_7_Bank_passbook_front_page.png"
Recommendation Letter| "Suresh_Patil_8_Recommendation_letter.png"

All specimens are fictional and marked SPECIMEN. Match the student's profile to the printed details to test OCR verification.

🛠️ Tech Stack

Layer| Technologies
Frontend| React 19, Vite, Tailwind CSS 4
UI & Animation| Framer Motion, Three.js, Lenis, React Bits
Backend| Node.js, Express 5, Sequelize
Database| PostgreSQL
Authentication| JWT, bcrypt
OCR| Tesseract.js
Email| Nodemailer (optional)
Deployment| Render

🚀 Run Locally

Prerequisites: Node.js 20+ and Docker with Docker Compose, or a running PostgreSQL instance.

git clone https://github.com/ItsShannu44/CBC044.git
cd CBC044

docker compose up -d
npm run setup

cp backend/.env.example backend/.env

Configure "DATABASE_URL" and "JWT_SECRET" in "backend/.env".

Start the backend:

npm run dev:api

In a second terminal, start the frontend:

npm run dev:web

Open http://localhost:5173.

To reload the demo data, run "npm run seed".

☁️ Deployment

VidyaSutra is deployed on Render using "render.yaml".

- Build command: "npm run build"
- Start command: "npm start"
- Health check: "/api/health"
- Database: PostgreSQL

Configure the required environment variables in Render before deploying. Never commit ".env" files or expose production secrets.

🧪 Tests

Run the automated test suite:

npm test

For end-to-end API tests, configure a separate test database using "TEST_DATABASE_URL" before running "npm run test:api" from the "backend/" directory. The API test wipes its target database.

📁 Project Structure

backend/
  src/engine/     Eligibility rules and profile fields
  src/models/     Database models
  src/routes/     API routes
  src/services/   OCR, matching, deadlines, notifications
  test/           Automated tests

frontend/
  src/pages/      Application screens
  src/components/ Shared UI components
  src/lib/        API client and utilities

test-user/        Fictional specimen documents
render.yaml       Render deployment configuration

🔒 Before Production

- Replace sample scholarships with verified official scheme criteria.
- Disable demo seeding and create secure reviewer accounts.
- Configure production secrets and email settings.
- Introduce database migrations and a suitable document-storage strategy.

🙌 Credits

Some UI components are adapted from "React Bits" (https://reactbits.dev) by David Haz, under the terms specified in "LICENSE-react-bits.md".

---

VidyaSutra — Making scholarship discovery simpler, clearer, and more accessible.
Developed by Team FluxWave.
