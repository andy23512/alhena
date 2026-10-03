<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->

# Alhena

An unofficial layout label editor for CharaChorder 3D input devices (CharaChorder One, CharaChorder Two, CCU, Master Forge). Lets you draw a blank device layout, assign free-text or Material icon labels to each key, then export/import the layout as JSON, save it as an image, or print it. Not affiliated with CharaChorder.

## Tech stack

- Angular 21 (standalone components/bootstrap — no `AppModule`; see `src/main.ts`)
- Nx (single-project workspace, `@angular/build:application` esbuild-based executor) driving build/serve/lint
- Tailwind CSS + Angular Material (M3 `mat.theme()`, see `src/styles.scss`) + SCSS
- Package manager: **Yarn** (Yarn Berry config in `.yarnrc.yml`, `nodeLinker: node-modules`)
- No state management library yet (component-local Signals are enough for now); add `@ngrx/signals` only if/when state sharing across routes actually requires it
- ESLint (flat config, `@nx/eslint-plugin` + `angular-eslint`) — unlike `alnitak`, this project does have lint configured

## Key commands

- Install: `yarn`
- Dev server: `yarn start` (nx serve)
- Build: `yarn build` (nx build, defaults to production configuration)
- Watch build (dev config): `yarn watch`
- Lint: `npx nx lint alhena`
- Deploy (CI only, via `nx deploy` / `angular-cli-ghpages`): pushes `dist/alhena/browser` to GitHub Pages under base href `/alhena/`

There is no unit test runner configured yet (generated with `--unitTestRunner=none`); add Vitest via Nx generator when tests are needed.

## Architecture notes

- `src/app/` — device layout canvas, click-to-edit key editor, and JSON export/import are implemented; image export and print are not implemented yet
- Sibling project `../alnitak` (also Angular/Nx) renders the same family of CharaChorder device layouts — its `src/app/components/switch`, `switch-sector`, `layout` drawing logic and `src/app/data`/`src/app/utils` layout data/math were ported as the starting point here, simplifying the label data model (`KeyLabel`: `text` | `icon`, see `src/app/models/key-label.models.ts`)
- `LayoutStore` (`src/app/stores/layout.store.ts`) holds the position-code → `KeyLabel` map as a single signal; no state management library yet — add `@ngrx/signals` only if/when state sharing across routes actually requires it
- Key labels auto-fit their available space (`src/app/utils/text-fit.utils.ts`): auto-wrap, then shrink font-size step by step down to a minimum readable size, then truncate with `…` if it still doesn't fit. Uses canvas `measureText` (not hover tooltips), so the result is the same in exported images/print as on screen. `SwitchComponent`/`SwitchSectorComponent` compute the actual available label area from the device geometry (inscribed square for the center circle, inner-radius chord × radial band for sectors) and pass it to `KeyLabelComponent` as `maxWidth`/`maxHeight`
- `DeviceStore` (`src/app/stores/device.store.ts`) holds the selected `DeviceType` (`src/app/models/device.models.ts`: CharaChorder One/Two/CCU/Master Forge) and a `showThumb3Switch` computed — only the Master Forge lacks the 3rd thumb switch, the other three have it. The layout editor page resolves this and passes it into `<app-layout showThumb3Switch>`; `LayoutComponent` itself stays decoupled from device selection

## Gotchas / conventions

- No `AppModule` — everything is standalone; new components/directives/pipes should follow the standalone pattern.
- This is a fully static, client-only app (no backend); the primary persistence mechanism is JSON file export/import, not local storage.
- Keep naming suffixes consistent with `alnitak` for files that play the same role (`.models.ts`, `.utils.ts`, `.const.ts`, etc.) once those files start getting created.