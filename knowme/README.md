# KnowMe — What Do You Really Think?

An interactive quiz game where friends answer opinion questions about you. Built with a Go backend and a vanilla JS frontend.

## Quick Start (Local)

```bash
cd knowme
make run
```

Open [http://localhost:8081](http://localhost:8081)

### API Endpoints

| Method | Endpoint           | Description                              |
|--------|----------------------|------------------------------------------|
| GET    | `/`                  | Game homepage                            |
| GET    | `/health`            | Health check                             |
| GET    | `/api/config`        | Game metadata (host name, title, etc.)   |
| GET    | `/api/questions`     | Question list (no correct answers)       |
| POST   | `/api/play`          | Submit player name + answers             |
| GET    | `/api/responses`     | All saved player responses (see below)   |
| GET    | `/static/*`          | CSS, JS assets                           |

---

## Project Structure

```
knowme/
├── cmd/
│   ├── server/main.go          # Go server entry point
│   └── staticexport/main.go    # Builds public/ for GitHub Pages
├── internal/
│   ├── api/server.go           # HTTP routes & handlers
│   ├── game/
│   │   ├── config.go           # Host name, title, subtitle
│   │   ├── questions.go        # Questions, options, scoring
│   │   └── errors.go           # Validation errors
│   └── store/store.go          # Persists responses to JSON file
├── web/
│   ├── templates/index.html    # Game UI shell
│   └── static/
│       ├── css/style.css       # Styles & animations
│       └── js/game.js          # Play flow, dodge logic, splashes
├── data/
│   └── responses.json          # Saved player responses (local, gitignored)
├── Dockerfile                  # Container build for Fly/Railway
├── .github/workflows/static.yaml  # GitHub Pages deploy (like gyanankur.dev)
├── Makefile                    # run, build, export, test
├── go.mod
└── README.md
```

---

## How It Works

1. A floating **Play** button invites visitors to start.
2. They enter their **name** on a banner modal.
3. They answer **8 binary questions** (Good/Bad style) about you.
4. Negative options **run away** with a 😏 splash; picking Good shows ☺️.
5. They see a results screen with their vibe score and breakdown.

---

## Viewing Responses (Player Names + Answers)

**There is no database.** Responses are stored in a **JSON file** on disk.

| Setting      | Default                  | Description                    |
|--------------|--------------------------|--------------------------------|
| `DATA_PATH`  | `./data/responses.json`  | File where all responses live  |

Each time someone finishes the game, a record is appended with:

- **Player name**
- **Score** and tier (e.g. Certified Fan)
- **Wrong answer attempts** — how many times they tried to click a runaway negative button
- **Every answer** they picked (question + label)
- **Timestamp** (`playedAt`)

### Locally

After someone plays, open the file:

```bash
cat data/responses.json
```

Or hit the API:

```bash
curl -s http://localhost:8081/api/responses | python3 -m json.tool
```

Example record:

```json
{
  "id": "0eb5caa8f029a04e",
  "player": "Alex",
  "score": 8,
  "total": 8,
  "wrongAttempts": 14,
  "tier": {
    "title": "Solid Supporter",
    "message": "Mostly positive vibes. I appreciate you!",
    "emoji": "🙌"
  },
  "breakdown": [
    {
      "questionId": "q1",
      "questionText": "How do you think Gyanankur is — a good person or a bad person?",
      "emoji": "😇",
      "chosenOptionId": "good",
      "chosenLabel": "Good",
      "positive": true
    }
  ],
  "playedAt": "2026-05-26T09:31:00Z"
}
```

### When Live (Production)

Once deployed, visit:

```
https://YOUR-DOMAIN/api/responses
```

Or SSH into your host and read the file (path depends on `DATA_PATH`):

```bash
# Example on Fly.io with a mounted volume at /app/data
fly ssh console -a your-app-name
cat /app/data/responses.json
```

> **Important:** On most cloud hosts (Fly.io, Railway, Render), the filesystem is **ephemeral** — responses are **lost on redeploy** unless you attach persistent storage.
>
> **Fly.io volume (recommended):**
> ```bash
> fly volumes create knowme_data --size 1 --region your-region
> # Mount it at /app/data in fly.toml, set DATA_PATH=/app/data/responses.json
> ```

> **Security note:** `/api/responses` is currently **public** (no auth). Before going live, consider restricting it (basic auth, IP allowlist, or a secret query token).

---

## Customize Questions

Edit `internal/game/questions.go` — update question text, options, and mark negative options with `Evasive: true`.

Edit `internal/game/config.go` to change the host name, title, and subtitle.

---

## Hosting Publicly

### Option A: GitHub Pages (same flow as gyanankur.dev)

This is the recommended path if you already use GitHub Pages for gyanankur.dev.

1. Push the **whole `knowme/` folder** to GitHub (repo root = where `go.mod` lives)
2. Enable **GitHub Pages** → Source: **GitHub Actions**
3. Push to `main` — the workflow builds a static site and deploys `public/`

```bash
cd knowme
git init
git add .
git commit -m "Initial KnowMe game"
git branch -M main
git remote add origin https://github.com/YOUR_USER/knowme.git
git push -u origin main
```

**Workflow:** `.github/workflows/static.yaml` runs:

```bash
go run ./cmd/staticexport   # builds public/index.html + public/static/
```

**If knowme is in a subfolder** of a monorepo (e.g. `dev/knowme/`), set in `static.yaml`:

```yaml
env:
  SITE_DIR: knowme
```

**Test the export locally before pushing:**

```bash
make export
# open public/index.html via a local server, e.g.:
python3 -m http.server 8082 --directory public
```

| GitHub Pages | Go server (`make run` / Fly.io) |
|--------------|----------------------------------|
| Game works ✅ | Game works ✅ |
| Questions baked into `game-data.json` | Questions served from API |
| Responses saved in **browser localStorage only** | Responses saved to **`responses.json`** centrally |
| No `/api/responses` endpoint | `GET /api/responses` lists all players |

On GitHub Pages, you **won't** see other people's names/answers centrally — each browser stores its own plays in `localStorage`. For a shared response log, use the Go server deploy (Option B below).

---

### Option B: Go server (Fly.io / Railway / Render)

Use this if you want **one place to read everyone's responses** (name, score, wrong attempts, answers).

| What | Role |
|------|------|
| **GitHub** | Stores your **source code** |
| **Fly.io / Railway / Render** | Runs the Go server and writes **`responses.json`** on the host |

When deployed with a **persistent volume**, every play appends to `responses.json` with name, score, wrong attempts, answers, and timestamp.

Without a volume, responses survive while the app is running but can be **lost on redeploy**.

### Push to GitHub (for either option)

```bash
brew install flyctl
fly auth login

cd knowme
fly launch          # Say NO to Postgres
fly deploy
```

Your app will be live at `https://knowme.fly.dev` (or similar).

**Persist responses across deploys:**

```bash
fly volumes create knowme_data --size 1
```

Add to `fly.toml`:

```toml
[mounts]
  source = "knowme_data"
  destination = "/app/data"
```

Set env: `DATA_PATH=/app/data/responses.json`

### Option 2: Railway

1. Push repo to GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Railway auto-detects the Dockerfile
4. Set env vars: `PORT=8081`, `DATA_PATH=/app/data/responses.json`
5. Add a **Volume** mounted at `/app/data` so responses survive redeploys

### Option 3: Render

1. Push to GitHub
2. [render.com](https://render.com) → New Web Service → Docker
3. Health check path: `/health`
4. Add a **Persistent Disk** mounted at `/app/data`

---

## Docker (Manual)

```bash
docker build -t knowme .
docker run -p 8081:8081 -v knowme-data:/app/data knowme
```

Responses will persist in the Docker volume `knowme-data`.

---

## Environment Variables

| Variable    | Default                   | Description                         |
|-------------|---------------------------|-------------------------------------|
| `PORT`      | `8081`                    | HTTP listen port                    |
| `DATA_PATH` | `./data/responses.json`   | JSON file for storing all responses |

---

## Development

```bash
make run    # Start Go server (saves responses to data/responses.json)
make export # Build static site into public/ for GitHub Pages
make build  # Build binary to bin/knowme
make test   # Run Go tests
```

---

## License

Personal project — all rights reserved © Gyanankur Dey
