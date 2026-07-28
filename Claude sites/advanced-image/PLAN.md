# Advanced Image — Product & Build Plan

*The paid, account-based evolution of Easy Image: a per-client image library for web freelancers and small agencies, with the Easy Image processing engine built in and one-click "push to website".*

Version: 1.1 — 2026-07-22 (v1.0 reviewed by an adversarial critique pass; all critical/important findings folded in)
Status: draft for review

---

## 1. Vision & positioning

**One sentence:** *The permanent home for all your clients' website images — store the originals once, export them perfectly sized for the web, and push them straight into the client's website.*

**Who it's for:** web freelancers and small agencies who build and maintain multiple client websites (WordPress, Joomla, custom, Shopify, Wix, Webflow, …). Secondary: the clients themselves, who get a login to their own library.

**The problem it solves (validated by research):**
- Freelancers run a "Frankenstein workflow": client assets scattered over WeTransfer (links die after 7 days), e-mail, Google Drive, Dropbox and old FTP folders. Every "where is that logo?" e-mail is unbilled time.
- Original high-quality images get lost; only the compressed website version survives.
- Clients upload 6 MB phone photos into WordPress and tank PageSpeed; freelancers fix it after the fact with plugins that bloat hosting.
- Existing DAM tools are either enterprise-priced (Bynder, Canto: $20k+/yr, quote-only), developer-CDN-oriented (Cloudinary, ImageKit), or do organization but **no optimization and no push** (Filecamp, BrandBay, Brandy, Dash).

**The killer feature nobody packages today:** select images → pick an export preset (e.g. "Blog hero 1600×900 WebP q80") → choose destination → the images land **in the client's WordPress media library / Joomla / FTP server, correctly sized, converted, named, with alt text**. The current "competition" for this is FileZilla with saved profiles.

**Positioning line vs. competitors:** compete on *handoff and deployment*, not on AI generation (Air), CDN delivery at scale (Cloudinary/ImageKit) or enterprise workflow (Bynder).

**Relationship to Easy Image (free):** Easy Image stays the free, no-account funnel. Every free tool gets a tasteful "Save this to your library →" upsell. Advanced Image reuses the same processing engine, i18n (EN/NL), theming and design language, so it feels like the grown-up sibling.

---

## 2. Market summary (from research, 2026-07)

### Closest competitors

| Product | Price | What they have | What they lack |
|---|---|---|---|
| Filecamp | $29–89/mo flat, 20–100 GB, unlimited users | Per-folder client branding, white label, share links | No image optimization, no push-to-site, weak drag-and-drop (top user complaint) |
| BrandBay | ~$12–79/mo, up to 4 TB | Multi-brand client workspaces, white-label portals | No optimization, no push |
| Dash (Bright) | ~$109+/mo | Resize-on-download, portals, unlimited users | Price above freelancer range, no push, no per-client model |
| Brandy | $5–35/mo | Brand guideline pages | No real media manager, no optimization/push |
| Cloudinary / ImageKit | credits / usage | Transforms + CDN, WP plugins (pull-based) | Wrong direction: they embed their DAM *inside* WP; complex credit pricing scares non-devs |
| Air | free–$25/seat-ish, credits | Gorgeous UI, AI, annotations | Team-creative oriented, credit pricing, no client-site push |

### Market rules learned
1. **Charge for storage and workspaces, never per seat.** Every winner in this segment (Filecamp, Dash, Air, Stockpress) leads with "unlimited users". Per-seat pricing is what small teams are fleeing.
2. **Flat, public pricing.** Quote-only is toxic under $100/mo.
3. **Avoid credit systems** — they confuse non-technical buyers.
4. A **free tier** (1 client workspace, ~1 GB) is standard and feeds the funnel (Air, Brandy, BrandBay, ImageKit all do it).
5. White label + custom domain is the proven **agency-tier upsell lever** (Filecamp Pro $89, BrandBay Agency ~$79).

### Proposed pricing (benchmark-anchored, validate with beta cohort)

