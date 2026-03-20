# Rosary — Dev Log

## 2026-03-20 — Phase II: NoteCard, ChannelGrid, drag-drop, canvas file drops

### NoteCard component
- New `NoteCard.tsx` — are.na-style text card: title, content preview (line-clamp-8), tags, "Note" type indicator at bottom
- `BlockCard` now routes `"note"` → `NoteCard`, keeps `"prompt"` → `PromptCard`
- **Files:** `components/blocks/NoteCard.tsx` (new), `components/blocks/BlockCard.tsx`

### ChannelGrid (are.na-style uniform grid)
- New `ChannelGrid.tsx` — fixed square-aspect cards (4→3→2→1 responsive columns)
- Each card: image fill, text preview for notes, icon fallback for empty blocks
- Block type badge (bottom-left): `Link2`, `FileText`, `User`, `Layers` by type
- Title + hostname rendered below card (are.na style)
- Board page now has 3-way view toggle: Masonry (Grid3x3) | Channel (LayoutGrid) | Canvas (Pencil)
- **Files:** `components/views/ChannelGrid.tsx` (new), `app/board/[id]/page.tsx`

### Drag-drop image upload (DropZone)
- New `DropZone` wrapper component: drag image files over grid/channel views → upload overlay → Supabase Storage → creates reference blocks
- Handles multi-file drops, 10MB limit, loading spinner
- Wired into HomePage grid and BoardPage (grid + channel views)
- **Files:** `components/ui/drop-zone.tsx` (new), `app/page.tsx`, `app/board/[id]/page.tsx`

### Canvas file drop support
- `handleFileUpload` existed but was never registered with tldraw
- Added `registerExternalContentHandler("files", ...)` in `handleMount` callback
- Drop image files directly onto tldraw canvas → upload → creates vault-block shape at drop point
- **File:** `components/views/TldrawCanvas.tsx`

---

## 2026-03-19 — Image proxy + canvas UX fixes

### Image proxy (`/api/img-proxy`)
- New endpoint fetches external images server-side and pipes them back with 24hr cache headers
- SSRF-guarded: only `http/https`, only image content-types allowed
- Solves hotlink protection, CORS redirect chains, auth-gated hosts (GitHub, Twitter, etc.)
- **File:** `app/api/img-proxy/route.ts` (new)

### OG fetch now stores proxied URLs
- `og-fetch` returns `/api/img-proxy?url=...` instead of raw external URLs
- All **new beads** get a proxied thumbnail from day one
- **File:** `app/api/og-fetch/route.ts`

### VaultBlockShape: proxy layer + clickable links
- **Old beads** (raw external `thumbnailUrl`) are rewritten through proxy at render time — no DB migration needed
- Click image area or hostname row → opens URL in new tab
- No-image fallback: 32px favicon + hostname + ↗ icon, entire area clickable
- External-link badge (top-right corner) on image shapes
- Bottom bar: favicon + hostname + ↗ always clickable
- **File:** `lib/tldraw/VaultBlockShape.tsx`

### Verified end-to-end (live, in-browser)
- `og-fetch` → GitHub, Stripe, Wikipedia: all return proxied URLs ✅
- `img-proxy` → GitHub avatar: `200 OK, image/png` ✅
- In-browser fetch chain: 1561 bytes delivered ✅
- New Next.js bead (grid view): OG image renders with logo ✅
- Canvas screenshot bead: image loads via proxy (2430×1534) ✅
- Google Docs / Descript: favicon fallback (correct — no OG image exists) ✅

---

## 2026-03-18 — Phase I shipped

### Vision locked
Personal blackboard in the spirit of Pinterest (visual, image-heavy) + Are.na (intentional collecting with connections). Personal-first; profiles/teams on the roadmap for Phase II.

### Dark mode tokens
Dark mode confirmed at `#1E1E1E` base, `#2C2C2C` accents (done prior session, confirmed today).

### OG image fix
`/api/og-fetch` now resolves relative `og:image` URLs against the page's base URL (e.g. `/images/og.jpg` → `https://example.com/images/og.jpg`). Also handles protocol-relative `//...` URLs.
- **File:** `app/api/og-fetch/route.ts` — `resolveUrl()` helper added

### Pinterest-style ReferenceCard
Full redesign of `ReferenceCard`:
- Image fills the entire card (no fixed aspect-ratio wrapper — natural image height)
- Hover: gradient overlay reveals title, favicon (Google S2), external-link button
- No image → text card with favicon + title + description + hostname
- Broken image → falls through to text card via `onError` → `setImgError(true)`
- **File:** `components/blocks/ReferenceCard.tsx`

