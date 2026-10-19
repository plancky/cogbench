# CogBench

A personal cognitive benchmark suite for tracking your own performance over time: Digit Span, Corsi,
2-back, Word Recall (immediate and delayed), PVT and Stroop. It is not a diagnostic tool.

## Setup
Requires [Bun](https://bun.sh) 1.3+. The backend uses Bun's built-in `bun:sqlite`.

```sh
bun install
```

## Run
```sh
bun run dev                      # Vite on :5173 (proxies /api) + API on :5174, with reload
bun run build && bun run start   # serve the built app from the API server on http://127.0.0.1:5174
```
The database is created and migrated on startup at `./data/cogbench.db` (override with `DB_PATH`).

## LAN access
The server binds to `127.0.0.1` by default. To use it from your phone, expose it on your LAN:
```sh
HOST=0.0.0.0 PORT=8080 bun run start   # then open http://<this-machine's-ip>:8080
```
There is no authentication, so only do this on a network you trust.

## Back up your data
- **File copy:** stop the server, then copy `data/cogbench.db` (plus any `-wal`/`-shm` files next to it).
  Or, while it is running: `sqlite3 data/cogbench.db ".backup cogbench-$(date +%F).db"`.
- **JSON:** use Tracking → Data → *Download backup* (`GET /api/backup`). Restore it there or with
  `POST /api/restore`, which replaces all data.
- **CSV:** use Tracking → Log → *Download CSV* (`GET /api/export/csv`, long format).

## Tests
```sh
bun run test       # unit + API tests (bun test, temporary SQLite files)
bun run test:e2e   # build, then Playwright smoke tests using ?fast=1 (uses system Chrome)
```
