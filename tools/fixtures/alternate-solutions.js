// Alternative valid workflows for the audit harness. Each entry is either an
// array of commands or { commands, resolutions }. Resolutions override the
// lab's own editor contents when a workflow edits a different path.
//
// Labs omitted here have one canonical workflow that the official solution
// already exercises (for example a single `git commit --amend`).

module.exports = {
  "recover-a-lost-commit": [
    "git reflog --oneline",
    "git branch recovered 4f1c9ab",
    "git rebase --onto main 9d2e113 recovered",
    "git switch main",
    "git merge --ff-only recovered"
  ],

  "recover-a-dropped-stash": [
    "git fsck --unreachable | grep commit",
    "git stash apply 44d9c71",
    "git stash apply 8c1f0a2"
  ],

  "recover-files-from-a-corrupt-index": [
    "mv .git/index .git/index.bak",
    "git reset",
    "git add src/session.ts"
  ],

  "undo-a-force-push-on-main": [
    "git fetch origin",
    "git rebase --onto origin/main c0ffee1 main",
    "git push origin main"
  ],

  "restore-a-deleted-branch": [
    "git branch feature/invoices 2c8b7de",
    "git revert --no-edit e9f0a1b"
  ],

  "rescue-detached-head-work": [
    "git reflog --oneline -6",
    "git branch spike/telemetry c0ffee1",
    "git rebase main spike/telemetry"
  ],

  "find-a-commit-after-a-hard-reset": [
    "git reflog --date=iso -4",
    "git reset --hard 4f1c9ab"
  ],

  "untangle-a-conflict-in-a-lockfile": [
    "git merge feature/billing",
    "git checkout --ours package.json",
    "npm install",
    "git add package.json package-lock.json",
    "git commit --no-edit"
  ],

  "rebase-across-a-renamed-file": {
    commands: [
      "git rebase main",
      "git checkout --theirs src/auth.ts",
      "git mv src/auth.ts src/session/auth.ts",
      "git add src/session/auth.ts",
      "git rebase --continue"
    ]
  },

  "split-a-conflicted-commit-into-two": [
    "git reset a1b2c3d",
    "git add src/merge.ts",
    "git commit -m \"merge: record pricing resolution\"",
    "git add src/user.ts",
    "git commit -m \"fix: guard a null user\""
  ],

  "squash-a-noisy-feature-branch": [
    "git reset main",
    "git add src/cart.ts",
    "git commit -m \"feat: cart totals with tax\"",
    "git add tests/",
    "git commit -m \"test: cover cart totals\""
  ],

  "reorder-commits-without-conflicts": [
    "git reset main",
    "git add src/refunds.ts",
    "git commit -m \"feat: refund calculation\"",
    "git add tests/",
    "git commit -m \"test: cover refunds\""
  ],

  "reword-the-last-commit": [
    "git reset --soft a1b2c3d",
    "git commit -m \"fix: round invoice totals to two decimals\" -m \"Refs #214\""
  ],

  "move-a-commit-to-another-branch": [
    "git switch docs/quickstart",
    "git cherry-pick c0ffee1",
    "git switch main",
    "git reset --hard b7c1d90"
  ],

  "split-one-commit-into-three": [
    "git reset b7c1d90",
    "git add api/client.ts",
    "git commit -m \"feat(api): retry requests three times\"",
    "git add README.md",
    "git commit -m \"docs: document request retries\"",
    "git add .github/ci.yml",
    "git commit -m \"ci: run tests on ubuntu 24.04\""
  ],

  "find-the-first-bad-commit": [
    "git bisect start",
    "git bisect bad",
    "git bisect good v1.4.0",
    "git bisect bad",
    "git bisect good",
    "git bisect good",
    "git bisect reset"
  ],

  "bisect-a-flaky-test": [
    "git bisect start",
    "git bisect bad",
    "git bisect good v1.2.0",
    "git bisect bad",
    "git bisect good",
    "git bisect bad",
    "git bisect reset",
    "edit docs/bisect-notes.md",
    "git add docs/bisect-notes.md",
    "git commit -m \"docs: record bisect confidence\""
  ],

  "catch-a-bug-that-only-happens-on-merge": [
    "git bisect start --first-parent main",
    "git bisect bad",
    "git bisect good feature/base",
    "git bisect bad",
    "git bisect reset",
    "edit docs/merge-bug.md",
    "git add docs/merge-bug.md",
    "git commit -m \"docs: record the merge interaction\""
  ],

  "recover-a-file-deleted-ten-commits-ago": [
    "git log --diff-filter=D --oneline -- config/limits.yml",
    "git revert --no-edit 9d2e113"
  ],

  "stash-work-mid-rebase": [
    "git stash",
    "edit src/session.ts",
    "git add src/session.ts",
    "git rebase --continue",
    "git stash pop"
  ],

  "test-a-fix-without-touching-your-branch": [
    "git worktree add ../review fix/session-guard",
    "git worktree list",
    "git worktree remove ../review"
  ],

  "remove-a-build-artifact-committed-by-mistake": {
    commands: [
      "git rm --cached dist/app",
      "edit .gitignore",
      "git add .gitignore",
      "git commit -m \"chore: stop tracking the release binary\""
    ],
    resolutions: {
      ".gitignore": "node_modules/\ndist/\n.env.local\n\ndist/app\n"
    }
  },

  "make-two-branches-share-history-again": [
    "git switch feature",
    "git rebase --onto main 9d2e11f feature"
  ],

  "rewrite-a-merge-commits-parents": [
    "git rev-parse main release/2.8",
    "git replace --graft c0ffee1 main release/2.8",
    "git show --no-patch --format='%P' HEAD"
  ],

  "sync-a-fork-without-polluting-history": [
    "git fetch upstream",
    "git rebase --onto upstream/main c0ffee1 main",
    "git push --force-with-lease origin main"
  ],

  "review-a-pr-without-checking-it-out": [
    "git fetch origin pull/482/head:pr-482",
    "git diff --stat main...pr-482",
    "git diff main...pr-482 -- src/session.ts src/total.ts",
    "edit docs/review-482.md",
    "git add docs/review-482.md",
    "git commit -m \"docs: review PR 482\""
  ],

  "clean-up-a-messy-commit-history": [
    "git reset main",
    "git add src/checkout.ts",
    "git commit -m \"feat: express checkout\"",
    "git add tests/",
    "git commit -m \"test: cover express checkout\"",
    "git add README.md",
    "git commit -m \"docs: document express checkout\""
  ],

  "untrack-a-file-without-deleting-it": {
    commands: [
      "git rm --cached .env.local",
      "edit .gitignore",
      "git add .gitignore",
      "git commit -m \"chore: stop tracking local environment\""
    ],
    resolutions: {
      ".gitignore": "node_modules/\ndist/\n.env.local\n"
    }
  }
};
