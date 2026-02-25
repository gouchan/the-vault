# Changelog

All notable changes to Rosary (formerly The Vault).

---

## [Unreleased]

*(nothing pending)*

---

## 2026-02-25 — tldraw License + UX Improvements

### Added
- **tldraw hobby license key** — watermark removed on `*.the-vault-one.vercel.app` (valid through 2031-02-23)
- **"+ Image" upload button** on home page and "Add Bead to Garland" dialog
- **"Images" filter tab** on home page — filters beads with `media_type: "image"`
- **"Connect" button** in garland toolbar — one-click arrow tool activation for drawing connectors
- **Toast notification** — "Connected — fields synced" appears when two beads are connected via arrow
- **"How to Connect Beads"** step-by-step guide in Help Modal
- Reusable `uploadImageAndCreateBlock` utility for image upload flows

### Changed
- Light mode: `#faf9f6` (off-white) background + `#f0f0f0` (smoky white) cards — less harsh
- Dark mode: `#2c2c2c` (charcoal) background + `#444444` (lifted) cards — less contrasty
- Home page filters refactored from type-based to key-based system (supports compound filters like Images)
- "Arrow" renamed to "Arrow / Connect" in Help Modal shortcuts
- `getBlocks()` now accepts optional `media_type` filter parameter

---

## 2026-02-17 — Rebrand: Rosary

### Changed
- App renamed from **The Vault** → **Rosary**
- Boards → **Garlands** throughout all UI, labels, and copy
- Blocks → **Beads** throughout all UI, labels, and copy
- Subheader updated to "String ideas together"
- Home page h1 → "Rosary" (title case)
- Sidebar wordmark → "ROSARY" (all-caps, brand lockup)
- Sidebar board icon → CircleDot (on brand with rosary bead motif)
- Garland list items in sidebar → CircleDot icons
- "New Board" → "New Garland" in sidebar and command palette
- Filter tabs: "All" → "All Beads", removed Garland filter (garlands are nav, not filters)
- Create buttons: removed Board/Garland option (garlands created via sidebar only)
- Board detail page: "Garland not found", "Untitled Garland", "Add Bead to Garland"
- Search page: "all your beads"
- BlockDetailPanel: "Edit Bead", "Delete this bead?", "sub-bead"

### Added
- **HelpModal** — keyboard shortcuts and concepts guide, anchored bottom-left of sidebar
- Help button (?) in both collapsed and expanded sidebar states
- Geist Sans font (via `geist` npm package) applied globally

### Fixed
- Removed `LayoutGrid` import from page.tsx (unused after filter cleanup)

---

## 2026-02-17 — tldraw Restored

### Reverted
- Removed Excalidraw, restored tldraw as the canvas engine
- Excalidraw migration failed due to image rendering issues and 1MB snapshot limits

### Fixed
- Removed CSS override that was hiding tldraw watermark — now visible per license terms
- Cleared stale Excalidraw-format snapshots from database

### Changed
- Updated tldraw from v4.3.1 to v4.3.2

---

## 2026-02-15 — Excalidraw Migration (Reverted)

### Added
- ExcalidrawCanvas component with autosave, history, block sync
- blockElements.ts helper for block-to-element conversion
- Image loading system with fetchImageAsDataURL

### Removed
- TldrawCanvas, VaultBlockShape, lib/tldraw/

### Issues
- Images showed placeholder icons, never rendered actual content
- Base64 image data in snapshots exceeded 1MB Server Action limit
- **Fully reverted on 2026-02-17**

---

## 2026-02-13 — Phase 3.5: UI Polish & Code Audit

### Added
- Sticky yellow accent throughout UI
- Collapsible sidebar with drag-reorder and pin favorites
- Horizontal dot timeline for history scrubbing
- Tighter Moleskine dot grid (12px spacing)

### Fixed
- Race condition in preview exit (cancelled flag pattern)
- Timeout leak on unmount
- React Hooks order violation in HistoryTimeline
- Sort performance (getBoardOrder outside comparator)

---

## 2026-02-12 — RLS Security & Bug Fixes

### Added
- Loading skeletons and pagination
- Supabase timeout and retry logic
- GIF playback toggle and video play buttons

### Fixed
- Canvas rendering issues
- Prompt renamed to Note type

---

## 2026-02-10 — Phase 3: tldraw Infinite Canvas

### Added
- tldraw v4 integration with custom VaultBlockShape
- Full drawing tools: freehand, shapes, text, arrows
- canvas_snapshots table (JSONB persistence)
- canvas_history table (60s periodic snapshots)
- HistoryTimeline component
- Autosave with visual indicator
- Arrow connector syncing between blocks
- Theme sync (next-themes to tldraw colorScheme)

### Removed
- Custom MoodboardCanvas (655 lines)
- Custom CanvasView (374 lines)

---

## 2026-02-08 — Phase 2: Nested Blocks & Moodboard

### Added
- block_connections for parent/child nesting
- Custom MoodboardCanvas with pan/zoom
- Image upload (drag-drop, paste, file picker)
- Sticky notes, resize handles, visual connectors
- Connector field syncing

---

## 2026-02-06 — Phase 1: Foundation

### Added
- Next.js 16 project with App Router
- Supabase integration (Postgres + Storage)
- Block system (Person, Reference, Prompt, Board)
- Dashboard, grid views, search, command palette
- OG metadata auto-fetch
- Dark mode with Moleskine dot-grid
