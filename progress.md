# GitCode lab/judge audit — fix progress

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

## 0. Decision
- [x] Keep this a static practice sandbox. Evaluation stays in the bundle, the UI says “visible checks” vs “hidden check”, and no page claims held-out or server-side tests. Recorded in `README.md`.

## 1. Foundation
- [x] Add `tools/audit-labs.js` — loads `data.js`, `git-engine.js`, and `labs.js` in a VM, seeds every lab, runs official + alternate solutions, and asserts invariants.
- [x] Add `tools/fixtures/alternate-solutions.js` — 28 non-official valid workflows (the other 16 labs have one canonical workflow, e.g. amend, filter-repo, abort, replace --graft).
- [x] Add `.github/workflows/labs.yml` — runs `npm test` on push, PR, and manual dispatch.
- [x] Add root `package.json` scripts for `npm test` / `npm run audit:labs` (no runtime dependencies).
- [x] Audit: every problem has a lab, no orphan labs, no duplicate check names.
- [x] Audit: every check returns cleanly on a seeded repo (no thrown exceptions) and every lab fails at seed.
- [x] Audit: every check has a stable name; hidden and guard roles are explicit; every hidden check has a hint.

## 2. Judge semantics (problem.js)
- [x] Split Run vs Submit: Run executes non-hidden checks only.
- [x] Never render the hidden check or its hint on Run. Run shows a “Hidden check withheld” callout instead.
- [x] On Submit, render hidden failures as `Hidden check N`; reveal the hint only after failure.
- [x] Add explicit `guard` check flag and stop calling guardrails “hidden”.
- [x] Make `submit()` timing exclude the artificial 380 ms delay.
- [x] Harden `evaluate()` so a thrown check reports a readable message, not a raw exception.
- [x] Fix progress semantics: clicking Run keeps a previously solved task solved instead of demoting it to attempted.
- [x] Update README/UI copy so Run/Submit, hidden checks, and local-only evaluation are described accurately.

## 3. Check quality (labs.js)
- [x] Reclassify every lab’s hidden check: exactly one objective-specific hidden check per lab, failing on a freshly seeded repo; guardrails marked `guard: true`.
- [x] Fix vacuous hidden checks in `review-a-pr-without-checking-it-out`, `untangle-a-conflict-in-a-lockfile`, `recover-from-a-failed-interactive-rebase`, and every other lab whose hidden check passed at seed (33/44 before, 0/44 now).
- [x] Fix `recover-a-lost-commit` hidden check (null-safe, content-based).
- [x] Fix `recover-a-lost-commit` over-fit: accept content-equivalent replays instead of requiring the original later-commit hashes to stay ancestors.
- [x] Fix `recover-both-sides-of-a-binary-conflict` to verify both extracted stage contents, not just a `/tmp` path.
- [x] Fix `push-a-rebased-branch-safely` to require a real lease push (`lastPush.lease`, no force, correct remote/branch); merge + plain push fails.
- [x] Fix `stash-work-mid-rebase` so the stash is load-bearing (unrelated edit must be stashed and popped).
- [x] Fix `find-what-changed-between-two-tags` broad `/cache/i` rejection: an accurate “cache was reverted” note passes, while missing the tag range fails.
- [x] Reduce literal-SHA over-fitting where a content-equivalent workflow should pass; 28 alternate workflows prove it.
- [x] Add reusable commit-identity helpers (`subjectOf`, `touched`, `authorEmail`, `treeText`) for checks that should not compare raw hashes.
- [x] Ensure documentation labs (`isolate-a-regression-with-log-s`, `blame-the-right-commit-after-a-rename`, tag notes) require facts derived from history, not one magic phrase.

## 4. Engine fidelity (git-engine.js)
- [x] `git revert` restores files deleted by the reverted commit (reverse-applies over the union of base and commit trees).
- [x] `git bisect run` requires good/bad (or a marked range), verifies the referenced script exists, derives the culprit from the bisect path, and rejects out-of-range results.
- [x] Refuse rebase/`rebase --continue` when unrelated dirty files would be carried through (stash becomes meaningful).
- [x] Track `lastPush` metadata (`lease`, `force`, `before`, `after`, remote, branch) for the judge.
- [x] Track every `cp` extraction (`copies`) with content, not just the last one.
- [x] Rebuild the index explicitly: the corrupt-index lab’s `mv .git/index …` + `git reset` step is load-bearing, and only the intended file may be staged.
- [x] `git remote add` duplicate stays a clean error; official solutions no longer depend on it failing.
- [x] Verify official solutions do not depend on engine shortcuts (unknown scripts, unchecked good/bad marks, dirty rebases) — enforced by the audit.

## 5. Content and metadata
- [x] `assets/logo.png` → `assets/logo.svg` in problem 14 statement/example.
- [x] `src/auth.js` → `src/auth.ts` and `src/session/auth.js` → `.ts` in problem 11.
- [x] Seed `scripts/check.sh` and `scripts/integration-check.sh`, or align official solutions.
- [x] Remove the failing `git remote add upstream` from `sync-a-fork-without-polluting-history`.
- [x] Align “120 commits”, “80 commits”, “ten commits ago”, and the merge-count prose with the actual labs.
- [x] Fix stale README badges: link the lab-audit workflow instead of the deployment workflow.
- [x] Seed demo progress honestly: all 44 statuses start `null`; no fake solved/attempted tasks.
- [x] Replace hardcoded `stats.streak` / `stats.submissions` / `stats.acceptance`; the dashboard derives streak and calendar dots from real `localStorage` activity.
- [x] Update screenshots/README copy for the new Run/Submit and honest progress behavior: regenerated dashboard (dark/light/mobile), question (dark/light/mobile), result, checks, submissions, solutions, problem list, and rail at 1440×900 @2x / 390 px.

## 6. Verification
- [x] Run audit: 44/44 official solutions pass.
- [x] Audit: 44/44 seed repos fail; 44/44 hidden checks fail at seed.
- [x] Audit: no unexpected official-solution command errors (expected demo conflicts/rejections are allow-listed).
- [x] Audit: every `edit` has a resolution; every resolution is used; every `scripts/*` referenced by a solution exists in the seed.
- [x] Audit: alternative valid solutions pass — 28 labs covered.
- [x] Audit: shortcut solutions fail — 9 trials (stash-without-stash, merge-without-lease, conflict-blob copy, bisect-without-good/bad, doc-only notes).
- [x] Audit: no check throws on seed; no duplicate names; no orphan labs; one objective-specific hidden check per lab.
- [x] Manual smoke test in the browser: Run shows visible checks only, Submit shows `Hidden check 5` with a hint on failure and accepts `5/5` after the official solution, a later Run keeps the task solved, and a cleared browser shows `0 / 44 solved` with no console errors.

## Results

```
44 problems, 44 labs, 28 alternate solutions, 9 shortcut trials
All audit checks passed
```

- `npm test` and `npm run audit:labs` both pass with zero failures and zero notes.
- Every lab starts unsolved; every hidden check fails at seed.
- `README.md` describes the static judge honestly and documents the audit commands.

## Remaining limitations

- This is still a static site. Check code ships to the browser, so “hidden” means withheld from the UI, not cryptographically secret.
- 16 labs have no alternate fixture because their canonical workflow is effectively unique (amend, filter-repo, abort, replace --graft, and similar single-path tasks).
- The audit harness is Node-only; it validates engine outcomes, not browser rendering. The UI paths were covered by the manual smoke test and the regenerated screenshots.
- The Git engine is a deterministic teaching simulation of the commands these labs need, not a full Git implementation.
