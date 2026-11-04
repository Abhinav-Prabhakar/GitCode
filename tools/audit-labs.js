#!/usr/bin/env node
// Offline audit for every GitCode lab. Loads the real data, engine, and lab
// definitions in a VM, then checks:
//   - every problem has a lab and no lab is orphaned
//   - every check runs cleanly on a seeded repo
//   - every lab fails at seed and every hidden check is objective-specific
//   - every official and alternate solution passes
//   - seeded shortcuts are rejected
//   - every edit has a resolution and every resolution is used
//
// No dependencies. Run with `npm test` or `node tools/audit-labs.js`.

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const JS_DIR = path.join(ROOT, "assets", "js");
const VERBOSE = process.argv.includes("--verbose");

const ctx = { console };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const file of ["data.js", "git-engine.js", "labs.js"]) {
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, file), "utf8"), ctx, { filename: file });
}

const labs = ctx.GCLabs;
const problems = ctx.GCData.problems;
const alternate = require("./fixtures/alternate-solutions.js");
const shortcuts = require("./fixtures/shortcuts.js");

const EXPECTED_ERRORS = [
  /CONFLICT/,
  /Automatic merge failed/,
  /non-fast-forward/,
  /rejected/,
  /blocked/i,
  /bad index file/i,
  /is the first bad commit/i
];

function createRepo(lab, slug) {
  const config = Object.assign({}, lab);
  config.seed = slug;
  if (!config.base) config.base = { "README.md": "# " + slug + "\n" };
  return ctx.GitLab.create(config);
}

function writeFile(repo, file, content) {
  const target = String(file || "").replace(/^\.\//, "");
  if (target.indexOf(".git/hooks/") === 0) {
    repo.hooks[target.slice(".git/hooks/".length)] = content;
    return;
  }
  repo.setFile(target, content);
}

function normalize(entry) {
  if (!entry) return { commands: [], resolutions: {} };
  if (Array.isArray(entry)) return { commands: entry, resolutions: {} };
  return { commands: entry.commands || [], resolutions: entry.resolutions || {} };
}

function applyCommands(repo, lab, entry) {
  const { commands, resolutions } = normalize(entry);
  const errors = [];
  const usedResolutions = new Set();
  for (const command of commands) {
    if (/^edit\s+/.test(command)) {
      const file = command.replace(/^edit\s+/, "").trim();
      const value = resolutions[file] != null ? resolutions[file] : (lab.resolutions || {})[file];
      if (value == null) {
        errors.push({ command, code: null, unexpected: true, lines: ["no resolution content for " + file] });
        continue;
      }
      usedResolutions.add(file);
      writeFile(repo, file, value);
      continue;
    }
    const response = repo.exec(command, { history: [] });
    if (response && response.code) {
      const lines = (response.lines || []).map((line) => line.text);
      const expected = EXPECTED_ERRORS.some((matcher) => matcher.test(lines.join("\n")));
      errors.push({ command, code: response.code, unexpected: !expected, lines });
    }
  }
  return { errors, usedResolutions };
}

function evaluate(repo, lab) {
  return lab.checks.map((check) => {
    let pass = false;
    let error = "";
    try {
      pass = !!check.test(repo);
    } catch (exception) {
      error = exception && exception.message ? String(exception.message) : String(exception);
    }
    return {
      name: check.name,
      hidden: !!check.hidden,
      guard: !!check.guard,
      pass,
      error
    };
  });
}

function summarize(checks) {
  return checks.filter((check) => check.pass).length + "/" + checks.length;
}

function reportFailures(label, checks) {
  for (const check of checks.filter((item) => !item.pass)) {
    console.log(
      "    FAIL " +
        (check.hidden ? "[hidden] " : check.guard ? "[guard] " : "") +
        check.name +
        (check.error ? " [ERROR " + check.error + "]" : "")
    );
  }
}

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
  console.log("FAIL  " + message);
}

function note(message) {
  notes.push(message);
  if (VERBOSE) console.log("NOTE  " + message);
}

// Structural invariants -------------------------------------------------------

for (const problem of problems) {
  if (!labs[problem.slug]) fail(problem.slug + ": problem has no lab");
}
for (const slug of Object.keys(labs)) {
  if (!problems.some((problem) => problem.slug === slug)) fail(slug + ": lab has no problem");
}

