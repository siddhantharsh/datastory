# DataStory — Project & Deployment Notes

Hackathon submission for **VISION2WEB**, problem statement 5: *Data Story Dashboard*. Users
upload or select a dataset, get auto-generated KPIs and a narrated "story" (trend, breakdown,
comparison, standouts) built from real statistics computed on the data, then explore it
themselves with filters, a chart builder, a searchable table, and CSV/JSON export.

## Architecture

Three tiers, one repo:

```
client/   React 18 + Vite 5 + Tailwind 4, Recharts (charts), D3 (particle-swarm physics),
          GSAP/Lenis (scroll-driven landing page + Act transitions)
server/   Express 5 + better-sqlite3 (the only persistence layer — no Mongo/Postgres)
sample-datasets/   3 synthetic CSVs (attendance/transport/energy), auto-seeded into SQLite on boot
```

- **No auth, no user accounts** — out of scope for a 2-day hackathon demo. Anyone hitting the
  API can upload/view/export/delete any (non-sample) dataset.
- **No React Router** — `client/src/App.jsx` toggles between `landing` and `dashboard` with a
  single `useState`; no deep-linking.
- **State**: one React Context, `client/src/context/DatasetContext.jsx` — holds the active
  dataset, loading/error state, and `constellationFilter` (the cross-filter driven by clicking a
  particle in the swarm view; name is a holdover from an earlier "ConstellationView" component
  that was replaced by `ParticleSwarm.jsx`).
- **The dashboard** (`client/src/pages/DashboardPage.jsx`) is a 7-"Act" scroll-driven narrative
  (`IntersectionObserver`-tracked): KPI cards → particle swarm → trend/breakdown/comparison
  charts with auto-generated narrative text → standouts tables → a free-form explorer (filters,
  chart builder, searchable/paginated table, per-column analytics summary).
- **Story generation** (`client/src/utils/storyGenerator.js`) computes real Pearson correlation,
  least-squares trend slope, category aggregation, and top/bottom-5 ranking over whatever CSV was
  uploaded — not canned copy. Column types (numeric/categorical/date) are auto-detected in
  `client/src/utils/smartDetector.js` by sampling up to 300 rows.
- **API** (`server/routes/`): `dataset.js` (list/get/delete), `upload.js` (multer + PapaParse →
  SQLite), `export.js` (stream CSV/JSON of a stored dataset). `server/db.js` creates the schema
  and seeds `sample-datasets/*.csv` into SQLite on first boot if not already present.

## Local development

```bash
# one-time setup
cd server && npm install && cd ../client && npm install && cd ..
npm run seed          # optional: (re)populate SQLite from sample-datasets/ directly

# two terminals
npm run dev:server    # Express on :3001
npm run dev:client    # Vite dev server on :5173, proxies /api -> :3001
```

Open `http://localhost:5173`. `server/data.db` and `server/uploads/` are created on disk and are
git-ignored (see "Repo hygiene" below).

## Repo hygiene notes

A prior "moved files to root" commit deleted the project's `.gitignore` and left a binary SQLite
DB and uploaded CSVs committed to git. This has been fixed: `.gitignore` is restored, and the
committed DB/uploads were removed (the server re-seeds sample data from `sample-datasets/`
automatically, so nothing demo-critical was lost). Known fixed issues, for context:

- **Stored XSS via CSV upload**: dashboard narratives are rendered with `dangerouslySetInnerHTML`;
  CSV-derived values (category names, dates, column headers) are now escaped in
  `storyGenerator.js` before interpolation.
- **Stale filter bug**: clicking a particle in the swarm view (Act 2) could desync from Act 7's
  filters/table due to an incomplete `useMemo` dependency array in `DashboardPage.jsx`.

## CSV robustness

The app is designed to work on **any** uploaded CSV, not just the 3 bundled samples — column types
(numeric/categorical/date) are auto-detected by shape, not by column name. A hardening pass fixed
several real gaps found by auditing the upload → parse → store → detect → visualize pipeline:

- **Ingestion** (`server/routes/upload.js`, `server/db.js`): the column list is now read from
  Papaparse's `meta.fields` (the actual header row) instead of the first data row's keys, which
  previously lost columns entirely on a ragged CSV. Parse errors are surfaced as non-fatal
  `warnings` instead of discarded; wrong-file-type/oversized uploads now return 400/413 instead of
  a generic 500; the temp upload file is deleted once its rows are in SQLite.
- **Detection** (`client/src/utils/csvHelpers.js`, `smartDetector.js`, `storyGenerator.js`):
  `parseNumericValue()` strips currency symbols/thousands separators/`%` so formatted numbers
  (`"$1,234.56"`, `"45%"`) are recognized as numeric. `detectDateFormat()`/`parseDateValue()`
  resolve a column's date format (ISO / DD-MM-YYYY / MM-DD-YYYY / month-name / unix timestamp)
  **once per column** from a sample, rather than guessing per value — a lone `new Date(...)` call
  can't tell "03/04/2024" apart from "13/04/2024" and silently swaps day/month for the former.
  Fully-empty columns are excluded from chart axes rather than shown as selectable-but-empty.
- **Upload UX** (`UploadModal.jsx`): file size is checked client-side before uploading; parse
  warnings from the server are shown in the modal instead of silently dropped.

