# Rosary

A personal creative curation tool — Notion meets Miro meets Are.na. Collect references, people, notes, and images on infinite canvas moodboards with freehand drawing. String ideas together.

Built with Next.js 16, Supabase, tldraw, and Tailwind CSS.

## Concepts

- **Beads** — individual content units: People, References, Notes
- **Garlands** — infinite canvas boards that hold and arrange beads spatially
- **Connectors** — arrows between beads that sync shared fields

## Features

- **Beads** — Three types: People, References, Notes. Each is a universal content unit with tags, notes, and metadata
- **Infinite Canvas** — tldraw-powered garlands with pan, zoom, freehand drawing, shapes, and arrows
- **Image Upload** — Drag-and-drop, paste, or file-pick images directly onto the canvas
- **Connectors** — Draw arrows between beads to sync shared fields (tags, URLs, descriptions)
- **Auto-save** — Canvas state persists automatically with visual save indicator
- **History Timeline** — Horizontal dot timeline to scrub through garland evolution, preview and restore past states
- **OG Metadata** — Paste a URL and it auto-fetches title, description, and preview image
- **Full-text Search** — Postgres-powered search across all beads
- **Command Palette** — `Cmd+K` to search, create, and navigate
- **Light/Dark Mode** — Toggle between themes with Moleskine dot-grid background
- **Collapsible Sidebar** — Expandable nav with drag-reorder garlands, pin favorites to top
- **Nested Beads** — Garlands can contain other garlands, beads can have children
- **Help Modal** — Built-in keyboard shortcut reference (`?` or help button in sidebar)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage |
| Canvas | tldraw v4.3.2 |
| Styling | Tailwind CSS v4 |
| UI | Radix primitives, Lucide icons, Framer Motion |
| Theme | next-themes |
| Search | cmdk (command palette) |

## Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/gouchan/rosary.git
cd the-vault
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these in your [Supabase dashboard](https://supabase.com/dashboard) under **Settings > API**.

### 3. Set up the database

Open your Supabase SQL Editor and run the contents of [`supabase/setup.sql`](./supabase/setup.sql).

This creates all tables, indexes, triggers, and disables RLS (single-user app).

### 4. Create the storage bucket

In the Supabase dashboard:

1. Go to **Storage** > **New bucket**
2. Name: `vault-images`
3. Toggle **Public bucket** on
4. Create

Or run the storage SQL at the bottom of `supabase/setup.sql` (uncomment the storage section).

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
the-vault/
├── app/
│   ├── page.tsx              # Dashboard (pinned + recent blocks)
│   ├── layout.tsx            # Root layout with providers
│   ├── board/[id]/page.tsx   # Board detail (grid + canvas views)
│   ├── block/[id]/page.tsx   # Block detail/edit
│   ├── people/page.tsx       # People grid
│   ├── search/page.tsx       # Search results
│   ├── api/
│   │   ├── upload/route.ts   # Image upload to Supabase Storage
│   │   └── og-fetch/route.ts # OG metadata extraction
│   └── globals.css           # Theme vars, dot grid, tldraw overrides
├── components/
│   ├── blocks/               # Block cards (Person, Reference, Prompt, Board)
│   ├── forms/                # BlockForm, QuickCapture
│   ├── layout/               # AppShell, Sidebar, CommandPalette
│   ├── providers/            # Theme + React Query providers
│   ├── ui/                   # Primitives (button, dialog, input, badge)
│   └── views/                # GridView, TldrawCanvas, HistoryTimeline
├── lib/
│   ├── actions/              # Server actions (blocks, boards, canvas, tldraw)
│   ├── supabase/             # Supabase client + server helpers
│   ├── tldraw/               # VaultBlockShape custom shape
│   └── utils/                # cn(), url-parser
├── types/
│   └── block.ts              # TypeScript types
└── supabase/
    └── setup.sql             # Complete database schema
```

## Architecture

### Bead System

Everything is a **bead** (internally: `block`). The `blocks` table uses a type discriminator:

| Type | Purpose | Key Fields |
|------|---------|-----------|
| `person` | People/contacts | role, avatar_url, social links |
| `reference` | Links/images/media | url, media_type, OG metadata |
| `note` | Notes/text | content |
| `board` | Garland (canvas container) | children via block_connections |

Beads connect to each other through `block_connections` (parent/child relationships). Any bead can be nested inside any garland.

### Canvas System

Each garland has an infinite tldraw canvas. The canvas state (all shapes, drawings, arrows) is stored as a single JSONB snapshot in `canvas_snapshots`. History snapshots are captured every 60 seconds of active editing into `canvas_history`.

Custom `vault-block` shapes render bead data (images, people cards, notes) directly inside tldraw. tldraw's native arrow tool doubles as a connector — drawing an arrow between two beads triggers field syncing.

### Data Flow

```
User action → Server Action → Supabase → Revalidate → UI Update
                                ↑
                          (no REST API)
                       (direct SQL via SDK)
```

All data operations use Next.js Server Actions with `"use server"`. No custom API routes for CRUD — just the upload and OG-fetch endpoints.

## Database Schema

8 tables total:

| Table | Purpose |
|-------|---------|
| `blocks` | All content (person, reference, prompt, board) |
| `tags` | Tag definitions |
| `block_tags` | Block-tag junction |
| `block_connections` | Parent-child relationships |
| `canvas_positions` | Legacy position data (migrated to snapshots) |
| `canvas_connectors` | Visual connections between blocks |
| `canvas_snapshots` | tldraw state per board |
| `canvas_history` | Timeline of board evolution |

## Security Notes

- **Single-user app** — RLS is disabled on all tables. If deploying for multiple users, enable RLS and add policies
- **Supabase anon key** — The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is designed to be public (used in browser). It only grants access based on RLS policies
- **No authentication** — Add Supabase Auth if needed for multi-user
- **Image uploads** — Validated server-side (image types only, 10MB max)
- **Environment variables** — All secrets in `.env.local`, never committed

## Canvas License

The infinite canvas uses [tldraw](https://tldraw.dev) under their SDK license with a hobby license key. The license is configured via the `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` environment variable and is valid for `*.the-vault-one.vercel.app` through 2031. Set this in both `.env.local` and your Vercel project environment variables.

## License

MIT
