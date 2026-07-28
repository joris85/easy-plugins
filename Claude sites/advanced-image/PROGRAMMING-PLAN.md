# Easy Image App — Programming Plan

*(Name decided 2026-07-28: product **Easy Image**, domain **easy-image.app** — see PLAN.md §6.)*

*Engineering companion to [PLAN.md](PLAN.md). Product scope lives there; this document says **how** to build it: stack, libraries, file structure, code structure, and build→test→debug phases. Target host: SiteGround shared (GoGeek), PHP — with a designed-in migration path to a VPS.*

Version: 1.0 — 2026-07-22
Inputs: SiteGround platform research + per-function library stability research (both 2026-07-22, live registry checks), PLAN.md v1.1.

---

## 1. Platform reality: SiteGround rules the architecture

Verified constraints (GoGeek unless noted) and the design rule each one forces:

| Constraint | Number | Design rule |
|---|---|---|
| CPU seconds quota | 4.000/hr, 40.000/day | Image work is metered: track CPU cost per job, throttle batch processing per account, spread queues over time. AVIF encoding (expensive) only if probe says it's cheap enough; never unbounded batches. |
| Web request time limit | 120 s, **unraisable** | No web request does heavy work. Everything slow goes through the job queue. Chunk assembly must finish < 120 s (it will: it's file concatenation). |
| Upload limits | 256 MB post, unraisable | Chunked uploads at **16 MB chunks** (reliable retries, far under the cap). Max file 100 MB (product cap) = 7 chunks. |
| No daemons, avg process time fair-use 4 s/day | — | **No resident workers.** Time-boxed cron/triggered runners that process jobs for ≤ 55 s and exit. |
| Cron fair use | official minimum 30 min on shared | Cron is the **backstop only**. Primary job execution is *opportunistic*: after any request that enqueues work, fire a non-blocking loopback HTTP call to the runner endpoint (budget 55 s, guarded by a DB lock). Cron every 30 min catches stragglers. |
| Simultaneous processes | 30 | Runner lock = max 2 concurrent runners (1 fast lane, 1 slow lane). Upload concurrency client-side ×3. |
| Inodes | 600.000 (GoGeek) | Files are the real ceiling (~4–6 files per asset: original, 3 thumbs, N renditions). Rendition cache capped per asset (LRU, keep last 10); trash purge and orphan sweeps are first-class jobs; monitor inode count weekly. |
| DB fair use | ~1 GB per database | Metadata only in DB (no blobs, no base64). Prune activity_log > 12 months. Fits easily. |
| MySQL | 8.0 | `SKIP LOCKED` available → clean queue claiming. |
| Imagick | present, **enable in Site Tools**; HEIC/AVIF delegates unverified, assume absent | Runtime **capability probe** (Phase 0) writes a `capabilities.json`; features (HEIC intake, AVIF output) are flagged on/off from it. HEIC fallback: `maestroerror/php-heic-to-jpg` static binary via `exec()` — only if the Phase 0 spike proves `exec()` works on SiteGround. |
| mod_security (WP-tuned, not editable) | — | JSON APIs may hit false-positive 403s. Phase 0 spike POSTs realistic payloads to a test endpoint; offending rule IDs go to SiteGround support for whitelisting. Avoid base64 blobs in JSON bodies; uploads are multipart. |
| No API for parked domains/SSL | — | **Custom customer domains are NOT buildable on SiteGround.** Agency white-label runs on subdomains of our own domain (`{agency}.clients.easy-image.app` under a wildcard cert — requires our DNS at SiteGround, fine). True custom domains = Cloudflare for SaaS in front, or wait for the VPS migration. PLAN.md §6/Phase 8 amended accordingly. |
| OPcache = files in home dir | — | Deploy script flushes opcache dir; also counts against inodes. |
| SSH + Composer + git on all plans | port 18765 | Deploy = `git push` to a bare repo on the server + post-receive hook (checkout, `composer install --no-dev`, migrate, flush opcache). Staging = a second SiteGround site, same mechanism. |

**Migration path (designed in from day one, per the "12-factor-ish" rule):** all config in one env file; storage behind Flysystem (local now, S3 later); queue behind our own small interface (DB-polled now, same table + supervisord worker later); mail via provider HTTP API; cron entry points are idempotent time-boxed CLI scripts. Moving to Hetzner/DO later = rsync + mysqldump + DNS. Expected triggers to migrate: CPU-second suspensions, >100k assets (inodes), custom-domain demand.

---

## 2. Library decisions (per function, stability-checked 2026-07)

Rule applied: boring, maintained, low-dependency; hand-roll only where owning the code is *more* stable than depending.

| Function | Decision | Why (health as of 2026-07) |
|---|---|---|
| Router / middleware | **slim/slim ^4.15** | Active (May 2026 release incl. security fix), thin PSR-7/15. Laravel too heavy for shared hosting; bare FastRoute is stalled (v2 beta since 2024). |
| DB access | **PDO + hand-rolled repositories** | Core PHP, zero risk. Small schema; if a query builder becomes necessary, adopt doctrine/dbal (very healthy) — never invent one. No ORM. |
| Migrations | **robmorgan/phinx ^0.16** | Rescued by Cake Software Foundation (Jul 2026 release), standalone, rollbacks + status. |
| Files/FTP/SFTP/S3 | **league/flysystem ^3** + `flysystem-ftp`, `flysystem-sftp-v3` (phpseclib3), `flysystem-async-aws-s3` | All under one maintained umbrella (Jul 2026 releases). AsyncAws ≪ smaller than full AWS SDK. One interface = the push-adapter layer *and* the future storage migration. |
| Chunked uploads (server) | **Hand-rolled**: `POST /uploads` (init) → `PUT /uploads/{id}/chunks/{n}` → `POST /uploads/{id}/finalize` (size + sha256 check) | tus-php is 17 months stale; a ~200-LOC protocol we own beats a protocol server we don't. Orphan chunks swept by job. |
| Upload UI (client) | **Hand-rolled fetch uploader** (concurrency 3, per-file progress, retry/backoff) | We're building a fully custom manager UI anyway, so Uppy's Dashboard would be hidden; headless Uppy adds a dependency for ~300 LOC of logic. (If we ever want its Dashboard, Uppy 5 is healthy — revisit.) |
| Auth core | **Hand-rolled**: `password_hash` (argon2id), DB sessions table, `hash_equals` remember-me | The boring, auditable path; Symfony security drags a framework worldview in. |
| TOTP 2FA | **spomky-labs/otphp ^11** | Healthy (Jun 2026). Never hand-roll RFC 6238. |
| Signed URLs | **Hand-rolled HMAC** (`hash_hmac('sha256', path\|expiry\|scope, key)` + `hash_equals`) | JWT is overkill for expiring media URLs. firebase/php-jwt (^7, healthy) only enters with the connector-plugin pairing tokens. |
| Credential encryption | **Raw libsodium** (`sodium_crypto_secretbox`, per-secret nonce, per-account data key wrapped by env master key) | Core extension, zero deps. defuse/php-encryption is dormant — avoid. |
| Billing | **mollie/mollie-api-php ^3** (v3 is the current rewrite — use v3 docs) + **ibericode/vat ^2** (VIES + rates) | Both first-party/healthy (2026 releases). dragonbe/vies is dead. |
| Invoices (PDF) | **dompdf/dompdf ^3** | Active (Jul 2026), pure PHP (no binaries — shared-hosting-proof), HTML/CSS templating. |
| | **symfony/mailer ^8** + Postmark bridge | Healthy; provider bridges + DSN config; HTTP API transport (ports open anyway, API > SMTP). |
| Image engine | **Imagick direct** via our own `Engine\` classes (ported `ImageProcessor.php`) | Full control (target-size search, ICC, WebP tuning already written). intervention/image would get punched through. **php-vips impossible on shared** (needs global FFI). |
| HTTP client | **guzzlehttp/guzzle ^7.9** | Industry default, Mollie v3 uses PSR-18. Guzzle 8.0.0 shipped this week — migrate later, don't launch on a 2-day-old major. |
| Job queue | **Hand-rolled DB queue** (~300 LOC): `jobs` table, claim via `SELECT … FOR UPDATE SKIP LOCKED`, columns `lane, attempts, available_at, claimed_at, heartbeat_at, last_error` | On cron-only hosting the failure modes (killed mid-job, overlapping runners) need to be visible columns, not framework internals. symfony/messenger is the documented fallback if retry logic sprawls. |
| Errors | **sentry/sentry ^4** | Works on shared hosting (curl at shutdown, no relay). Low sample rate. |
| Testing | **phpunit ^12/13** (unit + integration w/ real MySQL test DB, hand-rolled truncate trait) + **Playwright** for E2E | Playwright over Cypress: faster, better multi-tab (WP-push flows). |
| SVG sanitizing | **enshrined/svg-sanitize** | Quiet but the de-facto standard (TYPO3/WP ecosystems). Also serve user SVGs with CSP + `Content-Disposition: attachment` on download endpoints. |
| WordPress client | **Hand-rolled on Guzzle** (~150 LOC) | Every PHP WP SDK is dead or deprecated; WP core docs say "use an HTTP lib". Ours stays typed and testable. |
| **Frontend** | | |
| SPA framework | **Vue 3 + Vite**, islands inside PHP-rendered shell | Confirmed from PLAN.md; Vite build output committed to `public_html/assets/` by the deploy script. |
| State | **pinia ^4** | The boring choice (Jul 2026 release). |
| Virtual grid | **vue-virtual-scroller ^3** (`RecycleScroller` with `gridItems`) | Stable 3.x line since 2026; grid mode fits uniform tiles. Fallback documented: @tanstack/vue-virtual (healthier org, more DIY) — keep grid behind our own `<AssetGrid>` wrapper so a swap touches one file. |
| Drag & drop | **@atlaskit/pragmatic-drag-and-drop ^2** | Atlassian-backed, headless, designed for grid→tree + multi-drag, **works with virtualized DOM** (SortableJS fights it). |
| Lasso select | **Hand-rolled** (~100 LOC pointer + rect intersection) | All standalone lasso libs are abandonware. |
| Cropper | **cropperjs ^2** behind a small adapter component | 2.x is the maintained line; 1.x (what free Easy Image uses) is frozen. Adapter isolates the API rewrite; manual-crop UX ported, not copied. |

---

## 3. Repository & file structure

One git repo. App code lives **above** the web root (SiteGround serves `public_html/`; siblings in the site directory are not web-reachable).

```
easy-image-app/                     ← repo root = SiteGround site root
├── public_html/                    ← ONLY web-reachable directory
│   ├── index.php                   ← front controller (require ../app/bootstrap.php)
│   ├── .htaccess                   ← rewrite all to index.php; security headers
│   ├── assets/                     ← Vite build output (hashed filenames, committed by deploy)
│   └── static/                     ← favicons, og images, robots.txt
├── app/
│   ├── bootstrap.php               ← autoload, env, container, error handler
│   ├── routes.php                  ← all routes → [Controller::class, 'method'], grouped by middleware
│   ├── config/
│   │   ├── env.php                 ← reads .env (untracked); typed accessors; NO secrets in git
│   │   └── container.php           ← PHP-DI definitions (PDO, Flysystem, Mailer, Engine, …)
│   ├── src/                        ← PSR-4  EasyImageApp\  — organized by MODULE, not by layer
│   │   ├── Kernel/                 ← App wiring: Router glue, base Controller, Middleware base,
│   │   │                              ApiResponse, Validation, Clock, Ids (ULIDs)
│   │   ├── Auth/                   ← LoginController, RegisterController, PasswordReset,
│   │   │                              SessionRepository, AuthMiddleware, TotpService
│   │   ├── Accounts/               ← Account, AccountUsersRepository, roles/permissions
│   │   │                              (PermissionMatrix), InvitationService, quotas (QuotaService)
│   │   ├── Workspaces/             ← WorkspaceController/Repository, lifecycle (archive/delete/
│   │   │                              transfer job), FolderTemplateService
│   │   ├── Library/                ← the media manager backend:
│   │   │   ├── Folders/            ← FolderRepository (path-cached tree), move/reparent
│   │   │   ├── Assets/             ← AssetRepository, MetadataExtractor, DuplicateCheck,
│   │   │   │                          VersionService, TrashService, search (AssetSearch)
│   │   │   ├── Uploads/            ← ChunkedUploadController, UploadValidator (deep MIME,
│   │   │   │                          SvgSanitizer wrapper), ThumbnailJob
│   │   │   └── Collections/
│   │   ├── Engine/                 ← ported ImageProcessor + security helpers from easy-image;
│   │   │                              CapabilityProbe (writes capabilities.json); NO deps on
│   │   │                              other modules — publishable to the free site later
│   │   ├── Exports/                ← PresetRepository, ExportService (engine + renamer),
│   │   │                              RenditionCache (LRU cap), ZipBuilder (staged ≤2 GB)
│   │   ├── Push/
│   │   │   ├── Connections/        ← ConnectionRepository, CredentialVault (libsodium),
│   │   │   │                          HealthCheckJob, preflight probes
│   │   │   ├── Adapters/           ← DestinationAdapter interface +
│   │   │   │                          WordPressAdapter, FtpAdapter, SftpAdapter, S3Adapter,
│   │   │   │                          BunnyAdapter, (JoomlaAdapter, ShopifyAdapter, … Phase 8)
│   │   │   └── PushJobService      ← job orchestration, per-item state, outdated/re-push logic
│   │   ├── Sharing/                ← ShareLinkController (public), InboxController (public),
│   │   │                              rate limiting for anonymous surfaces
│   │   ├── Billing/                ← MollieService, PlanGates, InvoiceService (dompdf),
│   │   │                              VatService (ibericode), DunningJob, GdprService
│   │   │                              (export + delete-account)
│   │   ├── Jobs/                   ← Queue (enqueue/claim/complete/fail), JobRunner (time-boxed),
│   │   │                              LoopbackTrigger, job classes implement JobHandler interface
│   │   ├── Mail/                   ← Mailer wrapper + templates/ (php views per mail)
│   │   └── Admin/                  ← internal admin panel (accounts, usage, impersonate)
│   ├── templates/                  ← server-rendered PHP views (layout reuses shared/ design
│   │                                  language; i18n via ported lang/*.ini system)
│   ├── lang/                       ← en-GB.ini, nl-NL.ini (same format as free site)
│   ├── migrations/                 ← Phinx migration classes, numbered
│   └── storage-local/              ← dev-only tenant storage (prod path configured in .env,
│                                      e.g. ~/ai-storage/ outside the site dir)
├── frontend/                       ← Vite project (not deployed; builds into public_html/assets)
│   ├── src/
│   │   ├── main.ts                 ← mounts islands by [data-island] markers in PHP pages
│   │   ├── api/                    ← typed fetch client, one file per backend module
│   │   ├── stores/                 ← pinia: library.ts (tree+windows+selection), uploads.ts,
│   │   │                              jobs.ts (progress polling), ui.ts
│   │   ├── islands/
│   │   │   ├── manager/            ← AssetGrid.vue (virtual-scroller wrapper), FolderTree.vue,
│   │   │   │                          SelectionLayer.vue (lasso), BulkBar.vue, QuickLook.vue,
│   │   │   │                          InfoPanel.vue, dnd/ (pragmatic-dnd glue)
│   │   │   ├── export/             ← ExportDialog.vue, CropperAdapter.vue, Renamer.vue
│   │   │   ├── uploads/            ← DropOverlay.vue, UploadQueue.vue, uploader.ts (chunk logic)
│   │   │   └── connections/        ← wizards, health badges, push confirm/progress
│   │   └── shared/                 ← design tokens matching easy-image, composables
│   └── vite.config.ts
├── bin/                            ← CLI entrypoints (all idempotent, time-boxed, lock-guarded)
│   ├── run-jobs.php                ← the worker: --lane=fast|slow --budget=55
│   ├── migrate.php                 ← phinx wrapper
│   ├── probe.php                   ← Imagick/exec/limits capability probe → capabilities.json
│   ├── sweep.php                   ← orphan chunks, trash purge, rendition LRU, share-link expiry
│   ├── recount.php                 ← storage/inode accounting per account
│   └── health.php                  ← worker heartbeat check, weekly connection re-checks
├── tests/
│   ├── Unit/                       ← pure classes (validators, renamer, HMAC, PermissionMatrix…)
│   ├── Integration/                ← against MySQL test DB (truncate trait) + real tmp filesystem
│   ├── Golden/                     ← engine golden-file tests (fixtures/ + expected outputs)
│   └── e2e/                        ← Playwright specs + fixtures (runs against staging or local)
├── connector-plugin/               ← the WordPress plugin (own build, zipped by CI; Phase 8)
├── scripts/
│   ├── deploy.sh                   ← build frontend → git push production → hook runs:
│   │                                  checkout, composer install --no-dev, migrate, opcache flush
│   └── post-receive                ← the server-side hook (documented copy)
├── composer.json  package.json  phinx.php  phpunit.xml  playwright.config.ts
└── PLAN.md  PROGRAMMING-PLAN.md  docs/adr/  ← architecture decision records, one page each
```

**Cron entries on SiteGround (backstop lane):** `bin/run-jobs.php --lane=fast`, `--lane=slow`, `bin/sweep.php`, `bin/health.php` — each every 30 min, offset; each exits in seconds if a runner lock is held or queue is empty. Opportunistic execution (loopback trigger after enqueue) does the real-time work.

---

## 4. Code structure rules

1. **Modules own their tables.** Only `Library/Assets` touches `assets`; other modules go through its repository. No cross-module SQL.
2. **Controllers are thin**: validate (Kernel\Validation) → call service → ApiResponse. All JSON endpoints return the same envelope `{ok, data|error, meta}`.
3. **Every route passes middleware in this order**: session → auth → account context → **workspace scoping** (the IDOR killer: URL workspace/asset IDs are verified against the session's permitted set *in one place*) → permission check (PermissionMatrix, same table as PLAN.md §3) → rate limit (public surfaces).
4. **IDs are ULIDs** (sortable, non-guessable) — never sequential ints in URLs.
5. **Jobs are classes** implementing `JobHandler::handle(array $payload, JobContext $ctx)`; `$ctx` exposes `remainingBudget()` so long jobs (batch export, transfer) checkpoint and re-enqueue themselves instead of overrunning the 55 s budget. Every job idempotent (safe to re-run after a kill).
6. **Engine stays pure**: no DB, no HTTP, no session — file in, file out, options array. It's the shared package with the free site and the most-tested code in the repo.
7. **Capabilities, not assumptions**: `capabilities.json` (from `bin/probe.php`) gates HEIC intake, AVIF output, exec() fallback — UI reads the same flags.
8. **Frontend islands, not SPA-everything**: marketing/auth/settings pages are server-rendered PHP (fast, SEO, matches free site); only manager/export/uploads/connections mount Vue islands.
9. **Feature flags** (simple DB table) for anything mid-development on staging = same branch can deploy safely.
10. **Every external call** (Mollie, WP, S3, mail) goes through one wrapper class per service → mockable in tests, retryable, logged with secrets redacted.

---

## 5. Build phases — build → test → debug → build on

Numbering matches PLAN.md's product phases; here each phase gets its engineering breakdown. **Every phase ends the same way:** unit + integration suites green, the phase's Playwright specs green against staging, a manual 15-minute workflow demo, and a *debug log review* (Sentry + `last_error` columns + mod_security 403 count for the period). Only then build on.

### Phase 0 — Foundations & SiteGround spikes (1–2 wk)
**Build:** repo layout above; Slim skeleton + front controller + env config; Phinx + first migration (users, sessions); deploy script + bare repo + post-receive on a **staging site** (second SiteGround site); PHPUnit + Playwright scaffolds; port `ImageProcessor` + security helpers into `Engine/` with golden-file tests; `bin/probe.php`.
**Spikes on the real server (decides architecture, do not skip):**
1. Capability probe: Imagick formats (HEIC read? AVIF encode? WebP?), `exec()` allowed?, sodium, actual PHP limits.
2. mod_security: POST realistic JSON + multipart payloads to a test route; log any 403 rule IDs → support ticket.
3. Queue timing: enqueue → loopback trigger latency; cron behavior; two concurrent runners + `SKIP LOCKED` correctness.
4. Chunk upload: 100 MB file in 16 MB chunks through the real host; assembly timing.
5. CPU cost baseline: convert 50 typical JPEGs → WebP, measure CPU-seconds (informs batch throttles and the AVIF decision).
**Test:** golden-file engine suite (same output as free site); probe report reviewed.
**Debug gate:** capabilities.json committed as the reference; every spike documented in `docs/adr/`.
**Builds on:** nothing. Everything after depends on these numbers.

### Phase 1 — Auth, accounts, workspaces (2–3 wk)
**Build:** registration/verify/login/logout/reset/e-mail-change; DB sessions + remember-me; accounts + roles (`PermissionMatrix` as pure class, table-driven); workspaces CRUD + lifecycle (rename/archive/delete-soft) + switcher UI (server-rendered); invitations model (used by Phase 5); activity log; symfony/mailer + Postmark with first templates; Sentry wired; admin panel skeleton (impersonate, logged).
**Test:** unit — validators, PermissionMatrix truth table (every role × capability), token hashing. Integration — full auth flows against test DB; session fixation/regeneration; rate-limited login. Playwright — signup→verify→login→create workspace.
**Debug gate:** run the IDOR checklist (attempt every route with a wrong-workspace ID) — this list becomes a permanent integration test, extended in every later phase.
**Builds on:** Phase 0 skeleton, mailer spike.

### Phase 2 — Storage, uploads, folders, queue (3 wk)
**Build:** the hand-rolled **queue** + `JobRunner` + loopback trigger + cron backstop (first, everything else uses it); chunked upload endpoints + client `uploader.ts`; validation pipeline (deep MIME from Engine security, SVG sanitize, brand-file types); sha256 duplicate warning; thumbnail job (240/480/1024 WebP); folder tree CRUD + move/reparent; trash + purge job; storage/inode accounting (`recount.php`); orphan-chunk sweep; server-rendered basic grid (non-virtualized) to make everything usable before the SPA exists.
**Test:** unit — chunk state machine, validators, queue claim/retry/backoff logic (clock injected). Integration — kill a worker mid-job (simulate) → job retried, no double thumbnail; concurrent runners never double-claim; upload 1.000 files; quota accounting matches disk. Playwright — drag-drop upload of a folder, see thumbs appear.
**Debug gate:** deliberately break things on staging: kill mid-chunk, fill quota, upload hostile files (polyglot, SVG-with-script, decompression bomb — Engine guards must fire). CPU-seconds for the test load reviewed against Phase 0 baseline.
**Builds on:** queue is the foundation for every later phase; grid v0 proves the API shapes for Phase 3.

### Phase 3 — Media manager SPA (3–4 wk)
**Build:** Vite + Vue islands scaffold; pinia stores; `AssetGrid` (vue-virtual-scroller behind our wrapper) with windowed fetch (`offset/limit` on stable sort); selection model (click/shift/⌘/lasso/⌘A) as its own store, fully unit-tested; pragmatic-drag-and-drop glue (assets→folder, folder→folder, multi-drag badge, spring-loaded folders, OS-drop overlay coexistence); BulkBar actions (move incl. cross-workspace job, tag, rename, download, delete); search + filters (MySQL strategy from PLAN.md 4.4); QuickLook + InfoPanel (editable alt/title, versions, renditions); collections; folder templates; keyboard map.
**Test:** unit (Vitest) — selection store transitions exhaustively, lasso hit-testing, windowing math. Playwright — the heavy lane: 10k-asset seeded workspace (fixture script) → scroll fps sanity, folder switch < 300 ms, drag 25 assets to a nested folder, lasso + bulk tag, keyboard-only session.
**Debug gate:** the PLAN.md Phase 2 gate (non-developer user test) + virtual-scroller memory profile (no DOM leak over 10 min scrolling). Search checkpoint: measured < 200 ms or Meilisearch decision escalated (would mean VPS earlier — flag, don't drift).
**Builds on:** Phase 2 APIs unchanged — the SPA replaces grid v0 only in the view layer.

### Phase 4 — Processing, presets, export (2–3 wk)
**Build:** ExportService = Engine + renamer port + presets; export dialog island (modes/format/quality/target-size/enhance/effects — parity checklist against free site); CropperAdapter (cropperjs 2, manual crop per image + 9-point auto fallback); rendition cache with per-asset LRU cap (inodes!); staged ZipBuilder; job-progress polling UI; "save as renditions"; batch throttling per account (CPU budget from Phase 0).
**Test:** golden-files extended to every mode/format combination the UI can produce (the free site's outputs are the oracle); unit — renamer tokens, preset fingerprinting; integration — 100-image batch within job budget via checkpoint/re-enqueue; ZIP of 3 GB library arrives as 2 staged parts. Playwright — select 20 → preset → download ZIP; manual crop flow.
**Debug gate:** CPU-seconds per 100-image batch measured and recorded; AVIF go/no-go decision made from real numbers; feature-parity checklist 100%.
**Builds on:** selection/bulk plumbing from Phase 3; queue from Phase 2.

### Phase 5 — Sharing & client access (2–3 wk)
**Build:** permission middleware enforcing client scoping end-to-end; client invitations (reuses Phase 1 invitations); client-scoped UI variant; share links (HMAC-signed public pages, password/expiry/revoke, management page, report-abuse link, pre-cached rendition size choices — no anonymous processing); upload inbox (public page, holding area, review/accept flow, honeypot + IP rate limit + quota behavior); notification mails.
**Test:** integration — permission matrix as an executable table test across every endpoint (extends the Phase 1 IDOR suite); share-link expiry/revoke/trashed-asset behavior; inbox at 100% quota. Playwright — two-browser scenario: agency invites client, client logs in, sees only their workspace, downloads; anonymous share + inbox flows.
**Debug gate:** anonymous-surface abuse drill: script 200 rapid share hits + inbox spam on staging → rate limits hold, nothing queues unbounded work.
**Builds on:** Phases 1–4; this is where multi-tenancy is proven safe.

### Phase 6 — Billing & tiers (3 wk)
**Build:** Mollie v3 integration (checkout, recurring, webhooks — webhook endpoint must tolerate mod_security, spike-tested); plan gates (PlanGates consulted by upload/push/workspace/invite services); soft quota behavior (banners at 80/95/100); upgrade prorated one-off, downgrade at period end (read-only workspaces, client-login suspension); our invoice PDFs (dompdf) + VAT/VIES (ibericode/vat); dunning job; GDPR endpoints (staged export, delete-account with purge schedule); admin billing views.
**Test:** integration against **Mollie test mode** for every 4.11 branch (first payment, renewal, failed payment, chargeback webhook, cancel); invoice PDF snapshot tests (NL VAT, EU reverse-charge, non-EU); unit — proration math, VIES response handling (mock + one live smoke).
**Debug gate:** webhook replay/duplicate-delivery drill (Mollie retries — handlers must be idempotent); clock-skew test on period-end logic.
**Builds on:** quotas from Phase 2, roles from Phase 1/5.

### Phase 7 — Push v1: WordPress, FTP/SFTP, S3/Bunny (3 wk)
**Build:** `CredentialVault` (libsodium envelope, last-4 display, redacted logging); connections UI + environment tags + websites grouping; `DestinationAdapter` interface + WordPress (hand-rolled Guzzle client: app-password auth, `wp/v2/media`, alt/title), Ftp/Sftp (Flysystem), S3/Bunny adapters; preflight probes per connection (WP: HTTPS check, auth-header check with `.htaccess` fix hint, practical size cap probe; SFTP: host-key pinning); health checks (weekly job + badge); push jobs with per-item state/retry, pushed-to history **keyed on version**, outdated-list + re-push-latest, staging→production duplicate action.
**Test:** unit — adapters against mocked transports; vault encrypt/decrypt/rotation. Integration — a **real WP test site** (docker locally, plus one on cheap shared hosting with ModSecurity for realism), a real SFTP box, an R2 bucket: full push, mid-push network kill → consistent resumable state, retry works. Playwright — connect-WP wizard, push 10 assets, verify links; version-update → outdated → re-push cycle.
**Debug gate:** credentials confirmed absent from DB dump (automated check greps a dump for known plaintext), logs, and Sentry payloads; a wrong-password connection degrades to a clear amber state, not a stuck job.
**Builds on:** export pipeline (Phase 4) feeds the adapters; queue checkpointing from Phase 2.
**→ Beta cohort onboards here (per PLAN.md).**

### Phase 8 — Connector plugin & platform wave 2 (3–4 wk)
**Build:** `connector-plugin/` — the **Easy Image Connector** WordPress plugin, slug `easy-image-connector` (pairing-code handshake → API token in `api_tokens`; pull-from-signed-URL import; `wp_generate_attachment_metadata`, alt/caption; FileBird folder support; replace-in-place for re-push; deletion webhook) + wp.org listing assets; JoomlaAdapter (API token, base64 payload chunking awareness), ShopifyAdapter (`fileCreate` from signed URL, poll `fileStatus`), WixAdapter (API key + import-by-URL, poll ready), WebflowAdapter (MD5 + two-step S3 upload); Squarespace explainer page.
**Test:** plugin — PHPUnit with WP test framework (or wp-env) + Playwright against real WP: pair, push via pull, folders, replace, uninstall cleanly; per-platform one green E2E push on a real trial site; contract tests per adapter with recorded fixtures.
**Debug gate:** plugin on a hardened host (ModSecurity aggressive) and on lowest supported WP version; token revocation kills the pairing.
**Builds on:** adapter interface from Phase 7 unchanged — wave 2 is "more implementations", proving the abstraction.

### Phase 9 — Agency features & launch hardening (3–4 wk)
**Build:** staff roles UI, per-workspace client branding, white-label share/portal pages on **wildcard subdomains** (`{slug}.clients.ourdomain.com` — SiteGround wildcard LE; true custom domains documented as "on request" via Cloudflare for SaaS or post-VPS, per §1); branded mails; all-clients dashboard; workspace transfer (quota preflight + checkpointed copy job); 2FA (otphp); marketing site on the free-site SEO machinery; docs; status page; ToS/DMCA.
**Test:** Playwright — full agency journey incl. subdomain portal with valid TLS; transfer of a seeded 5 GB workspace (checkpointed over multiple job runs). Load — k6: 50 concurrent browse+upload+push against staging, watching CPU-seconds and process-slot ceilings (this decides launch plan tier vs. early VPS). Security — OWASP checklist, upload fuzzing rerun, third IDOR sweep, dependency audit (`composer audit`, `npm audit`).
**Debug gate:** external security scan; restore-from-backup rehearsal (full DB + storage to a scratch site); "stranger test" from docs alone; inode/disk/CPU dashboards reviewed with launch-month projections.
**Builds on:** everything; no new architecture allowed in this phase.

---

## 6. Testing & debugging strategy (cross-phase)

- **Test pyramid:** golden-file engine tests (the crown jewels — outputs must match the free site byte-class-for-byte-class) → unit (pure logic, no I/O, clock/random injected) → integration (real MySQL `easyimage_test` DB, truncate trait; real tmp filesystem via Flysystem local) → Playwright E2E (against local dev; the critical-path subset re-runs against staging after every deploy).
- **Fixtures:** `bin/`-invokable seeders — `seed-10k-assets`, `seed-agency-with-clients`, `seed-billing-states`. Used by both Playwright and manual debugging.
- **CI-lite (no pipeline dependency on SiteGround):** a local `composer check` script = php-cs-fixer + phpstan (level 6+) + phpunit; deploy script refuses to push if it fails. Playwright critical-path suite is the post-deploy smoke on staging.
- **Debugging in production:** Sentry (errors + failed-job alerts), `jobs.last_error` visible in admin, per-request debug id in every ApiResponse (`meta.rid`) logged server-side, mod_security 403s monitored via SiteGround logs during each phase's rollout, weekly `recount.php` report mail (storage, inodes, CPU-seconds trend).
- **Definition of done (every phase):** suites green · staging demo of the phase's PLAN.md workflows · IDOR suite extended and green · debug-log review clean · ADR written for any decision that deviates from this document.

## 7. Deltas this document imposes on PLAN.md v1.1

1. **Custom customer domains** (PLAN.md §6, Phase 8) are *not feasible on SiteGround* (no domain/SSL API). Launch scope: wildcard subdomains under our domain; true custom domains via Cloudflare for SaaS or after VPS migration. PLAN.md Phase 8 gate adjusted accordingly.
2. **AVIF output** becomes capability-gated (probe + CPU cost), not assumed.
3. **HEIC intake** likewise probe-gated with a tested `exec()` fallback, else rejected with a friendly "convert first" hint.
4. **Worker model** concretized: opportunistic loopback runner + 30-min cron backstop (PLAN.md 4.10's "cron every minute" assumption corrected).
5. **Launch hosting tier:** GoGeek minimum (CPU seconds + inodes); revisit VPS when beta load data exists (Phase 9 load test decides).
