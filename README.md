# The Vault

A personal creative curation tool — Notion meets Miro meets Are.na. Collect references, people, prompts, and images on infinite canvas moodboards with freehand drawing.

Built with Next.js 16, Supabase, tldraw, and Tailwind CSS.

## Features

- **Blocks** — Four types: People, References, Prompts, Boards. Each is a universal content unit with tags, notes, and metadata
- **Infinite Canvas** — tldraw-powered moodboards with pan, zoom, freehand drawing, shapes, and arrows
- **Image Upload** — Drag-and-drop, paste, or file-pick images directly onto the canvas
- **Connectors** — Draw arrows between blocks to sync shared fields (tags, URLs, descriptions)
- **Auto-save** — Canvas state persists automatically with visual save indicator
- **History Timeline** — Scrub through board evolution over time, restore past states
- **OG Metadata** — Paste a URL and it auto-fetches title, description, and preview image
- **Full-text Search** — Postgres-powered search across all blocks
- **Command Palette** — `Cmd+K` to search, create, and navigate
- **Light/Dark Mode** — Toggle between themes with Moleskine dot-grid background
- **Nested Blocks** — Boards can contain other boards, blocks can have children

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Supabase (Postgres) |
| Storage | Supabase Storage |
| Canvas | tldraw v4.3.1 |
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
git clone https://github.com/gouchan/the-vault.git
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

### Block System

Everything is a **block**. The `blocks` table uses a type discriminator:

| Type | Purpose | Key Fields |
|------|---------|-----------|
| `person` | People/contacts | role, avatar_url, social links |
| `reference` | Links/images/media | url, media_type, OG metadata |
| `prompt` | Notes/text | content |
| `board` | Moodboard container | children via block_connections |

Blocks connect to each other through `block_connections` (parent/child relationships). Any block can be nested inside any other block.

### Canvas System

Each board has an infinite tldraw canvas. The canvas state (all shapes, drawings, arrows) is stored as a single JSONB snapshot in `canvas_snapshots`. History snapshots are captured every 60 seconds of active editing into `canvas_history`.

Custom `vault-block` shapes render block data (images, people cards, notes) directly inside tldraw. tldraw's native arrow tool doubles as a connector — drawing an arrow between two blocks triggers field syncing.

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

## License

MIT
