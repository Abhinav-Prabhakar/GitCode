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
2. **One accent, many surfaces.** Orange is reserved for brand and the single primary
   action in a view. Everything else is monochrome.
3. **Colour carries meaning, never mood.** Teal = easy/success, yellow = medium/warning,
   red = hard/danger, blue = informational/link. Never use these decoratively.
4. **Monospace means "the machine said this".** Repo paths, commands, hashes, diffs, and
   terminal output are monospace. Prose is never monospace.
5. **The state is the interface.** Solved, attempted, daily — these are glyphs and tones,
   not sentences.
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

### 3.2 Surfaces and text (measured from the page)

The dashboard and question page use LeetCode's **legacy layer palette**, not the newer
`--sd-*` canvas values. `app.css` exposes them as `--gc-*` aliases so authored components
speak one vocabulary. The `--sd-*` tokens still power vendor utilities (the search field,
progress ring, menus); do not assume they equal the page canvas.

| Alias | Dark | Light | Use |
| --- | --- | --- | --- |
| `--gc-page` | `#0f0f0f` | `#ffffff` | Dashboard canvas / body |
| `--gc-layer` | `#282828` | `#ffffff` | Rail cards, cards, sticky chrome |
| `--gc-pane` | `#262626` | `#ffffff` | Question panes (layer-01) |
| `--gc-label-1` | `#ffffff` | `#262626` | Primary text |
| `--gc-label-2` | `#eff1f6bf` | `#262626bf` | Secondary text, nav links |
| `--gc-label-3` | `#eff2f699` | `#3c3c4399` | Tertiary metadata, calendar days |
| `--gc-label-4` | `#ebebf54d` | `#3c3c434d` | Disabled / faint rules |
| `--gc-wash` | `rgba(255,255,255,.08)` | `rgba(0,0,0,.04)` | Inputs, icon buttons, hover |
| `--gc-zebra` | `rgba(255,255,255,.06)` | `rgba(0,0,0,.02)` | Odd problem rows |
| `--gc-hairline` | `rgba(255,255,255,.10)` | `rgba(0,0,0,.08)` | Dividers |
| `--gc-green` | `#2db55d` | `#2db55d` | Calendar today, online dot |
| `--gc-blue` | `#0a84ff` | `#0a84ff` | Informational links |

Question-page canvas is `#0f0f0f` dark / `#f0f0f0` light (`--sd-background-gray`); panes sit
on it at `#262626` / `#ffffff`. The dashboard canvas is `#0f0f0f` / `#ffffff`, matching the
new LeetCode problemset shell; the navbar sits on the same canvas with a hairline border.

### 3.3 Meaning colours

| Role | Token | Value | Notes |
| --- | --- | --- | --- |
| Easy / success | `--difficulty-easy` · `--sd-easy` | `#46c6c2` · `hsl(180 74% 42%)` | Teal, not green |
| Medium / warning | `--difficulty-medium` · `--sd-medium` | `#fac31d` · `hsl(43 100% 50%)` | Yellow |
| Hard / danger | `--difficulty-hard` · `--sd-hard` | `#f8615c` · `hsl(0 91% 59%)` | Coral red |
| Brand | `--brand-orange` | `#ffa116` | The only saturated brand colour |
| Info / link | `--sd-info` · `--sd-blue-500` | `hsl(211 100% 50%)` | Links, selection |
| Success state | `--sd-success` | green-600 | Checkmarks, accepted |
| Danger state | `--sd-danger` | red-600 | Destructive actions |

**Hard rule:** difficulty text uses `text-difficulty-*` (legacy tokens) because that is what
the copied markup does. New components may use `text-sd-easy|medium|hard`; both resolve to
the same hue family.

### 3.4 Legacy utility classes are the source of truth

The captured markup is built from Tailwind colour utilities, not from CSS variables:
`dark:bg-dark-layer-1`, `bg-fill-3`, `text-label-2`, `dark:text-dark-label-2`,
`text-difficulty-easy`. Use those class names verbatim in copied markup. The measured
values behind the common ones:

