# Reference manifest

Source pages were fetched from a real Chrome session (Cloudflare challenge cannot be
passed by curl), then POSTed byte-for-byte to a local collector so the markup and
assets are the originals, not reconstructions.

Fetch date: 2026-11-04

| Local file | Origin | Bytes | SHA-256 |
|---|---|---|---|
| `problemset.html` | https://leetcode.com/problemset/ | 1,231,298 | `46a96cfe86a4830b52d54a49c16ac39886601a16c8b8cd7c4fd472f6d1628c48` |
| `problem.html` | https://leetcode.com/problems/two-sum/ | 775,100 | `b12ef2fe90fe479de1919ce9f562271bf688d49631bf0548bb7dc633c4984684` |
| `1b124651a654a33c.css` | https://leetcode.com/_next/static/css/1b124651a654a33c.css | 536,969 | `ab13a45e6fff54d3bbf340d3474b3d3c1504a4ebcbf1eb2c0c066cb8d6c67f1f` |
| `p_8115cf325c986a62.css` | https://leetcode.com/_next/static/css/8115cf325c986a62.css | 22,094 | `4243d56b8b587570bdcc224e35136d67f2ec6b990ab982eb263968073037c294` |
| `p_cc638f3f3ec3fa43.css` | https://leetcode.com/_next/static/css/cc638f3f3ec3fa43.css | 7,720 | `d423139a3288f41bbcfeaeb672cd34b0abf6607186820de10b77601b4253ae68` |
| `9673afd83d2408db.css` | https://leetcode.com/_next/static/css/9673afd83d2408db.css | 5,465 | `8405c3aa701f6a4c0359ab7c3710952a394433cd4763f84f6a85a5af1eafa593` |
| `p_9740b1ad9770bfb3.css` | https://leetcode.com/_next/static/css/9740b1ad9770bfb3.css | 2,227 | `9809008a789bf54aec5d77db9d28989040a631b05f71a74688d1ba6a6df3f302` |
| `js__app-*.js` | `/_next/static/chunks/pages/_app-991819791df6c306.js` | 382,280 | `e834bd490a88c82e149bd4338a5c3e8a3f987ff6e1aa6f1c396d297dd45f5266` |
| `js__5B_5B...slug_5D_5D-*.js` | problemset page chunk | 134,880 | `70c5d1cfbaa58869af2cfa21fc9148373b64feb023ec0b21aa281eb6d4dcb4e3` |
| `jsP__5B_5B...tab_5D_5D-*.js` | problem detail page chunk | 740,284 | `adf225ebc693c96f4f3001e217d88df3c8564973c7615af50007f976f103df83` |

Note: the CSS files are content-hashed by Next.js; responses can change between deploys.
The copies in `assets/css/vendor/` are the exact bytes from this date and are what the app
ships. The raw HTML/JS dumps in `_reference/downloaded/` are reference-only and ignored by git.

## What was reused where

- `assets/css/vendor/leetcode-base.css` — the full compiled Tailwind build. Provides every
  utility class used in the copied markup, the LeetCode color scale, the `--sd-*` design
  tokens and the `--dark-*` legacy tokens.
- `assets/css/vendor/leetcode-question.css` — problem-statement typography
  (`.HTMLContent_html__0OZLp`), testcase inputs, code-editor chrome.
- `assets/css/vendor/leetcode-extras.css` — premium gradients, medals, banner surfaces.
- Markup patterns (navbar, problem rows, filter pills, tab bars, description pane) were
  copied from the two HTML dumps and re-filled with Git content.
- SVG icon paths were extracted from the dumps into `assets/js/icons.js`.