Known, intentionally deferred: non-UTF-8 (e.g. Windows-1252) file encoding isn't sniffed — a
cosmetic mojibake risk on a minority of exports, not a structural one, and fixing it needs a new
dependency for low marginal value in a hackathon-scoped app.

## Scroll feel & mobile

- **Scroll feel**: Lenis's smoothing (`useLenis.js`) was tuned down from a 1.2s expo-out curve to
  0.8s cubic-out, and each dashboard Act's CSS reveal transition shortened from 700ms to 300ms —
  the two were stacking into a near-1-second lag between input and motion. The Act
  reveal/hide state (`DashboardPage.jsx`) is now symmetric on scroll-up as well as scroll-down.
- **Mobile**: the Particle Swarm (`ParticleSwarm.jsx`) had zero touch support (mouse-only) — it now
  handles tap-to-filter with the same hit-testing as desktop hover/click. Act sections use `dvh`
  instead of `vh` so the mobile browser's collapsing address bar doesn't cause layout jumps. Act
  7's sidebar collapse toggle (which only affected anything at the `lg` breakpoint) is hidden below
  it, and the sidebar itself is reordered to render after the charts/table on mobile. The three
  landing-page GSAP pinned-scroll sections skip pinning below ~768px, where a multi-screen-height
  pinned scroll is disproportionate and fights the mobile browser's dynamic toolbar.

## Docker

Single image, single container, single port — serves both the API and the built React app (so a
single `cloudflared` tunnel can front the whole app).

```bash
# build for your own machine's architecture (fast, for local testing)
docker build -t datastory:local-test .
docker run --rm -p 3001:3001 datastory:local-test
curl http://localhost:3001/api/health

# or via compose (also runs it with the same config used in production)
docker tag datastory:local-test datastory:latest
docker compose up -d
```

Notes on the `Dockerfile`:
- Multi-stage: build the client → install server prod deps → copy both into a slim runtime image.
- Base image is `node:22-bookworm-slim` (glibc + Node 22, matching `better-sqlite3`'s declared
  `engines.node >=22`), **not** alpine — alpine's musl libc has no matching prebuilt binary for
  `better-sqlite3`, and glibc doesn't either at this version, so it compiles from source via
  node-gyp. The `python3`/`make`/`g++` toolchain needed for that only exists in the discarded
  `server-deps` build stage, not the final ~93MB runtime image.
- Runtime container drops from root to an unprivileged `appuser`.
- `DATA_DIR` (default `/app/data` in the container) controls where `data.db` and `uploads/` live,
  so a single volume mount persists both across redeploys.

## Deploying to AWS Lightsail

The target instance is small (**~412MiB total RAM**, Ubuntu 24.04, Docker + Compose already
installed) and already runs another container (an unrelated Discord bot, ~15–20MiB). Because of
that:
- **Never build the image on the instance itself** — `npm install`/compiling `better-sqlite3`
  there risks OOM or extreme slowness. Build locally and ship the finished image instead.
- The instance is `amd64`; a local Apple Silicon Mac is `arm64`, so cross-build with `buildx`.
- The container binds to `127.0.0.1:3001` only (not a public port) — `cloudflared` will run on the
  same box and tunnel to that loopback address, so the app is never directly exposed to the
  internet without going through the tunnel/domain.

Deploy (from a machine with an `ssh lightsail` alias configured and Docker Desktop running):

```bash
# 1. Build for the remote's architecture
docker buildx build --platform linux/amd64 -t datastory:latest --load .

# 2. Ship the image over SSH (no registry needed)
docker save datastory:latest | ssh lightsail docker load

# 3. First time only: copy the compose file up
scp docker-compose.yml lightsail:~/datastory/docker-compose.yml

# 4. Start (or restart onto the newly loaded image)
ssh lightsail 'cd ~/datastory && docker compose up -d'

# 5. Verify
ssh lightsail 'docker ps; curl -s 127.0.0.1:3001/api/health; docker stats --no-stream'
```

**Redeploying after a code change**: repeat steps 1, 2, and 4 (`docker compose up -d` picks up the
newly loaded `datastory:latest` image and recreates the container; the named volume keeps the
database/uploads). No code changes are needed on the box itself.

## Domain routing (Cloudflare Tunnel)

The app is reachable at **https://datastory.manojsrivatsava.com**. `cloudflared` runs on the same
Lightsail instance as a systemd service (`systemctl status cloudflared`) and tunnels that hostname
to the container's port:

```
datastory.manojsrivatsava.com  --(cloudflared tunnel)-->  http://127.0.0.1:3001
```

This is the same loopback port the `docker-compose.yml` container binds — nothing else needs to
change on the app side. `cloudflared`'s ingress rule lives in `/etc/cloudflared/config.yml` on the
instance and maps that one hostname to that one port; it runs independently of the app container,
so redeploying the app (`docker compose up -d`) never touches the tunnel, and restarting the
tunnel (`sudo systemctl restart cloudflared`) never touches the app. If the app's port ever
changes, update the `service:` line in that config and restart the `cloudflared` service.

## Known limitations (in scope for hackathon judging discussion)

- No authentication/authorization — any client can upload, view, export, or delete any
  non-sample dataset.
- No automated tests.
- `client/src/components/dashboard/DatasetHeader.jsx` (client-side) and
  `server/routes/export.js` (server-side) both implement CSV/JSON export independently; kept
  as-is (both work, removing either was out of scope for this pass).
