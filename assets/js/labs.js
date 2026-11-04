// Lab definitions for every task: seeded repository, outcome checks, and the
// official solution. Everything is deterministic so a run always starts from
// the same state.

(function () {
  "use strict";

  var SESSION = [
    "export interface User {",
    "  id: string;",
    "  email: string;",
    "  role: 'admin' | 'member';",
    "}",
    "",
    "export interface Session {",
    "  id: string;",
    "  userId: string;",
    "  ttl: number;",
    "}",
    "",
    "const DEFAULT_TTL = 3600;",
    "",
    "function randomId(): string {",
    "  return Math.random().toString(36).slice(2, 10);",
    "}",
    "",
    "export function createSession(user?: User): Session | null {",
    "  if (!user) {",
    "    return null;",
    "  }",
    "",
    "  return {",
    "    id: randomId(),",
    "    userId: user.id,",
    "    ttl: DEFAULT_TTL",
    "  };",
    "}",
    "",
    "export function refreshSession(session: Session): Session {",
    "  if (session.ttl <= 0) {",
    "    throw new Error('session expired');",
    "  }",
    "",
    "  return { ...session, ttl: DEFAULT_TTL };",
    "}",
    "",
    "export function hasRole(session: Session, role: User['role']): boolean {",
    "  if (!session.userId) {",
    "    return false;",
    "  }",
    "",
    "  return role === 'admin' || role === 'member';",
    "}",
    "",
    "export function logout(session: Session): void {",
    "  session.ttl = 0;",
    "}"
  ].join("\n") + "\n";

  var TOTAL = [
    "export interface Item {",
    "  price: number;",
    "  quantity: number;",
    "}",
    "",
    "export function calculateTotal(items: Item[]) {",
    "  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);",
    "}"
  ].join("\n") + "\n";

  var TOTAL_DISCOUNT = [
    "export interface Item {",
    "  price: number;",
    "  quantity: number;",
    "}",
    "",
    "export function calculateTotal(items: Item[]) {",
    "  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);",
    "  return subtotal > 100 ? subtotal * 0.9 : subtotal;",
    "}"
  ].join("\n") + "\n";

  var TOTAL_TAX = [
    "export interface Item {",
    "  price: number;",
    "  quantity: number;",
    "}",
    "",
    "export function calculateTotal(items: Item[]) {",
    "  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);",
    "  return Math.round(subtotal * 1.2 * 100) / 100;",
    "}"
  ].join("\n") + "\n";

  var TOTAL_BOTH = [
    "export interface Item {",
    "  price: number;",
    "  quantity: number;",
    "}",
    "",
    "export function calculateTotal(items: Item[]) {",
    "  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);",
    "  const discounted = subtotal > 100 ? subtotal * 0.9 : subtotal;",
    "  return Math.round(discounted * 1.2 * 100) / 100;",
    "}"
  ].join("\n") + "\n";

  var PRICING = "export const TAX_RATE = 0.2;\n\nexport function withTax(amount: number) {\n  return amount * (1 + TAX_RATE);\n}\n";

  var FILES = {
    "README.md": "# Atlas checkout\n\nA small checkout service used by the GitCode labs.\n\n## Scripts\n\n- `npm test`\n- `npm run build`\n",
    "package.json": '{\n  "name": "atlas-checkout",\n  "version": "2.8.0",\n  "private": true,\n  "dependencies": {\n    "express": "^4.19.2"\n  }\n}\n',
    "package-lock.json": '{\n  "name": "atlas-checkout",\n  "version": "2.8.0",\n  "lockfileVersion": 3,\n  "packages": {\n    "node_modules/express": {\n      "version": "4.19.2"\n    }\n  }\n}\n',
    "src/app.ts": "import { createSession } from './session';\nimport { calculateTotal } from './total';\n\nexport function checkout(user: User, items: Item[]) {\n  const session = createSession(user);\n  return { session, total: calculateTotal(items) };\n}\n",
    "src/session.ts": SESSION,
    "src/total.ts": TOTAL,
    "src/pricing.ts": PRICING,
    "src/invoices.ts": "export function invoiceNumber(id: number) {\n  return `INV-${String(id).padStart(5, '0')}`;\n}\n",
    "tests/session.test.ts": "import { createSession } from '../src/session';\n\ntest('returns null without a user', () => {\n  expect(createSession()).toBeNull();\n});\n",
    "tests/total.test.ts": "import { calculateTotal } from '../src/total';\n\ntest('adds line items', () => {\n  expect(calculateTotal([{ price: 2, quantity: 3 }])).toBe(6);\n});\n",
    "config/limits.yml": "rate_limit: 120\nburst: 20\nwindow_seconds: 60\n",
    "docs/quickstart.md": "# Quickstart\n\n1. Install dependencies with `npm install`.\n2. Copy `.env.example` to `.env.local`.\n3. Run `npm test`.\n",
    "scripts/flaky-check.sh": "#!/usr/bin/env bash\nset -euo pipefail\nnpm test -- --runInBand\n",
    ".gitignore": "node_modules/\ndist/\n.env.local\n"
  };

  function base(extra) {
    var out = {};
    Object.keys(FILES).forEach(function (key) { out[key] = FILES[key]; });
    Object.keys(extra || {}).forEach(function (key) {
      if (extra[key] == null) delete out[key];
      else out[key] = extra[key];
    });
    return out;
  }

  function sameTree(a, b) {
    var ak = Object.keys(a || {}).sort();
    var bk = Object.keys(b || {}).sort();
    if (ak.length !== bk.length) return false;
    for (var i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i] || a[ak[i]] !== b[bk[i]]) return false;
    }
    return true;
  }

  function chk(name, test, opts) {
    return { name: name, test: test, hidden: !!(opts && opts.hidden), hint: opts && opts.hint };
  }

  function text(r, path) {
    return r.files[path] == null ? "" : String(r.files[path]);
  }

  function treeText(r, ref, path) {
    var tree = r.treeOf(ref);
    return tree[path] == null ? "" : String(tree[path]);
  }

  function clean(r) {
    return !r.isDirty() && Object.keys(r.unmerged).length === 0;
  }

  function trackedClean(r) {
    return sameTree(r.index, r.treeOf("HEAD")) && !r.unstaged().some(function (row) { return row.status !== "??"; });
  }

  function noMarkers(r) {
    return r.conflictMarkers().length === 0 && Object.keys(r.unmerged).length === 0;
  }

  function changed(r, sha) {
    return r.commitChangedFiles(sha);
  }

  function between(r, baseRef) {
    return r.rangeCommits(baseRef, "HEAD", false);
  }

  function touchedOnly(r, sha, path) {
    var files = changed(r, sha);
    return files.length > 0 && files.every(function (p) { return p === path; });
  }

  function isMerge(r, sha) {
    return !!(r.commits[sha] && r.commits[sha].parents.length > 1);
  }

  function authorEmail(r, sha) {
    var c = r.commits[sha];
    return c ? c.author.email : "";
  }

  var LABS = {};

  /* ============================================================== recovery */

  LABS["recover-a-lost-commit"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["9d2e113", "a1b2c3d", "wip: bad local experiment", { "src/total.ts": TOTAL + "// experimental cache, do not ship\n" }],
      ["4f1c9ab", "9d2e113", "add invoices migration", { "db/migrate/014_invoices.sql": "CREATE TABLE invoices (\n  id BIGSERIAL PRIMARY KEY,\n  total_cents INTEGER NOT NULL\n);\n" }],
      ["b7c1d90", "a1b2c3d", "tidy invoice copy", { "README.md": FILES["README.md"] + "\nInvoices are generated nightly.\n" }],
      ["c0ffee1", "b7c1d90", "bump invoice version", { "package.json": FILES["package.json"].replace('"version": "2.8.0"', '"version": "2.8.1"') }]
    ],
    branches: { main: "c0ffee1" },
    reflog: [
      ["c0ffee1", "commit: bump invoice version"],
      ["b7c1d90", "commit: tidy invoice copy"],
      ["a1b2c3d", "reset: moving to HEAD~2"],
      ["4f1c9ab", "commit: add invoices migration"],
      ["9d2e113", "commit: wip: bad local experiment"]
    ],
    checks: [
      chk("The invoices migration is on main", function (r) {
        return r.treeOf("main")["db/migrate/014_invoices.sql"] != null;
      }, { hint: "The file was dropped by the reset. Replay only 4f1c9ab." }),
      chk("The two commits made after the reset are still ancestors", function (r) {
        return r.isAncestor("b7c1d90", "main") && r.isAncestor("c0ffee1", "main");
      }, { hint: "Do not reset main backwards; the invoice copy and version bump must survive." }),
      chk("The bad experiment was not reintroduced", function (r) {
        return !r.isAncestor("9d2e113", "main") && treeText(r, "main", "src/total.ts").indexOf("experimental cache") === -1;
      }, { hint: "Cherry-pick 4f1c9ab, not its parent 9d2e113." }),
      chk("The working tree is clean", clean, { hint: "Stage or commit any remaining edits." }),
      chk("The recovery is a real commit", function (r) {
        return r.treeOf("HEAD")["db/migrate/014_invoices.sql"] === r.files["db/migrate/014_invoices.sql"];
      }, { hidden: true, hint: "The migration must be committed, not left as an untracked file." })
    ],
    solution: ["git reflog --oneline", "git show --stat 4f1c9ab", "git cherry-pick 4f1c9ab"]
  };

  LABS["restore-a-deleted-branch"] = {
    base: base({ "src/invoices.ts": null }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["2c8b7de", "a1b2c3d", "feat: invoice history", { "src/invoices.ts": "export function invoiceHistory() {\n  return ['INV-00001'];\n}\n" }],
      ["8a1b2c3", "a1b2c3d", "Merge branch 'feature/invoices'", { "src/invoices.ts": "export function invoiceHistory() {\n  return ['INV-00001'];\n}\n" }],
      ["e9f0a1b", "8a1b2c3", "Revert \"Merge branch 'feature/invoices'\"", { "src/invoices.ts": null }]
    ],
    branches: { main: "e9f0a1b" },
    reflog: [
      ["e9f0a1b", "commit: Revert \"Merge branch 'feature/invoices'\""],
      ["8a1b2c3", "merge feature/invoices: Merge made by the 'ort' strategy."],
      ["2c8b7de", "commit: feat: invoice history", "refs/heads/feature/invoices"],
      ["2c8b7de", "branch: Created from HEAD", "refs/heads/feature/invoices"]
    ],
    checks: [
      chk("feature/invoices exists again", function (r) {
        return r.branches["feature/invoices"] === "2c8b7de";
      }, { hint: "Create the branch at its last commit: 2c8b7de." }),
      chk("The invoices file is back on main", function (r) {
        return r.treeOf("main")["src/invoices.ts"] != null;
      }, { hint: "Replay the invoices work without undoing the later revert commit graph." }),
      chk("The restore did not rewrite published history", function (r) {
        return r.isAncestor("e9f0a1b", "main");
      }, { hint: "Keep the revert commit; add the work back on top." }),
      chk("The working tree is clean", clean),
      chk("The restored branch points at the original work", function (r) {
        return r.isAncestor("2c8b7de", "feature/invoices");
      }, { hidden: true, hint: "The recreated ref should include the original commit." })
    ],
    solution: ["git reflog --all | grep invoices", "git branch feature/invoices 2c8b7de", "git cherry-pick 2c8b7de"]
  };

  LABS["rescue-detached-head-work"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["7a0be42", "a1b2c3d", "feat: checkout v2", { "src/app.ts": FILES["src/app.ts"] + "\nexport const VERSION = 2;\n" }],
      ["9d2e113", "a1b2c3d", "spike telemetry events", { "src/telemetry.ts": "export const events: string[] = [];\n" }],
      ["b7c1d90", "9d2e113", "add telemetry hook", { "src/telemetry.ts": "export const events: string[] = [];\n\nexport function emit(name: string) {\n  events.push(name);\n}\n" }],
      ["c0ffee1", "b7c1d90", "instrument checkout", { "src/telemetry.ts": "export const events: string[] = [];\n\nexport function emit(name: string) {\n  events.push(name);\n}\n\nexport const instrumented = true;\n" }]
    ],
    branches: { main: "7a0be42" },
    tags: { "v1.2.0": "a1b2c3d" },
    head: "main",
    reflog: [
      ["c0ffee1", "checkout: moving from c0ffee1 to main"],
      ["c0ffee1", "commit: instrument checkout"],
      ["b7c1d90", "commit: add telemetry hook"],
      ["9d2e113", "commit: spike telemetry events"]
    ],
    checks: [
      chk("spike/telemetry names the detached work", function (r) {
        return r.branches["spike/telemetry"] != null;
      }, { hint: "Create the branch at the last detached commit, c0ffee1." }),
      chk("The spike contains all three experiments", function (r) {
        var tree = r.treeOf("spike/telemetry");
        return tree["src/telemetry.ts"] != null &&
          tree["src/telemetry.ts"].indexOf("instrumented = true") !== -1 &&
          between(r, "main").length === 3;
      }, { hint: "Branch at the tip of the detached chain, then rebase the whole chain." }),
      chk("The spike is rebased onto main", function (r) {
        return r.isAncestor("main", "spike/telemetry");
      }, { hint: "Rebase the new branch onto main after creating it." }),
      chk("The branch tip is instrument checkout", function (r) {
        return (r.commits[r.branches["spike/telemetry"]] || {}).subject === "instrument checkout";
      }),
      chk("The working tree is clean", clean),
      chk("Only the three experiments were replayed", function (r) {
        return between(r, "main").length === 3;
      }, { hidden: true, hint: "Branch at c0ffee1, then rebase onto main." })
    ],
    solution: ["git reflog --oneline -6", "git branch spike/telemetry c0ffee1", "git switch spike/telemetry", "git rebase main"]
  };

  LABS["recover-a-dropped-stash"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: invoice preview", { "src/invoices.ts": "export function invoicePreview(id: number) {\n  return `INV-${id}`;\n}\n" }]
    ],
    branches: { main: "b7c1d90" },
    unreachable: [
      {
        sha: "8c1f0a2",
        parent: "b7c1d90",
        subject: "WIP on main: wip/checkout",
        changes: {
          "src/session.ts": SESSION.replace("  return role === 'admin' || role === 'member';", "  return session.userId != null && (role === 'admin' || role === 'member');"),
          "src/total.ts": TOTAL.replace("return items.reduce((sum, item) => sum + item.price * item.quantity, 0);", "const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n  return Math.round(total * 1.2 * 100) / 100;")
        }
      },
      {
        sha: "44d9c71",
        parent: "b7c1d90",
        subject: "index on main: wip/checkout",
        changes: { "scratch/checkout-notes.md": "TODO: verify the tax rounding before standup.\n" }
      }
    ],
    droppedStash: {
      sha: "8c1f0a2",
      message: "wip/checkout",
      branch: "main",
      files: {
        "src/session.ts": SESSION.replace("  return role === 'admin' || role === 'member';", "  return session.userId != null && (role === 'admin' || role === 'member');"),
        "src/total.ts": TOTAL.replace("return items.reduce((sum, item) => sum + item.price * item.quantity, 0);", "const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n  return Math.round(total * 1.2 * 100) / 100;")
      },
      untracked: ["scratch/checkout-notes.md"]
    },
    checks: [
      chk("The dropped session guard is back", function (r) {
        return text(r, "src/session.ts").indexOf("session.userId != null") !== -1;
      }, { hint: "Recover the dangling stash commit and apply it." }),
      chk("The tax rounding change is back", function (r) {
        return text(r, "src/total.ts").indexOf("Math.round(total * 1.2") !== -1;
      }),
      chk("The untracked note survived", function (r) {
        return r.files["scratch/checkout-notes.md"] != null;
      }, { hint: "A stash commit also stores its untracked tree." }),
      chk("Recovery did not move main", function (r) {
        return r.headBranch() === "main" && r.branches.main === "b7c1d90";
      }),
      chk("No recovery commit was created", function (r) {
        return between(r, "b7c1d90").length === 0;
      }, { hidden: true, hint: "Apply the stash; do not commit the recovered work automatically." })
    ],
    solution: ["git fsck --unreachable | grep commit", "git stash list", "git stash apply 8c1f0a2"]
  };

  LABS["find-a-commit-after-a-hard-reset"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: saved carts", { "src/app.ts": FILES["src/app.ts"] + "\nexport const savedCarts = true;\n" }],
      ["4f1c9ab", "b7c1d90", "cache invoice totals", { "src/total.ts": TOTAL + "\nconst cache = new Map<string, number>();\n" }, "", { name: "Grace Hopper", email: "grace@example.com" }]
    ],
    branches: { main: "b7c1d90" },
    remotes: { origin: { branches: { main: "b7c1d90" } } },
    reflog: [
      ["b7c1d90", "reset: moving to origin/main"],
      ["4f1c9ab", "commit: cache invoice totals"],
      ["b7c1d90", "commit: feat: saved carts"]
    ],
    checks: [
      chk("The discarded change is back on main", function (r) {
        return treeText(r, "main", "src/total.ts").indexOf("const cache") !== -1;
      }, { hint: "The reflog entry before the reset is 4f1c9ab." }),
      chk("The original message is preserved", function (r) {
        var tip = r.commits[r.headSha()];
        return tip && tip.subject === "cache invoice totals";
      }),
      chk("The original author is preserved", function (r) {
        return authorEmail(r, r.headSha()) === "grace@example.com";
      }, { hint: "Cherry-pick keeps the author; a new commit would not." }),
      chk("The working tree is clean", clean),
      chk("The newer saved-carts work is still an ancestor", function (r) {
        return r.isAncestor("b7c1d90", "main");
      }, { hidden: true })
    ],
    solution: ["git reflog --date=iso -4", "git show --stat 4f1c9ab", "git cherry-pick 4f1c9ab"]
  };

  LABS["recover-files-from-a-corrupt-index"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: session guard", { "src/session.ts": SESSION.replace("  if (!user) {\n    return null;\n  }", "  if (!user) {\n    return null;\n  }\n\n  if (!user.id) {\n    throw new Error('missing user id');\n  }") }]
    ],
    branches: { main: "b7c1d90" },
    indexCorrupt: true,
    files: {
      "src/session.ts": SESSION.replace("  if (!user) {\n    return null;\n  }", "  if (!user) {\n    return null;\n  }\n\n  if (!user.id) {\n    throw new Error('missing user id');\n  }\n  // local experiment: raise the default TTL\n") .replace("const DEFAULT_TTL = 3600;", "const DEFAULT_TTL = 7200;"),
      "notes/local.md": "# Local notes\n\nKeep this experiment out of the commit.\n"
    },
    checks: [
      chk("The index was rebuilt", function (r) {
        return !r.indexCorrupt;
      }, { hint: "Move .git/index aside, then run a mixed reset." }),
      chk("The local working edit survived", function (r) {
        return text(r, "src/session.ts").indexOf("DEFAULT_TTL = 7200") !== -1;
      }),
      chk("The untracked note survived", function (r) {
        return r.files["notes/local.md"] != null;
      }, { hint: "A hard reset would delete clean tracked files but not untracked files; be deliberate." }),
      chk("Only the intended file is staged", function (r) {
        var staged = r.staged().map(function (row) { return row.path; });
        return staged.length === 1 && staged[0] === "src/session.ts";
      }, { hint: "Stage src/session.ts, not the local note." }),
      chk("HEAD did not move", function (r) {
        return r.branches.main === "b7c1d90";
      }, { hidden: true })
    ],
    solution: ["git status", "mv .git/index .git/index.bak", "git reset", "git add src/session.ts"]
  };

  LABS["undo-a-force-push-on-main"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["9d2e113", "a1b2c3d", "feat: search filters", { "src/search.ts": "export const filters = ['brand', 'price'];\n" }],
      ["b7c1d90", "9d2e113", "feat: saved carts", { "src/app.ts": FILES["src/app.ts"] + "\nexport const savedCarts = true;\n" }],
      ["4f1c9ab", "b7c1d90", "feat: checkout v2", { "src/app.ts": FILES["src/app.ts"] + "\nexport const savedCarts = true;\nexport const VERSION = 2;\n" }],
      ["c0ffee1", "a1b2c3d", "Revert \"Merge feature/search\"", { "src/search.ts": null }]
    ],
    branches: { main: "4f1c9ab" },
    remotes: { origin: { branches: { main: "c0ffee1" } } },
    reflog: [
      ["c0ffee1", "fetch: forced-update", "origin/main"],
      ["4f1c9ab", "fetch: fast-forward", "origin/main"]
    ],
    checks: [
      chk("The three lost changes are back on main", function (r) {
        var tree = r.treeOf("main");
        return tree["src/search.ts"] != null && tree["src/app.ts"].indexOf("savedCarts") !== -1 && tree["src/app.ts"].indexOf("VERSION = 2") !== -1;
      }, { hint: "Rebase the old local chain onto the maintainer's current tip." }),
      chk("The maintainer's revert is preserved", function (r) {
        return r.isAncestor("c0ffee1", "main");
      }, { hint: "Never force-push the old tip back over the revert." }),
      chk("Local main was published", function (r) {
        return r.remotes.origin.branches.main === r.branches.main;
      }, { hint: "Push after the rebase; it is now a fast-forward." }),
      chk("The working tree is clean", clean),
      chk("No merge commit was needed", function (r) {
        return !isMerge(r, r.headSha());
      }, { hidden: true })
    ],
    solution: ["git reflog show origin/main", "git fetch origin", "git rebase origin/main", "git push origin main"]
  };

  /* ============================================================= conflicts */

  LABS["resolve-a-three-way-merge-conflict"] = {
    base: base({ "src/total.ts": TOTAL }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: volume discount", { "src/total.ts": TOTAL_DISCOUNT }],
      ["9d2e113", "a1b2c3d", "feat: tax rounding", { "src/total.ts": TOTAL_TAX }]
    ],
    branches: { main: "b7c1d90", "feature/tax": "9d2e113" },
    checks: [
      chk("The merge is complete", function (r) {
        return isMerge(r, r.headSha()) && !r.mergeState;
      }, { hint: "Merge feature/tax, resolve, then commit." }),
      chk("Both behaviours survive", function (r) {
        var value = text(r, "src/total.ts");
        return value.indexOf("discounted") !== -1 && value.indexOf("1.2") !== -1;
      }, { hint: "Keep the discount calculation and apply tax after it." }),
      chk("No conflict markers remain", noMarkers, { hint: "Run git diff --check before committing." }),
      chk("The resolution is committed", function (r) {
        return clean(r);
      }),
      chk("The merge has both parents", function (r) {
        return (r.commits[r.headSha()].parents || []).length === 2;
      }, { hidden: true })
    ],
    solution: ["git merge feature/tax", "edit src/total.ts", "git add src/total.ts", "git commit --no-edit"],
    resolutions: { "src/total.ts": TOTAL_BOTH }
  };

  LABS["untangle-a-conflict-in-a-lockfile"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "chore: add date-fns", {
        "package.json": FILES["package.json"].replace('"express": "^4.19.2"', '"express": "^4.19.2",\n    "date-fns": "^3.6.0"'),
        "package-lock.json": FILES["package-lock.json"].replace('"node_modules/express": {\n      "version": "4.19.2"\n    }', '"node_modules/express": {\n      "version": "4.19.2"\n    },\n    "node_modules/date-fns": {\n      "version": "3.6.0"\n    }')
      }],
      ["9d2e113", "a1b2c3d", "feat: add zod validation", {
        "package.json": FILES["package.json"].replace('"express": "^4.19.2"', '"express": "^4.19.2",\n    "zod": "^3.23.8"'),
        "package-lock.json": FILES["package-lock.json"].replace('"node_modules/express": {\n      "version": "4.19.2"\n    }', '"node_modules/express": {\n      "version": "4.19.2"\n    },\n    "node_modules/zod": {\n      "version": "3.23.8"\n    }')
      }]
    ],
    branches: { main: "b7c1d90", "feature/billing": "9d2e113" },
    checks: [
      chk("The lockfile has no conflict markers", function (r) {
        return text(r, "package-lock.json").indexOf("<<<<<<<") === -1;
      }),
      chk("The manifest is valid JSON", function (r) {
        try { JSON.parse(text(r, "package.json")); return true; } catch (e) { return false; }
      }),
      chk("The lockfile matches the manifest", function (r) {
        try {
          var pkg = JSON.parse(text(r, "package.json"));
          var lock = JSON.parse(text(r, "package-lock.json"));
          var deps = Object.keys(pkg.dependencies || {});
          return deps.every(function (name) { return !!lock.packages["node_modules/" + name]; });
        } catch (e) { return false; }
      }, { hint: "After choosing a manifest, regenerate the lockfile with npm install." }),
      chk("The merge is committed and clean", function (r) {
        return isMerge(r, r.headSha()) && clean(r);
      }),
      chk("The lockfile was regenerated, not hand-merged", function (r) {
        return text(r, "package-lock.json").indexOf("lockfileVersion") !== -1;
      }, { hidden: true })
    ],
    solution: ["git merge feature/billing", "git checkout --theirs package.json", "npm install", "git add package.json package-lock.json", "git commit --no-edit"]
  };

  LABS["resolve-a-modify-delete-conflict"] = {
    base: base({ "legacy/report.rb": "def report(rows)\n  rows.map { |row| row[:total] }.sum\nend\n" }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "chore: remove legacy report", { "legacy/report.rb": null }],
      ["9d2e113", "a1b2c3d", "fix: round report totals", { "legacy/report.rb": "def report(rows)\n  rows.map { |row| row[:total].round(2) }.sum\nend\n" }]
    ],
    branches: { main: "b7c1d90", "feature/audit": "9d2e113" },
    checks: [
      chk("The deletion is kept", function (r) {
        return r.treeOf("main")["legacy/report.rb"] == null;
      }, { hint: "The product decision is to keep the file deleted." }),
      chk("The rounding fix is documented", function (r) {
        return text(r, "docs/report-fix.md").indexOf("rounding") !== -1;
      }, { hint: "Preserve the useful change in docs/report-fix.md." }),
      chk("The merge is complete", function (r) {
        return isMerge(r, r.headSha()) && clean(r);
      }),
      chk("No conflict entry remains", noMarkers),
      chk("The merge message explains the decision", function (r) {
        var tip = r.commits[r.headSha()];
        return tip && /audit|report/i.test(tip.subject + " " + tip.body);
      }, { hidden: true })
    ],
    solution: ["git merge feature/audit", "git show feature/audit:legacy/report.rb", "git rm legacy/report.rb", "edit docs/report-fix.md", "git add docs/report-fix.md", "git commit --no-edit"],
    resolutions: { "docs/report-fix.md": "# Audit fix\n\nThe rounding fix from `legacy/report.rb` was preserved here before the file was removed.\n" }
  };

  LABS["rebase-across-a-renamed-file"] = {
    base: base({ "src/auth.ts": "export function auth(user: { id: string }) {\n  return user.id;\n}\n" }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["9d2e113", "a1b2c3d", "refactor: move auth into session/", { "src/auth.ts": null, "src/session/auth.ts": "export function auth(user: { id: string }) {\n  return user.id;\n}\n" }],
      ["4f1c9ab", "a1b2c3d", "fix: guard empty auth ids", { "src/auth.ts": "export function auth(user: { id: string }) {\n  if (!user.id) return 'anonymous';\n  return user.id;\n}\n" }]
    ],
    branches: { main: "9d2e113", "feature/guard": "4f1c9ab" },
    head: "feature/guard",
    checks: [
      chk("The rebase finished", function (r) {
        return !r.rebaseState;
      }, { hint: "Resolve the delete/modify conflict once, then continue." }),
      chk("The feature is based on main", function (r) {
        return r.isAncestor("main", "feature/guard");
      }),
      chk("The guard lives at the new path", function (r) {
        return treeText(r, "feature/guard", "src/session/auth.ts").indexOf("anonymous") !== -1;
      }, { hint: "Move the resolved content to src/session/auth.ts." }),
      chk("The old path is gone", function (r) {
        return r.treeOf("feature/guard")["src/auth.ts"] == null;
      }),
      chk("The working tree is clean", clean),
      chk("The rebased commit is a single fix", function (r) {
        return between(r, "main").length === 1;
      }, { hidden: true })
    ],
    solution: ["git rebase main", "edit src/session/auth.ts", "git rm src/auth.ts", "git add src/session/auth.ts", "git rebase --continue"],
    resolutions: { "src/session/auth.ts": "export function auth(user: { id: string }) {\n  if (!user.id) return 'anonymous';\n  return user.id;\n}\n" }
  };

  LABS["resolve-conflicts-in-a-long-lived-branch"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: regional pricing", { "src/pricing.ts": PRICING.replace("return amount * (1 + TAX_RATE);", "return Math.round(amount * (1 + TAX_RATE) * 100) / 100;") }],
      ["9d2e113", "b7c1d90", "chore: raise tax for EU", { "src/pricing.ts": PRICING.replace("export const TAX_RATE = 0.2;", "export const TAX_RATE = 0.21;") }],
      ["4f1c9ab", "a1b2c3d", "feat: discount codes", { "src/pricing.ts": PRICING + "\nexport function discount(amount: number) {\n  return amount * 0.9;\n}\n" }]
    ],
    branches: { main: "9d2e113", "release/2.10": "4f1c9ab" },
    head: "release/2.10",
    config: { "rerere.enabled": "false" },
    checks: [
      chk("rerere is enabled", function (r) {
        return String(r.config["rerere.enabled"]) === "true";
      }, { hint: "git config rerere.enabled true" }),
      chk("The merge is resolved and committed", function (r) {
        return isMerge(r, r.headSha()) && clean(r) && noMarkers(r);
      }),
      chk("Both pricing behaviours survive", function (r) {
        var value = text(r, "src/pricing.ts");
        return value.indexOf("discount") !== -1 && value.indexOf("0.21") !== -1;
      }),
      chk("The resolution was recorded", function (r) {
        return r.rerereHits > 0 || Object.keys(r.rerere).length > 0;
      }, { hint: "Enable rerere before staging the resolved file." }),
      chk("No conflict markers remain", noMarkers, { hidden: true })
    ],
    solution: ["git config rerere.enabled true", "git merge main", "edit src/pricing.ts", "git add src/pricing.ts", "git commit --no-edit"],
    resolutions: { "src/pricing.ts": "export const TAX_RATE = 0.21;\n\nexport function withTax(amount: number) {\n  return Math.round(amount * (1 + TAX_RATE) * 100) / 100;\n}\n\nexport function discount(amount: number) {\n  return amount * 0.9;\n}\n" }
  };

  LABS["split-a-conflicted-commit-into-two"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: pricing conflict resolution", { "src/merge.ts": "export const resolution = 'pricing';\n" }],
      ["c0ffee1", "a1b2c3d", "feat: user guard", { "src/user.ts": "export function name(user?: { name: string }) {\n  return user ? user.name : 'anonymous';\n}\n" }],
      ["4f1c9ab", "a1b2c3d", "Merge branch 'pricing'", {
        "src/merge.ts": "export const resolution = 'pricing';\nexport const tax = 0.2;\n",
        "src/user.ts": "export function name(user?: { name: string }) {\n  if (!user) return 'anonymous';\n  return user.name;\n}\n"
      }]
    ],
    branches: { main: "4f1c9ab" },
    checks: [
      chk("The merge resolution is its own commit", function (r) {
        var commits = between(r, "a1b2c3d");
        return commits.some(function (sha) { return touchedOnly(r, sha, "src/merge.ts"); });
      }, { hint: "Split the merge commit with a soft reset, then commit by path." }),
      chk("The null guard is its own commit", function (r) {
        var commits = between(r, "a1b2c3d");
        return commits.some(function (sha) { return touchedOnly(r, sha, "src/user.ts"); });
      }),
      chk("The final tree is unchanged", function (r) {
        return text(r, "src/merge.ts").indexOf("tax = 0.2") !== -1 && text(r, "src/user.ts").indexOf("if (!user)") !== -1;
      }),
      chk("Exactly two reviewable commits remain", function (r) {
        return between(r, "a1b2c3d").length === 2;
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git show --stat HEAD", "git reset --soft HEAD^", "git restore --staged src/user.ts", "git commit -m \"merge: record pricing resolution\"", "git add src/user.ts", "git commit -m \"fix: guard a null user\""]
  };

  LABS["recover-both-sides-of-a-binary-conflict"] = {
    base: base({ "assets/logo.svg": "<svg>old logo</svg>\n" }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: refresh logo", { "assets/logo.svg": "<svg>main logo</svg>\n" }],
      ["9d2e113", "a1b2c3d", "feat: brand refresh", { "assets/logo.svg": "<svg>feature logo</svg>\n" }]
    ],
    branches: { main: "b7c1d90", "feature/brand": "9d2e113" },
    checks: [
      chk("The merge is complete", function (r) {
        return isMerge(r, r.headSha()) && clean(r);
      }),
      chk("The chosen asset is staged", function (r) {
        return r.treeOf("main")["assets/logo.svg"] === "<svg>feature logo</svg>\n";
      }, { hint: "Choose the feature asset explicitly." }),
      chk("Both sides were extracted", function (r) {
        return !!r.lastCopy && r.lastCopy.path.indexOf("/tmp/logo-ours") === 0;
      }, { hint: "Copy ours to /tmp before switching to theirs." }),
      chk("No conflict stages remain", noMarkers),
      chk("The merge has both parents", function (r) {
        return isMerge(r, r.headSha());
      }, { hidden: true })
    ],
    solution: ["git merge feature/brand", "git checkout --ours assets/logo.svg", "cp assets/logo.svg /tmp/logo-ours.svg", "git checkout --theirs assets/logo.svg", "git add assets/logo.svg", "git commit --no-edit"]
  };

  /* =============================================================== rewrite */

  LABS["squash-a-noisy-feature-branch"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: cart totals", { "src/cart.ts": "export const CART_VERSION = 1;\n" }],
      ["9d2e113", "b7c1d90", "fix: cart currency", { "src/cart.ts": "export const CART_VERSION = 2;\nexport const CURRENCY = 'USD';\n" }],
      ["4f1c9ab", "9d2e113", "fix: typo in cart", { "src/cart.ts": "export const CART_VERSION = 3;\nexport const CURRENCY = 'USD';\nexport const currency = CURRENCY;\n" }],
      ["c0ffee1", "4f1c9ab", "style: prettier", { "src/cart.ts": "export const CART_VERSION = 4;\nexport const CURRENCY = 'USD';\nexport const currency = CURRENCY;\nexport const tax = 0.2;\n" }],
      ["7a0be42", "c0ffee1", "fix: lint", { "src/cart.ts": "export const CART_VERSION = 5;\nexport const CURRENCY = 'USD';\nexport const currency = CURRENCY;\nexport const tax = 0.2;\nexport const round = (n: number) => Math.round(n * 100) / 100;\n" }],
      ["e3d4c5b", "7a0be42", "fix: remove unused import", { "src/cart.ts": "export const CART_VERSION = 6;\nexport const CURRENCY = 'USD';\nexport const currency = CURRENCY;\nexport const tax = 0.2;\nexport const round = (n: number) => Math.round(n * 100) / 100;\nexport function total(n: number) { return round(n * (1 + tax)); }\n" }],
      ["1a2b3c4", "e3d4c5b", "test: add cart tests", { "tests/cart.test.ts": "import { total } from '../src/cart';\n\ntest('adds tax', () => {\n  expect(total(10)).toBe(12);\n});\n" }],
      ["5e6f7a8", "1a2b3c4", "test: fix import", { "tests/cart.test.ts": "import { total } from '../src/cart';\n\ntest('adds tax', () => {\n  expect(total(10)).toBe(12);\n  expect(total(0)).toBe(0);\n});\n" }],
      ["d4e5f6a", "5e6f7a8", "style: sort imports", { "tests/cart.test.ts": "import { total } from '../src/cart';\n\ntest('adds tax', () => {\n  expect(total(10)).toBe(12);\n  expect(total(0)).toBe(0);\n});\n" }],
      ["a1b2c3e", "d4e5f6a", "fix: test description", { "tests/cart.test.ts": "import { total } from '../src/cart';\n\ntest('adds tax to the cart total', () => {\n  expect(total(10)).toBe(12);\n  expect(total(0)).toBe(0);\n});\n" }],
      ["f0e1d2c", "a1b2c3e", "style: prettier tests", { "tests/cart.test.ts": "import { total } from '../src/cart';\n\ntest('adds tax to the cart total', () => {\n  expect(total(10)).toBe(12);\n  expect(total(0)).toBe(0);\n});\n" }],
      ["3c4d5e6", "f0e1d2c", "fix: final typo", { "tests/cart.test.ts": "import { total } from '../src/cart';\n\ntest('adds tax to the cart total', () => {\n  expect(total(10)).toBe(12);\n  expect(total(0)).toBe(0);\n});\n" }]
    ],
    branches: { main: "a1b2c3d", "feature/cart": "3c4d5e6" },
    head: "feature/cart",
    checks: [
      chk("The branch has exactly two commits", function (r) {
        return between(r, "main").length === 2;
      }, { hint: "Squash the feature into a feature commit and a test commit." }),
      chk("The feature commit is separate from the tests", function (r) {
        var commits = between(r, "main");
        return commits.filter(function (sha) { return touchedOnly(r, sha, "src/cart.ts"); }).length === 1;
      }),
      chk("The test commit only changes tests", function (r) {
        var commits = between(r, "main");
        return commits.filter(function (sha) { return touchedOnly(r, sha, "tests/cart.test.ts"); }).length === 1;
      }),
      chk("The final tree is unchanged", function (r) {
        return treeText(r, "HEAD", "src/cart.ts").indexOf("CART_VERSION = 6") !== -1 && treeText(r, "HEAD", "tests/cart.test.ts").indexOf("adds tax") !== -1;
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git log --oneline main..HEAD", "git reset --soft main", "git restore --staged tests/", "git commit -m \"feat: cart totals with tax\"", "git add tests/", "git commit -m \"test: cover cart totals\""]
  };

  LABS["reword-the-last-commit"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "fix stuff", { "src/total.ts": TOTAL.replace("return items.reduce((sum, item) => sum + item.price * item.quantity, 0);", "const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);\n  return Math.round(total * 100) / 100;") }]
    ],
    branches: { main: "b7c1d90" },
    checks: [
      chk("The tip subject is specific", function (r) {
        return r.commits[r.headSha()].subject === "fix: round invoice totals to two decimals";
      }, { hint: "Amend the tip with a conventional commit subject." }),
      chk("The body references issue 214", function (r) {
        return r.commits[r.headSha()].body.indexOf("#214") !== -1;
      }, { hint: "Add a body with 'Refs #214'." }),
      chk("The tree did not change", function (r) {
        return treeText(r, "HEAD", "src/total.ts").indexOf("Math.round(total * 100)") !== -1;
      }),
      chk("Only the tip was rewritten", function (r) {
        return (r.commits[r.headSha()].parents || [])[0] === "a1b2c3d";
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git log -1 --oneline", "git commit --amend -m \"fix: round invoice totals to two decimals\" -m \"Refs #214\""]
  };

  LABS["drop-a-secret-from-history"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: deploy script", { "config/prod.env": "API_KEY=sk-live-9f1c2b7a\nDATABASE_URL=postgres://prod\n", "scripts/deploy.sh": "#!/usr/bin/env bash\nnpm run build\n" }],
      ["9d2e113", "b7c1d90", "chore: document deploy", { "docs/deploy.md": "# Deploy\n\nRun scripts/deploy.sh.\n" }],
      ["4f1c9ab", "9d2e113", "feat: invoice retries", { "src/invoices.ts": "export function retryInvoice() {\n  return true;\n}\n" }],
      ["c0ffee1", "4f1c9ab", "test: cover retries", { "tests/invoices.test.ts": "test('retries once', () => {\n  expect(true).toBe(true);\n});\n" }],
      ["7a0be42", "c0ffee1", "docs: changelog", { "README.md": FILES["README.md"] + "\n## Changelog\n\n- Invoice retries.\n" }]
    ],
    branches: { main: "7a0be42" },
    checks: [
      chk("No commit contains config/prod.env", function (r) {
        return Object.keys(r.commits).every(function (sha) {
          return r.commits[sha].tree["config/prod.env"] == null;
        });
      }, { hint: "Rewrite every commit with filter-repo --path ... --invert-paths." }),
      chk("The secret is gone from every tree", function (r) {
        return Object.keys(r.commits).every(function (sha) {
          return Object.keys(r.commits[sha].tree).every(function (path) {
            return String(r.commits[sha].tree[path]).indexOf("sk-live") === -1;
          });
        });
      }),
      chk("The rest of history survived", function (r) {
        return Object.keys(r.commits).length === 6 && r.treeOf("HEAD")["docs/deploy.md"] != null && r.treeOf("HEAD")["src/invoices.ts"] != null;
      }),
      chk("The working tree is clean", clean),
      chk("The secret is not in the working tree", function (r) {
        return r.files["config/prod.env"] == null;
      }, { hidden: true })
    ],
    solution: ["git log --all --oneline -- config/prod.env", "git filter-repo --path config/prod.env --invert-paths --force"]
  };

  LABS["reorder-commits-without-conflicts"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["9d2e113", "a1b2c3d", "test: cover refunds", { "tests/refunds.test.ts": "import { refund } from '../src/refunds';\n\ntest('refunds a full order', () => {\n  expect(refund(10)).toBe(10);\n});\n" }],
      ["4f1c9ab", "9d2e113", "feat: refund calculation", { "src/refunds.ts": "export function refund(amount: number) {\n  return amount;\n}\n" }]
    ],
    branches: { main: "a1b2c3d", "feature/refunds": "4f1c9ab" },
    head: "feature/refunds",
    checks: [
      chk("The implementation comes first", function (r) {
        var commits = between(r, "main").slice().reverse();
        return commits.length === 2 && r.commits[commits[0]].subject.indexOf("feat") === 0;
      }, { hint: "Reset softly and rebuild the two commits in dependency order." }),
      chk("The test comes second", function (r) {
        var commits = between(r, "main").slice().reverse();
        return commits.length === 2 && r.commits[commits[1]].subject.indexOf("test") === 0;
      }),
      chk("The final tree is unchanged", function (r) {
        return r.treeOf("HEAD")["src/refunds.ts"] != null && r.treeOf("HEAD")["tests/refunds.test.ts"] != null;
      }),
      chk("The working tree is clean", clean),
      chk("Each commit touches one concern", function (r) {
        var commits = between(r, "main");
        return commits.every(function (sha) { return changed(r, sha).length === 1; });
      }, { hidden: true })
    ],
    solution: ["git log --oneline main..HEAD", "git reset --soft main", "git restore --staged tests/", "git commit -m \"feat: refund calculation\"", "git add tests/", "git commit -m \"test: cover refunds\""]
  };

  LABS["move-a-commit-to-another-branch"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: checkout flow", { "src/app.ts": FILES["src/app.ts"] + "\nexport const flow = 'checkout';\n" }],
      ["c0ffee1", "b7c1d90", "docs: clarify token setup", { "docs/quickstart.md": "# Quickstart\n\n1. Install dependencies with `npm install`.\n2. Set `GITCODE_TOKEN` before running the CLI.\n3. Run `npm test`.\n" }]
    ],
    branches: { main: "c0ffee1", "docs/quickstart": "b7c1d90" },
    checks: [
      chk("The docs commit is on docs/quickstart", function (r) {
        return treeText(r, "docs/quickstart", "docs/quickstart.md").indexOf("GITCODE_TOKEN") !== -1;
      }, { hint: "Cherry-pick the commit onto the docs branch first." }),
      chk("main no longer contains the docs change", function (r) {
        return treeText(r, "main", "docs/quickstart.md").indexOf("GITCODE_TOKEN") === -1;
      }),
      chk("main kept its checkout work", function (r) {
        return r.isAncestor("b7c1d90", "main") && treeText(r, "main", "src/app.ts").indexOf("flow = 'checkout'") !== -1;
      }),
      chk("Both branches are clean", clean),
      chk("The docs branch did not move backwards", function (r) {
        return r.isAncestor("b7c1d90", "docs/quickstart");
      }, { hidden: true })
    ],
    solution: ["git branch --show-current", "git log -1 --oneline", "git switch docs/quickstart", "git cherry-pick c0ffee1", "git switch main", "git reset --hard HEAD~1"]
  };

  LABS["split-one-commit-into-three"] = {
    base: base({ "api/client.ts": "export async function request(path: string) {\n  return fetch(path);\n}\n" }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: request retries", { "api/client.ts": "export async function request(path: string) {\n  return fetch(path, { retry: 2 });\n}\n" }],
      ["4f1c9ab", "b7c1d90", "updates", {
        "api/client.ts": "export async function request(path: string) {\n  return fetch(path, { retry: 3, timeout: 5000 });\n}\n",
        "README.md": FILES["README.md"] + "\n## Retries\n\nRequests retry three times before failing.\n",
        ".github/ci.yml": "name: ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: npm test\n"
      }]
    ],
    branches: { main: "4f1c9ab" },
    checks: [
      chk("Three commits replace the mixed one", function (r) {
        return between(r, "b7c1d90").length === 3;
      }, { hint: "Soft reset to the parent, then commit one concern at a time." }),
      chk("The API change is alone", function (r) {
        return between(r, "b7c1d90").some(function (sha) { return touchedOnly(r, sha, "api/client.ts"); });
      }),
      chk("The README change is alone", function (r) {
        return between(r, "b7c1d90").some(function (sha) { return touchedOnly(r, sha, "README.md"); });
      }),
      chk("The CI change is alone", function (r) {
        return between(r, "b7c1d90").some(function (sha) { return touchedOnly(r, sha, ".github/ci.yml"); });
      }),
      chk("The final tree is unchanged", function (r) {
        return r.treeOf("HEAD")["api/client.ts"].indexOf("timeout: 5000") !== -1 && r.treeOf("HEAD")[".github/ci.yml"] != null;
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git show --stat HEAD", "git reset --soft HEAD^", "git restore --staged README.md .github/ci.yml", "git commit -m \"feat(api): retry requests three times\"", "git add README.md", "git commit -m \"docs: document request retries\"", "git add .github/ci.yml", "git commit -m \"ci: run tests on ubuntu 24.04\""]
  };

  /* ============================================================= debugging */

  LABS["find-the-first-bad-commit"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "release: 1.4.0", {}],
      ["b7c1d90", "a1b2c3d", "feat: cart drawer", { "src/cart.ts": "export const cart = [];\n" }],
      ["9d2e113", "b7c1d90", "feat: cart totals", { "src/cart.ts": "export const cart = [];\nexport const total = 0;\n" }],
      ["4f1c9ab", "9d2e113", "refactor: round totals", { "src/cart.ts": "export const cart = [];\nexport const total = Math.round(0);\n" }],
      ["c0ffee1", "4f1c9ab", "docs: cart notes", { "docs/cart.md": "# Cart\n" }],
      ["7a0be42", "c0ffee1", "test: cart coverage", { "tests/cart.test.ts": "test('cart', () => {\n  expect(true).toBe(true);\n});\n" }],
      ["e3d4c5b", "7a0be42", "style: format cart", { "src/cart.ts": "export const cart = [];\nexport const total = Math.round(0);\n" }],
      ["f0e1d2c", "e3d4c5b", "chore: bump dev deps", { "package.json": FILES["package.json"].replace('"version": "2.8.0"', '"version": "2.8.1"') }]
    ],
    branches: { main: "f0e1d2c" },
    tags: { "v1.4.0": "a1b2c3d" },
    bisectPath: ["a1b2c3d", "b7c1d90", "9d2e113", "4f1c9ab", "c0ffee1", "7a0be42", "e3d4c5b", "f0e1d2c"],
    bisectFirstBad: "4f1c9ab",
    checks: [
      chk("Bisect ended on 4f1c9ab", function (r) {
        return r.bisectResult === "4f1c9ab";
      }, { hint: "Mark main bad and v1.4.0 good, then let bisect run." }),
      chk("The repository is back on a branch", function (r) {
        return r.headBranch() === "main" && !r.bisect;
      }, { hint: "Finish with git bisect reset." }),
      chk("The working tree is clean", clean),
      chk("The first bad commit is inspectable", function (r) {
        return r.commits["4f1c9ab"] && r.commits["4f1c9ab"].subject === "refactor: round totals";
      }),
      chk("No commits were added or removed", function (r) {
        return between(r, "a1b2c3d").length === 7;
      }, { hidden: true })
    ],
    solution: ["git bisect start", "git bisect bad", "git bisect good v1.4.0", "git bisect run ./scripts/check.sh", "git bisect reset"]
  };

  LABS["bisect-a-flaky-test"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "release: 1.2.0", {}],
      ["b7c1d90", "a1b2c3d", "feat: cache layer", { "src/cache.ts": "export const cache = new Map();\n" }],
      ["9d2e113", "b7c1d90", "refactor: async cache", { "src/cache.ts": "export const cache = new Map();\nexport async function get() { return cache.get('x'); }\n" }],
      ["4f1c9ab", "9d2e113", "test: cache races", { "tests/cache.test.ts": "test('race', async () => {\n  await get();\n});\n" }],
      ["c0ffee1", "4f1c9ab", "feat: invoice", { "src/invoices.ts": "export const invoice = 1;\n" }],
      ["7a0be42", "c0ffee1", "docs: cache", { "docs/cache.md": "# Cache\n" }],
      ["e3d4c5b", "7a0be42", "style: cache", { "src/cache.ts": "export const cache = new Map();\nexport async function get() { return cache.get('x'); }\n" }],
      ["f0e1d2c", "e3d4c5b", "chore: deps", { "package.json": FILES["package.json"].replace('"version": "2.8.0"', '"version": "2.8.1"') }]
    ],
    branches: { main: "f0e1d2c" },
    tags: { "v1.2.0": "a1b2c3d" },
    bisectPath: ["a1b2c3d", "b7c1d90", "9d2e113", "4f1c9ab", "c0ffee1", "7a0be42", "e3d4c5b", "f0e1d2c"],
    bisectFirstBad: "9d2e113",
    checks: [
      chk("Bisect ended on 9d2e113", function (r) {
        return r.bisectResult === "9d2e113";
      }, { hint: "Wrap the test in a retry script so the predicate is deterministic." }),
      chk("The confidence note was committed", function (r) {
        return text(r, "docs/bisect-notes.md").toLowerCase().indexOf("confidence") !== -1;
      }, { hint: "Document the failure rate and the chosen threshold." }),
      chk("The repository is back on main", function (r) {
        return r.headBranch() === "main" && !r.bisect;
      }),
      chk("The working tree is clean", clean),
      chk("No history was rewritten", function (r) {
        return r.commits["a1b2c3d"] != null && between(r, "a1b2c3d").length >= 7;
      }, { hidden: true })
    ],
    solution: ["git bisect start", "git bisect bad", "git bisect good v1.2.0", "git bisect run ./scripts/flaky-check.sh", "git bisect reset", "edit docs/bisect-notes.md", "git add docs/bisect-notes.md", "git commit -m \"docs: record bisect confidence\""],
    resolutions: { "docs/bisect-notes.md": "# Flaky bisect\n\nThe predicate failed 4 of 5 runs at 9d2e113. Confidence: high, because the wrapper uses a 3/5 threshold and the raw runs are attached to the ticket.\n" }
  };

  LABS["cherry-pick-a-hotfix-to-a-release-branch"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: checkout flow", { "src/app.ts": FILES["src/app.ts"] + "\nexport const flow = 'checkout';\n" }],
      ["4f1c9ab", "b7c1d90", "fix: guard null session", { "src/session.ts": SESSION.replace("  if (!user) {\n    return null;\n  }", "  if (!user) {\n    return null;\n  }\n\n  // hotfix: never return a session without a user id\n  if (!user.id) return null;") }, "", { name: "Grace Hopper", email: "grace@example.com" }],
      ["9d2e113", "a1b2c3d", "chore: release 2.8 branch", { "package.json": FILES["package.json"].replace('"version": "2.8.0"', '"version": "2.8.0"') }]
    ],
    branches: { main: "4f1c9ab", "release/2.8": "9d2e113" },
    checks: [
      chk("The hotfix is on release/2.8", function (r) {
        return treeText(r, "release/2.8", "src/session.ts").indexOf("hotfix") !== -1;
      }, { hint: "Switch to release/2.8 and cherry-pick 4f1c9ab." }),
      chk("The source hash is recorded", function (r) {
        var tip = r.commits[r.branches["release/2.8"]];
        return tip && (tip.body + " " + tip.subject).indexOf("cherry picked from commit 4f1c9ab") !== -1;
      }, { hint: "Use cherry-pick -x." }),
      chk("The original author is preserved", function (r) {
        return authorEmail(r, r.branches["release/2.8"]) === "grace@example.com";
      }),
      chk("main was not changed", function (r) {
        return r.branches.main === "4f1c9ab";
      }),
      chk("The release branch is clean", clean, { hidden: true })
    ],
    solution: ["git switch release/2.8", "git cherry-pick -x 4f1c9ab"]
  };

  LABS["isolate-a-regression-with-log-s"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["4f1c9ab", "a1b2c3d", "refactor pricing helpers", { "src/pricing.ts": "export function formatCurrency(cents: number) {\n  return `$${(cents / 100).toFixed(2)}`;\n}\n" }],
      ["b7c1d90", "4f1c9ab", "feat: invoice preview", { "src/invoices.ts": "export const preview = true;\n" }],
      ["9d2e113", "b7c1d90", "docs: pricing", { "docs/pricing.md": "# Pricing\n" }]
    ],
    branches: { main: "9d2e113" },
    checks: [
      chk("The replacement is documented", function (r) {
        return text(r, "docs/regression.md").indexOf("formatCurrency") !== -1;
      }),
      chk("The culprit hash is documented", function (r) {
        return text(r, "docs/regression.md").indexOf("4f1c9ab") !== -1;
      }, { hint: "git log -S formatMoney --oneline --all" }),
      chk("The note is committed", function (r) {
        return r.treeOf("HEAD")["docs/regression.md"] != null && clean(r);
      }),
      chk("The old name is absent from the code", function (r) {
        return treeText(r, "HEAD", "src/pricing.ts").indexOf("formatMoney") === -1;
      }),
      chk("Only documentation was added", function (r) {
        var files = changed(r, r.headSha());
        return files.length === 1 && files[0] === "docs/regression.md";
      }, { hidden: true })
    ],
    solution: ["git log -S formatMoney --oneline --all", "edit docs/regression.md", "git add docs/regression.md", "git commit -m \"docs: trace the formatMoney regression\""],
    resolutions: { "docs/regression.md": "# Regression trace\n\n`formatMoney` was removed in 4f1c9ab (\"refactor pricing helpers\") and replaced by `formatCurrency`, which takes cents instead of dollars.\n" }
  };

  LABS["catch-a-bug-that-only-happens-on-merge"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: first-parent base", { "src/app.ts": FILES["src/app.ts"] + "\nexport const base = true;\n" }],
      ["9d2e113", "b7c1d90", "feat: merge interaction", { "src/app.ts": FILES["src/app.ts"] + "\nexport const base = true;\nexport const interaction = 'pricing';\n" }],
      ["c0ffee1", "9d2e113", "chore: release prep", { "docs/release.md": "# Release\n" }]
    ],
    branches: { main: "c0ffee1", "feature/base": "b7c1d90" },
    bisectPath: ["b7c1d90", "9d2e113", "c0ffee1"],
    bisectFirstBad: "9d2e113",
    checks: [
      chk("The merge interaction commit is identified", function (r) {
        return r.bisectResult === "9d2e113";
      }, { hint: "Bisect with --first-parent and a predicate that constructs the merge." }),
      chk("The interaction is documented", function (r) {
        var note = text(r, "docs/merge-bug.md");
        return note.indexOf("first-parent") !== -1 && note.indexOf("feature/base") !== -1;
      }),
      chk("The note is committed", function (r) {
        return r.treeOf("HEAD")["docs/merge-bug.md"] != null && clean(r);
      }),
      chk("The repository is back on main", function (r) {
        return r.headBranch() === "main" && !r.bisect;
      }),
      chk("No code was changed", function (r) {
        return treeText(r, "HEAD", "src/app.ts").indexOf("interaction = 'pricing'") !== -1;
      }, { hidden: true })
    ],
    solution: ["git bisect start --first-parent main", "git bisect bad", "git bisect good feature/base", "git bisect run ./scripts/integration-check.sh", "git bisect reset", "edit docs/merge-bug.md", "git add docs/merge-bug.md", "git commit -m \"docs: record the merge interaction\""],
    resolutions: { "docs/merge-bug.md": "# Merge interaction\n\nThe failure only appears when 9d2e113 is merged with feature/base. Bisecting the first-parent history isolates the interaction; neither side fails alone.\n" }
  };

  LABS["blame-the-right-commit-after-a-rename"] = {
    base: base({ "src/auth.ts": SESSION.replace("  if (!session.userId) {", "  if (session.userId == null) {") }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: invoice preview", { "src/invoices.ts": "export const preview = true;\n" }],
      ["9d2e113", "b7c1d90", "refactor: simplify role check", { "src/auth.ts": SESSION }],
      ["4f1c9ab", "9d2e113", "refactor: rename session module", { "src/auth.ts": null, "src/session.ts": SESSION }],
      ["c0ffee1", "4f1c9ab", "docs: session notes", { "docs/session.md": "# Session\n" }]
    ],
    branches: { main: "c0ffee1" },
    checks: [
      chk("The faulty commit is documented", function (r) {
        return text(r, "docs/blame.md").indexOf("9d2e113") !== -1;
      }, { hint: "Use git blame -C -C to follow the line across the rename." }),
      chk("The faulty condition is documented", function (r) {
        return text(r, "docs/blame.md").indexOf("session.userId") !== -1;
      }),
      chk("The note is committed", function (r) {
        return r.treeOf("HEAD")["docs/blame.md"] != null && clean(r);
      }),
      chk("The code is unchanged", function (r) {
        return treeText(r, "HEAD", "src/session.ts").indexOf("if (!session.userId)") !== -1;
      }),
      chk("The rename was called out as noise", function (r) {
        return /rename/i.test(text(r, "docs/blame.md"));
      }, { hidden: true })
    ],
    solution: ["git blame -L 40,48 src/session.ts", "git blame -C -C -L 40,48 src/session.ts", "edit docs/blame.md", "git add docs/blame.md", "git commit -m \"docs: identify the session guard regression\""],
    resolutions: { "docs/blame.md": "# Blame through a rename\n\nThe faulty `if (!session.userId)` condition was introduced in 9d2e113 under the old path `src/auth.ts`. The mass rename 4f1c9ab is not the culprit.\n" }
  };

  LABS["test-a-fix-without-touching-your-branch"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "fix: guard session", { "src/session.ts": SESSION.replace("  if (!session.userId) {", "  if (session.userId == null) {") }]
    ],
    branches: { main: "a1b2c3d", "fix/session-guard": "b7c1d90" },
    files: {
      "src/app.ts": FILES["src/app.ts"] + "\n// local work in progress: do not lose this\nexport const draft = true;\n"
    },
    checks: [
      chk("A worktree was created", function (r) {
        return r.worktreeHistory.length > 0 && r.worktreeHistory[0].branch === "fix/session-guard";
      }, { hint: "git worktree add ../gc-review fix/session-guard" }),
      chk("The worktree was removed", function (r) {
        return r.worktrees.length === 0;
      }, { hint: "Finish with git worktree remove ../gc-review." }),
      chk("The local draft is untouched", function (r) {
        return text(r, "src/app.ts").indexOf("draft = true") !== -1;
      }),
      chk("No stash was needed", function (r) {
        return r.stash.length === 0;
      }),
      chk("The fix branch still exists", function (r) {
        return r.branches["fix/session-guard"] != null;
      }, { hidden: true })
    ],
    solution: ["git worktree add ../gc-review fix/session-guard", "git worktree list", "git worktree remove ../gc-review"]
  };

  /* =============================================================== history */

  LABS["clean-up-a-messy-commit-history"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: express checkout", { "src/checkout.ts": "export const checkout = 'express';\n" }],
      ["9d2e113", "b7c1d90", "style: prettier", { "src/checkout.ts": "export const checkout = 'express';\n" }],
      ["4f1c9ab", "9d2e113", "Revert \"feat: express checkout\"", { "src/checkout.ts": null }],
      ["c0ffee1", "4f1c9ab", "feat: express checkout v2", { "src/checkout.ts": "export const checkout = 'express';\nexport const instant = true;\n" }],
      ["7a0be42", "c0ffee1", "style: prettier", { "src/checkout.ts": "export const checkout = 'express';\nexport const instant = true;\n" }],
      ["e3d4c5b", "7a0be42", "test: cover express checkout", { "tests/checkout.test.ts": "import { checkout } from '../src/checkout';\n\ntest('uses express checkout', () => {\n  expect(checkout).toBe('express');\n});\n" }],
      ["1a2b3c4", "e3d4c5b", "style: format tests", { "tests/checkout.test.ts": "import { checkout } from '../src/checkout';\n\ntest('uses express checkout', () => {\n  expect(checkout).toBe('express');\n});\n" }],
      ["5e6f7a8", "1a2b3c4", "docs: express checkout", { "README.md": FILES["README.md"] + "\n## Express checkout\n\nExpress checkout is on by default.\n" }],
      ["d4e5f6a", "5e6f7a8", "fix: typo in checkout copy", { "README.md": FILES["README.md"] + "\n## Express checkout\n\nExpress checkout is enabled by default.\n" }]
    ],
    branches: { main: "a1b2c3d", "feature/checkout": "d4e5f6a" },
    head: "feature/checkout",
    checks: [
      chk("The branch has three reviewable commits", function (r) {
        return between(r, "main").length === 3;
      }, { hint: "Keep a feature commit, a test commit, and a docs commit." }),
      chk("All revert noise is gone", function (r) {
        return between(r, "main").every(function (sha) { return !/^revert/i.test(r.commits[sha].subject); });
      }),
      chk("The final tree is preserved", function (r) {
        return r.treeOf("HEAD")["src/checkout.ts"].indexOf("instant = true") !== -1 &&
          r.treeOf("HEAD")["tests/checkout.test.ts"] != null &&
          r.treeOf("HEAD")["README.md"].indexOf("enabled by default") !== -1;
      }),
      chk("The working tree is clean", clean),
      chk("Each commit owns one concern", function (r) {
        var commits = between(r, "main");
        return commits.some(function (sha) { return touchedOnly(r, sha, "src/checkout.ts"); }) &&
          commits.some(function (sha) { return touchedOnly(r, sha, "tests/checkout.test.ts"); }) &&
          commits.some(function (sha) { return touchedOnly(r, sha, "README.md"); });
      }, { hidden: true })
    ],
    solution: ["git log --oneline main..HEAD", "git reset --soft main", "git restore --staged tests/ README.md", "git commit -m \"feat: express checkout\"", "git add tests/", "git commit -m \"test: cover express checkout\"", "git add README.md", "git commit -m \"docs: document express checkout\""]
  };

  LABS["rewrite-an-author-on-old-commits"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: billing", { "src/billing.ts": "export const billing = 1;\n" }, "", { name: "Ada Lovelace", email: "ada@personal.test" }],
      ["9d2e113", "b7c1d90", "test: billing", { "tests/billing.test.ts": "test('billing', () => {});\n" }, "", { name: "Ada Lovelace", email: "ada@personal.test" }],
      ["4f1c9ab", "9d2e113", "docs: billing", { "docs/billing.md": "# Billing\n" }, "", { name: "Ada Lovelace", email: "ada@personal.test" }],
      ["c0ffee1", "4f1c9ab", "fix: billing edge", { "src/billing.ts": "export const billing = 2;\n" }, "", { name: "Ada Lovelace", email: "ada@personal.test" }],
      ["7a0be42", "c0ffee1", "chore: billing deps", { "package.json": FILES["package.json"].replace('"version": "2.8.0"', '"version": "2.8.1"') }, "", { name: "Ada Lovelace", email: "ada@personal.test" }]
    ],
    branches: { main: "7a0be42" },
    checks: [
      chk("No personal email remains", function (r) {
        return Object.keys(r.commits).every(function (sha) { return authorEmail(r, sha) !== "ada@personal.test"; });
      }, { hint: "Rewrite the author email across all commits with filter-repo." }),
      chk("The new email is used", function (r) {
        return Object.keys(r.commits).every(function (sha) { return authorEmail(r, sha) === "ada@example.com" || r.commits[sha].parents.length === 0; });
      }),
      chk("The commit count is unchanged", function (r) {
        return Object.keys(r.commits).length === 6;
      }),
      chk("The code is unchanged", function (r) {
        return r.treeOf("HEAD")["src/billing.ts"].indexOf("billing = 2") !== -1;
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git log --format='%h %ae %s' main..HEAD", "git filter-repo --email-map ada@personal.test=ada@example.com --force"]
  };

  LABS["remove-a-build-artifact-committed-by-mistake"] = {
    base: base({ ".gitignore": "node_modules/\n.env.local\n" }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "build: add release binary", { "dist/app": "ELF-binary-placeholder-".repeat(200) }]
    ],
    branches: { main: "b7c1d90" },
    files: { "dist/app": "ELF-binary-placeholder-".repeat(200) },
    checks: [
      chk("The artifact is no longer tracked", function (r) {
        return r.index["dist/app"] == null;
      }, { hint: "git rm --cached dist/app keeps the file on disk." }),
      chk("The artifact is still on disk", function (r) {
        return r.files["dist/app"] != null;
      }),
      chk("The artifact is ignored", function (r) {
        return text(r, ".gitignore").split("\n").indexOf("dist/app") !== -1;
      }),
      chk("HEAD no longer contains the artifact", function (r) {
        return r.treeOf("HEAD")["dist/app"] == null;
      }),
      chk("No tracked changes remain", function (r) {
        return trackedClean(r);
      }, { hidden: true })
    ],
    solution: ["git ls-files dist/app", "du -h dist/app", "git rm --cached dist/app", "printf '\\ndist/app\\n' >> .gitignore", "git add .gitignore", "git commit -m \"chore: stop tracking the release binary\""]
  };

  LABS["recover-a-file-deleted-ten-commits-ago"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "chore: tune rate limits", { "config/limits.yml": "rate_limit: 240\nburst: 40\nwindow_seconds: 60\n" }],
      ["9d2e113", "b7c1d90", "chore: remove legacy limits", { "config/limits.yml": null }],
      ["4f1c9ab", "9d2e113", "feat: invoices", { "src/invoices.ts": "export const invoice = 1;\n" }],
      ["c0ffee1", "4f1c9ab", "test: invoices", { "tests/invoices.test.ts": "test('invoice', () => {});\n" }],
      ["7a0be42", "c0ffee1", "docs: invoices", { "docs/invoices.md": "# Invoices\n" }],
      ["e3d4c5b", "7a0be42", "style: invoices", { "src/invoices.ts": "export const invoice = 1;\n" }],
      ["1a2b3c4", "e3d4c5b", "chore: deps", { "package.json": FILES["package.json"].replace('"version": "2.8.0"', '"version": "2.8.1"') }],
      ["5e6f7a8", "1a2b3c4", "docs: deploy", { "docs/deploy.md": "# Deploy\n" }],
      ["d4e5f6a", "5e6f7a8", "chore: release notes", { "docs/release.md": "# Release\n" }]
    ],
    branches: { main: "d4e5f6a" },
    checks: [
      chk("The config file is restored", function (r) {
        return treeText(r, "main", "config/limits.yml").indexOf("rate_limit: 240") !== -1;
      }, { hint: "Check out the file from 9d2e113^, the commit before the deletion." }),
      chk("The deletion is still in history", function (r) {
        return r.isAncestor("9d2e113", "main");
      }),
      chk("Later work is untouched", function (r) {
        return r.isAncestor("d4e5f6a", "main") && r.treeOf("main")["src/invoices.ts"] != null;
      }),
      chk("The restore is committed", function (r) {
        return clean(r);
      }),
      chk("No merge was introduced", function (r) {
        return !isMerge(r, r.headSha());
      }, { hidden: true })
    ],
    solution: ["git log --diff-filter=D --oneline -- config/limits.yml", "git show 9d2e113^:config/limits.yml", "git checkout 9d2e113^ -- config/limits.yml", "git add config/limits.yml", "git commit -m \"restore: bring back config/limits.yml\""]
  };

  LABS["make-two-branches-share-history-again"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: search filters", { "src/search.ts": "export const filters = ['brand'];\n" }],
      ["9d2e113", "b7c1d90", "test: search filters", { "tests/search.test.ts": "test('filters', () => {});\n" }],
      ["b7c1d9e", "a1b2c3d", "feat: search filters (copy)", { "src/search.ts": "export const filters = ['brand'];\n" }],
      ["9d2e11f", "b7c1d9e", "test: search filters (copy)", { "tests/search.test.ts": "test('filters', () => {});\n" }],
      ["4f1c9a0", "9d2e11f", "feat: refunds", { "src/refunds.ts": "export const refunds = true;\n" }]
    ],
    branches: { main: "9d2e113", feature: "4f1c9a0" },
    head: "feature",
    checks: [
      chk("The branches share history", function (r) {
        return r.isAncestor("main", "feature");
      }, { hint: "Rebase the copied branch onto main; equivalent patches are dropped." }),
      chk("The unique refunds work survives", function (r) {
        return r.treeOf("feature")["src/refunds.ts"] != null;
      }),
      chk("The duplicate patches are gone", function (r) {
        return between(r, "main").length === 1;
      }, { hint: "Only the refunds commit should remain above main." }),
      chk("The working tree is clean", clean),
      chk("The merge base moved to main", function (r) {
        return r.mergeBase("main", "feature") === r.branches.main;
      }, { hidden: true })
    ],
    solution: ["git merge-base main feature", "git log --oneline --left-right main...feature", "git switch feature", "git rebase main"]
  };

  LABS["rewrite-a-merge-commits-parents"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: main work", { "src/app.ts": FILES["src/app.ts"] + "\nexport const mainline = true;\n" }],
      ["9d2e113", "a1b2c3d", "chore: release prep", { "package.json": FILES["package.json"].replace('"version": "2.8.0"', '"version": "2.8.0"') }],
      ["4f1c9ab", "a1b2c3d", "feat: staging experiment", { "src/staging.ts": "export const staging = true;\n" }],
      ["c0ffee1", "4f1c9ab", "Merge branch 'release/2.8' into staging", { "src/app.ts": FILES["src/app.ts"] + "\nexport const mainline = true;\n", "src/staging.ts": "export const staging = true;\n" }]
    ],
    branches: { main: "b7c1d90", "release/2.8": "9d2e113" },
    head: "detached:c0ffee1",
    checks: [
      chk("The merge parents are rewritten", function (r) {
        var parents = r.replacements[r.headSha()];
        return !!parents && parents[0] === "b7c1d90" && parents[1] === "9d2e113";
      }, { hint: "git replace --graft HEAD main release/2.8" }),
      chk("The tree is unchanged", function (r) {
        return r.treeOf("HEAD")["src/staging.ts"] != null && r.treeOf("HEAD")["src/app.ts"].indexOf("mainline") !== -1;
      }),
      chk("The original commit is still a merge", function (r) {
        var commit = r.commits[r.headSha()];
        var effective = r.replacements[r.headSha()] || (commit ? commit.parents : []);
        return effective.length === 2;
      }),
      chk("The replacement is visible in log", function (r) {
        var style = r.exec("git show --no-patch --format=%P HEAD");
        return style.lines[0].text.indexOf("b7c1d90") === 0;
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git show --no-patch --format='%P' HEAD", "git rev-parse main release/2.8", "git replace --graft HEAD main release/2.8", "git show --no-patch --format='%P' HEAD"]
  };

  /* ========================================================= collaboration */

  LABS["sync-a-fork-without-polluting-history"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: local cart", { "src/cart.ts": "export const cart = [];\n" }],
      ["c0ffee1", "a1b2c3d", "feat: upstream search", { "src/search.ts": "export const search = true;\n" }],
      ["9d2e113", "b7c1d90", "Merge branch 'main' of upstream", { "src/cart.ts": "export const cart = [];\n", "src/search.ts": "export const search = true;\n" }, "", { name: "Ada Lovelace", email: "ada@example.com" }]
    ],
    commitsExtraParents: { "9d2e113": ["b7c1d90", "c0ffee1"] },
    branches: { main: "9d2e113" },
    remotes: {
      upstream: { url: "https://example.com/org/repo.git", branches: { main: "4f1c9ab" } },
      origin: { url: "https://example.com/ada/repo.git", branches: { main: "9d2e113" } }
    },
    extraCommits: [
      ["4f1c9ab", "c0ffee1", "feat: upstream checkout v3", { "src/app.ts": FILES["src/app.ts"] + "\nexport const VERSION = 3;\n" }]
    ],
    checks: [
      chk("The fork contains the upstream tip", function (r) {
        return r.isAncestor("4f1c9ab", "main");
      }, { hint: "Fetch upstream and rebase main onto upstream/main." }),
      chk("History is linear", function (r) {
        return between(r, "4f1c9ab").every(function (sha) { return !/^Merge branch 'main' of upstream/.test(r.commits[sha].subject); });
      }, { hint: "Drop the merge commits by rebasing, not merging." }),
      chk("origin/main was updated", function (r) {
        return r.remotes.origin.branches.main === r.branches.main;
      }),
      chk("Local work survived", function (r) {
        return r.treeOf("main")["src/cart.ts"] != null;
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git remote add upstream https://example.com/org/repo.git", "git fetch upstream", "git rebase upstream/main", "git push --force-with-lease origin main"]
  };

  LABS["push-a-rebased-branch-safely"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: cart drawer", { "src/cart.ts": "export const cart = [];\n" }],
      ["9d2e113", "b7c1d90", "feat: cart totals", { "src/cart.ts": "export const cart = [];\nexport const total = 0;\n" }],
      ["c0ffee1", "a1b2c3d", "fix: teammate cart guard", { "src/cart-guard.ts": "export function guard() { return true; }\n" }, "", { name: "Mira Chen", email: "mira@example.com" }]
    ],
    branches: { "feature/cart": "9d2e113", main: "a1b2c3d" },
    head: "feature/cart",
    remotes: { origin: { branches: { "feature/cart": "c0ffee1", main: "a1b2c3d" } } },
    checks: [
      chk("The teammate commit is preserved", function (r) {
        return r.isAncestor("c0ffee1", "origin/feature/cart");
      }, { hint: "Fetch, rebase onto origin/feature/cart, then force-push with a lease." }),
      chk("Local and remote agree", function (r) {
        return r.remotes.origin.branches["feature/cart"] === r.branches["feature/cart"];
      }),
      chk("Your cart work survived", function (r) {
        return r.treeOf("feature/cart")["src/cart.ts"].indexOf("total = 0") !== -1;
      }),
      chk("The working tree is clean", clean),
      chk("The push used a lease", function (r) {
        return r.remotes.origin.branches["feature/cart"] != null;
      }, { hidden: true })
    ],
    solution: ["git push", "git fetch origin", "git log --oneline HEAD..origin/feature/cart", "git rebase origin/feature/cart", "git push --force-with-lease origin feature/cart"]
  };

  LABS["salvage-a-pr-after-an-upstream-rewrite"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["7a0be42", "a1b2c3d", "feat: old base", { "src/old.ts": "export const old = true;\n" }],
      ["4f1c9ab", "7a0be42", "feat: cart coupon", { "src/coupon.ts": "export const coupon = true;\n" }],
      ["b7c1d90", "a1b2c3d", "refactor: new base one", { "src/new.ts": "export const base = 1;\n" }],
      ["9d2e113", "b7c1d90", "refactor: new base two", { "src/new.ts": "export const base = 2;\n" }]
    ],
    branches: { "feature/cart": "4f1c9ab", main: "a1b2c3d" },
    head: "feature/cart",
    remotes: { origin: { branches: { main: "9d2e113" } } },
    checks: [
      chk("The PR is based on the new main", function (r) {
        return r.isAncestor("origin/main", "feature/cart");
      }, { hint: "Use rebase --onto origin/main 7a0be42 feature/cart." }),
      chk("The orphaned base is gone", function (r) {
        return !r.isAncestor("7a0be42", "feature/cart");
      }),
      chk("Only the coupon commit remains", function (r) {
        return between(r, "origin/main").length === 1 && r.treeOf("feature/cart")["src/coupon.ts"] != null;
      }),
      chk("The diff is clean", function (r) {
        return between(r, "origin/main").every(function (sha) { return changed(r, sha).length === 1; });
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git fetch origin", "git rebase --onto origin/main 7a0be42 feature/cart"]
  };

  LABS["review-a-pr-without-checking-it-out"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: main checkout", { "src/app.ts": FILES["src/app.ts"] + "\nexport const main = true;\n" }],
      ["c0ffee1", "a1b2c3d", "feat: pr session guard", { "src/session.ts": SESSION.replace("  if (!session.userId) {", "  if (session.userId == null) {"), "src/total.ts": TOTAL + "\nexport const rounded = true;\n" }]
    ],
    branches: { main: "b7c1d90" },
    remotes: { origin: { branches: { main: "b7c1d90" }, pulls: { "482/head": "c0ffee1" } } },
    checks: [
      chk("The PR ref was fetched", function (r) {
        return r.branches["pr-482"] != null;
      }, { hint: "git fetch origin pull/482/head:pr-482" }),
      chk("The review note lists the changed files", function (r) {
        var note = text(r, "docs/review-482.md");
        return note.indexOf("src/session.ts") !== -1 && note.indexOf("src/total.ts") !== -1;
      }),
      chk("The note is committed", function (r) {
        return r.treeOf("HEAD")["docs/review-482.md"] != null && clean(r);
      }),
      chk("main was not checked out away", function (r) {
        return r.headBranch() === "main";
      }),
      chk("The review used a three-dot diff", function (r) {
        return r.mergeBase("main", "pr-482") === "a1b2c3d";
      }, { hidden: true })
    ],
    solution: ["git fetch origin pull/482/head:pr-482", "git diff --stat main...pr-482", "git diff main...pr-482 -- src/session.ts", "edit docs/review-482.md", "git add docs/review-482.md", "git commit -m \"docs: review PR 482\""],
    resolutions: { "docs/review-482.md": "# Review: PR 482\n\nFiles that need attention: `src/session.ts` (guard change) and `src/total.ts` (rounding flag). The three-dot diff against `main` matches the PR page.\n" }
  };

  LABS["land-a-stack-of-dependent-prs"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: layer 1", { "layers/l1.txt": "layer 1\n" }],
      ["c0ffee1", "a1b2c3d", "Merge pull request #101 from feature/layer-1", { "layers/l1.txt": "layer 1\n" }],
      ["9d2e113", "b7c1d90", "feat: layer 2", { "layers/l2.txt": "layer 2\n" }],
      ["4f1c9ab", "9d2e113", "feat: layer 3", { "layers/l3.txt": "layer 3\n" }],
      ["7a0be42", "4f1c9ab", "feat: layer 4", { "layers/l4.txt": "layer 4\n" }]
    ],
    commitsExtraParents: { "c0ffee1": ["a1b2c3d", "b7c1d90"] },
    branches: {
      main: "c0ffee1",
      "feature/layer-1": "b7c1d90",
      "feature/layer-2": "9d2e113",
      "feature/layer-3": "4f1c9ab",
      "feature/layer-4": "7a0be42"
    },
    head: "feature/layer-4",
    checks: [
      chk("Every layer is based on the layer below", function (r) {
        return r.isAncestor("main", "feature/layer-2") && r.isAncestor("feature/layer-2", "feature/layer-3") && r.isAncestor("feature/layer-3", "feature/layer-4");
      }, { hint: "Rebase each layer with --onto as its parent lands." }),
      chk("Layer 2 is one commit above main", function (r) {
        return r.rangeCommits("main", "feature/layer-2", false).length === 1;
      }),
      chk("All four files survive", function (r) {
        var tree = r.treeOf("feature/layer-4");
        return tree["layers/l1.txt"] != null && tree["layers/l2.txt"] != null && tree["layers/l3.txt"] != null && tree["layers/l4.txt"] != null;
      }),
      chk("No layer was merged into another", function (r) {
        return r.rangeCommits("main", "feature/layer-4", false).every(function (sha) { return !isMerge(r, sha); });
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git rebase --onto main b7c1d90 feature/layer-2", "git rebase --onto feature/layer-2 9d2e113 feature/layer-3", "git rebase --onto feature/layer-3 4f1c9ab feature/layer-4"]
  };

  /* ================================================================ safety */

  LABS["undo-a-bad-merge-that-was-already-pushed"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: search", { "src/search.ts": "export const search = true;\n" }],
      ["9d2e113", "a1b2c3d", "feat: checkout v3", { "src/app.ts": FILES["src/app.ts"] + "\nexport const VERSION = 3;\n" }],
      ["4f1c9ab", "9d2e113", "Merge branch 'feature/search'", { "src/search.ts": "export const search = true;\n", "src/app.ts": FILES["src/app.ts"] + "\nexport const VERSION = 3;\n" }]
    ],
    commitsExtraParents: { "4f1c9ab": ["9d2e113", "b7c1d90"] },
    branches: { main: "4f1c9ab" },
    checks: [
      chk("A revert commit was added", function (r) {
        var tip = r.commits[r.headSha()];
        return tip && /^Revert "Merge branch 'feature\/search'"/.test(tip.subject);
      }, { hint: "git revert -m 1 4f1c9ab" }),
      chk("The merge remains in history", function (r) {
        return r.isAncestor("4f1c9ab", "main");
      }, { hint: "Do not rewrite the shared branch." }),
      chk("The feature files are gone", function (r) {
        return r.treeOf("main")["src/search.ts"] == null;
      }),
      chk("The checkout work survived", function (r) {
        return r.treeOf("main")["src/app.ts"].indexOf("VERSION = 3") !== -1;
      }),
      chk("The working tree is clean", clean, { hidden: true })
    ],
    solution: ["git revert -m 1 4f1c9ab"]
  };

  LABS["stash-work-mid-rebase"] = {
    base: base({ "scratch/notes.md": "# Scratch\n\nOriginal notes.\n" }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "feat: guard null sessions", { "src/session.ts": SESSION.replace("  if (!user) {\n    return null;\n  }", "  if (!user) {\n    return null;\n  }\n\n  if (!user.id) return null;") }],
      ["9d2e113", "a1b2c3d", "feat: guard anonymous sessions", { "src/session.ts": SESSION.replace("  if (!user) {\n    return null;\n  }", "  if (!user) {\n    return null;\n  }\n\n  if (user.id === 'anonymous') return null;") }]
    ],
    branches: { main: "b7c1d90", "feature/session": "9d2e113" },
    head: "feature/session",
    rebaseConflict: { branch: "feature/session", onto: "main", upstream: "main", commit: "9d2e113", label: "main" },
    files: { "scratch/notes.md": "# Scratch\n\nOriginal notes.\n\nTheory: the TTL is the problem, not the guard.\n" },
    checks: [
      chk("The rebase finished", function (r) {
        return !r.rebaseState && Object.keys(r.unmerged).length === 0;
      }, { hint: "Stash the unrelated edit, resolve, continue, then pop." }),
      chk("The resolved guard was committed", function (r) {
        return r.treeOf("feature/session")["src/session.ts"].indexOf("user.id === 'anonymous'") !== -1;
      }),
      chk("The scratch edit came back", function (r) {
        return text(r, "scratch/notes.md").indexOf("Theory: the TTL") !== -1;
      }),
      chk("The scratch edit is not in the commit", function (r) {
        return r.treeOf("feature/session")["scratch/notes.md"].indexOf("TTL") === -1;
      }),
      chk("The rebase added one commit", function (r) {
        return between(r, "main").length === 1;
      }, { hidden: true })
    ],
    solution: ["git status --short", "git stash push -- scratch/notes.md", "edit src/session.ts", "git add src/session.ts", "git rebase --continue", "git stash pop"],
    resolutions: { "src/session.ts": SESSION.replace("  if (!user) {\n    return null;\n  }", "  if (!user) {\n    return null;\n  }\n\n  if (!user.id) return null;\n  if (user.id === 'anonymous') return null;") }
  };

  LABS["recover-from-a-failed-interactive-rebase"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["4f1c9ab", "a1b2c3d", "feat: checkout v2", { "src/app.ts": FILES["src/app.ts"] + "\nexport const VERSION = 2;\n" }],
      ["c0ffee1", "a1b2c3d", "feat: checkout v2", { "src/app.ts": FILES["src/app.ts"] + "\nexport const VERSION = 2;\nexport const partial = true;\n" }]
    ],
    branches: { main: "c0ffee1" },
    head: "main",
    rebaseStateRaw: {
      plan: { branch: "main", tip: "4f1c9ab", onto: "a1b2c3d" },
      todo: [],
      pending: null,
      preHead: "4f1c9ab",
      preType: "branch",
      preBranch: "main",
      preFiles: null,
      preIndex: null,
      interactive: true
    },
    checks: [
      chk("The rebase was aborted", function (r) {
        return !r.rebaseState;
      }, { hint: "git rebase --abort restores the original tip." }),
      chk("The original tip is restored", function (r) {
        return r.branches.main === "4f1c9ab";
      }),
      chk("The partial commit is gone", function (r) {
        return r.treeOf("main")["src/app.ts"].indexOf("partial") === -1;
      }),
      chk("The working tree is clean", clean),
      chk("The branch is still main", function (r) {
        return r.headBranch() === "main";
      }, { hidden: true })
    ],
    solution: ["git status", "git rebase --abort", "git log --oneline -1"]
  };

  LABS["untrack-a-file-without-deleting-it"] = {
    base: base({ ".gitignore": "node_modules/\ndist/\n" }),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}],
      ["b7c1d90", "a1b2c3d", "chore: add local environment", { ".env.local": "API_URL=http://localhost:4000\nFEATURE_FLAG=on\n" }]
    ],
    branches: { main: "b7c1d90" },
    checks: [
      chk("The file is no longer tracked", function (r) {
        return r.index[".env.local"] == null;
      }, { hint: "git rm --cached .env.local" }),
      chk("The file still exists locally", function (r) {
        return r.files[".env.local"] != null && r.files[".env.local"].indexOf("FEATURE_FLAG") !== -1;
      }),
      chk("The ignore rule is present", function (r) {
        return text(r, ".gitignore").split("\n").indexOf(".env.local") !== -1;
      }),
      chk("HEAD no longer contains the file", function (r) {
        return r.treeOf("HEAD")[".env.local"] == null;
      }),
      chk("No tracked changes remain", function (r) {
        return trackedClean(r);
      }, { hidden: true })
    ],
    solution: ["git ls-files .env.local", "git rm --cached .env.local", "printf '.env.local\\n' >> .gitignore", "git add .gitignore", "git commit -m \"chore: stop tracking local environment\""]
  };

  LABS["protect-main-from-accidental-commits"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "chore: bootstrap checkout service", {}]
    ],
    branches: { main: "a1b2c3d" },
    hooks: {},
    checks: [
      chk("The hook checks the branch", function (r) {
        return (r.hooks["pre-commit"] || "").indexOf("symbolic-ref") !== -1;
      }, { hint: "Read the branch with git symbolic-ref --short HEAD." }),
      chk("The hook blocks main", function (r) {
        return /main/.test(r.hooks["pre-commit"] || "") && /exit 1/.test(r.hooks["pre-commit"] || "");
      }),
      chk("The override is documented", function (r) {
        return (r.hooks["pre-commit"] || "").indexOf("GITCODE_ALLOW_MAIN") !== -1;
      }),
      chk("A direct commit was blocked", function (r) {
        return r.hookBlocks > 0;
      }, { hint: "Try to commit on main once to exercise the hook." }),
      chk("The override allows an emergency commit", function (r) {
        return r.headBranch() === "main" && /emergency/i.test((r.commits[r.headSha()] || {}).subject || "");
      }, { hidden: true })
    ],
    solution: ["edit .git/hooks/pre-commit", "git switch main", "git commit --allow-empty -m \"quick fix\"", "GITCODE_ALLOW_MAIN=1 git commit --allow-empty -m \"emergency: release hotfix\""],
    resolutions: {
      ".git/hooks/pre-commit": "#!/usr/bin/env bash\nbranch=\"$(git symbolic-ref --short HEAD)\"\nif [ \"$branch\" = \"main\" ] && [ \"${GITCODE_ALLOW_MAIN:-0}\" != \"1\" ]; then\n  echo \"[ERROR] Direct commits to main are blocked. Use a branch.\"\n  echo \"Override: GITCODE_ALLOW_MAIN=1 git commit ...\"\n  exit 1\nfi\nexit 0\n"
    }
  };

  LABS["find-what-changed-between-two-tags"] = {
    base: base(),
    commits: [
      ["a1b2c3d", null, "release: v2.7.0", {}],
      ["b7c1d90", "a1b2c3d", "feat: billing retries", { "src/billing.ts": "export const retries = 3;\n" }],
      ["9d2e113", "b7c1d90", "feat: experimental cache", { "src/cache.ts": "export const experimental = true;\n" }],
      ["4f1c9ab", "9d2e113", "Revert \"feat: experimental cache\"", { "src/cache.ts": null }],
      ["c0ffee1", "4f1c9ab", "feat: saved search filters", { "src/search.ts": "export const savedFilters = true;\n" }],
      ["7a0be42", "c0ffee1", "chore: release notes scaffold", { "docs/release-2.8.0.md": "# Release 2.8.0\n\n## Billing\n\n## Search\n" }],
      ["e3d4c5b", "7a0be42", "Merge branch 'search'", { "src/search.ts": "export const savedFilters = true;\n", "src/billing.ts": "export const retries = 3;\n" }]
    ],
    commitsExtraParents: { "e3d4c5b": ["7a0be42", "c0ffee1"] },
    branches: { main: "e3d4c5b" },
    tags: { "v2.7.0": "a1b2c3d", "v2.8.0": "e3d4c5b" },
    checks: [
      chk("The billing change is described", function (r) {
        return /retr(y|ies|ied)|three times/i.test(text(r, "docs/release-2.8.0.md"));
      }),
      chk("The search change is described", function (r) {
        return /saved filters/i.test(text(r, "docs/release-2.8.0.md"));
      }),
      chk("The reverted cache work is excluded", function (r) {
        return !/cache/i.test(text(r, "docs/release-2.8.0.md"));
      }, { hint: "Reverted commits should not appear in user-visible notes." }),
      chk("The note is committed", function (r) {
        return r.treeOf("HEAD")["docs/release-2.8.0.md"] != null && clean(r);
      }),
      chk("The tag range is the source of truth", function (r) {
        return r.tags["v2.7.0"] === "a1b2c3d" && r.tags["v2.8.0"] === "e3d4c5b";
      }, { hidden: true })
    ],
    solution: ["git log --oneline v2.7.0..v2.8.0", "git diff --stat v2.7.0 v2.8.0", "edit docs/release-2.8.0.md", "git add docs/release-2.8.0.md", "git commit -m \"docs: draft the 2.8.0 release notes\""],
    resolutions: { "docs/release-2.8.0.md": "# Release 2.8.0\n\n## Billing\n\n- Retry failed charges up to three times.\n\n## Search\n\n- Saved filters are now available.\n" }
  };

  (typeof window !== "undefined" ? window : globalThis).GCLabs = LABS;
})();
