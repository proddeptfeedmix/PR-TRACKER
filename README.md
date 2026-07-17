# Purchase Requisition (PR) Tracker

A purchase requisition tracker for a multi-plant manufacturing operation — dashboard,
searchable/filterable requisition list, per-item status tracking, CSV/PDF exports,
and light/dark mode. Built as a **static site** (plain HTML/CSS/JS, no build step,
no server) so it can be hosted for free on GitHub Pages.

## Important: how data is stored

GitHub Pages only serves static files — it cannot run a backend or a real database
like SQLite. So this version stores everything in the **browser's local storage**:

- Data lives only in the browser/device it was entered on. It is **not** shared
  between people or devices, and clearing browser data or using a different
  browser/device shows a different, empty dataset.
- The login screen is a **role selector**, not real server-side security — anyone
  with browser dev tools can read the stored data. Treat this as an internal
  convenience tool, not a system for genuinely sensitive data.
- Use **Reports & Export → Backup & restore** to download a `.json` snapshot
  regularly and to move data between devices.

If you outgrow this and need multi-device sync, real authentication, or a shared
SQLite/Postgres database, that requires an actual backend (e.g. deployed on
Render, Railway, or similar) — a natural next step, just not something GitHub
Pages alone can host.

## Default accounts

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | Administrator — all plants, user management, delete |
| `plant1` | `plant1` | Plant 1 |
| `plant2` | `plant2` | Plant 2 |
| `plant3` | `plant3` | Plant 3 |
| `plant4` | `plant4` | Plant 4 |

Everyone can change their own username/password from **Settings**. Admins can
reset any account's credentials from **Settings → User accounts**.

## Features

- Dashboard: totals by status, average waiting days, completion %, 6-month trend, recent activity
- Requisition list: instant search, filters (plant, status, requester, date range, waiting >30 days)
- Requisition detail: general info, line items with quantities/UOM/issue status, PR-form and item photos
- Overall status is auto-derived from item statuses (with a visual stage tracker)
- Duplicate PR-number prevention, confirmation dialogs before delete
- Reports & Export: CSV (opens in Excel), print, PDF (via the browser's print dialog), by plant/month/year/status/entire database
- Light/dark mode, company name + logo branding, activity log (admin)

## Run it locally

No install needed — just open `index.html` in a browser. If your browser
blocks local file access for scripts, serve it instead:

```bash
cd pr-tracker
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new GitHub repository and push this folder's contents to it:
   ```bash
   cd pr-tracker
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose `main` and folder `/ (root)`, then **Save**.
5. Wait a minute, then visit `https://<your-username>.github.io/<your-repo>/`.

## Project structure

```
pr-tracker/
├── index.html          # app shell (login screen + main layout)
├── css/styles.css       # design tokens + all styling
├── js/
│   ├── constants.js     # statuses, plants, default accounts
│   ├── storage.js        # localStorage read/write helpers
│   ├── utils.js           # dates, calculations, CSV/JSON export, image resize
│   ├── seed.js            # first-run sample data
│   ├── auth.js             # login/session + account management
│   ├── dashboard.js        # dashboard view
│   ├── prlist.js            # searchable/filterable requisition list
│   ├── prmodal.js           # create/edit requisition modal
│   ├── reports.js           # Reports & Export page
│   ├── settingsview.js      # account, branding, users, activity log
│   └── main.js               # app state, routing, modal system, init
└── README.md
```
