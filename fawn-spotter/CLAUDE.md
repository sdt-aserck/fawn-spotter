# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start Tauri dev app (runs Vite + Rust simultaneously)
npm run tauri dev

# Type check only (no emit)
npx tsc --noEmit

# Build for production
npm run build        # frontend only
npm run tauri build  # full Tauri app
```

There are no tests or linters configured.

## Architecture

**Tauri v2 desktop app** — React + TypeScript frontend (Vite), Rust backend (minimal, plugin-only).

### Routing
`HashRouter` is required (not `BrowserRouter`) because Tauri serves files via `tauri://` protocol. Routes are defined in `src/main.tsx`. Pages live in `src/pages/`.

### State & Persistence
- All state is local React hooks (`useState`, `useMemo`) — no global state management.
- **Persisted** (via `@tauri-apps/plugin-store` → `fawn-spotter.json`): `tags`, `staff`, `activityTypes` — used in StaffPage and ActivitiesPage.
- **Not persisted** (in-memory only): camper data and shared experience selections on SharedExperiencePage — intentional, loaded fresh from CSV each session.

### Tauri Plugins
All four plugins must be registered in `src-tauri/src/lib.rs` AND listed in `src-tauri/capabilities/default.json` or IPC calls will silently fail:
- `store:default` — key-value persistence
- `dialog:allow-save` — save file dialog
- `fs:allow-write-file` + scope permissions — write .docx output
- `opener:default` — open URLs

### Page Structure
Each page has a paired `.css` file with a scoped background class (e.g. `.shared-experience-bg`) that overrides shared `App.css` styles for color theming. Collapsible sections use the native `<details>`/`<summary>` pattern with `.collapsible` / `.collapsible-summary` / `.collapsible-body` classes.

### Document Generation
`src/utils/generateSharedExperienceDoc.ts` uses the `docx` npm package to build `.docx` files entirely in the frontend (no Rust involvement). The output is written via Tauri's `plugin-fs` after a save dialog from `plugin-dialog`.

### Data Models
`src/Model/` contains class/interface definitions (`StaffMember`, `ActivityType`, `Tag`, `Villages` enum, etc.) used across pages. The `SharedExperiencePage` defines its own inline interfaces (`Camper`, `Cabin`, `Activity`, `SlotValue`, `SharedExperience`) — these are intentionally not shared with the Model folder since that page has no persistence requirement.

### TypeScript Strictness
`tsconfig.json` has `strict: true` plus `noUnusedLocals` and `noUnusedParameters`. Capture `e.currentTarget.value` into a local variable before any async or functional state updater — React's synthetic event pool nullifies `currentTarget` before the callback runs.
