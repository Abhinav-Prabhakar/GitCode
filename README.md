# GitCode

**LeetCode for Git.** A practice surface for the Git operations that actually hurt:
recovering a lost commit, resolving a gnarly merge, rebasing a shared branch, bisecting a
regression, cherry-picking a hotfix, and cleaning up history.

This is a **static frontend** — HTML, CSS, and vanilla JavaScript. There is no backend, no
build step, and no package manager. "Run" and "Submit" render deterministic simulated
results; every task, graph, and terminal line is local data.

Two screens:

- `index.html` — the dashboard: track cards, category filters, search, problem rows,
  pagination, bookmarks, daily challenge, and a highlights rail.
- `problem.html?p=<slug>` — the question page: description, editorial, solutions,
  submissions, a commit-graph workspace, and a terminal with Run/Submit output.

---

## Run it

Any static server works. From the repo root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000/index.html>.

The pages also work from `file://` because the scripts are classic `<script>` tags rather
than ES modules. A server is still recommended so the vendored CSS and fonts resolve at
the same origin.

### Review links

| URL | What it does |
| --- | --- |
| `index.html?theme=dark` | Force dark (canonical) |
| `index.html?theme=light` | Force light |
| `index.html?view=bookmarks` | Bookmarked tasks only |
| `index.html?tag=reflog` | Tag-filtered view (dismissible chip) |
| `index.html?page=2` | Deep link to a page |
| `problem.html?p=recover-a-lost-commit` | The flagship task |

A forced `?theme=` is persisted and then stripped from the URL on the next manual toggle, so
a review link does not override the choice forever.

### Keyboard

| Key | Action |
| --- | --- |
| `/` | Focus the visible search field |
| `Escape` | Close a menu, modal, or the mobile rail |
| `←` `→` | Move between tabs when a tab is focused |
| `Home` / `End` | First / last tab |
| Arrow keys on a splitter | Resize by 16 px |
| `Home` on a splitter | Reset to 50/50 |

---

## Project layout

```
index.html                 dashboard shell
problem.html               question-page shell
design.md                  the design-system contract — read this before adding UI
assets/
  css/
    vendor/                LeetCode's compiled CSS, byte-for-byte (do not edit)
      leetcode-base.css
      leetcode-question.css
      leetcode-extras.css
    app.css                token aliases + every authored gc-* component
  js/
    icons.js               Font Awesome geometry + icon()
    data.js                44 tasks, 7 categories, 6 tracks, daily/trending/stats
    ui.js                  nav, theme, menus, modals, tabs, splitters, fades
    dashboard.js           filtering, search, pagination, bookmarks
    problem.js             statement, panels, terminal, run/submit simulation
_reference/
  MANIFEST.md              source URLs, byte counts, hashes
  sink_server.py           local collector used to capture the real pages
```

The scraped dumps in `_reference/downloaded/` are git-ignored, as are the pretty-printed
reference HTML files. Only the vendored CSS and the manifest ship.

---

## How the design works

The styling is not "inspired by" LeetCode — it **is** LeetCode's compiled CSS. Existing
patterns (rows, pills, chips, tab strips, badges) reuse the original class names; only
components LeetCode has no equivalent for are authored as `gc-*` in `app.css`, built from
the vendor `--sd-*` tokens.

The full contract lives in [`design.md`](./design.md). The short version:

- Dark is canonical; light mode requires `html.light`, not merely removing `html.dark`.
- Nearly all colour is `hsl(var(--sd-…))`; no new colour literals.
- 14/20 body type, 4 px spacing grid, 8 px base radius.
- Orange is one primary action per view; difficulty colours are semantic, never decorative.
- Monospace only for repo paths, commands, hashes, diffs, and terminal output.
- Respect `prefers-reduced-motion`.

### Adding a component

1. Check whether LeetCode already has the pattern; if so, copy its markup and classes.
2. Otherwise add one `.gc-*` block to `app.css` using existing tokens.
3. Design it dark first, then verify with `html.light`.
4. Provide hover, focus-visible, disabled, and empty states.
5. Add it to `design.md` §8 and check 360 / 768 / 1024 / 1440 px.

---

## What is wired

- Category, difficulty, status, and tag filtering; search across title, slug, and tags;
  sorting by difficulty or acceptance; pagination with URL sync.
- Bookmarking (in-memory per load), bookmarked-only view, and empty states.
- Theme toggle in the nav, the question IDE bar, and the options menu — all stay in sync.
- Tabs, splitter drag and keyboard resize, focus mode, terminal clear, and simulated
  Run/Submit output driven by each task's `status`.
- Responsive behaviour down to 320 px; no horizontal page overflow.

## What is intentionally not wired

- No persistence beyond the theme; reloading resets bookmarks and terminal output.
- No real Git execution, authentication, or network calls.
- Solutions, submissions, and the editorial are representative static content.
- Nav links that have no second screen (`Tracks`, `Playground`, `Discuss`, `Premium`)
  route back into the dashboard's filtered views.

---

## Verification

The build was checked in headless Chromium at **1440, 1024, 768, 480, 360, and 320 px**, in
both themes, on both pages:

- Zero console errors and zero failed requests (including the Menlo webfont, which is
  overridden locally).
- No horizontal overflow at any tested width.
- Filtering, pagination, URL sync, search, tag chips, bookmarks, tabs, theme toggles,
  menus, modals, and the terminal were exercised end to end.

To reproduce the visual pass, start the server and use Playwright or your browser's device
toolbar at those widths. If you use the browser tools in this environment, note that
screenshots require a visible tab; headless Playwright is the reliable path.
