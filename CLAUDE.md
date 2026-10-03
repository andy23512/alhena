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

- `src/app/` — currently just the root `App` component and empty `app.routes.ts`; feature code (layout canvas, key editor, JSON import/export, image export, print) is not implemented yet
- Sibling project `../alnitak` (also Angular/Nx) renders the same family of CharaChorder device layouts — port its `src/app/components/switch`, `switch-sector`, `layout` drawing logic and `src/app/data`/`src/app/utils` layout data/math as the starting point here, rather than re-deriving the geometry from scratch
- Planned text-overflow handling for key labels: auto-wrap, then shrink font-size step by step down to a minimum readable size, then truncate with `…` if it still doesn't fit — no hover tooltips, since output must also work for exported images/print

## Gotchas / conventions

- No `AppModule` — everything is standalone; new components/directives/pipes should follow the standalone pattern.
- This is a fully static, client-only app (no backend); the primary persistence mechanism is JSON file export/import, not local storage.
- Keep naming suffixes consistent with `alnitak` for files that play the same role (`.models.ts`, `.utils.ts`, `.const.ts`, etc.) once those files start getting created.