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

- **Real per-user accounts** (`server/auth.js`) — email+password signup/login, JWT session cookie,
  per-dataset ownership and sharing. Replaced an earlier shared-passcode Editor/Viewer gate that
  didn't actually restrict *who could see* an uploaded dataset (see "Accounts, ownership & sharing"
  below).
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
git-ignored (see "Repo hygiene" below). To upload a dataset, click "Log in" in the dashboard nav
and sign up with any email/password (8+ chars) — uploading requires an account; browsing/filtering/
exporting the 3 bundled samples does not (see "Accounts, ownership & sharing").

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

## File format support & CSV robustness

Upload accepts **CSV and Excel** (`.xlsx`/`.xls`). Excel goes through `server/routes/upload.js`'s
`parseExcel()`, which uses SheetJS (`xlsx`) to read the **first worksheet** and converts it to the
same `{columns, rows}` shape Papaparse already produces for CSV — every downstream piece
(`smartDetector.js`, `storyGenerator.js`, every chart) operates on that shared shape regardless of
source format, so nothing else needed to change. Multi-sheet selection isn't implemented (first
sheet only). The `xlsx` dependency is installed from **SheetJS's own CDN tarball**
(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`), not the npm registry — the registry
version has two unpatched high-severity CVEs (prototype pollution, ReDoS) that SheetJS fixed only
in their own distribution.

**Apple Numbers (`.numbers`) is deliberately not supported** — it's a proprietary zip-of-protobuf
format with no maintained Node.js parser. Rather than fail silently or produce garbage, both
`UploadModal.jsx` (client-side, before any upload) and `upload.js`'s `fileFilter` (server-side)
detect the extension and reject with an actionable message: *"Numbers files aren't directly
supported — export as CSV or Excel from Numbers (File → Export To) and upload that instead."*

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

**Extended bug bash** (second pass, against real public datasets — Titanic, Apple stock history,
Gapminder, Iris, a 34k-row world-cities file, a 62k-row NBA game log, and others — not just
synthetic test CSVs) found four more real issues, all fixed:
- A 0/1-coded categorical column (e.g. Titanic's `survived`) was mislabeled "Other" and
  undercounted in the overview, because several places used `value || 'fallback'` /
  `.filter(Boolean)`, and `0` is falsy in JS. Fixed to check explicitly for
  null/undefined/empty-string instead of truthiness.
- Three chart components (`ActTrendChart`, `ActComparisonChart`, `ActStandoutsTables`)
  independently re-derived chart data from raw rows with bare `Number()`/`new Date()`, bypassing
  the shared parsers — a currency-formatted column showed correct narrative text but a
  flat/NaN chart underneath it. Now use `parseNumericValue`/`parseDateValue` too.
- Continuous decimal measurements with naturally low unique-value counts (e.g. Iris's
  `sepal_width`, ~23 distinct values across 150 rows) were misclassified as categorical by the
  "<25 unique values" rule (meant for near-integer dimensions like floor number or rating).
  `smartDetector.js` now exempts columns that are mostly non-integer decimals from that rule.
  Also: `layoutTimeline` in `formations.js` and the Particle Swarm's hover tooltip re-parsed dates
  with a raw `new Date()`, bypassing the resolved date format (same class of bug as above); and
  `DataTableExplorer`'s column sort fell back to plain string comparison for anything that wasn't
  a native `number`, so a currency-formatted or non-ISO-date column sorted in the wrong order.
- A numeric column whose values are almost all unique (a primary/foreign key like `geonameid` or
  a row-order column) was getting auto-picked as the headline metric to sum/average — technically
  correct arithmetic, meaningless as an insight. `numericCols` is now stably sorted to deprioritize
  (not exclude) such columns so a real metric is preferred when one exists.

## Scroll feel & mobile

- **Snap-scroll story**: Acts 1–6 are each a fixed `100dvh` section with native CSS
  `scroll-snap-type: y mandatory` (`index.css`'s `html.snap-scroll-active`, toggled on/off by
  `DashboardPage.jsx` on mount/unmount) — scrolling lands cleanly on one Act at a time instead of
  free-scrolling past wherever a tall Act's content happened to end. Act 7 (the explorer) stays
  free-scroll, since it's a workbench with more content than one screen, not a narrative beat. A
  fixed top nav pill below the main Navbar lists all Acts (1–7) and jumps to any of them on click.
  Lenis (see below) is disabled on the dashboard page for this to work reliably — it virtualizes
  scroll position in JS, which fights the browser's native snap logic — and kept only for the
  landing page's GSAP pinned sections (`useLenis.js`'s `enabled` param, wired from
  `App.jsx`/`Footer.jsx`'s `SmoothScrollWrapper`). Act sections use `justify-start` rather than
  `justify-center` internally: centering content that's taller than the `100dvh` slide bleeds it
  upward past its own `padding-top` (a flex/overflow quirk), which was covering the heading with
  the fixed nav bars above it — `justify-start` makes the padding a reliable minimum gap instead.
- **Scroll feel** (landing page only, via Lenis): smoothing (`useLenis.js`) was tuned down from a
  1.2s expo-out curve to 0.8s cubic-out, and each dashboard Act's CSS reveal transition shortened
  from 700ms to 300ms — the two were stacking into a near-1-second lag between input and motion.
  The Act reveal/hide state (`DashboardPage.jsx`) is now symmetric on scroll-up as well as
  scroll-down.
- **Mobile**: the Particle Swarm (`ParticleSwarm.jsx`) had zero touch support (mouse-only) — it now
  handles tap-to-filter with the same hit-testing as desktop hover/click. Act sections use `dvh`
  instead of `vh` so the mobile browser's collapsing address bar doesn't cause layout jumps. Act
  7's sidebar collapse toggle (which only affected anything at the `lg` breakpoint) is hidden below
  it, and the sidebar itself is reordered to render after the charts/table on mobile. The three
  landing-page GSAP pinned-scroll sections skip pinning below ~768px, where a multi-screen-height
  pinned scroll is disproportionate and fights the mobile browser's dynamic toolbar.

## Accounts, ownership & sharing

Replaced an earlier shared-passcode Editor/Viewer gate that controlled *who could upload* but not
*who could see what was uploaded* — every dataset was visible to every visitor regardless of who
uploaded it. Now:

- **Auth** (`server/auth.js`, `server/routes/auth.js`): email+password accounts. Passwords hashed
  with `bcryptjs` (pure JS, no native compile — matters on the small Lightsail instance). Sessions
  are a JWT in an httpOnly, `sameSite=lax` cookie (`datastory_token`, 30-day expiry) — safer against
  XSS than the old system's localStorage-held editor token. `POST /api/auth/signup` (8+ char
  password, email normalized to lowercase), `POST /api/auth/login` (identical error whether the
  email doesn't exist or the password is wrong, so login can't be used to enumerate accounts),
  `POST /api/auth/logout`, `GET /api/auth/me`. No email verification, password reset, or OAuth —
  out of scope for a hackathon-scoped app.
- **Ownership** (`server/db.js`, `server/routes/dataset.js`): datasets have a nullable `owner_id`.
  `owner_id IS NULL` means public — this covers the 3 bundled samples and anything uploaded under
  the old passcode system (nothing existing was hidden or orphaned by the migration). New uploads
  are private to their uploader by default. `GET /api/datasets` (optional-auth) returns public
  datasets to everyone, plus — if logged in — the caller's own datasets and datasets shared with
  them, each tagged `access: 'public' | 'owner' | 'shared'` so the UI can group/label them.
  `GET /api/datasets/:id` 403s unless the dataset is public, owned, or shared with the caller.
  Upload/delete require `requireAuth`; delete additionally requires ownership.
- **Sharing** (`dataset_shares` table, `POST /api/datasets/:id/share {email}`,
  `GET/DELETE /api/datasets/:id/shares`): an owner can grant another *registered* user view access
  to a dataset by email (404 with a clear message if that email has no account — no invites to
  non-existent users, no public share links). `ShareModal.jsx` is the owner-only UI for this;
  `AuthControl.jsx` is the login/signup modal + user badge in `Navbar.jsx`.
- **Client state** (`DatasetContext.jsx`): `user`, `signup()`, `login()`, `logout()`,
  `shareDataset()`, `getDatasetShares()`, `revokeDatasetShare()`. Session is restored on mount via
  `GET /api/auth/me`. `DatasetHeader.jsx` gates Upload/Share/Delete on `user` + ownership, and
  groups the dataset picker into Samples / Yours / Shared with you by `access`.

## Features

Beyond the core "upload → auto-detect → narrated story → explore" flow:

- **Manual column-type override** (Act 7 sidebar, `DashboardPage.jsx` + `smartDetector.js`'s
  `typeOverrides` param): click a column's type icon to reassign it (numeric/categorical/date/text)
  when auto-detection gets it wrong. Takes precedence over the heuristic; resets per dataset.
- **Shareable/permalink URLs** (`DashboardPage.jsx`, `DatasetHeader.jsx`'s "Copy Link"): the active
  dataset + filters + visible columns + type overrides are serialized into
  `?dataset=<id>&state=<json>` via `history.replaceState` as you interact, and restored when that
  URL is opened fresh. Handles the race between the URL's requested dataset and
  `DatasetContext`'s own auto-select-first-dataset behavior by re-asserting the target on every
  `activeDataset` change until it matches (see the effect comment in `DashboardPage.jsx`).
- **Anomaly flagging** (`storyGenerator.js`'s `buildStandouts`, rendered in
  `ActStandoutsTables.jsx`): records more than 2 standard deviations from the primary metric's
  mean, surfaced as an "Unusual Records" panel — a different signal than top5/bottom5, since an
  outlier can sit mid-range and still be statistically unusual.
- **Basic forecasting** (`storyGenerator.js`'s `buildTrend`, rendered in `ActTrendChart.jsx`):
  projects the already-computed least-squares trend line 5 periods forward (spaced at the
  dataset's own average date interval), drawn as a dashed continuation of the trend chart.
  Explicitly labeled "not a guaranteed forecast" — simple linear extrapolation, not a real
  time-series model.
- **Export Story as PDF** (`DatasetHeader.jsx` → `window.print()`): a print stylesheet
  (`print:hidden` on interactive-only chrome + a few page-layout rules in `index.css`) turns the
  narrated Acts 1–6 into a clean printable/PDF-able document, hiding the nav, Act 7's interactive
  studio, and other controls that don't make sense in a static export.
- **Dark mode** (`useDarkMode.js`, toggle in `Navbar.jsx`): scoped to the dashboard page only — the
  landing page's marketing sections weren't converted (raw hex throughout, not the CSS custom
  properties `index.css` already defines), so the toggle only applies the `.dark` class while
  `currentPage === 'dashboard'`, and is hidden on the landing page to avoid a half-themed look.
  Defaults to **light mode** — the hook's only source of truth is what was last explicitly toggled
  in `localStorage`; it does not fall back to the OS's `prefers-color-scheme`, which previously
  caused dark mode to turn on unexpectedly for anyone with a system-wide dark theme.

## Roadmap — further hackathon-differentiation ideas

Beyond what's built, roughly in order of value vs. effort for a future pass:

- **Lightweight natural-language filter bar**: parse simple queries like `revenue > 1000 in West`
  into the existing filter state with a rule-based parser over the already-known column
  names/types — no external LLM dependency needed.
- **Dataset comparison mode**: pick two datasets and view their KPIs/trends side by side.
- **Geo-map view**: when a column pair looks like coordinates, or categorical values match
  country/state names, render a simple map. Highest visual "wow" on this list, also the largest
  lift (new dependency, new layout) — not attempted yet.
- **Multi-file joins**: relate two uploaded CSVs on a shared key (e.g. `students.csv` +
  `grades.csv` on `student_id`).
- **Beyond single-user accounts**: password reset, email verification, OAuth/social login,
  multi-sheet Excel selection — real accounts + per-dataset ownership + email-based sharing are
  already built (see "Accounts, ownership & sharing"), these are the next layer on top.
- **An LLM-powered "ask your data" layer**: natural-language Q&A over the dataset. Deliberately
  out of scope without the project owner provisioning an API key/budget.
- **Real-time collaborative viewing**: shared cursors / live filter sync across sessions viewing
  the same dataset.

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
- `JWT_SECRET` signs session cookies (see "Accounts, ownership & sharing"). `docker-compose.yml`
  reads it from a sibling `.env` file (git-ignored): `echo "JWT_SECRET=$(openssl rand -hex 32)" > .env`.
  Without it, the server generates a random secret at boot, which invalidates every logged-in
  session on each container restart/redeploy — set a real persisted value before going live.

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

- Accounts are email+password only — no password reset, email verification, or OAuth (see
  Roadmap). Session secret (`JWT_SECRET`) must be set explicitly in production or sessions
  invalidate on every redeploy (see Docker notes).
- Excel upload reads only the first worksheet; multi-sheet selection isn't implemented.
- Apple Numbers files are rejected with a redirect-to-CSV/Excel message, not parsed — no
  maintained Node.js library exists for the format (see "File format support & CSV robustness").
- No automated tests.
- Dark mode doesn't extend to the landing page's marketing sections (see Features above).
- `client/src/components/dashboard/DatasetHeader.jsx` (client-side) and
  `server/routes/export.js` (server-side) both implement CSV/JSON export independently; kept
  as-is (both work, removing either was out of scope for this pass).