| Tier | Price (mo / yr −15%) | Storage | Clients | What it adds |
|---|---|---|---|---|
| **Free** | €0 | 1 GB | 1 | Full media manager + full editing/export/download. Share links (Easy Image-branded). **No push, no client logins, no inbox.** |
| **Personal** | €11 / €112 | 25 GB | 3 | Push to websites: **2 connections (account-wide)**. Unbranded share links. |
| **Pro (Freelancer)** | €29 / €296 | 100 GB | 15 | Unlimited connections, **client logins**, upload inboxes, connector plugin (plugin ships in Phase 7 — don't market before then), brand-file storage. |
| **Agency** | €79 / €806 | 500 GB | Unlimited | White label + custom domain, client portal theming, staff roles, workspace transfer, priority support. |
| Storage add-on | €5 / 100 GB / mo | | | All paid tiers. |

Notes: the original "1 GB personal" idea maps to **Free**; a *paid* tier must offer far more (Filecamp gives 20 GB at $29 — 1 GB paid would look broken). Editing/export is **not** gated anywhere — it's the free funnel's DNA; the paid gates are storage, clients, push, and client-facing features. Payment: **Mollie** (iDEAL + card + SEPA — NL/EU first); see §4.11 for what Mollie does *not* do. All prices excl. VAT.

---

## 3. Core concepts & data model

Everything hangs off these nouns. Names are final unless marked.

| Concept | Description |
|---|---|
| **Account** | The paying entity (freelancer or agency). Owns the subscription, storage quota, branding settings. |
| **User** | A person who can log in. Belongs to one or more accounts with a role: `owner`, `admin`, `member` (agency staff), `client` (scoped to specific workspaces). One login can be client of agency A *and* owner of account B → account/workspace picker after login. |
| **Workspace** ("Client") | One client/brand inside an account. Has its own folder tree, connections, client users, branding. UI label: **Client**. Lifecycle: rename anytime, archive (read-only, keeps data), delete (see 4.13). |
| **Folder** | Nested folders inside a workspace. Drag-and-drop movable, unlimited depth (soft cap 10). |
| **Asset** | One file. Usually an image; **brand files** (PDF, EPS/AI, fonts, ICO) are stored too — no renditions, generic/PDF-page thumbnail, so the "Logo & Brand" folder can truly hold the masters. Stores the **original untouched** + extracted metadata (EXIF/IPTC, dimensions, dominant colors), title, alt text, caption, tags. sha256 checksum → **duplicate warning** on upload (storage-level dedupe is not v1). Soft-delete with 30-day trash. |
| **Version** | Replacement uploads of an asset (logo v2). Every version's original kept; latest is default. A new version marks earlier pushes of that asset **outdated** (see 4.7). |
| **Rendition** | A derived export (resized/cropped/converted). Cached, regenerable, free (doesn't count toward quota). |
| **Export preset** | Named recipe: fit/crop mode + dimensions + format + quality/target-size + effects + rename pattern. Account-level and workspace-level. |
| **Connection** | A configured destination: WordPress, Joomla, (S)FTP, S3/Bunny, Shopify/Wix/Webflow. Has an **environment tag** (production / staging) and can be grouped under a *website* so one client site can have both. Credentials envelope-encrypted (§6). |
| **Push job** | A queued transfer: N assets × 1 preset × 1 connection, per-item status/log. |

Supporting: **Share link** (public gallery page, password/expiry/revoke), **Upload inbox** (public "send me your images" page), **Collection** (curated cross-folder set), **Invitation** (client/staff invites, 14-day expiry), **Folder template**, **Activity log**.

### Database (MySQL/MariaDB, InnoDB, utf8mb4)

`accounts`, `users`, `account_users` (role + per-workspace scope for clients), `invitations`, `workspaces`, `folders`, `folder_templates`, `assets`, `asset_versions`, `renditions`, `tags` + `asset_tags`, `presets`, `websites` + `connections`, `push_jobs` + `push_job_items` (keyed on asset **version**), `share_links`, `inboxes` + `inbox_uploads`, `collections` + `collection_assets`, `jobs` (generic queue, §4.10), `activity_log`, `subscriptions` + `invoices`, `password_resets`, `sessions`, `api_tokens` (connector plugin). Migrations via numbered SQL files + tiny runner (or Phinx).

### File storage layout

```
storage/                        ← OUTSIDE public_html, never web-served directly
  {account_id}/{workspace_id}/
    originals/{asset_id}/{version}.{ext}
    renditions/{asset_id}/{fingerprint}.{ext}
    thumbs/{asset_id}/{240|480|1024}.webp
```
All delivery through an auth-checked PHP endpoint (`X-Sendfile`/`X-Accel-Redirect`) or short-lived **signed URLs** (`/f/{token}`) — signed URLs also serve push-by-import and share pages. Filesystem behind **Flysystem** from day one (local disk now, S3/Bunny later without rewrite). Note: workspace transfer and cross-workspace moves are physical copies under this layout — they run as background jobs (4.10), never inline.

### Permission matrix (enforced server-side on every endpoint; automated test in Phase 4)

| Capability | Owner/Admin | Member (staff) | Client-Manage | Client-Contribute | Client-View |
|---|---|---|---|---|---|
| Browse/download in scoped workspaces | ✓ | ✓ | ✓ | ✓ | ✓ |
| Upload/organize/edit metadata | ✓ | ✓ | ✓ | ✓ (allowed folders) | — |
| Export/renditions | ✓ | ✓ | ✓ | ✓ | download presets only |
| Push to connections | ✓ | ✓ | — | — | — |
| Manage connections / see credentials UI | ✓ | ✓ | — | — | — |
| Share links, inbox management | ✓ | ✓ | ✓ | — | — |
| Invite client users | ✓ | ✓ | — | — | — |
| Workspace create/rename/archive/delete/transfer | ✓ | — | — | — | — |
| Billing, account settings, staff management | ✓ (billing: owner) | — | — | — | — |

---

## 4. Workflows (walk through every one before building)

### 4.1 Freelancer signup & onboarding
1. Lands on marketing site (or upsell from Easy Image) → **Start free**.
2. Registers: e-mail + password (`password_hash`), e-mail verification link. No credit card for Free.
3. First-run wizard: "Create your first client" → workspace name + optional website URL → empty library with 3-step checklist overlay: **① Drag in images ② Try an export ③ Connect the website**.
4. Sample preset pack auto-created (Blog hero 1600×900 WebP, Thumbnail 600×600 WebP, Full-width 1920 WebP, Logo PNG untouched).
Account settings include: change e-mail (verify at both addresses), change password (re-auth), delete account (see 4.11), data export (see 4.12).

### 4.2 Agency sets up a new client
1. Sidebar: **+ New client** → name, color/logo (UI chip + client portal), website URL(s) — multiple websites per client supported; each website can hold a production and a staging connection.
2. Optionally pick a **folder template** (Logo & Brand / Team / Blog / Products / Headers) — account-level, editable.
3. Optionally connect the website(s) (4.6) and invite the client (4.3).
Agency members get a **client switcher** (sidebar + ⌘K). All-clients dashboard: storage per client, last activity, connection health.

### 4.3 Client gets a login (invitation flow)
1. Workspace → **People** → *Invite client* → e-mail + permission level: **View & download** (default) / **Contribute** (upload into allowed folders) / **Manage** (organize, share links, inbox — never connections, billing, or workspace lifecycle; see matrix §3).
2. Client receives branded e-mail (agency logo on Agency tier) → sets own password → sees **only** their workspace(s). Standard self-service flows (password reset, e-mail change) work for client users too. Same login invited by multiple agencies → workspace picker.
3. Agency can revoke anytime; revocation kills sessions. Invitations expire after 14 days, resendable.
4. Zero-login alternative: **Share link** (4.8).

### 4.4 Uploading & organizing (the media manager)
- Drag files/folders anywhere → background upload queue (parallel ×3, per-file progress, retry). Folder drops recreate structure. **Resumable chunked uploads**: 8 MB chunks with index + finalize call (works under any `post_max_size`), orphaned chunks swept by a cleanup job; resume-after-reload is post-launch.
- On upload (server): validate (reuse Easy Image `security.php` deep-MIME checks; SVG sanitized), extract metadata, sha256 → duplicate warning ("already in *Blog/2026* — add anyway / skip / go to it"), generate 240/480/1024 thumbs, DB row. Images: JPG, PNG, WebP, AVIF, GIF, HEIC, SVG. Brand files: PDF, EPS, AI, WOFF/WOFF2/TTF/OTF, ICO. 100 MB/file.
- Organize: left folder tree (counts, drag to re-parent), drag assets onto tree/grid folders, multi-select (click, shift-range, ⌘-click, ⌘A, drag-lasso), **sticky bulk bar** (Move / Tag / Rename / Collection / Download / Export / Push / Delete). Move-to-another-workspace lives under Move (background copy job, quota-checked, activity-logged).
- Find: instant search (name, alt, tags, caption) per workspace or all clients; filters: type, orientation, min-size, untagged, never-pushed. (Search engine: start MySQL — but prefix-match via `LIKE` on a normalized name column, FULLTEXT for words; if <200 ms target fails at 10k assets, adopt Meilisearch — decision checkpoint in Phase 2 gate.)
- Preview: spacebar quick-look + arrows; info panel with metadata, tags, editable alt/title, versions, renditions, **pushed-to history**.
- Trash per workspace, 30-day retention, restore. Trashed assets make their share links show "no longer available".

### 4.5 Edit & export (the Easy Image moment)
1. Select 1–N assets → **Export** (or drag onto a preset).
2. Export dialog = the Easy Image settings panel, reorganized: left = presets, right = the familiar modes (Resize / Crop / Optimize), format, quality/target-size, enhance/effects, and the **renamer** ({name}, {nn}, {date}, prefix/suffix…). Manual crop via Cropper.js per image (automatic 9-point fallback for the rest of the batch).
3. Output: **Download** (single or server-side ZIP), **Save as renditions**, or **Push** (4.7).
4. "Save these settings as preset" always one click away. Full feature parity with free Easy Image is a Phase 3 gate item.
Processing runs server-side through `ImageProcessor` in the job queue with progress UI; small batches (<10) inline.

### 4.6 Connecting a website
Workspace → **Connections** → *Add connection*: pick website (or create one) + environment (production/staging) + type. Every connection ends with **"Send test image"** and gets a health badge (green/amber/red, last checked; re-verified weekly).
- **WordPress (v1)**: site URL + username + **Application Password**. Wizard notes the hard requirements honestly: client site must be HTTPS (app passwords are disabled on plain HTTP) and pushes are capped by the host's `upload_max_filesize` — the test-image step runs a **preflight** that detects stripped Authorization headers (shows the `.htaccess` fix) and probes the practical size cap, stored per connection and enforced with a warning at push time. The Phase 7 **connector plugin** removes these caps (pull model) and adds folders/thumbnail guarantees.
- **FTP / SFTP (v1)**: host, port, user, password or SSH key (key recommended), remote base path; SFTP host-key pinning; browse-remote-dir picker.
- **S3-compatible / Bunny Storage (v1)**: endpoint/bucket/keys, prefix; optional public base URL so pushed images get a copyable CDN URL.
- **Joomla (v2)**: URL + API token (`X-Joomla-Token`), core media Web Services.
- **Shopify (v2)**: custom-app Admin token, `write_files`, `fileCreate` from our signed URL.
- **Wix (v2)**: site API key + site ID, Import-File-by-URL.
- **Webflow (v2)**: site token `assets:write`, two-step S3 upload, MD5 dedupe.
- **Squarespace**: no general media API exists — listed as "manual download" with explainer, never promised.
Credentials envelope-encrypted (§6), shown as last-4 only, never logged. Docs teach least privilege: dedicated WP user with `upload_files` only; single-bucket S3 policies; SFTP keys over passwords.

### 4.7 Push to website
1. Export dialog → **Push** → pick connection (+ per-type options: WP = alt source, title pattern, folder if plugin; FTP/S3 = remote path pattern `/images/{yyyy}/{mm}/`). Staging connections are visually distinct; "duplicate this push to production" offered after a staging push.
2. Confirm: N images → preset → connection, size estimate (warns if any file exceeds the connection's probed cap). Push.
3. Queue: render rendition → transfer (binary push, or signed-URL import for platforms that pull) → record. Per-item status, platform error surfaced, individually retryable, failures never block the rest. Mid-job network loss leaves consistent, resumable state.
4. Results: WP → links into wp-admin media items; FTP/S3 → final public URLs (copy all).
5. **Pushed-to history** per asset (where, when, preset, version, by whom). Re-push warning is keyed on asset *version* + preset + connection — pushing a new version never false-warns.
6. **Version propagation (the logo-update flow):** replacing an asset with a new version marks all its previous pushes **outdated**; the asset panel and a per-workspace "Outdated on website" list show them, with one-click **Re-push latest** (same preset + connection, and — via connector plugin — replacing the file in place where the platform allows it). This is deliberate, never automatic.

### 4.8 Share links (client-facing, zero login)
- Select assets/folder/collection → **Share** → public gallery page: grid, per-image download, ZIP-all, size choice (*original* or any **pre-cached rendition** — anonymous visitors never trigger processing; the owner picks which preset sizes to offer and they're rendered once at share time).
- Options: password, expiry (default never — *anti-WeTransfer*), allow-original toggle, notify-on-download.
- Management: per-workspace **Share links** page lists all active links with view/download counts, revoke button. Trashed assets/deleted workspaces auto-kill their links.
- Branding: Easy Image-branded on Free; account logo on paid; full white label + custom domain on Agency. Every public page footer has a **Report abuse** link (DMCA/takedown flow, ToS item).
- Abuse controls: share and signed-URL endpoints rate-limited per IP (reuse Easy Image limiter), bandwidth ceiling per link per day (soft, bumps to a friendly throttle page).

### 4.9 Upload inbox (collect from clients)
- Per workspace: **Inbox** → public page "*Send images to {Agency} for {Client}*", drag-and-drop, no login. Optional note ("min 2000 px wide"), optional passcode.
- Uploads land in a holding area → review → accept-into-folder (optional auto-preset normalization) or reject. E-mail notification.
- Limits: per-inbox cap (default 500 MB, configurable), rate-limited per IP + honeypot field (Turnstile optional later). Inbox uploads **count toward account quota**; at 100% quota the inbox page closes with a friendly "library is full — contact {Agency}" message (and the owner is e-mailed).

### 4.10 Background jobs
One `jobs` table + PHP workers via cron (no Redis at this scale), **two priority lanes**: *fast* (thumbs, small ZIPs, inbox scans, health checks) and *slow* (pushes, big batches, big ZIPs, transfers) so one 20-minute FTP push can't starve thumbnails. Workers are cron-respawned loops that exit after N jobs or M minutes (prevents PHP/Imagick memory creep), take row locks, heartbeat to a status row (monitored). Every job: attempts, backoff, per-item logs, progress endpoint (polling; SSE later).

### 4.11 Billing lifecycle
- Checkout & recurring charges via **Mollie** (iDEAL/card/SEPA). Be explicit about what Mollie does *not* provide: no plan/proration engine, no tax engine, no invoice generator — these are ours:
  - **Upgrades**: immediate; one-off prorated charge for the remainder of the cycle, then new recurring amount.
  - **Downgrades/cancel**: take effect at period end. Nothing is ever deleted: over-quota storage → uploads block; over-limit workspaces → extras become read-only (owner picks which stay active); dropping below Pro → client logins are suspended (clients see a polite "access paused" page; agency warned 14 days ahead).
  - **Invoices**: generated by us (PDF, sequential numbering). VAT: NL 21% for consumers/NL businesses, reverse-charge for EU B2B with validated VAT-ID (VIES check), outside-EU no VAT. (If this grows beyond EU, revisit Stripe + Stripe Tax.)
  - **Dunning**: payment failure → retry schedule + e-mails, 14-day grace, then account read-only. Never deletion.
- Quota is **soft**: banner + e-mail at 80/95/100%; at 100% uploads and inboxes block, nothing else breaks.
- **Cancel**: staged full export offered (4.12), data retained 90 days, then purge.
- **Delete account** (GDPR, self-service): re-auth → type-to-confirm → immediate deactivation, purge after 30 days from live storage; backup snapshots expire on their own 30-day rotation, so full erasure completes within ≤60 days — stated plainly in the privacy policy.

### 4.12 Offboarding, handover & export
- **Workspace transfer**: generates an invite; recipient accepts into their own account. Pre-flight checks the recipient's quota (must fit or upgrade first). Runs as a background copy job across `{account_id}` prefixes (server-side copy on S3), then source is released. Assets, folders, presets, tags move; **connection credentials never transfer** (flagged for re-entry); share links die (privacy) and are listed for recreation.
- **Full export**: background job builds **staged ZIPs (≤2 GB each, per top-level folder)** + a metadata JSON/CSV (titles, alt, tags, folder paths, push history), delivered as expiring signed links; disk-headroom check before building. Available anytime (GDPR data portability), not just at cancel.

### 4.13 Workspace lifecycle
- **Rename**: anytime, everywhere-safe (IDs, not names, in URLs/storage).
- **Archive**: read-only, hidden from switcher by default, keeps data + quota usage.
- **Delete**: owner-only, type-name-to-confirm → immediately kills client access, share links, inboxes, connections → 30-day soft-delete (restorable) → purge job releases storage. Storage recount runs after purge.

---

## 5. Media manager — engineering spec (the make-or-break component)

- **Rendering**: virtualized grid (only visible rows in DOM), 240px WebP thumbs, blurred-placeholder progressive load, stable scroll position on data changes, "load more" sentinel + ARIA live region.
- **Data access**: windowed fetches by index range (`?offset=&limit=` on a stable sort) — virtual scrolling needs random access, so plain cursor pagination is out; cursors only for append-style feeds (activity log).
- **State**: one client-side store (tree, current page windows, selection set, upload queue, job progress). **Stack decision: Vue 3 + Vite build step.** The free site's no-build philosophy is right for landing pages, wrong for this app: virtualization + DnD + lasso at 60 fps needs SFCs, a real virtual-scroller lib, and tree-shaken builds. Vite stays small (one `npm run build` in deploy); server-rendered PHP + `shared/` layer still wraps everything outside the manager islands.
- **Drag & drop**: HTML5 DnD for internal moves (assets→folder, folder→folder, multi-drag with count badge, spring-loaded folders opening on hover); OS-file drops via a separate drop-zone overlay; the two must not conflict.
- **Selection model**: single source of truth; survives folder navigation ("12 selected in 3 folders"); esc clears; all bulk actions act on it.
- **Keyboard**: arrows move focus, space quick-look, enter open, ⌘A, del → trash, F2 rename, / search, ⌘K client switcher.
- **API**: REST-ish JSON (`/api/v1/...`), ETag on tree, optimistic UI for move/rename/tag with rollback.
- **Performance targets**: 10.000 assets/workspace at 60 fps; folder switch < 300 ms; search-as-you-type < 200 ms (strategy in 4.4; Meilisearch checkpoint at Phase 2 gate).
- **Concurrency**: two staff in one workspace — last-write-wins with activity trail; deletes always via trash so conflicts are recoverable.

---

## 6. Architecture & stack

- **Backend**: PHP 8.3, Composer (private app): `flysystem` (+ sftp adapter), `phpseclib3`, `mollie-api-php`, `firebase/php-jwt`, libsodium (bundled). **Slim 4 + PHP-DI** as micro-framework: small enough to read in an afternoon, gives clean middleware (auth, rate limit, workspace scoping).
- **Engine**: lift `ImageProcessor.php` + `security.php` from easy-image into a shared `src/Engine/` package used by both sites (free site migrates to it in Phase 3).
  - **Imagick delegates are a hosting landmine**: HEIC needs libheif, AVIF encode is slow/memory-hungry. Phase 0 gate: delegate probe script (reuse the engine's runtime probing) must pass on the production box; set `Imagick::setResourceLimit` (memory/map/disk) explicitly; AVIF encodes always via the slow job lane; keep a `libvips` fallback decision on file if Imagick disappoints at scale.
- **DB**: MariaDB/MySQL, migrations as numbered SQL + tiny runner (or Phinx).
- **Frontend**: server-rendered PHP shell (reusing `shared/` header/footer/i18n/theme, Bootstrap 5) + Vue 3/Vite islands for manager, export dialog, connections, upload queue.
- **Auth**: DB sessions, `password_hash`/`password_verify`, e-mail verification, rate-limited login, e-mail-change with dual verification, optional TOTP 2FA (Phase 8), support impersonation ("log in as", fully logged).
- **Secrets/credential encryption**: envelope encryption with libsodium — per-account data key encrypts each credential (AES-256-GCM/secretbox), data keys wrapped by a **master key stored in the app-server environment, never in DB or DB backups**. Honest threat model: on a single VPS, app and DB share a box, so the win is protecting DB dumps/backups and SQL-injection exfiltration, not root compromise — documented as such. Rotation procedure: introduce new master key, re-wrap all data keys (background job), retire old. At revenue scale, move master key to a KMS (Scaleway/AWS) — designed so only the unwrap call changes.
- **Queue/cron**: per §4.10. `fastcgi_finish_request` trick reused for fire-and-forget micro-jobs.
- **E-mail**: transactional provider (Postmark/Resend/SES — pick in Phase 1). Templates: verify, e-mail-change, invite (staff/client), reset, share-notify, inbox-notify, quota 80/95/100, billing set, outdated-push digest (optional).
- **Custom domains (Agency)** — *a real subsystem, not a checkbox*: customer CNAMEs point to a dedicated ingress running **Caddy with on-demand TLS** (issuance gated by an "is this domain registered to an account?" check endpoint), proxying to the app. Only the client portal + share pages are served on custom domains (never the admin app); cookies scoped per host; Host allow-list from DB. Budgeted as its own chunk of Phase 8.
- **Hosting**: LAMP-style VPS (matches current workflow) + the Caddy ingress later. Needs PHP 8.3 + verified Imagick delegates, ample disk, off-site **backups** (nightly DB dumps + restic for storage, 30-day rotation, restore rehearsed), staging subdomain, HTTPS everywhere.
- **Observability**: Sentry (or log shipping) for app + worker, job-failure alerting to e-mail, uptime monitor on app and worker heartbeat.
- **GDPR**: EU hosting, DPA template, sub-processor list (Mollie, e-mail provider, host), self-service data export (4.12) and account deletion (4.11) as *working endpoints*, backup-expiry erasure statement. Keep Easy Image's privacy-first promises ("we never scan or train on your images").

**Domain/name — DECIDED (2026-07-28)**: product name **Easy Image** (paid app), domain **easy-image.app**, connector-plugin slug `easy-image-connector`, e-mail sender `@easy-image.app`. Family branding with the free site wins over a standalone brand. Accepted tradeoffs from the naming research: easyimage.app (no hyphen) is dormant in third-party hands and easyimage.com is parked — mistyped-domain leakage is possible; "Easy Image" is a crowded, weakly-ownable name (CKEditor legacy service, WP plugins). Mitigations: also register easyimage.io/easyimage.pro/easyimagepro.com as redirects; brand consistently as "Easy Image App" in external copy.

---

## 7. Build phases

Each phase ends with a **☑ recheck gate**: working deploy on staging, listed acceptance checks pass, and a 15-minute self-demo of the affected §4 workflows end-to-end. Don't start the next phase on a red gate.

### Phase 0 — Decisions & skeleton (≈1 wk)
Name/domain; pricing sign-off (§2); repo + staging + local dev (PHP 8.3/Imagick/MariaDB); migration runner; deploy script + `php -l` CI-lite; shared `Engine/` extracted with golden-file smoke tests; **Imagick delegate probe on the production box (HEIC read, AVIF encode, resource limits set)**.
**☑ Gate:** staging serves a routed page; engine converts golden images identically to the free site; delegate probe green.

### Phase 1 — Accounts & the library core (≈3–4 wk)
Auth (register/verify/login/reset/e-mail-change/sessions), accounts, workspaces CRUD (incl. rename/archive; delete = 4.13) + switcher, folder tree, **resumable chunked uploads** (spec in 4.4) with validation/dup-warning/thumbs + orphan-chunk sweeper, brand-file handling, basic grid (virtualization may land in Ph 2), download original, trash, activity log, storage accounting, e-mail provider + first templates.
**☑ Gate:** workflows 4.1, 4.2 (minus templates), upload-half of 4.4, and 4.13 demoed; 1.000-image upload passes; a 60 MB file uploads through 8 MB chunks on default PHP limits; security checks confirmed; backup + restore rehearsed once.

### Phase 2 — Media manager, seriously (≈3–4 wk)
Virtualized grid + windowed fetch, selection model, internal DnD (assets + folders), bulk bar (incl. move-across-workspaces job), search + filters + tags, quick-look + info panel, collections, folder templates, keyboard map.
**☑ Gate:** full 4.4 demo incl. §5 spec bullets; 10k-asset seeded workspace hits performance targets (**search checkpoint: stay MySQL or adopt Meilisearch — decide now**); a non-developer test user organizes 50 images without instruction.

### Phase 3 — Processing & export (≈2–3 wk)
Export dialog with full engine (modes/formats/quality/target-size/enhance/effects/renamer/manual crop), presets, renditions cache, server-side ZIP, **job queue with both lanes + worker lifecycle (4.10)**, progress UI, save-as-renditions. Free site switched to shared `Engine/`.
**☑ Gate:** workflow 4.5 demo; 100% feature-parity checklist vs. free Easy Image; 100-image batch with progress + renames; a deliberately slow job in the slow lane doesn't delay thumbnails.

### Phase 4 — Sharing & client access (≈2–3 wk)
Permission matrix (§3) as enforced middleware, client invitations + scoped client UI, versions UI (upload v2, history), share links (password/expiry/revoke/management page/report-abuse), pre-cached-rendition size choice, upload inbox + review + quota behavior, all related e-mails.
**☑ Gate:** workflows 4.3, 4.8, 4.9 with two real browsers; a "client" tester downloads an image unaided; **automated permission-matrix test** (client cannot reach connections/billing/other workspaces/foreign IDs — IDOR sweep on every endpoint); share pages rate-limited.

### Phase 5 — Billing & tiers (≈3 wk — includes DIY invoice/VAT work Mollie doesn't do)
Mollie subscriptions, plan gates + storage/workspace quotas (soft, per 4.11), upgrade w/ prorated one-off, downgrade-at-period-end incl. workspace read-only + client-login suspension paths, our own invoice PDFs + VAT/VIES logic, dunning/grace, **account deletion + data export endpoints (GDPR)**, admin panel v1 (accounts, usage, impersonate).
**☑ Gate:** every 4.11 branch in Mollie test mode incl. failed payment and downgrade-over-limit; invoice PDF validates (NL VAT + reverse-charge cases); quota banners at 80/95/100; delete-account purges on schedule.

### Phase 6 — Push v1: WordPress, (S)FTP, S3/Bunny (≈3 wk)
Websites + connections UI (environment tags), envelope encryption, test-transfer + **preflight probes** (WP auth-header + size cap, HTTPS requirement messaging), health badges + weekly re-check; push flow 4.7 with per-item retry, pushed-to history keyed on version, re-push warning, **outdated-after-new-version list + re-push-latest**; staging→production duplicate action.
**☑ Gate:** 4.6 + 4.7 demoed against a real WP site, a shared-hosting FTP, and an R2/Bunny bucket; kill-the-network mid-push → consistent, resumable state; credentials unreadable in a DB dump and absent from logs; version-update → outdated → re-push cycle demoed. **→ Soft-launch beta here: 5–10 real freelancers get free Pro — now they can test the actual killer feature before pricing is locked.**

### Phase 7 — Connector plugin & platform wave 2 (≈3–4 wk)
**Advanced Image Connector** WP plugin (pairing-code handshake → API token; pull-from-signed-URL import; `wp_generate_attachment_metadata`, alt/caption; FileBird folders; replace-in-place for re-push; deletion webhook), wp.org listing. Then Joomla, Shopify, Wix, Webflow (per 4.6). Squarespace explainer.
**☑ Gate:** plugin works from ZIP on fresh WP *and* a hardened host (ModSecurity); each platform one green end-to-end push on a real test site; per-platform docs with screenshots; beta feedback triaged into Phase 8/10.

### Phase 8 — Agency & white label (≈3–4 wk — custom-domain subsystem is the big rock)
Staff roles, per-workspace client branding, white-label share pages + client portal, **custom domains via Caddy on-demand TLS ingress (§6)**, branded e-mails, all-clients dashboard, workspace transfer (4.12 with quota preflight + background copy), 2FA.
**☑ Gate:** full agency journey: account → 3 clients → staff + client invited → client sees branded portal on a real custom domain with valid TLS; transfer a 5 GB workspace between two accounts; admin app confirmed unreachable via custom domains.

### Phase 9 — Launch hardening & marketing (≈2 wk, overlaps 8)
Load test (k6: 50 concurrent browse+push), security pass (OWASP top-10, upload fuzzing, second IDOR sweep, abuse-limits verification), GDPR pack finalized, marketing site (reuse Easy Image SEO machinery: feature pages, "vs Filecamp / WeTransfer / Cloudinary" comparisons, NL+EN), Easy Image upsell touchpoints, onboarding drip, docs, status page, ToS + DMCA/report-abuse flow.
**☑ Gate:** external scan clean; a stranger completes signup→upload→export→push from docs alone; beta cohort NPS/pricing feedback incorporated.

### Phase 10 — Post-launch backlog (re-prioritize on real feedback)
AI auto-tagging **with manual override** · visual/color search · duplicate finder · comments/approvals · download/usage analytics dashboards · brand-guideline page per workspace (Brandy-as-a-feature) · embeddable picker widget for arbitrary CMSs · Craft/Statamic/October connectors · public API + Zapier/Make · browser extension / desktop drop helper · resume-after-reload uploads · client-side pre-upload compression · storage-level dedupe · SSO · KMS migration for master key.

**Total to launch: realistically 26–34 focused weeks solo** (was 22–29 in v1.0; the critique correctly priced up billing DIY, chunked uploads, the custom-domain subsystem, and the build-step frontend). Biggest schedule risks: Phases 5, 6, 8.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Media manager UX not good enough → "another Drive" | Dedicated phase + gate + real-user test; Vue/Vite decided upfront; virtualization + DnD prototyped first |
| Push fails on messy real hosts (WAF, upload caps, HTTP-only sites) | Preflight probes + honest per-connection caps in Phase 6; connector plugin (pull model) is the structural fix in Phase 7 |
| Site credentials = crown-jewel liability | Envelope encryption with documented threat model, least-privilege onboarding, never-display, master key outside DB/backups, rotation procedure, breach runbook |
| Beta validates the wrong product | Beta moved to after Phase 6 so testers price the *push* feature, not a Filecamp clone |
| Storage cost/abuse | Type validation, 100 MB cap, quotas incl. inbox, share-page rate + bandwidth limits, report-abuse flow, renditions regenerable |
| Solo scope creep | Gates are §4 workflow demos, not feature lists; Phase 10 is a parking lot |
| Competitor adds push (Filecamp/BrandBay) | Speed, connector-plugin depth, Easy Image SEO funnel as moat |
| Mollie billing DIY underestimated | Phase 5 sized at 3 wk with explicit invoice/VAT/dunning scope; Stripe fallback documented |
| HEIC/AVIF hosting surprises | Phase 0 delegate probe on the real box; slow-lane AVIF; libvips fallback on file |

## 9. Open questions (answer before or during Phase 0)
1. ~~Name & domain~~ **DECIDED: easy-image.app** (see §6; register the domain + sibling redirects immediately).
2. Mollie-only for launch (NL/EU) — confirmed? Stripe+Tax only if going global later.
3. Vue 3 + Vite build step — confirm (recommended; the no-build alternative costs more than it saves here).
4. Beta cohort: which 5–10 freelancers get free Pro at Phase 6?
5. Does free Easy Image get a visible "Pro" nav item at launch, or quiet rollout first?
6. E-mail provider: Postmark vs. Resend vs. SES (pick in Phase 1).

---

*Research inputs: codebase analysis of `public_html` (Easy Image engine, shared i18n/SEO/theme layers, security stack — all reusable; no auth/DB exists today), competitor & pricing research (Filecamp, BrandBay, Dash, Brandy, Pics.io, Air, Cloudinary, ImageKit, Stockpress — 2026-07), platform API feasibility research (WordPress REST/app-passwords + connector-plugin pattern, Joomla media Web Services, Wix/Webflow/Shopify APIs, Squarespace = no media API, S3/Bunny, phpseclib/Flysystem, envelope encryption), and a 25-finding adversarial critique pass whose critical/important items are all incorporated in this v1.1.*
