# CroX Project - Startup Guide

Here are the commands you need to start the frontend and backend services for this project.

## 1. Start the Backend (Django)

The backend is built with Django and uses a Python virtual environment. Open a new terminal window and run:

```bash
# 1. Navigate to the backend directory
cd /home/ayush/Desktop/MonadProj/apps/backend

# 2. Activate the virtual environment
source venv/bin/activate

# 3. Apply any pending migrations (optional, but good practice)
python manage.py migrate

# 4. Start the Django development server
python manage.py runserver
```
*The backend API will be available at `http://localhost:8000`.*

---

## 2. Start the Frontend (Next.js)

The frontend is a Next.js application that runs on port 3000. Open a **second** terminal window and run:

```bash
# 1. Navigate to the web (frontend) directory
cd /home/ayush/Desktop/MonadProj/apps/web

# 2. Wait for dependencies to install (if you haven't already run install)
# npm install

# 3. Start the Next.js development server
npm run dev
```

*The frontend application will be available at `http://localhost:3000`.*

---

## Quick Start Scripts

If you want to start both together in one terminal (in the background), you can run this combined command from the root folder `/home/ayush/Desktop/MonadProj`:

```bash
# Start Backend in background
cd apps/backend
source venv/bin/activate
python manage.py runserver &

# Start Frontend in background
cd ../web
npm run dev &
```

*(Note: If you run them in the background, you can stop them later with `pkill -f "runserver"` and `pkill -f "next dev"`).*
