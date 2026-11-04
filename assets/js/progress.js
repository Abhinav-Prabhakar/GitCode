// Local progress and submission history for GitCode.
// Everything lives in localStorage so the static site works from file:// with
// no backend. Dashboard and question pages share this module.

(function () {
  "use strict";

  var KEY = "gc-progress";
  var LIMIT = 40;

  function empty() {
    return { version: 1, tasks: {}, submissions: {} };
  }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object") {
        return {
          version: 1,
          tasks: raw.tasks && typeof raw.tasks === "object" ? raw.tasks : {},
          submissions:
            raw.submissions && typeof raw.submissions === "object" ? raw.submissions : {}
        };
      }
    } catch (e) {}
    return empty();
  }

  var state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function now() {
    return new Date().toISOString();
  }

  var P = {};

  P.state = state;

  P.status = function (slug) {
    var entry = state.tasks[slug];
    return entry && entry.status ? entry.status : null;
  };

  P.entry = function (slug) {
    return state.tasks[slug] || null;
  };

  P.apply = function (problems) {
    (problems || []).forEach(function (problem) {
      var status = P.status(problem.slug);
      if (status) problem.status = status;
      else problem.status = null;
    });
    return problems;
  };

  P.attempt = function (slug, info) {
    info = info || {};
    var previous = state.tasks[slug] || { status: "todo", attempts: 0 };
    var solved = !!info.solved || previous.status === "solved";
    state.tasks[slug] = {
      status: solved ? "solved" : "attempted",
      attempts: (previous.attempts || 0) + 1,
      passed: solved && previous.passed != null ? previous.passed : info.passed == null ? previous.passed : info.passed,
      total: solved && previous.total != null ? previous.total : info.total == null ? previous.total : info.total,
      updatedAt: now()
    };
    save();
    return state.tasks[slug];
  };

  P.recordSubmission = function (slug, info) {
    info = info || {};
    var checks = (info.checks || []).map(function (check) {
      return {
        name: check.name,
        pass: !!check.pass,
        hidden: !!check.hidden
      };
    });
    var record = {
      id: "sub_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      verdict: info.solved ? "Accepted" : "Wrong Answer",
      solved: !!info.solved,
      passed: info.passed || 0,
      total: info.total || checks.length,
      failures: checks.filter(function (c) { return !c.pass; }).map(function (c) {
        return c.hidden ? "Hidden check" : c.name;
      }),
      checks: checks,
      ms: info.ms || 0,
      at: now()
    };
    var list = state.submissions[slug] || [];
    list.unshift(record);
    state.submissions[slug] = list.slice(0, LIMIT);
    var previous = state.tasks[slug] || { status: "todo", attempts: 0 };
    state.tasks[slug] = {
      status: info.solved ? "solved" : previous.status === "solved" ? "solved" : "attempted",
      attempts: (previous.attempts || 0) + 1,
      passed: record.passed,
      total: record.total,
      updatedAt: record.at
    };
    save();
    return record;
  };

  function dayKey(value) {
    var d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return (
      d.getFullYear() +
      "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + d.getDate()).slice(-2)
    );
  }

  // Real activity for the dashboard calendar and streak. Nothing is seeded:
  // an untouched browser reports no days, no streak, no submissions.
  P.activity = function () {
    var days = {};
    Object.keys(state.tasks || {}).forEach(function (slug) {
      var entry = state.tasks[slug];
      if (entry && entry.updatedAt) {
        var key = dayKey(entry.updatedAt);
        if (key) days[key] = true;
      }
    });
    Object.keys(state.submissions || {}).forEach(function (slug) {
      (state.submissions[slug] || []).forEach(function (record) {
        if (!record || !record.at) return;
        var key = dayKey(record.at);
        if (key) days[key] = true;
      });
    });

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var daysThisWeek = 0;
    for (var i = 0; i < 7; i++) {
      var recent = new Date(today.getTime() - i * 86400000);
      if (days[dayKey(recent)]) daysThisWeek += 1;
    }

    var streak = 0;
    var cursor = new Date(today.getTime());
    if (!days[dayKey(cursor)]) cursor = new Date(cursor.getTime() - 86400000);
    while (days[dayKey(cursor)]) {
      streak += 1;
      cursor = new Date(cursor.getTime() - 86400000);
    }

    return {
      activeDays: days,
      days: Object.keys(days).length,
      daysThisWeek: daysThisWeek,
      streak: streak
    };
  };

  P.submissions = function (slug) {
    return (state.submissions[slug] || []).slice();
  };

  P.latest = function (slug) {
    return P.submissions(slug)[0] || null;
  };

  P.reset = function (slug) {
    delete state.tasks[slug];
    delete state.submissions[slug];
    save();
  };

  P.resetAll = function () {
    state = empty();
    P.state = state;
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
  };

  P.stats = function (problems) {
    var list = problems || [];
    var out = { solved: 0, attempted: 0, todo: 0, total: list.length };
    list.forEach(function (problem) {
      var status = P.status(problem.slug) || problem.status;
      if (status === "solved") out.solved++;
      else if (status === "attempted") out.attempted++;
      else out.todo++;
    });
    return out;
  };

  P.byCategory = function (problems, category) {
    return (problems || []).filter(function (problem) {
      return problem.category === category;
    });
  };

  P.byTag = function (problems, tag) {
    return (problems || []).filter(function (problem) {
      return problem.tags.indexOf(tag) !== -1;
    });
  };

  P.relative = function (iso) {
    if (!iso) return "just now";
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "just now";
    var diff = Math.max(0, Date.now() - then);
    var minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return minutes + "m ago";
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + "h ago";
    var days = Math.floor(hours / 24);
    if (days < 30) return days + "d ago";
    return new Date(iso).toLocaleDateString();
  };

  P.subscribe = function (handler) {
    function onStorage(event) {
      if (event.key !== KEY) return;
      state = load();
      P.state = state;
      handler(P);
    }
    window.addEventListener("storage", onStorage);
    return function () {
      window.removeEventListener("storage", onStorage);
    };
  };

  window.GCProgress = P;
})();
