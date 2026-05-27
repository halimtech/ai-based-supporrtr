# 🌐 Deploy Core Delight to Render (Free)

This guide explains how to host the app online with a **persistent PostgreSQL database** so team data (users, rooms, votes, messages) survives redeploys and service sleeps.

---

## Prerequisites

1. **Push this project to GitHub**
   - Create a new repository on GitHub
   - Upload/push all files (including `backend/`, `frontend/`, `build.sh`, `render.yaml`)

---

## Option 1: Deploy via Blueprint (Recommended)

The `render.yaml` file in this repo tells Render to create both a **web service** and a **free PostgreSQL database** automatically.

1. Go to **[render.com](https://render.com)** and sign up / log in
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Render reads `render.yaml` and sets up:
   - A **PostgreSQL database** (`core-delight-db`) — persistent storage
   - A **Web Service** (`core-delight`) — runs the app
5. Click **Apply**
6. Wait 3–5 minutes for the build
7. Done! Your URL will be `https://core-delight.onrender.com`

---

## Option 2: Deploy via Render Dashboard (Manual)

If you prefer manual setup:

1. **Create a PostgreSQL database**
   - In Render dashboard, click **New +** → **PostgreSQL**
   - Name: `core-delight-db`
   - Plan: **Free**
   - Region: **Frankfurt** (or match your web service region)
   - Create and copy the **Internal Database URL**

2. **Create a Web Service**
   - Click **New +** → **Web Service**
   - Connect your GitHub repo
   - Configure:
     - **Name**: `core-delight`
     - **Runtime**: `Python 3`
     - **Build Command**: `bash build.sh`
     - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - **Plan**: Free
   - Add environment variable:
     - `DATABASE_URL` = paste the Internal Database URL from step 1

3. Click **Create Web Service**

---

## ⚠️ Important Notes

- **Persistent data**: With the included PostgreSQL database, all users, rooms, messages, ratings, and weights are **persisted** across redeploys and sleeps.
- **Sleeping**: Free web services still go to sleep after 15 minutes of inactivity. The first request after sleep may take 30–60 seconds to wake up, but your data remains safe.
- **Database size**: Render's free PostgreSQL tier includes **1 GB** of storage — plenty for a team demo.
- **CORS**: Already configured to allow all origins (`*`), so the deployed app works without issues.

---

## 🔗 After Deployment

- **App URL**: `https://core-delight.onrender.com`
- **API Docs**: `https://core-delight.onrender.com/docs`

---

## 🆘 Troubleshooting

### "Module not found" errors
Make sure `requirements.txt` is in the `backend/` folder and pushed to GitHub.

### Frontend shows blank page
Make sure `frontend/dist/` was built. The `build.sh` script handles this on Render.

### Database connection errors
Check that the `DATABASE_URL` environment variable is set correctly in your Render service settings.

---

**Done! Your app is now live with persistent storage.** 🚀