| Utility | Dark result | Light result |
| --- | --- | --- |
| `bg-dark-layer-1` / `bg-layer-1` | `#282828` | `#ffffff` |
| `bg-dark-layer-bg` | `#1a1a1a` | `#ffffff` |
| `bg-sd-background` | `#0f0f0f` | `#ffffff` |
| `bg-fill-3` / `dark:bg-dark-fill-3` | `rgba(255,255,255,.10)` | `rgba(0,10,32,.05)` |
| `bg-fill-quaternary` | `rgba(255,255,255,.06)` | `rgba(0,0,0,.02)` |
| `text-dark-label-1` | `#ffffff` | `#262626` |
| `text-dark-label-2` | `rgba(239,241,246,.75)` | `rgba(38,38,38,.75)` |
| `text-dark-label-3` | `rgba(239,242,246,.60)` | `rgba(60,60,67,.60)` |
| `shadow-dark-down-01` | layered 2/4/8 px black shadow | light equivalent |

The legacy family (`--dark-*`, `--blue-*`, `--green-s`) is still Tailwind *colour*, not a
runtime CSS variable. Do not write `var(--dark-layer-1)`; use the utility.

### 3.5 Gradients

Only one is allowed: the progress-ring stroke gradient (`#007AFF → #73B6FF`). Do not
invent gradient buttons or gradient text.

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
- **Prose measure:** the split pane determines the width; cap prose at 72 characters and
  never let it run edge-to-edge on an ultrawide pane.
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
| Page offset below navbar | **56 px** (`mt-14`) |
| Problem row | **44 px**, radius **8 px** |
| Filter pill | **40 px** tall, `0 16px` padding, fully rounded, **16 px** text |
| Keyword tag | 14 px text + 18 px count badge, 20 px gap |
| Toolbar control (search, icon buttons) | **32 px**; search **200 px** wide |
| Tab strip / tab button | **36 px** strip, **28 px** tab, radius **5 px** |
| Difficulty chip | **24 px** tall, padding `4px 8px`, fully rounded |
| Dashboard content | **1100 px** outer, `0 24px` padding → **1052 px** inner |
| Dashboard right rail | **270 px** (`w-[270px]`) |
| Right-rail card | 270 px wide, radius **8 px**, layer `#282828` |
| Feature banners | **268 × 132 px**, radius **8 px**, horizontal carousel |
| Question panes | split pane, **10 px** workspace sides/bottom, **8 px** gutter, radius **5 px** |
| Splitter hit area | **8 px** |

At 1440 px the three-column dashboard resolves to content `x=27` (inner `x=51`) and rail
`x=1154`, exactly as measured from the reference.

### 5.3 Shape

- Base radius **8 px** (`--sd-radius`). Cards, rows, panes, menus.
- Small radius **5 px** (`calc(var(--sd-radius) - 3px)`) for inline code and tiny controls.
- Fully rounded (`9999px`) for pills, chips, badges, icon buttons.
- Borders are **1 px** and always `hsl(var(--sd-border))`. No 2 px borders except focus.
- Shadows are LeetCode's layers, used sparingly: menus/popovers get `shadow-level2`,
  floating cards `shadow-dark-level2`. Rows and panes get no shadow.

### 5.4 The two shells

**Dashboard shell** — page scrolls. There is **no left sidebar** on the problem set; the
reference stores it off-canvas at width 0.

```
┌ navbar 50px ──────────────────────────────────────────────────────┐
│  content 1100 outer / 1052 inner          [rail 270]              │
│  feature banners 268×132 (4-up carousel)  calendar + daily        │
│  keyword tags 21px                        trending commands       │
│  category pills 40px                      footer links            │
│  toolbar 32px                                                     │
│  problem rows 44px, radius 8, no gap                              │
└───────────────────────────────────────────────────────────────────┘
```

Content and rail are a flex row with a **27 px** gap, left offset **27 px**, right margin
16 px. Below 1280 px the rail is removed and the content fills up to 1100 px.

**Question shell** — no page scroll; panes scroll internally.

