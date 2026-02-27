# Rosary — Dev Log

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
