# GitCode Design System

**Product:** GitCode — *LeetCode for Git.* Practice repo surgery: recover lost commits,
resolve conflicts, rebase safely, bisect bugs, cherry-pick fixes, clean history.

**Status:** v1. Two surfaces exist — the **Dashboard** (`index.html`) and the **Question**
(`problem.html`). This document is the contract for everything added later.

> The name "GitCode" is a placeholder. Swap the wordmark and `<title>` and the system
> holds — no colour, spacing, or component depends on the name.

---

## 1. Provenance: where the design comes from

The look is not "inspired by" LeetCode — it **is** LeetCode's compiled styling, taken from
the live site and vendored byte-for-byte. Never restyle a copied component by hand; if it
looks wrong, the markup is wrong.

| What | Where it lives | How to treat it |
| --- | --- | --- |
| LeetCode's full compiled Tailwind build (537 KB) | `assets/css/vendor/leetcode-base.css` | **Read-only vendor file.** Contains every utility class, the `--sd-*` token set, and the legacy `--dark-*` palette. Never edit. |
| Problem-statement typography, testcase inputs, editor chrome | `assets/css/vendor/leetcode-question.css` | Read-only. |
| Premium gradients, medals, banner surfaces | `assets/css/vendor/leetcode-extras.css` | Read-only. |
| Our token aliases + new components | `assets/css/app.css` | **The only stylesheet we author.** |
| Icon geometry (50 SVGs lifted from the site) | `assets/js/icons.js` | Generated once; add new paths by hand in the same format. |
| Original HTML/CSS/JS dumps | `_reference/downloaded/` (git-ignored) | Reference only. Hashes and URLs in `_reference/MANIFEST.md`. |

Rules that follow from this:

1. **Copy markup, not pixels.** When a screen needs an existing LeetCode pattern (problem
   row, filter pill, tab bar, badge), copy the element tree and classes from the reference
   dump, then replace the text. Do not re-invent it with `gc-*` classes.
2. **`gc-*` is for net-new components only** — things LeetCode has no equivalent for
   (terminal, commit graph, splitter, repo tree). Build them from `--sd-*` / `--dark-*`
   tokens and the measurements in §3–§5 so they sit inside the copied UI invisibly.
3. **No new colour literals.** Every colour must resolve through a token. The only
   exception is the brand orange `#ffa116`, which is a token anyway (`--sd-brand-lc-orange`,
   `--brand-orange`).
4. Logos: LeetCode's wordmark is **not** reused. The GitCode lockup is ours (§6).

---

## 2. Design principles

1. **Density over decoration.** This is a practice tool, not a landing page. Information
   per pixel is high; whitespace is structural, not ornamental.
2. **One accent, many surfaces.** Orange is reserved for brand, premium, and the single
   primary action in a view. Everything else is monochrome.
3. **Colour carries meaning, never mood.** Teal = easy/success, yellow = medium/warning,
   red = hard/danger, blue = informational/link. Never use these decoratively.
4. **Monospace means "the machine said this".** Repo paths, commands, hashes, diffs, and
   terminal output are monospace. Prose is never monospace.
5. **The state is the interface.** Solved, attempted, premium, daily — these are glyphs and
   tones, not sentences.
