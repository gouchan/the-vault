# Dev Log

Development history of The Vault, built in collaboration with Claude Code over a series of sessions.

---

## Phase 1 — Foundation

**Goal:** Replicate the core experience of [eden.so](https://eden.so) — a personal creative curation hub.

### What was built:
- Next.js 16 project scaffolding with App Router and Turbopack
- Supabase integration (Postgres + Storage)
- Block system with 4 types: Person, Reference, Prompt, Board
- Dashboard with pinned blocks and recent activity
- Grid views with masonry layout (react-masonry-css)
- Block detail pages with full CRUD
- Tag system with colored badges
- Full-text search powered by Postgres tsvector
- Command palette (Cmd+K) via cmdk
- OG metadata auto-fetch — paste a URL, get title/description/image
- Dark mode by default with CSS custom properties

### Key decisions:
- **Single `blocks` table** with type discriminator instead of separate tables per type — simpler queries, universal relationships
- **Server Actions** over REST API — less boilerplate, type-safe, works with React Server Components
- **No auth** — designed as a single-user local tool first

---

## Phase 2 — Nested Blocks + Moodboard Canvas

**Goal:** Make boards feel spatial. Boards should be infinite canvases where you can arrange, resize, and connect blocks.

### What was built:
- `block_connections` table for parent/child nesting (any block can contain any block)
- Board page with grid/canvas view toggle
- Custom MoodboardCanvas component with:
  - Pan and zoom (mouse wheel, trackpad, +/- keys)
  - Block drag-and-drop positioning
  - Image upload (drag-drop, paste, file picker) to Supabase Storage
  - Sticky notes (double-click canvas to create)
  - 8-direction resize handles on all blocks
  - Visual connectors (purple dashed SVG lines between blocks)
  - Connector field syncing — connecting two blocks copies shared data (tags, URLs, descriptions, notes, OG metadata) from source to target
  - Autosave positions (debounced 800ms)
- `canvas_positions` table for spatial layout persistence
- `canvas_connectors` table for visual connections
- `/api/upload` route with server-side validation (image types only, 10MB max)

### Bugs fixed:
- **"Failed to fetch" TypeError on navigation** — caused by a stray `package-lock.json` in `~/` that made Turbopack infer the wrong workspace root. Deleted the stray file, cleared `.next` cache
- **"Bucket not found"** on image upload — user needed to create the `vault-images` storage bucket in Supabase
- **Hydration mismatches** — theme toggle needed `mounted` state guard

---

## Phase 3 — tldraw Infinite Canvas

**Goal:** Replace the custom canvas with tldraw for proper infinite canvas, freehand drawing, shapes, and native arrow connectors. Add autosave and a history timeline.

### What was built:
- Migrated from custom MoodboardCanvas to tldraw v4.3.1
- Custom `VaultBlockShape` extending `BaseBoxShapeUtil` — renders block data (images, people cards, notes) as native tldraw shapes
- Full tldraw feature set: freehand drawing, shapes, text, arrows, multi-select, undo/redo
- `canvas_snapshots` table — stores entire tldraw state as JSONB per board
- `canvas_history` table — periodic snapshots (every 60s of active editing) for timeline scrubbing
- HistoryTimeline component — scrub bar to view and restore past board states
- Autosave with visual indicator ("Saving..." / "Saved")
- Migration path: existing boards with `canvas_positions` data auto-migrate to tldraw snapshots on first load
- Arrow connector sync — tldraw's native arrow tool triggers field syncing between connected vault-block shapes
- Image upload preserved (drag-drop, paste onto canvas)
- Double-click block to navigate to its detail page

### Theme integration:
- Synced next-themes with tldraw's `colorScheme` user preference
- Moleskine dot-grid background on tldraw's `.tl-background` element
- Dark mode: subtle white dots on near-black
- Light mode: soft gray dots on warm white
- tldraw toolbar/panels respect the current theme

### Bugs fixed:
- **"fn is not a function" crash** — `handleMount` was `async`, returning a Promise instead of void. tldraw's `useOnMount` stored it as a teardown function and crashed during cleanup. Fixed by splitting into sync mount handler + fire-and-forget async initialization
- **White canvas in dark mode** — CSS overrides used `--color-background` but tldraw uses `--tl-color-background`. Fixed variable names and added `!important`
- **Light toolbar in dark mode** — tldraw uses `prefers-color-scheme` by default. Synced it via `editor.user.updateUserPreferences({ colorScheme })` driven by next-themes `resolvedTheme`

---

## Cleanup + Open Source Prep

- Deleted dead code: MoodboardCanvas.tsx (655 lines), CanvasView.tsx (374 lines), tags.ts (34 lines)
- Created `.gitignore` (node_modules, .next, .env.local, OS files)
- Created `.env.example` with placeholder values
- Consolidated 3 SQL files into single `supabase/setup.sql`
- Security audit: verified no hardcoded credentials in source code, all secrets via env vars
- Verified `.env.local` is gitignored

---

## Phase 3.5 — UI Polish & Code Audit

**Goal:** Refine the visual identity, fix layout issues, and harden the codebase with a meticulous audit.

### What was built:
- **Sticky yellow accent** throughout UI — tldraw selection, history timeline, sidebar highlights
- **Collapsible sidebar** — toggle between expanded (224px) and icon-only (48px) states, persisted to localStorage
- **Drag-reorder boards** — reorder boards in sidebar with drag handles, custom order saved to localStorage
- **Pin boards** — pin/unpin boards to the top of the sidebar list with a single toggle icon
- **Horizontal dot timeline** — redesigned history from vertical list to a horizontal dot-based scrub bar with hover tooltips
- **Tighter Moleskine dot grid** — doubled density to 12px spacing with 0.8px dots for an authentic notebook feel
- **Theme-aware pin icon** — yellow in dark mode, dark grey in light mode for proper contrast
- **tldraw watermark** — initially hidden via CSS, later restored to comply with tldraw license terms

### Layout fixes:
- **Toolbar overlap** — replaced fixed-height canvas (`calc(100vh - 180px)`) with flex layout where canvas takes remaining space and history panel sits below as `flex-shrink-0`
- **Loading placeholder** — now uses `h-full` with `minHeight: 300px` instead of fixed calc

### Code audit fixes:
- Removed unused imports (TLEditorSnapshot, getCanvasPositions, useRef, useCallback)
- Removed dead functions (handleCreateNote) and dead state (refreshKey, showHistory prop)
- **Race condition** in preview exit — added `cancelled` flag pattern in async useEffect cleanup
- **Timeout leak** — tracked fadeTimeout with ref, cleared on unmount
- **React Hooks order violation** — moved `useMemo` above early returns in HistoryTimeline
- **Event target safety** — replaced `e.target` with `e.currentTarget` for reliable positioning
- **Sort performance** — moved `getBoardOrder()` call outside sort comparator (was re-reading localStorage on every comparison)
- **Tooltip edge clamping** — CSS `clamp()` prevents tooltips from overflowing container

### Bugs fixed:
- **React Hooks order error** — `useMemo` placed after early returns caused hooks to fire in different order between renders. Moved above `if (loading)` guard
- **Duplicate pin icons** — two separate elements (indicator + toggle) replaced with single button that changes color
- **Pin contrast in light mode** — yellow on white was invisible; added `--pin-active` CSS variable (dark grey in light, yellow in dark)

---

## Phase 4 — Excalidraw Detour & tldraw Return

**Goal:** Replace tldraw with Excalidraw (MIT-licensed) to avoid the 5-second canvas disappearance on production deployments without a license key. Then revert when Excalidraw proved worse.

### What happened:
- Attempted full migration from tldraw to Excalidraw
- Built `ExcalidrawCanvas.tsx` with all features: autosave, history, block sync, double-click nav, drag-drop upload, arrow connectors
- Created `blockElements.ts` helper for converting blocks to Excalidraw element skeletons
- Hit multiple blockers:
  - **Images never rendered** — Excalidraw's image element system requires `BinaryFileData` with base64 `dataURL`, `FileId` branding, and registration via `addFiles()`. Despite multiple approaches (initialData.files, post-init addFiles, two-phase loading), images only showed placeholder icons
  - **1MB body size limit** — Saving base64 image data in canvas snapshots exceeded Next.js Server Action limits
  - **Overall worse UX** — Excalidraw's hand-drawn style didn't match the app's aesthetic, and the element creation API was brittle compared to tldraw's shape system

### Decision:
Reverted entirely to tldraw. The canvas disappearance is a licensing issue, not a technical one — solvable with a free hobby license key from tldraw.dev. Excalidraw's MIT license wasn't worth the degraded experience.

### Changes:
- Restored `TldrawCanvas.tsx`, `VaultBlockShape.tsx`, `HistoryTimeline.tsx` from pre-migration commit
- Deleted all Excalidraw files (`ExcalidrawCanvas.tsx`, `lib/excalidraw/`)
- Swapped `@excalidraw/excalidraw` back to `@tldraw/tldraw`
- **Removed CSS watermark override** — tldraw watermark now visible per license terms
- Cleared Excalidraw-format snapshots from database

### Lesson learned:
Don't migrate away from a good tool because of a licensing issue that has a free solution. Apply for the hobby license instead.

---

## Phase 5 — Rebrand: Rosary

**Goal:** Give the app a distinct identity. The Vault was a placeholder name. Rosary ties into the bead metaphor — collecting and stringing together ideas.

### Naming system:
- **App**: The Vault → **Rosary**
- **Boards** → **Garlands** (a string of beads/ideas arranged spatially)
- **Blocks** → **Beads** (the individual units you collect and string)
- **Connectors** stay as connectors (arrows between beads)

### What was built:
- **Full rename** across all components, pages, server actions, and copy
- **HelpModal** — keyboard shortcuts guide and concepts explainer, anchored bottom-left of sidebar. Covers: Concepts (Beads/Garlands/Connectors), App shortcuts, Canvas navigation, Canvas tools, Canvas edit, Canvas arrange
- **Help button** added to both collapsed (icon) and expanded (labeled) sidebar states
- **Geist Sans font** — installed `geist` npm package, applied via CSS variable globally. Experimented with GeistPixelSquare (headlines) and GeistMono (everything) before settling on Geist Sans for its clean, modern feel
- **CircleDot icon** — replaced Vault and LayoutGrid icons throughout sidebar with CircleDot, on-brand with the rosary bead motif
- **Filter cleanup** — removed Garlands from the home page filter tabs (garlands are a navigation construct, not a filterable bead type). "All" → "All Beads" for brand consistency
- **Create button cleanup** — removed the "+ Garland" create button from home page; garlands are only created via the sidebar "New Garland" button to avoid confusion (creating from home page was creating bead-like items, not proper canvas boards)

### Key decisions:
- **Garlands as navigation, not content** — boards/garlands are canvas workspaces, not bead types. Keeping them in the filter was confusing because "creating a garland" from the home page produced an item that didn't behave like a canvas. Removed entirely from that context.
- **CircleDot as brand icon** — simple, geometric, and directly evokes a rosary bead. Consistent across the wordmark, garland list items, and favicon (future).
- **Geist Sans over Geist Mono** — tried Mono for the full-terminal aesthetic, user preferred the cleaner feel of Sans. Kept tracking-tight on the sidebar ROSARY wordmark for density.
- **HelpModal placement** — anchored bottom-left (aligned with the sidebar footer) rather than centered, so it feels like part of the nav chrome rather than a modal interruption.

### Bugs avoided:
- Confirmed "board" type in the blocks table remains `"board"` internally — only the display/label language changed. No DB migration needed.
- Removed unused `LayoutGrid` import from page.tsx after filter cleanup to keep the bundle clean.

---

## Architecture Snapshot

```
8 Supabase tables
41 source files
~4,500 lines of application code
0 hardcoded secrets
```

### Stack:
- Next.js 16.1.6 (App Router, Turbopack, Server Actions)
- Supabase (Postgres + Storage)
- tldraw 4.3.2 (infinite canvas, custom shapes)
- Tailwind CSS 4 (utility-first styling)
- next-themes (light/dark with class strategy)
- cmdk (command palette)
- Framer Motion (animations)
- react-masonry-css (grid layouts)
- Lucide (icons)
- Zod (validation)
