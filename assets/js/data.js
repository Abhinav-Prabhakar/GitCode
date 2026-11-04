// GitCode problem dataset. Pure data: no DOM, no network.
// Shapes are documented at the bottom of this file; every page reads from
// window.GCData so the dashboard and question page never disagree.

(function () {
  var categories = [
    { id: "all", label: "All Topics", icon: "objects-column" },
    { id: "recovery", label: "Recovery", icon: "clock-rotate-left" },
    { id: "conflicts", label: "Conflicts", icon: "code-merge" },
    { id: "rewrite", label: "Rewrite", icon: "code-branch" },
    { id: "debugging", label: "Debugging", icon: "diagram-project" },
    { id: "history", label: "History", icon: "rotate-right" },
    { id: "collaboration", label: "Collaboration", icon: "arrow-right-arrow-left" },
    { id: "safety", label: "Safety", icon: "shield-halved" }
  ];

  var tracks = [
    {
      id: "recovery",
      label: "Recovery",
      title: "Recover lost work",
      meta: "7 tasks · reflog, fsck, reset",
      done: 3,
      total: 7,
      icon: "clock-rotate-left",
      color: "#4c9aff",
      tint: "rgb(76 154 255 / 0.14)",
      href: "index.html?category=recovery"
    },
    {
      id: "conflicts",
      label: "Conflicts",
      title: "Resolve merge conflicts",
      meta: "7 tasks · merge, rerere",
      done: 2,
      total: 7,
      icon: "code-merge",
      color: "#46c6c2",
      tint: "rgb(70 198 194 / 0.14)",
      href: "index.html?category=conflicts"
    },
    {
      id: "rebase",
      label: "Rewrite",
      title: "Rebase without fear",
      meta: "6 tasks · squash, reword, split",
      done: 2,
      total: 6,
      icon: "code-branch",
      color: "#fac31d",
      tint: "rgb(250 195 29 / 0.14)",
      href: "index.html?category=rewrite"
    },
    {
      id: "bisect",
      label: "Debugging",
      title: "Bisect a regression",
      meta: "7 tasks · bisect, blame, worktree",
      done: 1,
      total: 7,
      icon: "diagram-project",
      color: "#a78bfa",
      tint: "rgb(167 139 250 / 0.16)",
      href: "index.html?category=debugging"
    },
    {
      id: "cherry-pick",
      label: "Cherry-pick",
      title: "Cherry-pick a fix",
      meta: "4 tasks · hotfix, backport",
      done: 1,
      total: 4,
      icon: "code-commit",
      color: "#f8615c",
      tint: "rgb(248 97 92 / 0.14)",
      href: "index.html?tag=cherry-pick"
    },
    {
      id: "history",
      label: "History",
      title: "Clean up history",
      meta: "6 tasks · filter-repo, amend",
      done: 3,
      total: 6,
      icon: "rotate-right",
      color: "#ffa116",
      tint: "rgb(255 161 22 / 0.14)",
      href: "index.html?category=history"
    }
  ];

  function P(n, slug, title, difficulty, acceptance, category, tags, status, premium, summary, scenario, task, examples, hints, editorial) {
    return {
      n: n,
      slug: slug,
      title: title,
      difficulty: difficulty,
      acceptance: acceptance,
      category: category,
      tags: tags,
      status: status || null,
      premium: !!premium,
      summary: summary,
      scenario: scenario,
      task: task,
      examples: examples || [],
      hints: hints || [],
      editorial: editorial || "",
      starred: false
    };
  }

  var problems = [
    P(1, "recover-a-lost-commit", "Recover a Lost Commit", "Easy", 68.4, "recovery",
      ["reflog", "reset", "recovery"], null, false,
      "A hard reset threw away a commit you still need. The reflog remembers it.",
      "You ran <code>git reset --hard HEAD~2</code> to undo a bad change, then realized the older of the two dropped commits also contained the migration your teammate needs. Nothing has been pushed. The reflog still has both commits.",
      "Restore <code>4f1c9ab</code> onto <code>main</code>, keep the two commits made after the reset, and leave <code>bad-change</code> out of the branch.",
      [
        { label: "Example 1 · reflog is intact", code: "$ git reflog --oneline\n4f1c9ab HEAD@{4}: commit: add invoices migration\n9d2e113 HEAD@{3}: commit: bad local experiment\n7a0be42 HEAD@{2}: reset: moving to HEAD~2\nb7c1d90 HEAD@{1}: commit: tidy invoice copy\nc0ffee1 HEAD@{0}: commit: bump invoice version" },
        { label: "Example 2 · the commit is behind a reset", code: "$ git show --stat 4f1c9ab\ncommit 4f1c9ab\nAuthor: Ada <ada@example.com>\n\n    add invoices migration\n\n db/migrate/014_invoices.sql | 42 ++++++++++++++\n 1 file changed, 42 insertions(+)" }
      ],
      [
        "Start from <code>git reflog</code>. Every HEAD move is recorded there for 90 days by default.",
        "You do not need to reset the whole branch. <code>git cherry-pick 4f1c9ab</code> replays only that commit.",
        "Check the result with <code>git log --oneline -3</code>. The two commits made after the reset must still be ancestors of <code>main</code>."
      ],
      "The reflog is a local safety net, not a backup. It records every change to HEAD with a timestamp, so a discarded commit is still reachable by hash until it is garbage-collected. Cherry-picking that hash replays the change on top of the current branch and leaves the newer commits alone. A reset would rewrite the branch tip; here the task only asks for the one lost change."
    ),
    P(2, "restore-a-deleted-branch", "Restore a Deleted Branch", "Easy", 61.2, "recovery",
      ["branch", "reflog", "recovery"], null, false,
      "A merged branch was deleted, then the merge was reverted.",
      "A teammate deleted <code>feature/invoices</code> after merging it. The merge was later reverted, and now the invoices work is gone from <code>main</code>. The branch is not on the remote.",
      "Recreate <code>feature/invoices</code> at its last commit and restore its files on <code>main</code> without reverting the revert.",
      [{ label: "Example", code: "$ git reflog --all | grep invoices\n4f1c9ab HEAD@{9}: merge feature/invoices: Merge made by the 'ort' strategy.\n2c8b7de refs/heads/feature/invoices@{0}: branch: Created from HEAD" }],
      ["<code>git branch feature/invoices 2c8b7de</code> recreates the ref.", "The old merge commit is also in the reflog; inspect it before deciding how to restore the files."],
      "A deleted branch is just a missing ref. If the commit is still in the reflog or in a merge parent, creating the branch at that hash brings it back immediately. Restoring files on main is a separate decision: revert the revert if the original merge is still in history."
    ),
    P(3, "rescue-detached-head-work", "Rescue Detached HEAD Work", "Medium", 44.8, "recovery",
      ["checkout", "reflog", "branch"], "todo", false,
      "You committed experiments while in detached HEAD and switched away.",
      "While reviewing an old tag, you made three commits in detached HEAD state. A <code>git checkout main</code> moved you away and the commits are no longer on any branch.",
      "Give the detached work a branch called <code>spike/telemetry</code>, then rebase it onto <code>main</code>.",
      [{ label: "Example", code: "$ git reflog --oneline -6\nc0ffee1 HEAD@{0}: checkout: moving from c0ffee1 to main\nc0ffee1 HEAD@{1}: commit: instrument checkout\nb7c1d90 HEAD@{2}: commit: add telemetry hook\n9d2e113 HEAD@{3}: commit: spike telemetry events" }],
      ["The last detached commit is the first line of the reflog before the checkout.", "Create the branch at that hash, then rebase onto main."],
      "Detached HEAD is not dangerous by itself; the risk is losing the only ref. The reflog keeps the chain, and a branch gives it a name. Rebase the new branch onto main to put the experiments in the right place."
    ),
    P(4, "recover-a-dropped-stash", "Recover a Dropped Stash", "Medium", 39.1, "recovery",
      ["stash", "fsck", "recovery"], "todo", false,
      "A dropped stash never made it into a commit.",
      "You dropped a stash named <code>wip/checkout</code> after a failed test run. The working tree is clean and the stash list is empty, but the objects still exist.",
      "Recover the dropped stash and apply it to <code>main</code> without losing the untracked files it contains.",
      [{ label: "Example", code: "$ git fsck --unreachable | grep commit\nunreachable commit 8c1f0a2\nunreachable commit 44d9c71\n$ git stash list\n(empty)" }],
      ["<code>git fsck --unreachable</code> finds the dangling stash commits.", "A stash commit has two parents: the index and the untracked files. Inspect both before applying."],
      "Dropped stashes are dangling commits. fsck lists them, and the stash commit's parents hold the index and untracked tree. Recovering is a matter of recreating the stash ref or checking out the tree into the working directory."
    ),
    P(5, "find-a-commit-after-a-hard-reset", "Find a Commit After a Hard Reset", "Medium", 52.6, "recovery",
      ["reset", "reflog", "recovery"], null, false,
      "A reset moved the branch, but the old tip is still reachable.",
      "A script ran <code>git reset --hard origin/main</code> and discarded a local commit that was never pushed. The reset happened one hour ago.",
      "Identify the discarded commit and reapply it, preserving its original message and author.",
      [{ label: "Example", code: "$ git reflog --date=iso -4\n9d2e113 HEAD@{2026-11-04 10:12:04}: reset: moving to origin/main\n4f1c9ab HEAD@{2026-11-04 10:11:58}: commit: cache invoice totals" }],
      ["Filter the reflog by the reset entry, then take the entry immediately before it.", "Cherry-pick keeps the author; a plain reset would delete newer work."],
      "The entry before a reset is the tip that was discarded. Recovering it is a cherry-pick, not a reset, whenever the branch has moved on since."
    ),
    P(6, "recover-files-from-a-corrupt-index", "Recover Files from a Corrupt Index", "Hard", 27.4, "recovery",
      ["index", "reset", "fsck"], "todo", true,
      "The index is unreadable and the working tree has uncommitted edits.",
      "A crash left <code>.git/index</code> corrupt. <code>git status</code> fails, but the working tree contains edits you cannot lose and the last commit is intact.",
      "Rebuild the index from <code>HEAD</code> while keeping the working tree edits, then stage only the files you intended to change.",
      [{ label: "Example", code: "$ git status\nfatal: loose object 3a7f... (stored in .git/objects/3a/7f...) is corrupt" }],
      ["Move the index aside instead of deleting the working tree.", "<code>git reset</code> rebuilds the index from HEAD and leaves working files alone."],
      "The index is a cache, not the source of truth. Renaming it and running a mixed reset reconstructs it from HEAD; the working tree is untouched. Untracked files survive as long as you do not run a hard reset."
    ),
    P(7, "undo-a-force-push-on-main", "Undo a Force-Push on main", "Hard", 22.9, "recovery",
      ["push", "reset", "reflog"], "todo", true,
      "Someone force-pushed main and removed three shared commits.",
      "A maintainer force-pushed <code>main</code> to drop a bad merge. Three unrelated commits that other people had based work on disappeared from the remote. You have the old tip locally.",
      "Restore the three commits on <code>main</code>, then publish the repaired branch without discarding the maintainer's revert.",
      [{ label: "Example", code: "$ git reflog show origin/main\nc0ffee1 origin/main@{0}: fetch: forced-update\n7a0be42 origin/main@{1}: fetch: fast-forward" }],
      ["Do not force-push back over the maintainer. Reapply the lost commits on top of the current tip.", "Use <code>--force-with-lease</code> only after the repaired history is verified."],
      "A force-push changes the remote ref but not the objects. Recovering means replaying the discarded commits on the new tip. Restoring the exact old tip would also resurrect the bad merge the maintainer removed."
    ),

    P(8, "resolve-a-three-way-merge-conflict", "Resolve a Three-Way Merge Conflict", "Medium", 57.3, "conflicts",
      ["merge", "conflicts", "index"], null, false,
      "Two branches edited the same function for different reasons.",
      "Merging <code>feature/tax</code> into <code>main</code> stops in a conflict: both sides changed <code>calculate_total()</code>. <code>main</code> added a discount, the feature added tax rounding.",
      "Resolve the conflict so both behaviours survive, stage the file, and finish the merge with the original merge message.",
      [{ label: "Example", code: "$ git merge feature/tax\nAuto-merging src/total.ts\nCONFLICT (content): Merge conflict in src/total.ts\nAutomatic merge failed; fix conflicts and then commit the result." }],
      ["Read both sides; the answer is usually both changes, not one of them.", "Remove every conflict marker before staging.", "<code>git diff --check</code> catches leftover markers."],
      "A content conflict is a three-way comparison: base, ours, theirs. Resolve by combining intent, then stage the result. The merge commit is created by <code>git commit</code>, using the prepared message."
    ),
    P(9, "untangle-a-conflict-in-a-lockfile", "Untangle a Conflict in a Lockfile", "Easy", 71.8, "conflicts",
      ["merge", "lockfile", "conflicts"], null, false,
      "A lockfile conflict should never be hand-merged.",
      "A merge conflicts in <code>package-lock.json</code>. Both branches added dependencies; the file is 9,000 lines and contains resolved URLs.",
      "Resolve the conflict by regenerating the lockfile from the merged manifest, then verify the install is reproducible.",
      [{ label: "Example", code: "$ git checkout --theirs package.json\n$ npm install\n$ git add package.json package-lock.json" }],
      ["Take one side's manifest, merge the dependency list by hand, then regenerate.", "Never edit hashes or resolved URLs inside a lockfile."],
      "Lockfiles are generated artifacts. Resolve the human-editable manifest, then let the package manager produce a consistent lockfile. Committing a hand-merged lockfile invites non-reproducible installs."
    ),
    P(10, "resolve-a-modify-delete-conflict", "Resolve a Modify/Delete Conflict", "Medium", 48.2, "conflicts",
      ["merge", "rm", "conflicts"], null, false,
      "One branch edited a file the other branch deleted.",
      "<code>main</code> deleted <code>legacy/report.rb</code>; <code>feature/audit</code> fixed a bug in it. The merge reports a modify/delete conflict.",
      "Keep the deletion, preserve the bug fix somewhere useful, and record why in the merge commit.",
      [{ label: "Example", code: "$ git merge feature/audit\nCONFLICT (modify/delete): legacy/report.rb deleted in HEAD and modified in feature/audit." }],
      ["Inspect the deleted file's change with <code>git diff main...feature/audit -- legacy/report.rb</code>.", "<code>git rm legacy/report.rb</code> resolves in favour of deletion."],
      "A modify/delete conflict asks a product question before a Git question. Decide whether the change still matters after the deletion, and record the decision in the merge commit so the next person does not relitigate it."
    ),
    P(11, "rebase-across-a-renamed-file", "Rebase Across a Renamed File", "Hard", 31.5, "conflicts",
      ["rebase", "rename", "conflicts"], "todo", false,
      "A rebase lost track of a file after a rename.",
      "You renamed <code>src/auth.ts</code> to <code>src/session/auth.ts</code> on <code>main</code>. A feature branch still edits the old path, and rebasing produces a delete/modify conflict on every commit.",
      "Rebase the feature branch onto <code>main</code> with rename detection enabled, and keep the feature's edits in the new location.",
      [{ label: "Example", code: "$ git rebase main\nCONFLICT (modify/delete): src/auth.ts deleted in HEAD and modified in 4f1c9ab." }],
      ["<code>-X find-renames</code> helps Git pair the paths.", "If a commit still conflicts, resolve it once and continue; later commits usually follow."],
      "Rebase replays commits one at a time, so a rename on the upstream side can look like a deletion. Rename detection plus one careful resolution usually carries the rest of the series."
    ),
    P(12, "resolve-conflicts-in-a-long-lived-branch", "Resolve Conflicts in a Long-Lived Branch", "Hard", 26.7, "conflicts",
      ["merge", "rerere", "conflicts"], "todo", true,
      "The same conflict returns every time you merge.",
      "A release branch has diverged for six weeks. Every merge from <code>main</code> conflicts in the same four files, and you resolve them the same way each time.",
      "Enable conflict reuse, resolve the current merge once, and confirm the recorded resolution is applied automatically on the next merge.",
      [{ label: "Example", code: "$ git config rerere.enabled true\n$ git merge main\nCONFLICT (content): Merge conflict in src/pricing.ts" }],
      ["<code>rerere</code> records the preimage and resolution of each hunk.", "It only helps after a resolution has been recorded once."],
      "rerere is Git's replay of conflict resolutions. It is ideal for long-lived branches with repeated merges: resolve deliberately once, and Git applies the same resolution the next time the identical conflict appears."
    ),
    P(13, "split-a-conflicted-commit-into-two", "Split a Conflicted Commit into Two", "Hard", 24.3, "conflicts",
      ["add", "merge", "conflicts"], "todo", false,
      "A merge commit mixed a conflict resolution with an unrelated fix.",
      "You resolved a merge conflict and, in the same commit, fixed an unrelated null check. Reviewers cannot separate the two changes.",
      "Rewrite the merge so the conflict resolution and the null-check fix are separate, reviewable commits.",
      [{ label: "Example", code: "$ git show --stat HEAD\n src/merge.ts   | 18 ++++++++++------\n src/user.ts    |  4 ++--" }],
      ["Do not rewrite a merge commit in place; replay the resolution in two steps.", "A temporary branch makes the split reversible."],
      "Separating a fix from a resolution is a history-rewrite task, not a conflict task. Recreate the merge, commit the resolution, then apply the unrelated fix as a follow-up so blame and review stay honest."
    ),
    P(14, "recover-both-sides-of-a-binary-conflict", "Recover Both Sides of a Binary Conflict", "Medium", 41.9, "conflicts",
      ["merge", "checkout", "binaries"], "todo", false,
      "A binary conflict replaced the asset you needed.",
      "A merge conflicts on <code>assets/logo.svg</code>. The working tree contains one side, and you need to compare both before choosing.",
      "Extract both versions of the binary, choose the correct one, and complete the merge without leaving conflict entries in the index.",
      [{ label: "Example", code: "$ git checkout --ours assets/logo.svg\n$ cp assets/logo.svg /tmp/logo-ours.svg\n$ git checkout --theirs assets/logo.svg" }],
      ["<code>--ours</code> and <code>--theirs</code> write each stage into the working tree.", "Stage the chosen file to clear all three index stages."],
      "Binary files cannot be text-merged, so Git gives you the two stages. Extracting both and choosing explicitly is safer than accepting a side by default, especially for assets that affect rendering."
    ),

    P(15, "squash-a-noisy-feature-branch", "Squash a Noisy Feature Branch", "Medium", 63.1, "rewrite",
      ["rebase", "squash", "history"], null, false,
      "Twelve fixup commits should land as one coherent change.",
      "A feature branch contains twelve commits: three fixes for the first commit, four typo commits, and five real steps. The final tree is correct.",
      "Squash the branch into two commits - one for the feature, one for the tests - without changing the final tree.",
      [{ label: "Example", code: "$ git log --oneline main..HEAD\nc0ffee1 fix typo again\nb7c1d90 add tests\n9d2e113 fix test import\n4f1c9ab add feature" }],
      ["<code>git rebase -i main</code> and mark fixups as <code>fixup</code>.", "Compare the final tree before and after with <code>git diff</code>."],
      "Interactive rebase is a plan, not a command history. Squashing preserves the final tree while removing noise that makes review and revert harder. Verify with a tree comparison, not by reading the new log."
    ),
    P(16, "reword-the-last-commit", "Reword the Last Commit", "Easy", 79.4, "rewrite",
      ["commit", "amend", "message"], null, false,
      "A commit message has a typo and needs context.",
      "The last commit says <code>fix stuff</code>. It actually fixes the invoice rounding bug described in issue 214.",
      "Reword the last commit to <code>fix: round invoice totals to two decimals</code> and add the issue reference in the body.",
      [{ label: "Example", code: "$ git log -1 --oneline\nb7c1d90 fix stuff" }],
      ["<code>git commit --amend</code> edits the tip commit.", "The commit hash changes; that is expected."],
      "Amend rewrites the tip commit with the current index and a new message. It is safe before sharing and should be followed by a lease-protected push after."
    ),
    P(17, "drop-a-secret-from-history", "Drop a Secret from History", "Hard", 19.6, "rewrite",
      ["filter-repo", "secrets", "history"], "todo", true,
      "An API key was committed three months ago.",
      "A production API key was committed in <code>config/prod.env</code> and has been in history for 60 commits. Rotating the key is underway; the repository still contains it.",
      "Remove the file from every commit, keep the rest of history intact, and verify the object is no longer reachable.",
      [{ label: "Example", code: "$ git log --all --oneline -- config/prod.env\n4f1c9ab add prod config\n9d2e113 deploy script" }],
      ["Rotate the secret first. History rewriting does not un-leak it.", "<code>git filter-repo --path config/prod.env --invert-paths</code> removes it everywhere.", "Force-push with a lease and ask every clone to re-fetch."],
      "A secret in history must be treated as compromised. Rewriting removes the object from the repository, but rotation is the actual fix. filter-repo is preferred over filter-branch because it is faster and harder to misuse."
    ),
    P(18, "reorder-commits-without-conflicts", "Reorder Commits Without Conflicts", "Medium", 46.5, "rewrite",
      ["rebase", "interactive", "history"], "todo", false,
      "Two commits are in the wrong order and depend on each other.",
      "A branch has the tests commit before the implementation commit. The final tree is fine, but every commit in between fails CI.",
      "Reorder the two commits so each commit passes on its own, without changing the final tree.",
      [{ label: "Example", code: "$ git log --oneline main..HEAD\n9d2e113 test: cover refunds\n4f1c9ab feat: refund calculation" }],
      ["Swap the lines in the interactive rebase todo list.", "Expect a conflict if the test imports a symbol introduced by the implementation."],
      "Reordering is only safe when each intermediate commit is self-contained. If the earlier commit depends on the later one, reordering requires splitting or squashing; otherwise CI will fail at the intermediate step."
    ),
    P(19, "move-a-commit-to-another-branch", "Move a Commit to Another Branch", "Easy", 66.2, "rewrite",
      ["cherry-pick", "branch", "recovery"], null, false,
      "A commit landed on the wrong branch.",
      "You committed a documentation fix directly on <code>main</code>. It belongs on <code>docs/quickstart</code>, and <code>main</code> must not contain it.",
      "Copy the commit to <code>docs/quickstart</code>, remove it from <code>main</code>, and keep both branches buildable.",
      [{ label: "Example", code: "$ git branch --show-current\nmain\n$ git log -1 --oneline\nc0ffee1 docs: clarify token setup" }],
      ["Cherry-pick onto the docs branch before removing it from main.", "Use <code>git reset --hard HEAD~1</code> only if main has not moved on."],
      "The order matters: copy first, remove second. If you reset main first and the branch pointer is lost, the reflog can still recover it, but the safe sequence avoids the recovery step entirely."
    ),
    P(20, "split-one-commit-into-three", "Split One Commit into Three", "Hard", 29.8, "rewrite",
      ["reset", "add", "history"], "todo", false,
      "One commit contains three unrelated changes.",
      "A commit titled <code>updates</code> changes the API client, the README, and the CI config. Each change should be reviewable and revertible on its own.",
      "Rewrite the commit into three commits, each containing one concern, with a passing tree at the end.",
      [{ label: "Example", code: "$ git show --stat 4f1c9ab\n api/client.ts | 22 +++++++++-----\n README.md     |  8 ++++--\n .github/ci.yml|  4 ++--" }],
      ["Reset softly to the parent, then stage by path or hunk.", "<code>git add -p</code> is the tool for mixed files."],
      "Splitting is the inverse of squashing: reset the tip softly so all changes become unstaged, then build commits deliberately. A soft reset keeps the working tree and index, which makes the split non-destructive until you commit."
    ),

    P(21, "find-the-first-bad-commit", "Find the First Bad Commit", "Medium", 58.7, "debugging",
      ["bisect", "debugging", "regression"], null, false,
      "A test passed last month and fails now.",
      "A regression appeared somewhere in the last eight commits. You have a reliable test command, and checking out old commits by hand would take a while.",
      "Use bisect to identify the first commit where the test fails, then inspect that commit without checking it out manually.",
      [{ label: "Example", code: "$ git bisect start\n$ git bisect bad\n$ git bisect good v1.4.0\nBisecting: 3 revisions left to test after this (roughly 2 steps)" }],
      ["Mark the current tip bad and a known-good tag good.", "Run the same command at every step, then <code>git bisect reset</code>."],
      "Bisect is binary search over history. Its value depends on a deterministic test: a flaky command produces a wrong answer. Six steps cover 64 commits, which is why the workflow beats manual checkout."
    ),
    P(22, "bisect-a-flaky-test", "Bisect a Flaky Test", "Hard", 23.4, "debugging",
      ["bisect", "flaky", "debugging"], "todo", false,
      "The failing test only fails one run in five.",
      "A test fails intermittently across the last eight commits. A normal bisect gives inconsistent good/bad marks.",
      "Produce a defensible first-bad commit despite the flake, and document the confidence level.",
      [{ label: "Example", code: "$ git bisect run ./scripts/flaky-check.sh\nrunning ./scripts/flaky-check.sh\n... exit code 1\n" }],
      ["Make the check run the test several times and require a threshold.", "Keep the raw results; a bisect with flaky marks is not evidence."],
      "Bisect assumes a stable predicate. For a flaky test, wrap the test in a script that retries and returns a deterministic exit code. If the failure rate is too close to the threshold, report the ambiguity instead of a false first-bad commit."
    ),
    P(23, "cherry-pick-a-hotfix-to-a-release-branch", "Cherry-Pick a Hotfix to a Release Branch", "Easy", 72.5, "debugging",
      ["cherry-pick", "release", "backport"], null, false,
      "A fix on main is needed on the release branch now.",
      "A one-line fix for a crash landed on <code>main</code>. <code>release/2.8</code> cannot take a merge because it has diverged, but it needs the fix today.",
      "Cherry-pick the fix onto <code>release/2.8</code>, resolve any context drift, and keep the original author.",
      [{ label: "Example", code: "$ git switch release/2.8\n$ git cherry-pick -x 4f1c9ab\n[release/2.8 9d2e113] fix: guard null session" }],
      ["<code>-x</code> records the source hash in the message.", "A cherry-pick applies a diff, not the whole commit; context drift may need a small edit."],
      "Cherry-pick is the right tool for a backport because it does not drag unrelated history to the release branch. The <code>-x</code> trailer preserves provenance for the next person who compares branches."
    ),
    P(24, "isolate-a-regression-with-log-s", "Isolate a Regression with git log -S", "Medium", 49.6, "debugging",
      ["log", "pickaxe", "debugging"], null, false,
      "A function disappeared and no commit message mentions it.",
      "A helper called <code>formatMoney</code> stopped being called. Commit messages are unhelpful, and the code was moved between files.",
      "Find the commit that changed the number of occurrences of <code>formatMoney</code> and explain what replaced it.",
      [{ label: "Example", code: "$ git log -S formatMoney --oneline --all\n4f1c9ab refactor pricing helpers\n9d2e113 add invoice preview" }],
      ["<code>-S</code> finds commits where the count of a string changed.", "<code>-G</code> matches the diff content instead and is better for regex-shaped questions."],
      "The pickaxe options answer a different question from <code>git log -- path</code>: not when a file changed, but when a specific string appeared or disappeared. That makes them ideal for tracking a renamed or removed symbol."
    ),
    P(25, "catch-a-bug-that-only-happens-on-merge", "Catch a Bug That Only Happens on Merge", "Hard", 21.8, "debugging",
      ["bisect", "merge", "debugging"], "todo", true,
      "Every commit passes alone; the merge of two branches fails.",
      "Two branches each pass CI. Merged together, the integration test fails. The bug is not present on either side alone.",
      "Find the smallest pair of commits that reproduces the failure, and describe the interaction.",
      [{ label: "Example", code: "$ git bisect start --first-parent main\n$ git bisect bad\n$ git bisect good feature/base" }],
      ["A merge-only bug needs a predicate that builds the merge.", "Bisect over first-parent history to keep the merge structure readable."],
      "Some regressions are interactions, not single commits. Bisecting a merge requires a predicate that constructs the candidate state. If no single commit is responsible, report the pair and the invariant that each side violates."
    ),
    P(26, "blame-the-right-commit-after-a-rename", "Blame the Right Commit After a Rename", "Medium", 43.7, "debugging",
      ["blame", "rename", "debugging"], "todo", false,
      "Blame points at a mass rename instead of the real change.",
      "Every line in <code>src/session.ts</code> is blamed on a rename commit. The bug was introduced earlier, under the old filename.",
      "Trace the line back through the rename and identify the commit that introduced the faulty condition.",
      [{ label: "Example", code: "$ git blame -L 40,48 src/session.ts\n4f1c9ab (rename session module 2026-09-02)\n...\n$ git blame -C -C -L 40,48 src/session.ts" }],
      ["<code>-C -C</code> follows lines copied or moved between files.", "<code>--follow</code> works on log, not blame."],
      "Blame reports the last commit that touched a line, which a rename touches all at once. Copy detection makes blame follow the content across the rename, revealing the change that actually introduced the bug."
    ),
    P(27, "test-a-fix-without-touching-your-branch", "Test a Fix Without Touching Your Branch", "Medium", 55.9, "debugging",
      ["worktree", "testing", "debugging"], "todo", false,
      "You need to test a candidate fix while your branch stays dirty.",
      "Your working tree has uncommitted work you cannot stash safely. A reviewer asks whether their fix passes the integration suite on a clean checkout.",
      "Create a separate working tree for the reviewer's branch, run the suite there, and remove the worktree without disturbing your current edits.",
      [{ label: "Example", code: "$ git worktree add ../gc-review fix/session-guard\nPreparing worktree (new branch 'fix/session-guard')\n$ git worktree list" }],
      ["A worktree shares the object database but has its own index and working files.", "<code>git worktree remove</code> cleans up the directory and metadata."],
      "Worktrees are the low-risk way to run a second checkout. Unlike stash, they do not touch your current index, and unlike a second clone, they share objects and refs, so the test uses exactly the commits you are reviewing."
    ),

    P(28, "clean-up-a-messy-commit-history", "Clean Up a Messy Commit History", "Medium", 60.4, "history",
      ["rebase", "squash", "history"], null, false,
      "A branch mixes formatting, fixes, and feature work.",
      "Before review, a branch has 24 commits: an initial feature, a revert, a re-apply, and a dozen formatting commits. The final tree is correct.",
      "Produce a history a reviewer can follow: one feature commit, one test commit, and no reverted noise.",
      [{ label: "Example", code: "$ git log --oneline main..HEAD | head\nc0ffee1 style: prettier\nb7c1d90 revert \"feat: cart\"\n9d2e113 feat: cart\n4f1c9ab style: prettier" }],
      ["Drop revert/re-apply pairs together; dropping only one changes the tree.", "Compare <code>git diff main..HEAD</code> before and after."],
      "Cleaning history is safe only when the final tree is preserved. Revert and re-apply pairs are the usual trap: removing one without the other silently changes behaviour. Always diff the endpoints."
    ),
    P(29, "rewrite-an-author-on-old-commits", "Rewrite an Author on Old Commits", "Medium", 47.2, "history",
      ["rebase", "author", "history"], "todo", false,
      "Commits were made with the wrong email address.",
      "Five commits were authored with a personal email that should not appear in the public repository. They are not the tip, and the code must not change.",
      "Rewrite the author on those five commits only, keep the committer dates, and verify the tree is identical.",
      [{ label: "Example", code: "$ git log --format='%h %ae %s' main..HEAD\n4f1c9ab ada@personal.test feat: billing\n9d2e113 ada@personal.test test: billing" }],
      ["<code>git rebase -i --exec 'git commit --amend --no-edit --author=...'</code> is one option.", "filter-repo can rewrite by mailmap with less manual work."],
      "Author rewriting is a metadata change, but it rewrites hashes. Keep the tree identical by verifying the diff is empty, and coordinate the force-push before anyone else builds on the branch."
    ),
    P(30, "remove-a-build-artifact-committed-by-mistake", "Remove a Build Artifact Committed by Mistake", "Easy", 76.1, "history",
      ["rm", "gitignore", "history"], null, false,
      "A 200 MB build artifact is in the repository.",
      "A compiled binary was committed in the last release. It is still tracked, and every clone downloads it.",
      "Untrack the artifact, add it to <code>.gitignore</code>, and keep the working file on disk.",
      [{ label: "Example", code: "$ git ls-files dist/app\n dist/app\n$ du -h dist/app\n200M\tdist/app" }],
      ["<code>git rm --cached</code> stops tracking without deleting the file.", "Removing it from old commits is a separate, optional step."],
      "Untracking stops future growth; history rewriting shrinks existing clones. Most teams should do the first immediately and schedule the second, because rewriting shared history has a coordination cost."
    ),
    P(31, "recover-a-file-deleted-ten-commits-ago", "Recover a File Deleted Seven Commits Ago", "Easy", 69.8, "history",
      ["log", "checkout", "recovery"], "todo", false,
      "A config file vanished and nobody noticed for a week.",
      "A config file was deleted seven commits ago. The deletion commit is not obvious, and the file is not in the current tree.",
      "Find the last commit that contained the file and restore it without reverting the commits made since.",
      [{ label: "Example", code: "$ git log --diff-filter=D --oneline -- config/limits.yml\n9d2e113 chore: remove legacy limits" }],
      ["<code>--diff-filter=D</code> narrows log to deletions.", "<code>git show 9d2e113^:config/limits.yml</code> prints the file from before the deletion."],
      "A file deleted in history still exists in its parent commit. Restoring it is a checkout from that commit, which composes cleanly with the newer history and avoids a revert that would also remove later edits."
    ),
    P(32, "make-two-branches-share-history-again", "Make Two Branches Share History Again", "Hard", 25.6, "history",
      ["rebase", "merge-base", "history"], "todo", false,
      "Two branches contain the same work under different hashes.",
      "A branch was copied instead of merged. Both branches now contain the same five patches with different hashes, and a merge produces duplicates.",
      "Make the branches share history again without duplicating the patches or dropping either side's work.",
      [{ label: "Example", code: "$ git merge-base main feature\n9d2e113\n$ git log --oneline --left-right main...feature" }],
      ["<code>git patch-id</code> identifies equivalent patches.", "Rebase the copied branch onto the original, dropping duplicates."],
      "When patches exist twice with different hashes, Git cannot infer equivalence. patch-id gives you the mapping, and a rebase onto the common base removes the duplicate series. Preserve merge-base output before rewriting."
    ),
    P(33, "rewrite-a-merge-commits-parents", "Rewrite a Merge Commit's Parents", "Hard", 18.7, "history",
      ["replace", "merge", "history"], "todo", true,
      "A merge was made against the wrong base branch.",
      "A release merge points at <code>staging</code> instead of <code>main</code>. The tree is correct, but the parent order and ancestry are wrong, which breaks future merges.",
      "Rewrite the merge so its first parent is <code>main</code> and its second is the release branch, keeping the tree unchanged.",
      [{ label: "Example", code: "$ git show --no-patch --format='%P' HEAD\n8a1b2c3 9d2e113\n$ git rev-parse main release/2.8" }],
      ["<code>git commit-tree</code> can build a merge with explicit parents.", "<code>git replace</code> is reversible and useful for verification."],
      "Parent order encodes which branch is the mainline, and first-parent history drives log and bisect. Rebuilding a merge with commit-tree preserves the tree while correcting ancestry; verify with <code>git diff</code> against the old tip."
    ),

    P(34, "sync-a-fork-without-polluting-history", "Sync a Fork Without Polluting History", "Easy", 74.3, "collaboration",
      ["remote", "rebase", "fork"], null, false,
      "Your fork has merge commits from every upstream sync.",
      "Your fork's <code>main</code> contains merge commits from past upstream syncs. You need the latest upstream code with a linear history.",
      "Sync the fork, rebase your local work on the upstream tip, and push without adding merge commits.",
      [{ label: "Example", code: "$ git fetch upstream\n$ git rebase upstream/main" }],
      ["Fetch upstream, then rebase your local branch onto it.", "Push the rewritten branch with <code>--force-with-lease</code>."],
      "A fork is a normal remote. Fetching upstream and rebasing keeps your patches on top of the current base; merging upstream instead records a merge commit for every sync, which is noise in a fork's history."
    ),
    P(35, "push-a-rebased-branch-safely", "Push a Rebased Branch Safely", "Medium", 53.4, "collaboration",
      ["push", "lease", "rebase"], null, false,
      "A rebase succeeded, and the push was rejected.",
      "You rebased a shared feature branch and the remote rejects a normal push. A teammate pushed to the same branch ten minutes ago.",
      "Publish the rebased branch without overwriting the teammate's new commit.",
      [{ label: "Example", code: "$ git push\n ! [rejected] feature/cart -> feature/cart (non-fast-forward)\n$ git fetch origin\n$ git log --oneline HEAD..origin/feature/cart" }],
      ["Fetch first and inspect what arrived.", "A lease ties the force-push to the remote state you actually saw."],
      "Force-push is the only way to publish rewritten history, but a blind <code>--force</code> discards concurrent work. <code>--force-with-lease</code> refuses when the remote moved since your last fetch, turning a destructive operation into a safe one."
    ),
    P(36, "salvage-a-pr-after-an-upstream-rewrite", "Salvage a PR After an Upstream Rewrite", "Hard", 28.9, "collaboration",
      ["rebase", "force-with-lease", "collaboration"], "todo", true,
      "The base branch was rewritten under an open PR.",
      "The base branch was force-pushed while your PR was open. Your branch now includes commits that no longer exist upstream, and the PR diff shows unrelated changes.",
      "Rebase your PR onto the new base, drop the orphaned commits, and restore a clean diff.",
      [{ label: "Example", code: "$ git fetch origin\n$ git rebase --onto origin/main <old-base> feature/cart" }],
      ["Use <code>--onto</code> to transplant only your commits.", "Compare <code>git diff origin/main...HEAD</code> before and after."],
      "When the base is rewritten, a plain rebase can replay commits that are already upstream in a different form. <code>--onto</code> with the old base limits the replay to your own commits, which restores a reviewable diff."
    ),
    P(37, "review-a-pr-without-checking-it-out", "Review a PR Without Checking It Out", "Easy", 67.5, "collaboration",
      ["fetch", "diff", "review"], "todo", false,
      "You want to review a PR without disturbing your checkout.",
      "A pull request is ready for review. You are mid-task on a dirty branch and do not want to switch.",
      "Fetch the PR ref, inspect the diff against its merge base, and list the files that need attention.",
      [{ label: "Example", code: "$ git fetch origin pull/482/head:pr-482\n$ git diff --stat main...pr-482\n$ git diff main...pr-482 -- src/session.ts" }],
      ["The three-dot diff compares against the merge base, which is what a PR shows.", "A temporary local ref makes follow-up commands easy."],
      "Fetching a PR ref gives you the commits without checkout. Three-dot diff is the correct review view: it excludes changes made on main since the branch started, so the diff matches the PR page."
    ),
    P(38, "land-a-stack-of-dependent-prs", "Land a Stack of Dependent PRs", "Hard", 30.2, "collaboration",
      ["rebase", "cherry-pick", "stack"], "todo", true,
      "Four dependent PRs need to land one at a time.",
      "A stack of four branches builds on itself. Reviewers approve each layer separately, but only the first is merged.",
      "Rebase each remaining layer onto the updated main as its parent lands, without duplicating commits or breaking the stack.",
      [{ label: "Example", code: "$ git rebase --onto main feature/layer-1 feature/layer-2\n$ git log --oneline main..feature/layer-2" }],
      ["After layer 1 merges, rebase layer 2 onto main with <code>--onto</code>.", "Repeat upward; never merge a lower layer into an upper one."],
      "A stack is a chain of bases. When the bottom lands, the next branch's base is the merged commit. <code>--onto</code> moves only the layer's own commits, keeping each PR's diff equal to its review."
    ),

    P(39, "undo-a-bad-merge-that-was-already-pushed", "Undo a Bad Merge That Was Already Pushed", "Medium", 56.8, "safety",
      ["revert", "merge", "safety"], null, false,
      "A merge broke production and other people have pulled it.",
      "A merge of <code>feature/search</code> broke the checkout page and is already on <code>main</code>. Two teammates have built on it.",
      "Undo the merge on the shared branch without rewriting published history, then prepare a clean re-merge later.",
      [{ label: "Example", code: "$ git revert -m 1 4f1c9ab\n[main 9d2e113] Revert \"Merge feature/search\"" }],
      ["<code>-m 1</code> keeps the mainline parent.", "A later re-merge needs the revert reverted first."],
      "Reverting a merge is the safe public undo. It records a new commit and leaves everyone's history intact. Re-merging the same branch later requires reverting the revert, because Git still considers the original merge an ancestor."
    ),
    P(40, "stash-work-mid-rebase", "Stash Work Mid-Rebase", "Medium", 42.6, "safety",
      ["stash", "rebase", "safety"], "todo", false,
      "A rebase stopped and you have unrelated edits in the tree.",
      "An interactive rebase stopped at a conflict. While resolving, you also edited an unrelated file to test a theory. The rebase cannot continue with a dirty tree.",
      "Preserve the unrelated edits, finish the rebase, and reapply them afterwards without mixing them into the rebased commit.",
      [{ label: "Example", code: "$ git status --short\n M src/session.ts\n M scratch/notes.md\n$ git stash push -- scratch/notes.md" }],
      ["Stash only the unrelated path, not the conflict resolution.", "Stash during a rebase is allowed; the stash is independent of the sequencer."],
      "A rebase sequencer needs a clean index and working tree for the paths it touches. A path-limited stash removes the unrelated edit temporarily without disturbing the conflict resolution already staged."
    ),
    P(41, "recover-from-a-failed-interactive-rebase", "Recover from a Failed Interactive Rebase", "Easy", 65.9, "safety",
      ["rebase", "abort", "safety"], null, false,
      "An interactive rebase went wrong halfway through.",
      "You started an interactive rebase, dropped a commit by mistake, and are now several steps in. The branch has not been pushed.",
      "Return the branch to its exact pre-rebase state, then redo the rebase with the correct plan.",
      [{ label: "Example", code: "$ git status\ninteractive rebase in progress; onto 7a0be42\n$ git rebase --abort\n$ git log --oneline -1" }],
      ["<code>git rebase --abort</code> restores the original branch tip.", "The reflog is the fallback if the abort is unavailable."],
      "The rebase sequencer records the original tip before starting. Abort uses that record to restore the branch, which makes experimentation safe. Only after a successful push does the old tip become expensive to recover."
    ),
    P(42, "untrack-a-file-without-deleting-it", "Untrack a File Without Deleting It", "Easy", 81.2, "safety",
      ["rm", "cached", "gitignore"], null, false,
      "A local config file should not be tracked.",
      "<code>.env.local</code> is tracked and contains machine-specific settings. Teammates keep committing their own values by accident.",
      "Stop tracking the file for everyone while keeping each developer's local copy, and prevent it from being added again.",
      [{ label: "Example", code: "$ git ls-files .env.local\n.env.local\n$ git rm --cached .env.local\n$ printf '.env.local\\n' >> .gitignore" }],
      ["<code>--cached</code> removes it from the index only.", "Everyone keeps their working copy; the next pull will not delete it."],
      "Tracking and existence are separate concerns. <code>git rm --cached</code> removes the index entry, and .gitignore prevents re-adding. This is the standard fix for local configuration that should never have been committed."
    ),
    P(43, "protect-main-from-accidental-commits", "Protect main from Accidental Commits", "Medium", 50.1, "safety",
      ["hooks", "reset", "safety"], "todo", true,
      "Someone keeps committing directly to main.",
      "Direct commits to <code>main</code> bypass review. You cannot change server settings in this exercise, but you can add a local guard.",
      "Add a pre-commit hook that blocks commits on <code>main</code>, allows an explicit override, and does not interfere with rebases.",
      [{ label: "Example", code: "$ git switch main\n$ git commit -m \"quick fix\"\n[ERROR] Direct commits to main are blocked. Use a branch." }],
      ["Check <code>git symbolic-ref --short HEAD</code> in the hook.", "Allow <code>GITCODE_ALLOW_MAIN=1</code> as an escape hatch.", "Exit non-zero with a readable message."],
      "A local hook is a guardrail, not an access control. It should fail loudly, explain the fix, and provide an override for legitimate emergencies. Server-side protection remains the real enforcement."
    ),
    P(44, "find-what-changed-between-two-tags", "Find What Changed Between Two Tags", "Easy", 70.6, "safety",
      ["diff", "log", "tags"], null, false,
      "A release note needs the real changes between two tags.",
      "You need to summarize what changed between <code>v2.7.0</code> and <code>v2.8.0</code>. The log contains merge commits and backports.",
      "List the user-visible changes, grouped by area, and exclude commits that were reverted before the release.",
      [{ label: "Example", code: "$ git log --oneline v2.7.0..v2.8.0\n$ git diff --stat v2.7.0 v2.8.0" }],
      ["Range log shows commits reachable from the new tag but not the old.", "Check for reverts before writing the notes."],
      "A tag range answers reachability, not intent. Merge commits and reverted pairs add noise, so release notes require reading the log and filtering by user-visible effect, not simply listing every commit."
    )
  ];

  // Bookmarks are a UI preference; seed a couple so the dashboard has state.
  problems.forEach(function (p) {
    p.starred = ["find-the-first-bad-commit", "recover-a-lost-commit", "clean-up-a-messy-commit-history"].indexOf(p.slug) !== -1;
  });

  var daily = {
    n: 1,
    slug: "recover-a-lost-commit",
    date: "Nov 4, 2026",
    title: "Recover a Lost Commit",
    difficulty: "Easy",
    acceptance: 68.4,
    tags: ["reflog", "reset"]
  };

  var trending = [
    { label: "git reflog", value: "2.4k attempts" },
    { label: "git rebase -i", value: "1.9k attempts" },
    { label: "git bisect run", value: "1.7k attempts" },
    { label: "git cherry-pick -x", value: "1.4k attempts" },
    { label: "git revert -m 1", value: "986 attempts" }
  ];

  var stats = {
    solved: problems.filter(function (p) { return p.status === "solved"; }).length,
    attempted: problems.filter(function (p) { return p.status === "attempted"; }).length,
    total: problems.length,
    streak: 0,
    submissions: 0,
    acceptance: 0
  };

  function bySlug(slug) {
    for (var i = 0; i < problems.length; i++) {
      if (problems[i].slug === slug) return problems[i];
    }
    return null;
  }

  function byNumber(n) {
    for (var i = 0; i < problems.length; i++) {
      if (problems[i].n === n) return problems[i];
    }
    return null;
  }

  function adjacent(slug) {
    var i = problems.findIndex(function (p) { return p.slug === slug; });
    return {
      index: i,
      prev: i > 0 ? problems[i - 1] : null,
      next: i > -1 && i < problems.length - 1 ? problems[i + 1] : null
    };
  }

  window.GCData = {
    categories: categories,
    tracks: tracks,
    problems: problems,
    daily: daily,
    trending: trending,
    stats: stats,
    bySlug: bySlug,
    byNumber: byNumber,
    adjacent: adjacent
  };
})();
