# Rosary

A personal blackboard for research and idea collection.

## What is Rosary?

Rosary is a visual thinking tool that combines the intentional block-collecting of Are.na with the image-forward aesthetics of Pinterest. Create infinite canvases to map connections between ideas, collect content from anywhere, and organize your research into coherent boards (garlands). Whether you're gathering reference images, linking concepts, or building mood boards, Rosary lets you think visually in a distraction-free space.

## Features

**Canvas & Connections**
- Infinite tldraw canvas with custom shapes, text, and connectors
- Connect beads (blocks) with arrows and sync fields across connections
- Full drawing toolkit: freehand, shapes, text, arrows, resize handles
- Canvas history with 60-second snapshot timeline

**Content & Curation**
- Drag-drop image upload (multi-file, 10MB limit)
- Pinterest-style masonry grid with automatic OG metadata fetching
- Are.na-style channel grid view with uniform square cards
- Server-side image proxy to bypass hotlink protection and CORS

**Organization**
- Garlands (channels/collections) for organizing beads across themes
- Block types: Person, Reference, Note, Prompt, Board
- Full-screen lightbox viewer with Escape/click-to-close
- Tag system with autocomplete and colored tag pills
- Move blocks between garlands
- Drag-reorder garlands in sidebar with pin-to-favorites

**Interaction**
- Command palette (Cmd+K) for URL quick-add with OG fetch, notes, garland targeting
- Block detail pages with tag editing and garland membership badges
- Created/updated timestamps on all blocks
- Dark mode with carefully tuned colors (#1E1E1E base, #2C2C2C accents)

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Canvas**: tldraw v4
- **Database**: Supabase (Postgres + Storage)
- **Styling**: Tailwind CSS with CVA
- **Language**: TypeScript
- **Deployment**: Vercel
- **UI Components**: Radix UI, Lucide icons

## Getting Started

### Clone the repository
```bash
git clone https://github.com/gouchan/the-vault.git
cd the-vault
```

### Install dependencies
```bash
npm install
```

### Set up environment variables
Create a `.env.local` file in the root with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run the development server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Project Structure

```
the-vault/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                 # Home (grid view)
│   ├── board/[id]/              # Board detail page
│   ├── block/[id]/              # Block detail page
│   ├── search/                  # Search page
│   ├── profile/                 # User profile
│   └── people/                  # People directory
├── components/
│   ├── layout/                  # Shell, sidebar, command palette, help modal
│   ├── blocks/                  # ReferenceCard, NoteCard, PersonCard, BoardCard
│   ├── views/                   # GridView, ChannelGrid, TldrawCanvas, HistoryTimeline
│   ├── forms/                   # BlockForm, QuickCapture
│   └── ui/                      # Primitives (input, button, badge, lightbox, tag-input, etc.)
├── lib/                         # Utilities, API clients, database functions
├── public/                      # Static assets
└── package.json
```

## License

MIT
