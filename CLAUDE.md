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

**cloudflared / domain**: managed separately by the project owner. It just needs to point its
tunnel's ingress at `http://127.0.0.1:3001` on the same Lightsail instance — no app-side changes
required for that.

## Known limitations (in scope for hackathon judging discussion)

- No authentication/authorization — any client can upload, view, export, or delete any
  non-sample dataset.
- No automated tests.
- `client/src/components/dashboard/DatasetHeader.jsx` (client-side) and
  `server/routes/export.js` (server-side) both implement CSV/JSON export independently; kept
  as-is (both work, removing either was out of scope for this pass).
