// Seeded shortcuts that must NOT be accepted. The audit runs each one against
// a fresh repository and asserts that at least one check still fails.

module.exports = {
  "stash-work-mid-rebase": {
    reason: "Rebases without stashing the unrelated edit",
    commands: [
      "edit src/session.ts",
      "git add src/session.ts",
      "git rebase --continue",
      "git stash pop"
    ]
  },

  "push-a-rebased-branch-safely": {
    reason: "Merges the teammate's commit and plain-pushes instead of using a lease",
    commands: [
      "git fetch origin",
      "git merge origin/feature/cart",
      "git push"
    ]
  },

  "recover-both-sides-of-a-binary-conflict": {
    reason: "Extracts only one side of the binary conflict",
    commands: [
      "git merge feature/brand",
      "git checkout --ours assets/logo.svg",
      "cp assets/logo.svg /tmp/logo-ours.svg",
      "git add assets/logo.svg",
      "git commit --no-edit"
    ]
  },

  "find-the-first-bad-commit": {
    reason: "Runs bisect without a good/bad range or a real script",
    commands: [
      "git bisect start",
      "git bisect run ./not-a-script.sh",
      "git bisect reset"
    ]
  },

  "bisect-a-flaky-test": {
    reason: "Runs bisect without a good/bad range or a real script",
    commands: [
      "git bisect start",
      "git bisect run ./not-a-script.sh",
      "git bisect reset",
      "edit docs/bisect-notes.md",
      "git add docs/bisect-notes.md",
      "git commit -m \"docs: record bisect confidence\""
    ]
  },

  "catch-a-bug-that-only-happens-on-merge": {
    reason: "Runs bisect without a good/bad range or a real script",
    commands: [
      "git bisect start --first-parent main",
      "git bisect run ./not-a-script.sh",
      "git bisect reset",
      "edit docs/merge-bug.md",
      "git add docs/merge-bug.md",
      "git commit -m \"docs: record the merge interaction\""
    ]
  },

  "find-what-changed-between-two-tags": {
    reason: "Writes a magic-phrase note without deriving the tag range",
    commands: [
      "edit docs/release-2.8.0.md",
      "git add docs/release-2.8.0.md",
      "git commit -m \"docs: draft the 2.8.0 release notes\""
    ],
    resolutions: {
      "docs/release-2.8.0.md": "# Release notes\n\nRetries and saved filters. The experimental cache was reverted.\n"
    }
  },

  "isolate-a-regression-with-log-s": {
    reason: "Names the hash and replacement but misses the semantic change",
    commands: [
      "edit docs/regression.md",
      "git add docs/regression.md",
      "git commit -m \"docs: trace the formatMoney regression\""
    ],
    resolutions: {
      "docs/regression.md": "# Regression trace\n\n`formatMoney` was removed in 4f1c9ab and replaced by `formatCurrency`.\n"
    }
  },

  "blame-the-right-commit-after-a-rename": {
    reason: "Names the faulty commit but does not distinguish the rename",
    commands: [
      "edit docs/blame.md",
      "git add docs/blame.md",
      "git commit -m \"docs: identify the session guard regression\""
    ],
    resolutions: {
      "docs/blame.md": "# Session guard\n\nThe faulty `if (!session.userId)` condition was introduced in 9d2e113.\n"
    }
  }
};