6. **Dark first.** The canonical look is dark (LeetCode's own default). Light mode is a
   full peer, not an afterthought, but every new component is designed in dark first.

---

## 3. Colour

### 3.1 How colour is expressed

LeetCode's modern tokens are **HSL channel triples**, consumed as
`hsl(var(--sd-background))`. That matters: opacity variants are written
`hsl(var(--sd-foreground) / 0.6)`, and Tailwind's generated utilities already do this
(`bg-sd-accent`, `border-sd-border`, `text-sd-muted-foreground`). Our own CSS must follow
the same form.

```css
/* correct */
color: hsl(var(--sd-muted-foreground));
background: hsl(var(--sd-accent));

/* wrong — breaks opacity composition and token overrides */
color: #a8a8a8;
```

### 3.2 Semantic tokens (the ones to use)

Measured from the live site on 2026-11-04.

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--sd-background` | `0 0% 6%` · #0f0f0f | `0 0% 100%` · #ffffff | Page canvas |
| `--sd-background-gray` | `0 0% 6%` | `0 0% 94.1%` · #f0f0f0 | Question-page canvas (sits behind panes) |
| `--sd-foreground` | `0 0% 96%` · #f5f5f5 | `0 0% 10%` · #1a1a1a | Primary text |
| `--sd-muted-foreground` | `0 0% 66%` · #a8a8a8 | `0 0% 45%` · #737373 | Secondary text, metadata |
| `--sd-card` | `0 0% 15%` · #262626 | `0 0% 100%` | Raised card |
| `--sd-popover` | `0 0% 20%` · #333333 | `0 0% 100%` | Menus, dialogs |
| `--sd-secondary` | `0 0% 22%` · #383838 | `0 0% 96%` | Neutral buttons, chips |
| `--sd-muted` | `0 0% 22%` | `0 0% 94%` | Inert fills |
| `--sd-accent` | `0 0% 100% / .08` | `0 0% 0% / .04` | Hover wash, ghost-button hover |
| `--sd-border` | `0 0% 100% / .10` | `0 0% 0% / .08` | Dividers, card outlines |
| `--sd-input` | `0 0% 100% / .14` | `0 0% 0% / .06` | Input outlines |
| `--sd-ring` | `240 4.9% 83.9%` | `240 10% 3.9%` | Focus ring |
| `--sd-radius` | `0.5rem` (8 px) | same | Base corner radius |

### 3.3 Meaning colours

| Role | Token | Value | Notes |
| --- | --- | --- | --- |
| Easy / success | `--difficulty-easy` · `--sd-easy` | `#46c6c2` · `hsl(180 74% 42%)` | Teal, not green |
| Medium / warning | `--difficulty-medium` · `--sd-medium` | `#fac31d` · `hsl(43 100% 50%)` | Yellow |
| Hard / danger | `--difficulty-hard` · `--sd-hard` | `#f8615c` · `hsl(0 91% 59%)` | Coral red |
| Brand / premium | `--brand-orange` | `#ffa116` | The only saturated brand colour |
| Info / link | `--sd-info` · `--sd-blue-500` | `hsl(211 100% 50%)` | Links, selection |
| Success state | `--sd-success` | green-600 | Checkmarks, accepted |
| Danger state | `--sd-danger` | red-600 | Destructive actions |

**Hard rule:** difficulty text uses `text-difficulty-*` (legacy tokens) because that is what
the copied markup does. New components may use `text-sd-easy|medium|hard`; both resolve to
the same hue family.

### 3.4 The legacy palette (still load-bearing)

A second, older token family is baked into a lot of markup: `--dark-layer-1`, `--dark-layer-bg`,
`--dark-fill-{1..4}`, `--dark-label-{1..4}`, `--dark-gray-*`, `--blue-*`, `--green-s`,
`--red-s`, `--brand-orange`. They are Tailwind *colours*, not CSS vars, so use them only
through the utilities the reference markup already uses (`dark:bg-dark-layer-1`,
`text-label-2`, `dark:text-dark-label-2`). Do not write `var(--dark-layer-1)` — it does not
exist as a variable.

Observed values worth knowing:

| Surface | Dark value | Where seen |
| --- | --- | --- |
| Navbar | `#282828` (rgb 40,40,40) | `#leetcode-navbar` |
| Page | `#1a1a1a` | `body` under `.dark` |
| Problem row zebra | `rgba(255,255,255,.06)` | alternate rows |
| Tab bar | `rgba(255,255,255,.06)` | question-page tab strips |
| Row hover | `--sd-accent` wash | everywhere |

### 3.5 Gradients

Only two are allowed, both already defined by LeetCode's CSS: the premium text gradient
(`.premium-text-yellow-gradinet`) and the progress-ring stroke gradient
(`#007AFF → #73B6FF`). Do not invent gradient buttons.

One exception exists in `app.css`: the edge-fade mask (§8.14) uses a black-to-transparent
`linear-gradient` as a `mask-image`. It paints no colour, so it is not a visual gradient.

### 3.6 Theme switching

Dark is canonical: `<html class="dark">`. **Light mode is not "dark removed".** The vendor
build redefines the token block inside `@media (prefers-color-scheme: dark) { :root:not(.light) { … } }`,
so a bare `<html>` still resolves as dark on a dark OS. Moving to light means explicitly
setting `.light`:

```js
document.documentElement.classList.toggle("dark", theme === "dark");
document.documentElement.classList.toggle("light", theme === "light");
```

Both class names are therefore load-bearing. Never add or remove one without the other.

- The choice persists in `localStorage["gc-theme"]`.
- `?theme=light|dark` forces a theme for review, persists it, and is removed from the URL
  the next time the user toggles (so a forced link does not win forever).
- Every toggle in the DOM is `[data-theme-toggle]`; `UI.initTheme()` labels it and wires it.
  There are three: dashboard nav, question IDE bar, question options menu. All three stay in
  sync because `applyTheme` rewrites each one.

---

## 4. Typography

### 4.1 Families

```css
--gc-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
                sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
--gc-font-mono: ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Mono", Consolas,
                "Liberation Mono", monospace;
```

The site resolves to the system UI stack. Body is **14 px / 21 px** (`line-height: 1.5`) —
smaller than typical web apps, and central to the density. Headings get **24 px / 32 px,
weight 600**.

> Vendor caveat: `.font-menlo` in the downloaded CSS points at a `Menlo-fallback` webfont
> that we do not ship. `app.css` overrides `.font-menlo` with `--gc-font-mono`, so all
> monospace stays monospace on every OS.

### 4.2 Scale

| Name | Class | Size / line | Weight | Use |
| --- | --- | --- | --- | --- |
| Display | — | 36 / 44 | 600 | Marketing only (unused) |
| Title large | `.text-title-large` | 24 / 32 | 600 | Question title, page title |
| Title medium | `.text-title-medium` | 20 / 28 | 600 | Section heads, empty-state titles |
| Title small | `.text-title-small` | 16 / 24 | 600 | Card headers, sidebar groups |
| Body | `.text-body` | 14 / 20 | 400 | Default text, row titles at 500 |
| Caption | `.text-caption` | 12 / 16 | 400 | Chips, badges, meta |
| Micro | — | 11 / 14 | 500 | Counts in pills, tab hints |

Tabular numerals are on globally (`font-variant-numeric: tabular-nums`); keep them on for
acceptance %, counts, and timers so columns do not jitter.

### 4.3 Rules

- **Two weights per view, max:** 400 prose, 500/600 for emphasis and titles. No 700+.
- **No letter-spacing on prose.** Small caps / tracking is not part of this system.
- **Links** are `--sd-info`, no underline by default, underline on hover inside prose.
- **Prose measure:** the description pane is ~454 px wide at 486 px pane width. Do not let
  problem statements run wider than 72 characters.
- **Inline code** in prose: 12 px mono, `rgba(255,255,255,.07)` background, 5 px radius,
  2 px padding, colour `rgba(239,241,246,.75)`.

---

## 5. Space, shape, structure

### 5.1 The 4 px grid

All spacing is a multiple of 4: `4, 8, 12, 16, 20, 24, 32, 40, 48`. The only half-steps are
the 2 px hairline paddings inherited from the reference markup.

### 5.2 Fixed dimensions (measured)

| Element | Size |
| --- | --- |
| Top navbar | **50 px** (dashboard), **48 px** (question IDE bar) |
| Problem row | **44 px**, radius **8 px** |
| Filter pill | **40 px** tall (`px-4 py-[10px]`), fully rounded |
| Toolbar control (search, icon buttons) | **32 px** |
| Tab strip | **36 px** |
| Difficulty chip | **24 px** tall, padding `4px 8px`, fully rounded |
| Topic chip | 24 px, caption type |
| Dashboard content max-width | **1100 px** (`--gc-content-max`) |
| Dashboard right rail (aside) | **272 px** (`--gc-aside-w`) |
| Dashboard left rail (library) | **240 px** (`--gc-rail-w`) |
| Shell max-width | **1680 px**, centred |
| Track card | **268 × 132 px** (232 × 120 below 900 px) |
| Panes on question page | 50/50 split, **8 px** workspace padding, **8 px** gutter |

### 5.3 Shape

- Base radius **8 px** (`--sd-radius`). Cards, rows, panes, menus.
- Small radius **5 px** (`calc(var(--sd-radius) - 3px)`) for inline code and tiny controls.
- Fully rounded (`9999px`) for pills, chips, badges, avatars, icon buttons.
- Borders are **1 px** and always `hsl(var(--sd-border))`. No 2 px borders except focus.
- Shadows are LeetCode's layers, used sparingly: menus/popovers get `shadow-level2`,
  floating cards `shadow-dark-level2`. Rows and panes get no shadow.

### 5.4 The two shells

**Dashboard shell** — page scrolls, content is centred.

```
┌ navbar 50px ────────────────────────────────────────────────────┐
│ [rail 240] │  content max 1100                [aside 272]       │
│  Library…  │  track cards 268×132                             │
│  My Lists… │  category pills (40px)                            │
│            │  toolbar (32px controls)                          │
│            │  problem rows (44px, 8px radius, 1px gap)         │
└────────────┴───────────────────────────────────────────────────┘
```

The shell is a grid: `240px minmax(0,1fr)`. The content column is itself a grid:
`minmax(0,1fr) 272px` with a **28 px** gap and **20/24/64 px** padding. Below 1280 the
aside is removed from the grid and the content re-centres; below 1024 the rail leaves the
grid and becomes a fixed overlay.

**Question shell** — no page scroll; panes scroll internally.

```
┌ IDE bar 48px: [‹ All tasks] [‹ ›] 1. Title        [Run] [Submit] ⋯ ┐
│ ┌ Description ─────────┐ ┌ Terminal ──────────────────────────┐ │
│ │ tab bar 36px         │ │ tab bar 36px                       │ │
│ │ scrollable prose     │ │ scrollable output                  │ │
│ │                      ├─┼────────────────────────────────────┤ │
│ │                      │ │ Workspace / Test Result            │ │
│ └──────────────────────┘ └────────────────────────────────────┘ │
│  8px padding · 8px gutters · draggable 8px splitters             │
└──────────────────────────────────────────────────────────────────┘
```

### 5.5 Elevation

| Level | Token | Use |
| --- | --- | --- |
| 0 | none | Rows, panes, page |
| 1 | `--shadow-layer-1` | Sticky sub-headers |
| 2 | `--shadow-layer-2` / `shadow-level2` | Menus, dropdowns, popovers |
| 3 | `--shadow-layer-3` | Dialogs |

---

## 6. Logo & brand

The GitCode lockup is a 22 px-tall mark + wordmark, mirroring the LeetCode logo's height and
nav placement.

- **Mark:** 22×22 rounded square, `#ffa116` fill, white git-branch glyph (one trunk, two
  branches, three nodes). Reads at 16 px.
- **Wordmark:** `GitCode` in 600 weight, `hsl(var(--sd-foreground))`, 17 px, tracking `-0.01em`.
- **Clear space:** 8 px minimum on all sides. Never place the mark on orange.
- **Dashboard nav:** mark + wordmark. The wordmark (`.gc-logo__word`) is hidden at ≤720 px;
  the mark remains as the home link.
- **Question page:** the lockup is absent. The IDE bar opens with a back chevron and
  "All tasks", because the task title already occupies the centre. Do not add a second logo
  to the question shell.

Premium is never a logo variant — it is the orange "Premium" pill in the nav.

---

## 7. Iconography

- 50 icons lifted from the live site live in `assets/js/icons.js` as `{viewBox, inner}`.
  Render with `icon('terminal', 'h-4 w-4')` — it returns a complete `<svg>`.
- Geometry is Font Awesome 6 Free (the site's icon set). **Do not mix icon families.**
- Default size is `1em`, so icon size follows the text around it. Set explicit
  `h-4 w-4` (16 px) / `h-3.5 w-3.5` (14 px) only when the icon is standalone.
- Icons inherit `currentColor`. There is no two-tone icon; use a second element for badges.
- New icons must be added as a path in the same 512-unit FA grid, `fill="currentColor"`,
  no strokes.

Gylph vocabulary:

| Concept | Icon |
| --- | --- |
| Solved | `square-check` in `--sd-easy` |
| Attempted | `clock-rotate-left` in `--sd-medium` |
| Todo | empty 16 px ring, `hsl(var(--sd-border))` |
| Premium / locked | `lock-keyhole` |
| Daily | `calendar` in `--sd-blue-500` |
| Bookmark | `star` |
| Run | `play` · Submit: `cloud-arrow-up` |
| Terminal | `terminal` · Repo: `list-tree` · Code: `code` |

---

## 8. Components

Every component below is implemented in `assets/css/app.css` unless marked *copied* — in
which case the class names come from LeetCode's vendor CSS and must be used as-is.

### 8.1 Buttons

```
.gc-btn                    base: 32px, radius 8, 500, inline-flex, gap 8
.gc-btn--sm                28px, 12px text
.gc-btn--lg                40px, 14px text
.gc-btn--primary           background hsl(--sd-primary), color hsl(--sd-primary-foreground)   [light-on-dark in dark mode]
.gc-btn--secondary         bg hsl(--sd-secondary), fg hsl(--sd-secondary-foreground)
.gc-btn--ghost             transparent, hover hsl(--sd-accent)
.gc-btn--brand             bg #ffa116, black text (only for the one "start" action per page)
.gc-btn--success           green text, transparent bg, 1px border (the Submit affordance)
.gc-btn--danger            red text, transparent, for destructive repo ops
.gc-btn--icon              32×32, centred, rounded-full
```

States: hover raises the wash one step (`--sd-accent`), active steps back to `--sd-muted`,
focus is `outline: none; box-shadow: 0 0 0 1px hsl(var(--sd-ring))`, disabled is
`opacity: .5; cursor: not-allowed`.

Rules: at most one `--brand` button per view. "Run" is ghost; "Submit" is the green text
button from the IDE bar (`text-green-s`), not a filled pill. Never put two filled buttons
side by side.

### 8.2 Pills / segmented filters *(copied)*

The category row is LeetCode's filter pill:

```html
<a class="relative last:mr-12" data-e2e-active="true">
  <div class="flex items-center space-x-2 whitespace-nowrap rounded-full px-4 py-[10px]
              text-base leading-tight bg-gray-8 dark:bg-white text-label-r
              dark:text-dark-label-r shadow-level2 dark:shadow-dark-level2">
    <svg class="mr-2 hidden h-[18px] w-[18px] lg:block">…</svg>
    All Topics
  </div>
</a>
```

Selected = inverted (white in dark mode). Unselected = `bg-fill-3 text-label-2` with a
`hover:bg-fill-2` step. **Never** colour a selected pill orange; inversion is the signal.

### 8.3 Chips *(copied)*

```html
<div class="relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1
            rounded-full bg-fill-secondary text-difficulty-easy">Easy</div>
```

Variants: difficulty (`text-difficulty-*`), topic (`text-text-secondary`, or `bg-sd-accent`),
premium (`premium-text-yellow-gradinet` + lock), status (`bg-sd-easy/15 text-sd-easy`).

### 8.4 Status glyph

The solved/attempted/todo mark at the start of every problem row. 16 px box, never a badge,
never a checkbox:

| State | Render |
| --- | --- |
| solved | `square-check`, `--sd-easy` |
| attempted | `clock-rotate-left`, `--sd-medium` |
| todo | `<span class="gc-status-ring">` — 14 px circle, 1.5 px `hsl(var(--sd-border))` |
| locked | `lock-keyhole`, `hsl(var(--sd-muted-foreground))` |

### 8.5 Problem row *(copied structure, `.gc-row` modifiers)*

44 px, radius 8, zebra every other row with `bg-fill-quaternary`, hover `--sd-accent`.
Column order and widths, left to right:

```
[status 16] [daily 14?] [number 38] [title flex] [topic tag*] [accept 64] [difficulty 64]
[premium lock 20?] [bookmark 28] [chevron 16 on hover]
```

Title is 14/20 **500**; number is 13 px at 400 in `--sd-muted-foreground`, right-aligned and
suffixed with a period (`1. Two Sum`). Acceptance is 64 px, right-aligned, secondary text,
and is hidden below 720 px. The topic tag (`#reflog`) is a hairline chip that fades in on
row hover and is hidden below 900 px. The whole row is one `<a>`; inner controls
(`.gc-row__star`, a `span role="button"`) stop propagation.

### 8.6 Tab bar *(copied look, `.gc-tabbar` implementation)*

A 36 px strip with a `hsl(var(--sd-foreground) / .04)` wash and a 1 px bottom border,
full-bleed at the top of a pane. Markup is `.gc-tabbar > .gc-tabbar__scroll[role=tablist]
+ .gc-tabbar__tools`. A tab is `padding: 0 12px`, 13 px text, gap 7, icon at 14 px in a
role colour:

| Tab | Icon | Icon colour |
| --- | --- | --- |
| Description | `book-open` | `--sd-info` |
| Editorial | `memo` | `--sd-medium` |
| Solutions | `code` | `--sd-info` |
| Submissions | `clock-rotate-left` | `--sd-info` |
| Terminal | `terminal` | `--sd-green-500` |
| Testcase | `flask` | `--sd-green-500` |

Selected = foreground text at weight 500 + a 1 px top rule inset 8 px (`::before`),
no fill. Unselected = `--sd-muted-foreground`, hover wash. Never use underlines.

Behaviour (`UI.initTabs`): arrow keys rove between tabs, `Home`/`End` jump to the ends, and
the selected tab is scrolled into view with `scrollIntoView({ inline: "nearest" })`. The
scroll strip gets an edge fade (§8.14) when it overflows. The tool cluster on the right
(bookmark, focus) uses 26 px icon buttons with 13 px icons so the strip stays 36 px.

Tab panels follow ARIA: `role="tabpanel"` with `aria-labelledby` pointing at the tab. Only
the active panel is rendered; inactive panels carry `hidden`.

### 8.7 Progress ring *(copied)*

22 px SVG, `r=42` in a 100-unit viewBox, stroke-width 11, track
`stroke-sd-primary/20`, arc `stroke-sd-success`. Label sits to the right:
`0/4101 Solved` in `--sd-muted-foreground` at 12 px. Numbers use tabular figures.

### 8.8 Terminal (new — `.gc-terminal`)

The question page's right pane. This is the one component LeetCode does not have.

- Surface: `hsl(var(--sd-card))`, 8 px radius, 1 px `--sd-border`, no shadow.
- Body: 13 px / 20 px mono, 16 px padding, tabular off (mono is already fixed-width).
- Prompt: `user@repo` in `--sd-info`, path in `--sd-easy`, branch in `--sd-medium`,
  `$` in `--sd-muted-foreground`. One space before the command.
- Command text: `hsl(var(--sd-foreground))`. Output: `--sd-muted-foreground`.
- Success lines prefixed `✔` in `--sd-easy`; failures `✖` in `--sd-hard`; warnings `▲` in
  `--sd-medium`. Never colour the whole line — only the glyph and the key token.
- A block cursor is a 7×16 px rectangle in `--sd-foreground`, blinking at 1.1 s `steps(2)`.
- No scrollbar chrome; the pane scrolls, the terminal does not grow the page.

### 8.9 Commit graph (new — `.gc-graph`)

A 3-column SVG: graph lane (40 px) · hash (64 px mono) · subject. Rows 26 px. Lanes use the
palette in order: `--sd-info`, `--sd-easy`, `--sd-medium`, `--sd-purple-400`, `--sd-hard`.
Nodes are 7 px circles; HEAD gets a 2 px ring in `--sd-foreground`. Merge edges are 1.5 px
cubic curves — no connectors that cross a node. Refs are chips to the right of the subject
(`main`, `origin/main`, `HEAD`, `tag/v1.2`), each chip 11 px in the same tones.

### 8.10 Splitter (new — `.gc-splitter`)

8 px hit area, 1 px visible line `hsl(var(--sd-border))`, cursor `col-resize` /
`row-resize`, hover/drag line becomes `--sd-info` at 2 px. Keyboard: focusable,
arrow keys move 16 px, `Home` resets to 50/50. Double-click resets.

### 8.11 Callouts (new — `.gc-callout`)

Four tones: `--info` (blue), `--success` (teal), `--warn` (yellow), `--danger` (red).
Left border 2 px, background `hsl(<tone> / .10)`, 16 px padding, 8 px radius, 14/20 text,
title 600. Used for "This rewrites history", "Protected branch", "Tests failed" etc.

### 8.12 Menus *(copied look, `.gc-menu` implementation)*

Popover surface `hsl(var(--sd-popover))`, radius 8, 1 px border, `shadow-level2`, 4 px
padding. Item 32 px, 8 px radius, 13 px, hover `--sd-accent`, checkmark for selected.
Sections separated by a 1 px `--sd-border` rule with an 8 px label in
`--sd-muted-foreground`, 11 px, weight 500.

### 8.13 Empty states & skeletons

Empty: centred, 48 px icon in `hsl(var(--sd-muted-foreground) / .4)`, title 16/24 600,
one line of 14/20 secondary, one ghost button. Never an illustration.
Skeletons: `hsl(var(--sd-muted))` blocks with a 1.6 s shimmer; radius matches the element
they replace.

### 8.14 Edge fades (new — `.gc-fade-x`)

Horizontal strips that scroll (track cards, filter pills, tab bars) must advertise the
overflow. `UI.initEdgeFades(selector)` adds `.gc-fade-x` once per element and toggles two
state classes from the element's own `scrollLeft` / `clientWidth` / `scrollWidth`:

| State | Effect |
| --- | --- |
| `is-fade-right` | 40 px transparent tail on the right |
| `is-fade-left` | 40 px transparent lead on the left |
| both | lead and tail, content opaque in the middle |

Implemented with `mask-image` (plus `-webkit-mask-image`), so it works on any background
and in both themes. Fades appear only while the strip actually overflows — a strip that
fits is never dimmed. Re-run the updater on `scroll`, `resize`, and after re-rendering the
strip's children.

### 8.15 Active tag filter chip (new — `.gc-filterchip`)

Arriving from a trending `#reflog` link sets a tag filter. The dashboard then shows a
single dismissible chip in the toolbar, before the result count:

```
[ # reflog  × ]   12 tasks
```

- Height 32 px, fully rounded, 1 px `hsl(var(--sd-info) / .28)` border,
  `hsl(var(--sd-info) / .12)` fill, `--sd-info` text.
- `#` renders at 65% opacity; the label is the raw lowercase tag.
- The dismiss button is a 22 px transparent circle with an `xmark` icon and an explicit
  `aria-label="Remove tag filter"`.
- It is `hidden` when no tag is active, and clearing it resets pagination to page 1 and
  removes `tag` from the URL.

### 8.16 Menus with state *(extension of §8.12)*

The account menu and the question-page options menu may contain a theme item. It is a
normal `.gc-menu__item` with `[data-theme-toggle]`, an icon, and a label that flips between
"Light mode" and "Dark mode". `applyTheme` rewrites **every** `[data-theme-toggle]` in the
document, so the nav button, the IDE-bar button, and the menu item never disagree.

Menu rules that the implementation enforces: click outside closes, `Escape` closes and
returns focus to the trigger, one menu open at a time, `role="menu"` with
`role="menuitem"` children, and disabled rows use `aria-disabled="true"` rather than the
`disabled` attribute (so they remain discoverable).

---

## 9. Motion

| Token | Duration | Easing | Use |
| --- | --- | --- | --- |
| fast | 120 ms | `ease-out` | Hover, focus, tab switch |
| base | 200 ms | `cubic-bezier(.2,.8,.2,1)` | Menus, chips toggling |
| slow | 300 ms | `ease-in-out` | Sidebar collapse, pane resize |
| cursor blink | 1.1 s | `steps(2)` | Terminal cursor |

Principles: motion explains a state change or it does not exist. No entrance animations on
page load, no parallax, no confetti. Respect `prefers-reduced-motion: reduce` — set every
duration to `1ms` and stop the cursor blink.

---

## 10. Voice & content

- **Titles** are imperative and short: *Recover a Lost Commit*, not *How to use git reflog*.
  Prefix with the number and a period, exactly like LeetCode: `14. Recover a Lost Commit`.
- **Statement** opens with the scenario in second person ("Your teammate force-pushed…"),
  then "Return …" / "Recover …" specifying the acceptance condition.
- **Difficulty** is the LeetCode rubric: Easy = one command, known syntax; Medium = a
  command plus reasoning about state; Hard = sequencing, destructive operations, or
  recovery under constraints.
- **Tags** are lowercase git verbs/nouns: `reflog`, `rebase`, `merge`, `bisect`,
  `cherry-pick`, `stash`, `reset`, `worktree`.
- **Categories** (our "topics") are operations, not git internals: Recovery, Conflicts,
  Rewrite, Debugging, History, Collaboration, Safety.
- **Copy** is sentence case. No exclamation marks. No emoji in UI chrome; the terminal's
  ✔/✖/▲ are glyphs, not emoji.

---

## 11. Accessibility

- Contrast: body text ≥ 4.5:1 (`#f5f5f5` on `#1a1a1a` is 15.9:1; secondary `#a8a8a8` is
  6.9:1). Difficulty colours are used for 12 px labels only where the label is also
  present as text ("Easy"), never colour-only.
- Focus is always visible: 1 px ring `--sd-ring` + 2 px offset on dark. Do not remove
  outlines without a replacement.
- Every icon-only control has `aria-label`. Rows are `<a>`; nested buttons are real
  `<button>`s.
- The splitter is a `role="separator"` with `aria-valuenow`, keyboard-operable.
- Tabs use `role="tablist"` / `role="tab"` / `aria-selected`, with arrow-key roving.
- Hit targets: 32 px minimum, 44 px for primary nav.
- `prefers-reduced-motion` is honoured globally.

---

## 12. Responsive

The breakpoints are max-width media queries at **1279, 1023, 900, 720, 560, 480 px**. They
are chosen by content collapse, not by device names.

| Breakpoint | Dashboard | Question page |
| --- | --- | --- |
| ≥ 1280 | rail 240 + content (1100 max) + aside 272 | 50/50 panes, splitters live |
| 1024–1279 | aside hides; content re-centres at 1100 + 48 padding | unchanged |
| ≤ 1023 | rail leaves the grid and becomes a fixed 240 px overlay with a scrim; nav search hides; main padding drops to 18/16 | unchanged |
| ≤ 900 | nav drops the 4th link and Premium; row topic tag hides; track cards shrink to 232×120 | panes stack — description 46 vh, terminal fills the rest; splitters hide |
| ≤ 720 | wordmark hides; nav drops to 3 links; streak hides; rows tighten (8 px gaps, 28 px number, 48 px difficulty); acceptance hides; toolbar wraps and search goes full-width; pills drop to 34 px; Submit label hides | description title 20/28; prose padding 16; terminal padding 12; graph drops refs |
| ≤ 560 | — | IDE bar compacts: back label, divider, prev/next, and the bar's theme button hide; Run and Submit keep their labels |
| ≤ 480 | toolbar's icon cluster wraps; search takes a full row | — |

Rules:

- Never shrink the 44 px row height.
- Never let the description pane go under 360 px; below 900 px it is full-width instead.
- The mobile rail is `visibility: hidden` when closed so its links leave the tab order, and
  `Escape` closes it. Tapping the scrim closes it too.
- At ≤1023 px every row's bookmark star is permanently visible (it is hover-only on
  desktop), because hover does not exist on touch.
- Header controls never disappear without a replacement: back chevron, title, Run, Submit,
  and the options menu remain at every width.

---

## 13. File architecture

```
index.html                 dashboard
problem.html               question page
design.md                  this document
README.md                  how to run, what is wired, QA notes
assets/
  css/
    vendor/                untouched LeetCode CSS (3 files)
    app.css                tokens, gc-* components, overrides
  js/
    icons.js               generated icon set + icon()
    data.js                problem dataset, categories, tracks, stats
    ui.js                  nav, theme, menus, tabs, splitter, shared renderers
    dashboard.js           dashboard-only behaviour
    problem.js             question-page-only behaviour
_reference/                provenance (git-ignored contents)
  MANIFEST.md              source URLs + hashes
  sink_server.py           local asset collector used for the download
```

Vanilla JS, classic `<script>` tags (no modules) so the pages also work from `file://`.
Everything that mutates the DOM is scoped to a `[data-page]` root; shared helpers live on
`window.UI`. There is no build step, no package manifest, and no backend — "Run" and
"Submit" render deterministic simulated results from the problem's `status`.

**Adding a component — checklist**

1. Does LeetCode already have it? Copy the reference markup and classes; stop.
2. Otherwise: add one `.gc-*` block to `app.css` using §3–§5 tokens only.
3. Design dark first, then verify light by setting `html.light` — removing `.dark` is not
   enough (§3.6).
4. Provide hover / active / focus-visible / disabled / empty states.
5. Add the pattern to §8 with anatomy and rules.
6. Check it at 360, 768, 1024, 1440 px in both themes.
7. Keyboard-test it. If it is interactive, it must be reachable and labelled.

---

## 14. Do / Don't

| Do | Don't |
| --- | --- |
| Copy LeetCode class names verbatim | Re-implement a row with your own spacing |
| Use one orange action per view | Use orange for links, tags, or hover |
| Keep 14/20 body type | Bump body to 16 px "for readability" |
| Use teal for easy/success | Use pure green |
| Put commands in mono | Put prose in mono |
| Invert pills to show selection | Colour the selected pill |
| Let panes scroll | Let the question page scroll |
| 8 px radius everywhere | Mix 4/6/10/12 px radii |
| 1 px borders at 10% white | 2 px borders or heavy shadows |

---

## 15. Token quick reference (copy-paste)

```css
/* surfaces */
background: hsl(var(--sd-background));
background: hsl(var(--sd-card));
background: hsl(var(--sd-popover));
background: hsl(var(--sd-secondary));
background: hsl(var(--sd-accent));      /* hover wash */

/* type */
color: hsl(var(--sd-foreground));
color: hsl(var(--sd-muted-foreground));
color: hsl(var(--sd-easy));             /* also --sd-medium, --sd-hard */

/* lines */
border: 1px solid hsl(var(--sd-border));
border-radius: var(--sd-radius);        /* 8px */
border-radius: calc(var(--sd-radius) - 3px); /* 5px */

/* brand */
color: #ffa116;
background: rgb(255 161 22 / 0.12);
```
