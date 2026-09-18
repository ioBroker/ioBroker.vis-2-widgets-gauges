# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

`iobroker.vis-2-widgets-gauges` is a **widget set for vis-2**, not a running adapter. `io-package.json` declares
`"mode": "none"`, `"onlyWWW": true`, `"type": "visualization-widgets"` - there is no Node.js runtime code. The React
sources in `src-widgets/` are built into `widgets/vis-2-widgets-gauges/`, which vis-2 loads via module federation.

Ten widgets, all in the set `vis-2-widgets-gauges`:

| tpl id | class | since |
|---|---|---|
| `tplGauge2Color` | `ColorGauge` | 0.x (was react-gauge-chart) |
| `tplGauge2Water` | `WaterGauge` | 0.x (was react-liquid-gauge) |
| `tplGauge2Battery` | `BatteryGauge` | 0.x (was react-battery-gauge) |
| `tplGauge2Radial`, `tplGauge2Arc`, `tplGauge2Linear`, `tplGauge2Thermometer`, `tplGauge2Compass`, `tplGauge2Tank`, `tplGauge2Rings` | `RadialGauge` ... `RingsGauge` | after 2.0.3 |

**Projects store the widget data per attribute name.** The first three widgets were rewritten without their libraries
but must keep every attribute name they ever had - a renamed field silently drops the user's setting.
`npm run check-widgets` enforces that against the list `LEGACY` in `src-widgets/checkWidgets.mjs`.

## Commands

```bash
npm run build          # npm i in src-widgets + tsc + vite build + copy to widgets/vis-2-widgets-gauges
npm run tsc            # type-check src-widgets only
npm run check-widgets  # validate the widget declarations (see below)
npm run preview        # vite dev server with a stub of vis-2 - shows all widgets without an ioBroker
npm run screenshots    # render docs/img/*.png and src-widgets/public/img/prev_*.png with a headless Chrome
npm run lint           # eslint with @iobroker/eslint-config
npm test               # mocha --exit -> test/testPackageFiles.js (package/io-package validation)
npm run npm            # install in root and src-widgets
npm run release-patch  # release-script; runs lint before the check and build before the commit
```

Scripts of `src-widgets` have to be called with `npx` (`cd src-widgets && npx vite ...`): `npm run` only puts the
`node_modules/.bin` of the **root** on the PATH.

### `npm run check-widgets`

`src-widgets/checkWidgets.mjs` bundles the widget sources for node, stubs `window.visRxWidget`, calls every
`getWidgetInfo()` and checks: unique tpl ids, `visSet`, the attributes of version 2.0 (`LEGACY`), that every label /
tooltip / help / select option exists in `src/i18n/en.json`, that every other language has exactly the keys of
English, that the palette preview image exists and that the widget is exposed in `vite.config.ts` and listed in
`io-package.json`. `node checkWidgets.mjs --keys` prints all used keys.

## Architecture (`src-widgets/`)

Vite + `@module-federation/vite`, federation name `vis2gaugeWidgets`, remote entry `customWidgets.js`. The exposed
component names are repeated in `io-package.json` under `common.visWidgets.vis2gaugeWidgets.components` - adding a
widget means touching `vite.config.ts` (`exposes`), that block, `WIDGETS` in `checkWidgets.mjs`, the preview pages
and the docs.

`moduleFederationShared(pack)` from `@iobroker/types-vis-2` filters the shared modules by `src-widgets/package.json`.
react and `react/jsx-runtime` must stay shared: vis-2 on React 19 reads `mf-manifest.json` (which `tasks.js` copies
on purpose) and refuses sets that do not share the JSX runtime (`visWidgetSetCompatibility.ts` in vis-2). There is no
MUI, emotion, d3 or moment in the dependencies - the widgets draw plain SVG.

`@swc/core` is pinned via `overrides` - `vite-plugin-top-level-await` fails on 1.16.

### Widget classes

Every widget extends `Generic` (`src/Generic.tsx`), which extends `window.visRxWidget` from the vis-2 runtime and
returns `vis_2_widgets_gauges_` from `getI18nPrefix()`. The JSON files under `src/i18n/` hold the keys **without** the
prefix and `src/translations.ts` adds it.

