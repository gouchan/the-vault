# Rosary — Lessons Learned

## tldraw

### Binding detection
- `registerAfterCreateHandler("binding", ...)` is the **reliable** way to detect when an arrow binds to a shape. `registerAfterChangeHandler("shape", ...)` fires too often and may miss binding events.
- Binding record: `{ type: "arrow", fromId: arrowShapeId, toId: targetShapeId, props: { terminal: "start"|"end" } }`
- `editor.getBindingsFromShape(arrowShape, "arrow")` returns all bindings for an arrow

### Coordinate spaces
- `editor.pageToScreen(point)` → coordinates **relative to the tldraw container element**, NOT the browser viewport
- To get true viewport (fixed-positioning) coordinates: add `containerRef.current.getBoundingClientRect().left/top`
- `editor.getShapeMaskedPageBounds(shapeId)` → page-space bounding box with `.midX` / `.midY`

### React state from tldraw callbacks
- State updates inside tldraw side-effect handlers may not trigger React re-renders reliably
- Wrap `setState(...)` calls in `requestAnimationFrame(() => setState(...))` when called from tldraw handlers

### overflow: hidden + absolute positioning
- The tldraw wrapper div uses `overflow: hidden` for rounded corners
- Any `position: absolute` child is clipped to the container bounds
- Use `position: fixed` for UI overlays (toasts, popovers, sheets) that need to escape the container

## Next.js

### Favicons in App Router
- Drop an `icon.svg` (or `icon.png`) in the `app/` directory — Next.js auto-serves it as `/favicon.ico` equivalent
- No manual `<link rel="icon">` needed

## General

### React callbacks from stable refs
- When a `useCallback` with `[]` deps needs to access mutable state, use a `useRef` that mirrors the state (`fooRef.current = foo`) — avoids stale closures without re-creating the handler
