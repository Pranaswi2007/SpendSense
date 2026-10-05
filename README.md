# SpendSense — Setup Guide

Full-stack personal finance app.  
**Frontend:** HTML + CSS + Vanilla JS  
**Backend:** Node.js + Express  
**Database:** MongoDB (Atlas or local)

---

## Prerequisites

Install these before starting:

| Tool | Download |
|---|---|
| Node.js (v18+) | https://nodejs.org |
| MongoDB Atlas (free) | https://mongodb.com/atlas |

---

## Step 1 — Get a free MongoDB database

1. Go to **https://mongodb.com/atlas** and create a free account
2. Create a free **M0** cluster (takes ~2 minutes)
3. Under **Database Access** → Add a new user with a username + password
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all — for development)
5. Click **Connect** → **Drivers** → copy the connection string  
   It looks like:  
   `mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/`

---

## Step 2 — Configure the backend

Open `backend/.env` and paste your connection string:

```
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/spendsense
JWT_SECRET=pick_any_long_random_string_here
JWT_EXPIRES_IN=30d
PORT=5000
CLIENT_ORIGIN=*
```

---

## Step 3 — Install dependencies and start the server

Open a terminal in the `backend` folder:

```bash
cd backend
npm install
npm run dev
```

You should see:
```
SpendSense API running on http://localhost:5000
MongoDB connected: cluster0.xxxxx.mongodb.net
```

---

## Step 4 — Open the website

Open your browser and go to:

```
http://localhost:5000
```

The server serves the frontend files automatically.  
You can also open `index.html` directly in the browser — but login/register requires the server to be running.

---

## Folder Structure

```
PBL/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   └── auth.js            # JWT auth middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Expense.js
│   │   ├── Budget.js
│   │   ├── Goal.js
│   │   └── Reminder.js
│   ├── routes/
│   │   ├── auth.js            # register, login, profile
│   │   ├── expenses.js
│   │   ├── budgets.js
│   │   ├── goals.js
│   │   ├── reminders.js
│   │   └── salary.js
│   ├── .env                   # your secrets (never commit this)
│   ├── package.json
│   └── server.js              # entry point
│
├── index.html                 # landing page
├── auth.html                  # login / register
├── dashboard.html
├── expenses.html
├── budget.html
├── goals.html
├── tips.html
├── settings.html
├── auth.js                    # calls API for login/register
├── utils.js                   # API client + shared helpers
└── styles.css
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update name/avatar |
| PUT | `/api/auth/password` | Change password |
| DELETE | `/api/auth/account` | Delete account + all data |
| GET | `/api/expenses?month=9&year=2026` | Get expenses |
| POST | `/api/expenses` | Add expense |
| PUT | `/api/expenses/:id` | Edit expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/budgets` | Get all budgets |
| POST | `/api/budgets` | Add budget |
| POST | `/api/budgets/replace` | Replace all (Smart Planner) |
| PUT | `/api/budgets/:id` | Edit budget |
| DELETE | `/api/budgets/:id` | Delete budget |
| GET | `/api/goals` | Get all goals |
| POST | `/api/goals` | Add goal |
| PATCH | `/api/goals/:id/add-funds` | Add savings to goal |
| PUT | `/api/goals/:id` | Edit goal |
| DELETE | `/api/goals/:id` | Delete goal |
| GET | `/api/reminders` | Get reminders |
| POST | `/api/reminders` | Add reminder |
| PATCH | `/api/reminders/:id/pay` | Mark as paid |
| DELETE | `/api/reminders/:id` | Delete reminder |
| GET | `/api/salary` | Get salary |
| PUT | `/api/salary` | Update salary |

---

## What gets stored in MongoDB

Every user gets their own isolated data:

- **Users collection** — name, email (hashed password), avatar, salary
- **Expenses collection** — all transactions, linked to user by ID
- **Budgets collection** — category limits, alert thresholds
- **Goals collection** — financial goals with saved amounts
- **Reminders collection** — payment reminders with due dates

All data is automatically separated per user — no user can see another's data.