```
┌ IDE bar 48px: [logo] [‹ All tasks] [‹ ›] 1. Title   [▶] [Submit] ⋯ ┐
│ ┌ Description ─────────┐ ┌ Terminal ──────────────────────────┐ │
│ │ tab strip 36px       │ │ tab strip 36px                     │ │
│ │ prose 14/21          │ │ scrollable output                  │ │
│ │                      ├─┼────────────────────────────────────┤ │
│ │ action bar 36px      │ │ Workspace / Test Result            │ │
│ └──────────────────────┘ └────────────────────────────────────┘ │
│  10px sides/bottom · 8px gutter · 8px splitters · pane radius 5px │
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
- **Wordmark:** `GitCode` in 600 weight, `var(--gc-label-1)`, 17 px, tracking `-0.01em`.
- **Clear space:** 8 px minimum on all sides. Never place the mark on orange.
- **Dashboard nav:** mark + wordmark. The wordmark is shown at ≥1024 px and below 768 px;
  between **768–1023 px** it is hidden so the icon logo and four links fit. At mobile the
  wordmark returns beside the mark.
- **Question page:** the lockup is present at the start of the 48 px IDE bar, followed by
  the "All tasks" back control. This mirrors LeetCode's logo → Problem List order.

The mark is never recoloured, rotated, or replaced by a task icon.

---

## 7. Iconography

- The icon set lifted from the live site lives in `assets/js/icons.js` as
  `{viewBox, inner}` (75+ glyphs). Render with `icon('terminal', 'h-4 w-4')` — it returns a
  complete `<svg>`.
- Geometry is Font Awesome 6 Free (the site's icon set). **Do not mix icon families.**
- Default size is `1em`, so icon size follows the text around it. Set explicit
  `h-4 w-4` (16 px) / `h-3.5 w-3.5` (14 px) only when the icon is standalone.
- Icons inherit `currentColor`. There is no two-tone icon; use a second element for badges.
- New icons must be added as a path in the same 512-unit FA grid, `fill="currentColor"`,
  no strokes.

Gylph vocabulary:

| Concept | Icon |
| --- | --- |
| Solved | `check-regular` at 14 px in `--sd-success` |
| Attempted | `circle` at 14 px in `--sd-muted-foreground` |
| Todo | empty 16 px box |
| Hidden check | `lock-keyhole` |
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

The category row is LeetCode's filter pill, reproduced with the original classes:

```html
<button class="gc-pillbtn" role="tab" aria-selected="true" data-category="all">
  <span class="gc-pill is-active">
    <span class="gc-pill__icon">…</span>All Topics
  </span>