A widget class only reads settings and states (`renderWidgetBody`) and renders a **function component** that draws
(`ColorGaugeDrawing`, `ArcDrawing`, ...) inside `GaugeFrame`, which measures the space with a `ResizeObserver` and
renders an SVG of exactly that size. Drawing in px of the real size keeps px settings (text offsets, sizes) exact.

`Generic` provides: `getMainValue()` (the `oid` field also takes a constant: a number, or a word without a dot shown
as text), `getNumberOf(attr)`, `getGaugeTheme()` (fallback colors from the vis-2 MUI theme, light/dark), `getRange()`,
`getDigits()`, `wrapGauge()` (card or not) and the shared field groups (`commonGroup`, `valueGroup`, `colorGroups`,
`levelGroup`, `animationGroup`, `oidField` - which takes over unit/min/max of the selected object, also for indexed
groups).

`Components/`:

- `geometry.ts` - angles in degrees clockwise from 12 o'clock; `polar`, `arcPath` (stroke), `sectorPath` (filled ring
  segment with the corner radius and padding of `d3.arc()`), `arcBounds`, tick helpers.
- `levels.ts` - the level model shared by all widgets (`levelsCount`, `colorN`, `levelThresholdN` = upper bound;
  missing colors are interpolated first -> last like react-gauge-chart did).
- `colors.ts` - parse/mix colors (`mixHsl` = `d3.interpolateHsl`).
- `easing.ts` - the d3-ease functions under their d3 names (projects store them in `*Easing` attributes).
- `hooks.ts` - `useElementSize`, `useAnimatedValue` (rAF, continues from the current value), `useUnwrappedAngle`
  (compass takes the short way), `animationsFrozen()`.
- `format.ts` - `toNumber`, `num`, `isTrue`, `asText`, `formatNumber` (decimal comma from the system config).

### Conventions

- **Attribute values may arrive as strings.** Use `num()`, `toNumber()`, `isTrue()` instead of comparing directly.
- An empty field means the default. For the old widgets some fields historically took `0` as "default" too (battery
  gap/radius, water `textOffsetY`/`margin`); that is kept for compatibility and documented.
- Defaults a new widget should get go into `default` of the field; the drawing code still needs a fallback for widgets
  of older projects where the attribute does not exist (e.g. `showMinMax` is on for new color gauges, off for old ones).
- Colors that are not set follow the theme (`getGaugeTheme()`); set colors are never changed by the theme.
- `window.__visGaugesStill = true` (set by the screenshot page) stops the endless animations (waves, charging sweep,
  flash) so the images are deterministic. Nothing else uses it.

## `src-widgets/preview/`

`npm run preview` (port 4173) renders all widgets against `preview/stub.tsx` - a stub of `VisRxWidget` including
`wrapContent` (MUI-card look) and `t()` from `en.json`. The state values live in the page; sliders drive them. URL
parameters: `?dark=1&nocard=1&size=1.5&only=Compass,Tank`.

`shots.html` / `shots.tsx` holds fixed scenes. `npm run screenshots` (`preview/screenshots.mjs`) starts its own vite
on port 4175, drives a local Chrome over the DevTools protocol (node 22 `WebSocket`, no puppeteer) and saves every
`<section data-shot="name">` as `docs/img/name.png` at 2x, then `shots.html?prev=1` with a transparent background as
`public/img/prev_<name>.png` (the palette previews, `visPrev`). `npm run screenshots -- arc tank` renders only those,
`-- --prev` only the previews. After changing how a widget looks, re-render the images and check `docs/en/README.md`
and `docs/de/README.md` - both describe every setting of every widget.

A blank preview page usually means a second vite is running on the same cache - the config uses `strictPort` and its
own `cacheDir` to avoid it.

To try the set in a real vis-2: `npm start` in `src-widgets` serves the federation build on port 4173 and the widget
development mode of the vis-2 palette loads it from there (it rewrites the URL in the instance object).

## Changelog

`README.md` carries the changelog; the release script moves the `### **WORK IN PROGRESS**` section into
`io-package.json` `common.news` with translations. Add entries as `* (author) description`.