### Lightbox
Click any image card → full-screen viewer:
- `position: fixed`, `z-index: 9999`, black/90 + blur backdrop
- Top bar: favicon, title, open-original link, close button
- Esc key closes; click outside image closes
- `document.body.style.overflow = "hidden"` while open
- **File:** `components/ui/lightbox.tsx` (new)

### Masonry grid tightened
- Columns: 5 (default) → 4 (1536px) → 3 (1280px) → 2 (768px) → 1 (480px)
- Gutter reduced: 16px → 10px (more pins per row, tighter Pinterest feel)
- **Files:** `components/views/GridView.tsx`, `app/globals.css`

### Profile foundation
- `supabase/profiles.sql` — `profiles` table with username, display_name, bio, avatar_url, cover_url, social links; seed row `username='me'`
- `lib/actions/profiles.ts` — `getProfile(username)`, `upsertProfile(data)` server actions
- `app/profile/page.tsx` — profile page with cover photo, avatar, display name, bio, social links, inline edit mode
- Sidebar: added Profile nav item (User icon → `/profile`)
- **Note:** Run `supabase/profiles.sql` in Supabase dashboard to activate

---

## 2026-02-26

### Dark mode background nudge
- Changed dark mode `--background` from `#2c2c2c` → `#232323`
- Updated `--sticky-yellow-fg` to match (`#232323`)
- **File:** `app/globals.css`

### CircleDot favicon
- Added `app/icon.svg` — Next.js App Router auto-serves it as the favicon
- SVG is the same CircleDot used in sidebar for branding consistency
- **File:** `app/icon.svg` (new)

### Sidebar garland UX overhaul
- **Pin moved left:** Pin button now sits right next to CircleDot icon
- **Pin = CircleDot:** The CircleDot itself is the pin toggle — fills yellow (like a top-down pushpin) when pinned, hollow outline when not
- **Delete on hover:** Trash2 icon appears at far right on hover; requires `window.confirm()` before deleting; redirects to `/` if viewing the deleted garland; dispatches `vault:refresh`
- **File:** `components/layout/Sidebar.tsx`

### Connector preview sheet
**Problem:** When connecting two beads with an arrow, fields were auto-synced silently — users had no idea what was being shared.

**Solution:** Show a preview card at the connection point before syncing.

- `getConnectorPreview(fromId, toId)` — computes which fields can transfer without touching the DB
- `syncSelectedFields(fromId, toId, keys, syncTags)` — syncs only user-chosen fields
- `ConnectorPreviewSheet` component: checkbox list of transferable fields (pre-checked), blocked fields (greyed), tags row, Skip / Sync → buttons
- Triggered by `registerAfterCreateHandler("binding", ...)` in tldraw for reliable detection
- `seenConnectionsRef` prevents duplicate sheets per arrow
- **Files:** `lib/actions/connectors.ts`, `components/views/ConnectorPreviewSheet.tsx` (new), `components/views/TldrawCanvas.tsx`

### Connector sheet positioning fix (part 1)
**Problem:** Sheet rendered `position: absolute` at `bottom-4 left-1/2` — hidden behind tldraw's bottom toolbar.

**Fix:** Compute screen midpoint between connected shapes using `editor.getShapeMaskedPageBounds()` + `editor.pageToScreen()`, then position sheet near the connection midpoint.
- **Commit:** `303ac63`

### Connector sheet positioning fix (part 2)
**Problem:** Sheet still potentially clipped because it was `position: absolute` inside an `overflow: hidden` container. Also, `editor.pageToScreen()` returns container-relative coords, not viewport coords — clamping math was wrong.

**Fix:**
- Added `containerRef` on the tldraw wrapper div
- Offset `editor.pageToScreen()` by `containerRef.getBoundingClientRect()` → true viewport coords
- Changed sheet to `position: fixed` with `z-index: 9999` — floats above everything, `overflow: hidden` has zero effect
- **Commit:** `263553a`

---

## Domain / infrastructure notes
- App lives at `the-vault-one.vercel.app` (Vercel project name)
- tldraw hobby license is locked to `*.the-vault-one.vercel.app`
- Explored Rosary-branded domains: `userosary.com` available and liked, deferred for now
- GitHub: `https://github.com/gouchan/the-vault`