</button>
```

The visual pill is **40 px** tall, `0 16px` padding, **16 px / 20 px** text, fully rounded,
with an **18 px** icon. Selected = inverted: `bg-white text-[#262626]` plus
`shadow-level2` (light mode inverts to `#262626` on white). Unselected =
`rgba(255,255,255,.10)` on dark / `rgba(0,10,32,.05)` on light, `dark-label-2` text, with a
`fill-2` hover step. **Never** colour a selected pill orange; inversion is the signal.
Icon colours come from the vendor scale: orange, blue, green, purple, teal, pink, yellow.

Pills sit in a horizontally scrolling strip with a **16 px** gap. An `angles-right` button
(34 px wide, page-coloured fade) appears when the strip overflows; it scrolls by 240 px.

### 8.3 Chips *(copied)*

```html
<div class="relative inline-flex items-center justify-center text-caption px-2 py-1 gap-1
            rounded-full bg-fill-secondary text-difficulty-easy">Easy</div>
```

Variants: difficulty (`text-difficulty-*`), topic (`text-text-secondary`, or `bg-sd-accent`),
status (`bg-sd-easy/15 text-sd-easy`). Tags are stored lowercase for filtering and displayed
title-case (`reflog` → `Reflog`, `cherry-pick` → `Cherry-pick`).

### 8.4 Status glyph

The solved/attempted/todo mark at the start of every problem row. 16 px box, never a badge,
never a checkbox:

| State | Render |
| --- | --- |
| solved | `check-regular` at 14 px, `--sd-success` |
| attempted | `circle` at 14 px, `--sd-muted-foreground` |
| todo | empty 16 px box |
| daily | `calendar`, `--sd-blue-500`, in the status slot |

### 8.5 Problem row *(copied structure, `.gc-row` modifiers)*

44 px, radius 8, odd rows `bg-fill-quaternary` (`rgba(255,255,255,.06)` dark /
`rgba(0,0,0,.02)` light). The row is one `<a>` with this anatomy:

```
[status 16] │ 12px gap │ [title, 80% cap] [accept 70 centered] [difficulty 38, mx 16]
            [difficulty meter] [bookmark 28]
```

- Title is **14/20, weight 500**, and includes the number: `1. Recover a Lost Commit`. It is
  capped at 80% from 760 px so a truncated title never touches the numeric columns; on phones
  it keeps the full row width.
- Acceptance is a fixed **70 px** centred column, 14 px, `#a8a8a8`, tabular numerals; hidden
  below 760 px.
- Difficulty is a fixed **38 px** left-aligned column, 14 px in the exact rubric colour
  (`#46c6c2`, `#fac31d`, `#f8615c`). It uses the short `Med.` label and 16 px side margins
  from 1200 px (an 8 px gutter on phones).
- The difficulty meter is eight 2×8 px bars at 20% opacity. It is hidden below 720 px in the
  mobile layout. The daily task takes the status slot with a blue calendar glyph.
- The bookmark is a 28 px hover-only control (`opacity: 0` until row hover/focus); it is
  hidden below 720 px.
- Hover is a 300 ms background transition; inner controls stop propagation.

### 8.6 Tab bar *(copied look, `.gc-tabbar` implementation)*

A **36 px** strip painted `rgba(255,255,255,.06)` over the `#262626` pane (composite
`#323232`), radius `8px 8px 0 0`. Tabs are **28 px** pills inside it, radius **5 px**,
`padding: 4px 8px`, **14 px** text, icon at 14 px:

| Tab | Icon | Icon colour |
| --- | --- | --- |
| Description | `book-open` | `#007bff` |
| Editorial | `memo` | `#fac31d` |
| Solutions | `code` | `#007bff` |
| Submissions | `clock-rotate-left` | `#007bff` |
| Terminal | `terminal` | `#2db55d` |
| Testcase | `flask` | `#2db55d` |

Selected = `dark-label-1` text at weight 500, transparent fill. Unselected =
`dark-label-2`, hover `rgba(255,255,255,.08)`. There is **no underline**; the active tab is
a filled text-weight change only. This is the biggest difference from the earlier
LeetCode-adjacent pass: the old 36 px full-height tab with a top rule is gone.

Behaviour (`UI.initTabs`): arrow keys rove, `Home`/`End` jump, selected tabs scroll into
view, and the strip gets an edge fade when it overflows. The right-hand tool cluster
(bookmark, focus, clear, copy) is 26 px and fades in on pane hover, matching LeetCode's
`hover_show_toolbar` behaviour. Panels are `role="tabpanel"` with `hidden` on inactive.

### 8.7 Progress ring *(copied)*

18 px SVG, `r=42` in a 100-unit viewBox, stroke-width 11, track
`hsl(var(--sd-muted-foreground) / .25)`, arc `--sd-success` with a round cap. Label sits to
the right: `15 / 44 solved` in `--sd-muted-foreground` at 12 px. Numbers use tabular
figures. The ring is rendered by `UI.progressRing(done, total, size)`; pass a size only
when the composition needs a larger ring.

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

There are no skeletons in this build: all data is local and renders synchronously, so a
loading state would be fiction. If async data is introduced, add `hsl(var(--sd-muted))`
blocks with a 1.6 s shimmer and match the radius of the element they replace — do not ship
a spinner for a sub-200 ms load.

### 8.14 Edge fades (new — `.gc-fade-x`)

Horizontal strips that scroll (feature banners, keyword tags, tab strips) must advertise
the overflow. `UI.initEdgeFades(selector)` adds `.gc-fade-x` once per element and toggles
two state classes from the element's own `scrollLeft` / `clientWidth` / `scrollWidth`:

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

### 8.17 Feature banners *(new — `.gc-banner`)*

The top of the dashboard is a four-up carousel of 268 × 132 px cards, 14 px gap, radius 8.
Each card reuses the vendor cover surfaces (`background_cover-background__OCnoq` plus
`dark-blue`, `dark-green`, `dark-orange`, `dark-purple`, `dark-red`, `dark-gray`) so the
gradient treatment is LeetCode's own. Content order:

```
[icon watermark 22px, top right]
[EYEBROW 11px / 600 / .78 opacity / uppercase]
[Title 18px / 24px / 600]
[meta 12px + count]  ← pushed to the bottom
[3px progress rail]
```

The strip scrolls horizontally with an edge fade; the fourth card clips exactly as it does
on the reference at 1440 px.

### 8.18 Keyword tags *(new — `.gc-keyword`)*

A single 21 px row under the banners, 34 px below them. Each tag is 14 px text plus an
18 px count badge (`12 px`, `bg-fill-3`, radius 10). Gaps are 20 px. The row is clipped and
scrollable, with an `Expand` control that reveals the remaining tags. Hover turns the label
blue. Clicking a tag filters the list via `?tag=`.

### 8.19 Rail cards *(new — `.gc-calcard`, `.gc-trendcard`)*

The 270 px rail holds two layer-1 cards (`#282828`, radius 8, layered 2/4/8 px shadow)
and a footer.

- **Calendar card:** 36 px header (`Day N`, countdown at 10 px, `UTC` chip at 11 px,
  prev/next at 18 px, 34 × 40 month tile), 7-column grid of 32 px cells, weekday cells
  26 px, today a 28 px green circle, completed days a 4 px red dot. Below it, a 77 px
  orange-tinted daily banner with the challenge title, difficulty, acceptance and a Start
  link. Footer: streak and week count.
- **Trending card:** 36 px header with a live filter field (32 px) and 34 px rows with rank,
  mono command, and the number of tasks carrying that tag.
- **Footer:** a 12 px local-storage note and a copyright line. There is no row of dead links.

### 8.20 Mobile header *(new)*

Below 768 px the 50 px bar shows logo + wordmark on the left, then a bookmark shortcut and
the theme toggle. There is no auth or menu affordance to fake. The desktop search collapses
to a 32 px icon between 768–1023 px and expands to 240 px on focus with a 300 ms width
transition.

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

- Contrast: body text ≥ 4.5:1 (`#f5f5f5` on `#0f0f0f` is 17.6:1; secondary `#a8a8a8` is
  8.1:1). Difficulty colours are used for 12 px labels only where the label is also
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

Max-width media queries at **1279, 1023, 900, 767, 760, 720, 480 px**. Breakpoints follow the
reference's Tailwind steps (`xl`, `lg`, `md`) and the content's own collapse points.

| Breakpoint | Dashboard | Question page |
| --- | --- | --- |
| ≥ 1280 | content 1100 + rail 270, `x=27 / 51`, `x=1154` | 50/50 panes, splitters live |
| 1024–1279 | rail removed; content centred, width ≤1100, `0 16px` padding | unchanged |
| ≤ 1023 | nav wordmark hides, search collapses to a 32 px icon (expands on focus), streak hides | prev/next hide; centre actions leave absolute centring |
| 768–1023 | desktop nav remains (icon logo + 3 links + search icon + theme) | unchanged |
| ≤ 767 | mobile header: logo + wordmark, bookmark shortcut, theme toggle; identity links hidden | unchanged |
| ≤ 900 | content `x=16`; row topic tag hides | panes stack — description 46 vh, terminal fills the rest; splitters hide |
| ≤ 720 | acceptance (hidden below 760) and bookmark hide; difficulty meter stays; toolbar stays on one row with a flexible search; progress text drops to 12 px | title stays 24/32; pane padding 16; terminal padding 12 |
| ≤ 560 | — | IDE bar compacts: back label, divider, logo wordmark hide |
| ≤ 480 | toolbar controls tighten (30 px buttons, 14 px ring, 11 px progress) | — |

Rules:

- Never shrink the 44 px row height.
- Content offset stays **56 px** below the navbar at every width.
- The description pane is full-width below 900 px; never narrower than 360 px.
- The mobile menu is a disclosure, not a drawer: `hidden` removes it from the tab order, and
  `Escape` closes it.
- No horizontal page overflow at 320 px, in either theme.

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
    app.css                tokens, gc-* components, parity rules
  fonts/
    Typo_Round_Regular.subset.woff2
    Typo_Round_Regular.woff
    Typo_Round_Bold.woff   rounded display face used by the track cards
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
/* page surfaces */
background: var(--gc-page);            /* #0f0f0f / #fff */
background: var(--gc-layer);           /* #282828 / #fff */
background: var(--gc-pane);            /* #262626 / #fff */
background: var(--gc-wash);            /* inputs + icon buttons */
background: var(--gc-zebra);           /* odd rows */

/* type */
color: var(--gc-label-1);              /* #fff / #262626 */
color: var(--gc-label-2);              /* 75% */
color: var(--gc-label-3);              /* 60% */
color: var(--gc-label-4);              /* 30% */

/* ruled lines + shape */
border: 1px solid var(--gc-hairline);
border-radius: 8px;                    /* cards, rows, banners */
border-radius: 5px;                    /* panes, tabs, inline code */

/* meaning */
color: #46c6c2;                        /* easy */
color: #fac31d;                        /* medium */
color: #f8615c;                        /* hard */
color: #ffa116;                        /* brand */
color: #2db55d;                        /* today / online */

/* copied markup — prefer the vendor utility */
class="dark:bg-dark-layer-1 dark:text-dark-label-2 text-difficulty-easy"
```

Rules of thumb: **surfaces** come from `--gc-*`, **hover/inputs** use `--gc-wash`,
**text** uses `--gc-label-*`, and any component that has a LeetCode class equivalent uses
the vendor class instead of writing colour by hand.
