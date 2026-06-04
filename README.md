# 📬 FutureMail — Backend API

A REST API to schedule messages that are delivered by email at a future date.

## Tech Stack
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL (Supabase free tier)
- **Auth:** JWT
- **Email:** Resend
- **Scheduler:** node-cron (every minute)
- **Deploy:** Render (free tier)

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Create account |
| POST | `/auth/login` | ❌ | Login, get JWT |
| GET | `/auth/me` | ✅ | Get current user |

### Messages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/messages` | ✅ | Create a future message |
| GET | `/messages` | ✅ | List your messages |
| GET | `/messages/:id` | ✅ | Get a single message |
| DELETE | `/messages/:id` | ✅ | Delete a pending message |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Server health check |

---

## Request & Response Examples

### Register
```
POST /auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Login
```
POST /auth/login
{
  "email": "john@example.com",
  "password": "securepassword"
}
→ { user: {...}, token: "eyJ..." }
```

### Create a Message
```
POST /messages
Authorization: Bearer <token>
{
  "title": "Hey future me",
  "body": "I hope you've built something great.",
  "recipient_email": "john@example.com",
  "recipient_name": "Future John",
  "deliver_at": "2026-01-01T09:00:00Z"
}
```

---

## Local Setup

```bash
# 1. Clone and install
npm install

# 2. Copy and fill in env vars
cp .env.example .env

# 3. Run in development
npm run dev
```

---

## Deployment Guide

### Step 1 — Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → New project
2. Once created, go to **Settings → Database**
3. Copy the **Connection string (URI)** — looks like:
   `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`
4. Paste it as `DATABASE_URL` in your env

> Tables are created automatically on first server start via `initDB()`.

---

### Step 2 — Resend (Email)

1. Go to [resend.com](https://resend.com) → Sign up (free: 3,000 emails/month)
2. **API Keys** → Create API key → copy it as `RESEND_API_KEY`
3. **Domains** → Add and verify your domain (or use `onboarding@resend.dev` for testing)
4. Set `FROM_EMAIL` to your verified sender address

---

### Step 3 — Render (Deployment)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your GitHub repo
4. Set these in Render:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add all environment variables from `.env.example` under **Environment**
6. Deploy — Render gives you a free `https://your-app.onrender.com` URL

> ⚠️ Free Render instances spin down after 15 mins of inactivity. The scheduler keeps running while the server is awake. For always-on, upgrade to Render's $7/mo paid tier, or use Render's free **Cron Job** service to ping `/health` every 10 mins.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (Render sets this automatically) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs (use a long random string) |
| `JWT_EXPIRES_IN` | Token expiry e.g. `7d` |
| `RESEND_API_KEY` | Your Resend API key |
| `FROM_EMAIL` | Verified sender email address |
| `FRONTEND_URL` | Your frontend URL for CORS |
