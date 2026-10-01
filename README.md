# STEM Outreach for School Children

A full-stack web application that runs STEM outreach activities for school students
(Computational Thinking, Coding, Logic, Problem Solving, Science, Technology) and measures how
effective they are with a **Pre-Assessment** and a **Post-Assessment**.

**Tech stack:** HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js | Node.js, Express.js | MongoDB + Mongoose | bcrypt (bcryptjs), JWT, OTP

---

## 1. What you need to install (one time)

| Software | Download | Check it works |
|---|---|---|
| Node.js (LTS version 18 or newer) | https://nodejs.org | open a terminal and type `node -v` |
| MongoDB Community Server | https://www.mongodb.com/try/download/community | see Step 2 |
| Google Chrome + VS Code | already installed | |

An internet connection is needed to load Bootstrap and Chart.js (they come from a CDN).

## 2. Start MongoDB

- When you install MongoDB Community on Windows, choose **"Install MongoDB as a Service"**. It then starts automatically.
- If it is not running, open **Command Prompt as Administrator** and type: `net start MongoDB`
- Optional: install **MongoDB Compass** (offered in the installer) to look at your data. Connect to `mongodb://127.0.0.1:27017`.
- No local MongoDB? Use a free MongoDB Atlas cluster and put its connection string in `MONGO_URI` (Step 4).

## 3. Open the project in VS Code

1. Unzip `STEM-Outreach.zip`.
2. VS Code > **File > Open Folder** > choose the `STEM-Outreach` folder (the one that contains `package.json`).
3. Open the terminal: **Terminal > New Terminal**.

## 4. Install and set up (one time)

Type these commands one by one in the VS Code terminal:

```
npm install
copy server\.env.example server\.env
npm run seed
```

- `npm install` downloads the libraries.
- `copy ...` creates your settings file `server/.env` (you can open it and change `JWT_SECRET`).
- `npm run seed` creates the **admin account** and **15 sample STEM activities** in MongoDB.
  You should see: `Admin created ...` and `Activities added: 15`.

### Shortcut (optional): double-click files instead of typing commands
- `setup.bat` does Step 4 for you (creates `server\.env`, installs libraries, seeds the database).
- `start.bat` starts the server and opens Chrome at http://localhost:5000.

## 5. Run the project

```
npm start
```

You should see: `MongoDB connected` and `Server running. Open Google Chrome and go to: http://localhost:5000`

Now open **Google Chrome** and go to **http://localhost:5000**. The **Login page** opens first.
(Frontend and backend run together on the same port 5000, so there is nothing else to start.)
Stop the server with `Ctrl + C`.

## 6. Login details

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@stem.com` | `Admin@123` |
| **Student** | create one with *Create New Account* | your own |

The admin email and password come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env` (used when you run `npm run seed`).

## 7. Demo flow (for your teacher)

1. Login page > **Create New Account** > fill details (photo optional) > **Send OTP**.
2. **OTP:** look at the VS Code terminal where the server runs, find the box `DEVELOPMENT OTP`, type the 6 digits.
   (With `DEV_SHOW_OTP=true` the OTP is also shown in a yellow box on the page.) Then **Login**.
3. Student Dashboard > **Start Assessment** > take the **Pre-Assessment** (10 questions).
4. **Activities** > complete at least **3** activities (score and answer review are shown).
5. **Assessment** > take the **Post-Assessment** (unlocks after 3 activities).
6. **Progress** shows 4 charts. **Certificate** > *Download Certificate (PDF)* (choose "Save as PDF").
7. **Profile**: edit details, change photo, change password.
8. Logout, then login as **admin** to see the Admin Dashboard, Students, Activities (add / edit / delete), Results and Reports (with **Export CSV**).

**Forgot password:** Login > Forgot Password > email > OTP (terminal) > new password.

## 8. Folder structure