for (const problem of problems) {
  const lab = labs[problem.slug];
  if (!lab) continue;
  const names = new Set();
  for (const check of lab.checks || []) {
    if (!check.name) fail(problem.slug + ": a check has no name");
    if (typeof check.test !== "function") fail(problem.slug + ": check '" + check.name + "' has no test");
    if (names.has(check.name)) fail(problem.slug + ": duplicate check name '" + check.name + "'");
    names.add(check.name);
  }
  const hidden = (lab.checks || []).filter((check) => check.hidden);
  if (hidden.length !== 1) {
    fail(problem.slug + ": expected exactly one hidden check, found " + hidden.length);
  }
  for (const check of hidden) {
    if (!check.hint) note(problem.slug + ": hidden check has no hint");
  }
}

// Seed, official, alternate, and shortcut runs -------------------------------

let alternatesRun = 0;
let shortcutsRun = 0;

for (const problem of problems) {
  const lab = labs[problem.slug];
  if (!lab) continue;
  const slug = problem.slug;

  const seed = createRepo(lab, slug);
  const seedChecks = evaluate(seed, lab);
  const seedErrors = seedChecks.filter((check) => check.error);
  if (seedErrors.length) {
    fail(slug + ": a seed check threw");
    reportFailures(slug, seedErrors);
  }
  if (seedChecks.some((check) => check.pass) && seedChecks.every((check) => check.pass)) {
    fail(slug + ": the lab is already solved at seed");
  }
  const seedHidden = seedChecks.filter((check) => check.hidden);
  for (const check of seedHidden) {
    if (check.pass) fail(slug + ": hidden check passes at seed (" + check.name + ")");
  }

  // Official solution.
  const officialRepo = createRepo(lab, slug);
  const official = applyCommands(officialRepo, lab, lab.solution || []);
  const officialChecks = evaluate(officialRepo, lab);
  if (!officialChecks.every((check) => check.pass)) {
    fail(slug + ": official solution does not pass (" + summarize(officialChecks) + ")");
    reportFailures(slug, officialChecks);
  }
  for (const error of official.errors.filter((item) => item.unexpected)) {
    fail(slug + ": unexpected error from `" + error.command + "` (code " + error.code + ")");
    if (VERBOSE) console.log("    " + error.lines.join(" | "));
  }
  for (const resolution of Object.keys(lab.resolutions || {})) {
    if (!official.usedResolutions.has(resolution) && !(lab.solution || []).some((cmd) => cmd === "edit " + resolution)) {
      fail(slug + ": unused resolution '" + resolution + "'");
    }
  }
  for (const command of lab.solution || []) {
    if (!/^edit\s+/.test(command)) continue;
    const file = command.replace(/^edit\s+/, "").trim();
    if ((lab.resolutions || {})[file] == null) fail(slug + ": edit without resolution '" + file + "'");
  }
  for (const command of lab.solution || []) {
    const match = command.match(/\.\/(scripts\/[^\s]+)/);
    if (match && !(lab.base || {})[match[1]]) fail(slug + ": solution references missing script " + match[1]);
  }

  // Alternate solution.
  if (alternate[slug]) {
    alternatesRun += 1;
    const alternateRepo = createRepo(lab, slug);
    const result = applyCommands(alternateRepo, lab, alternate[slug]);
    const checks = evaluate(alternateRepo, lab);
    if (!checks.every((check) => check.pass)) {
      fail(slug + ": alternate solution does not pass (" + summarize(checks) + ")");
      reportFailures(slug, checks);
    }
    for (const error of result.errors.filter((item) => item.unexpected)) {
      fail(slug + ": alternate solution hit an unexpected error from `" + error.command + "`");
    }
  }

  // Shortcut, which must be rejected.
  if (shortcuts[slug]) {
    shortcutsRun += 1;
    const shortcutRepo = createRepo(lab, slug);
    applyCommands(shortcutRepo, lab, shortcuts[slug]);
    const checks = evaluate(shortcutRepo, lab);
    if (checks.every((check) => check.pass)) {
      fail(slug + ": shortcut was accepted (" + shortcuts[slug].reason + ")");
    } else if (VERBOSE) {
      console.log("  rejected shortcut: " + slug + " (" + shortcuts[slug].reason + ")");
    }
  }
}

// Summary --------------------------------------------------------------------

console.log("");
console.log(
  problems.length +
    " problems, " +
    Object.keys(labs).length +
    " labs, " +
    alternatesRun +
    " alternate solutions, " +
    shortcutsRun +
    " shortcut trials"
);
console.log(failures.length ? failures.length + " failure(s)" : "All audit checks passed");
if (notes.length) console.log(notes.length + " note(s)");
process.exit(failures.length ? 1 : 0);