```
STEM-Outreach/
├── package.json            project info + libraries + commands
├── README.md               this file
├── client/                 the website (what Chrome shows)
│   ├── index.html          always redirects to the Login page
│   ├── login.html  register.html  verify-otp.html  forgot-password.html  reset-password.html
│   ├── dashboard.html  profile.html  activities.html  activity.html
│   ├── assessment.html  progress.html  certificate.html
│   ├── admin/              dashboard, students, activities, results, reports
│   ├── css/style.css       Space Explorer theme
│   └── js/
│       ├── common.js       shared helpers: login state, API calls, navbar, charts
│       ├── auth.js         login / register / OTP / forgot / reset pages
│       ├── student.js      all student pages
│       └── admin.js        all admin pages
└── server/                 the backend
    ├── server.js           starts Express, connects MongoDB, serves the website
    ├── seed.js             creates admin + 15 activities
    ├── .env.example        settings template
    ├── config/             db.js (MongoDB), constants.js (categories, rules)
    ├── models/             User, Activity, Result, Assessment, Otp, Certificate
    ├── controllers/        authController, studentController, assessmentController, adminController
    ├── routes/             auth.js, student.js, admin.js
    ├── middleware/         auth.js (JWT + role protection), errorHandler.js
    └── utils/              otp.js, progress.js, validate.js, assessment questions ...
```

## 9. Main features and rules

- **Passwords** are hashed with bcrypt (the `bcryptjs` package: same algorithm, but installs on Windows without build tools).
- **JWT** token (7 days) protects every private route. **Admin routes** also check `role = admin`, so students cannot open them.
- **OTP:** 6 digits, valid **10 minutes**, stored hashed, max 5 wrong tries, old OTP is replaced when a new one is requested.
  To send real emails fill `EMAIL_USER` and `EMAIL_PASSWORD` in `server/.env` (Gmail app password). No code change needed.
- **Assessments:** one Pre and one Post per student. Correct answers stay on the server. Post unlocks after the Pre and **3 completed activities**.
- **Certificate** unlocks after the Post-Assessment and 3 completed activities. Both numbers are in `server/config/constants.js` (`MIN_ACTIVITIES_FOR_POST`).
- **Improvement %** = `((Post - Pre) / Pre) x 100`. Example: Pre 50%, Post 80% gives **60%** (which is **+30 percentage points**; both are shown).
  If Pre is 0 the formula cannot divide, so the Post percentage is shown as the gain and marked "pre-score was 0".
- Retaking an activity replaces the old score for that activity.

## 10. REST API summary

| Method | URL | Who |
|---|---|---|
| POST | /api/auth/register, /verify-otp, /resend-otp, /login, /forgot-password, /reset-password | everyone |
| GET / PUT | /api/profile | logged in |
| PUT | /api/profile/password | logged in |
| GET | /api/activities, /api/activities/:id | student |
| POST / GET | /api/results | student |
| GET | /api/assessment/status, /api/assessment/questions?type=pre\|post | student |
| POST | /api/assessment | student |
| GET | /api/progress, /api/certificate | student |
| GET | /api/admin/stats, /students, /students/:id, /results, /activities, /reports, /reports/csv | admin |
| DELETE | /api/admin/students/:id | admin |
| POST / PUT / DELETE | /api/admin/activities, /api/admin/activities/:id | admin |

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `MongoDB connection FAILED` | MongoDB is not running. Run `net start MongoDB` (Administrator), then `npm start` again. |
| `JWT_SECRET is missing` | You skipped `copy server\.env.example server\.env`. |
| `'npm' is not recognized` | Install Node.js, then close and reopen VS Code. |
| `running scripts is disabled on this system` (PowerShell) | Type `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and press Y, or open a **Command Prompt** terminal (the `+ v` arrow in the VS Code terminal > Command Prompt). |
| `Port 5000 already in use` | Change `PORT=5001` in `server/.env` and open `http://localhost:5001`. |
| Page looks plain / charts missing | No internet (Bootstrap and Chart.js load from a CDN). |
| I do not see the OTP | Look at the terminal where `npm start` is running, not the browser. |
| Want a clean database | In Compass, delete the `stem_outreach` database, then run `npm run seed` again. |
