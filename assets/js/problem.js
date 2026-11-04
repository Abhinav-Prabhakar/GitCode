// Question page behaviour. Renders one task from the shared dataset, wires the
// panes, and simulates a run so the test-result states can be reviewed.

(function () {
  var D = window.GCData;
  var UI = window.GCUI;
  var params = new URLSearchParams(location.search);
  var p = D.bySlug(params.get("p") || "") || D.problems[0];
  var ide = document.getElementById("gc-ide");
  var adjacent = D.adjacent(p.slug);

  var bookmarks = {};
  try {
    bookmarks = JSON.parse(localStorage.getItem("gc-bookmarks") || "null") || {};
  } catch (e) {}
  if (!(p.slug in bookmarks)) bookmarks[p.slug] = !!p.starred;

  document.title = p.n + ". " + p.title + " · GitCode";

  function setIcon(id, name) {
    var node = document.getElementById(id);
    if (node) node.innerHTML = window.icon(name);
  }

  function activePanel(tabgroup, name) {
    var tabs = UI.$$('[role="tab"]', tabgroup);
    tabs.forEach(function (tab) {
      if (tab.getAttribute("data-tab") === name) tab.click();
    });
  }

  function copyText(text, message) {
    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(area);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        UI.toast(message || "Copied", "copy");
      }, function () {
        fallback();
        UI.toast(message || "Copied", "copy");
      });
    } else {
      fallback();
      UI.toast(message || "Copied", "copy");
    }
  }

  /* --------------------------------------------------------------- header */

  function renderHeader() {
    setIcon("gc-back-icon", "angle-left");
    setIcon("gc-run-icon", "play");
    setIcon("gc-submit-icon", "cloud-arrow-up");
    var more = document.getElementById("gc-more");
    if (more) more.innerHTML = window.icon("ellipsis");

    var prevnext = document.getElementById("gc-prevnext");
    prevnext.innerHTML =
      (adjacent.prev
        ? '<a class="gc-iconbtn gc-tip" data-tip="Previous task" aria-label="Previous task" href="problem.html?p=' +
          encodeURIComponent(adjacent.prev.slug) + '">' + window.icon("chevron-left") + "</a>"
        : '<span class="gc-iconbtn" aria-disabled="true" aria-label="No previous task">' + window.icon("chevron-left") + "</span>") +
      (adjacent.next
        ? '<a class="gc-iconbtn gc-tip" data-tip="Next task" aria-label="Next task" href="problem.html?p=' +
          encodeURIComponent(adjacent.next.slug) + '">' + window.icon("chevron-right") + "</a>"
        : '<span class="gc-iconbtn" aria-disabled="true" aria-label="No next task">' + window.icon("chevron-right") + "</span>");

    document.getElementById("gc-ide-title").innerHTML =
      '<strong style="color:hsl(var(--sd-foreground));font-weight:500">' + p.n + ".</strong> " + UI.esc(p.title);
  }

  /* ------------------------------------------------------------ tab labels */

  function renderTabLabels() {
    var labels = {
      "gc-tab-desc": ["book-open", "Description"],
      "gc-tab-editorial": ["memo", "Editorial"],
      "gc-tab-solutions": ["code", "Solutions"],
      "gc-tab-submissions": ["clock-rotate-left", "Submissions"],
      "gc-tab-terminal": ["terminal", "Terminal"],
      "gc-tab-help": ["lightbulb", "Terminal help"],
      "gc-tab-workspace": ["list-tree", "Workspace"],
      "gc-tab-result": ["flask", "Test Result"]
    };
    Object.keys(labels).forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.innerHTML = window.icon(labels[id][0]) + "<span>" + labels[id][1] + "</span>";
    });

    setIcon("gc-bookmark", "star");
    setIcon("gc-focus", "expand");
    setIcon("gc-clear", "trash");
    setIcon("gc-copy", "copy");
    setIcon("gc-expand", "expand");
    setIcon("gc-refresh", "arrows-rotate");
    setIcon("gc-shell-chev", "chevron-down");

    var logo = document.getElementById("gc-ide-logo");
    if (logo) {
      logo.innerHTML = UI.logoMark + '<span class="gc-logo__word">GitCode</span>';
    }
    var acts = [
      ["gc-like", "thumbs-up", "71K"],
      ["gc-dislike", "thumbs-down", "2.2K"],
      ["gc-comment", "comment", "2.2K"],
      ["gc-share", "arrow-up-right-from-square", ""],
      ["gc-help", "circle-question", ""]
    ];
    acts.forEach(function (a) {
      var node = document.getElementById(a[0]);
      if (!node) return;
      node.innerHTML = window.icon(a[1]) + (a[2] ? "<span>" + a[2] + "</span>" : "");
    });
  }

  /* ------------------------------------------------------------ description */

  function renderDescription() {
    var premium = p.premium
      ? '<span class="gc-chip gc-chip--premium">' + window.icon("lock-keyhole") + "Premium</span>"
      : "";
    var tags = p.tags
      .map(function (t) {
        return '<a class="gc-chip" href="index.html?tag=' + encodeURIComponent(t) + '">' + UI.esc(t) + "</a>";
      })
      .join("");

    document.getElementById("gc-desc").innerHTML =
      '<div class="gc-qhead"><h1 class="gc-qtitle">' +
      p.n +
      ". " +
      UI.esc(p.title) +
      "</h1></div>" +
      '<div class="gc-qchips">' +
      UI.difficultyChip(p.difficulty) +
      '<span class="gc-chip">' + window.icon("tag") + "Topics</span>" +
      premium +
      '<a class="gc-chip" href="#gc-hints">' + window.icon("lightbulb") + "Hint</a>" +
      tags +
      "</div>" +
      UI.renderStatement(p);
  }

  function renderEditorial() {
    var steps = p.hints
      .map(function (hint) {
        return "<li>" + hint + "</li>";
      })
      .join("");
    var firstCode = p.examples[0] ? p.examples[0].code : "";
    document.getElementById("gc-editorial").innerHTML =
      '<div class="gc-qbody">' +
      "<h2 style=\"font-size:20px;line-height:28px;margin:0 0 14px\">Editorial</h2>" +
      "<p>" + p.editorial + "</p>" +
      '<div class="gc-callout gc-callout--success">' +
      window.icon("circle-check") +
      '<div class="gc-callout__body"><strong>Key insight</strong>' +
      "The final tree is part of the contract. Run <code>git diff</code> before and after any rewrite; a clean result is the proof that you moved history and not content." +
      "</div></div>" +
      "<h4>Walkthrough</h4><ol>" + steps + "</ol>" +
      "<h4>Reference transcript</h4>" +
      "<pre><code>" + UI.esc(firstCode) + "</code></pre>" +
      '<div class="gc-daily__meta" style="margin-top:16px">' +
      '<span class="gc-chip">' + UI.esc(p.category) + "</span>" +
      p.tags.map(function (t) { return '<span class="gc-chip">#' + UI.esc(t) + "</span>"; }).join("") +
      "</div></div>";
  }

  function renderSolutions() {
    var code = p.examples[0] ? p.examples[0].code : "";
    var rows = [
      { name: "Official", votes: 1284, author: "GitCode", code: code, lang: "bash" },
      {
        name: "Reflog first, reset never",
        votes: 412,
        author: "mira",
        code: "git reflog --oneline -10\ngit switch -c recovery/" + p.tags[0] + " <hash>\ngit rebase main",
        lang: "bash"
      },
      {
        name: "Verify before publishing",
        votes: 97,
        author: "kaito",
        code: "git diff --stat HEAD@{1} HEAD\ngit log --oneline --graph -5\ngit push --force-with-lease",
        lang: "bash"
      }
    ];
    document.getElementById("gc-solutions").innerHTML =
      '<div class="gc-qbody"><h2 style="font-size:20px;line-height:28px;margin:0 0 14px">Solutions</h2>' +
      '<p class="text-sm" style="color:hsl(var(--sd-muted-foreground))">Community approaches, ordered by votes. All assume you have read the task.</p>' +
      rows
        .map(function (s) {
          return (
            '<article class="gc-solution">' +
            '<div class="gc-solution__head"><div><div class="gc-solution__title">' +
            UI.esc(s.name) +
            "</div><div class=\"gc-solution__meta\">" +
            UI.esc(s.author) +
            " · " +
            s.lang +
            "</div></div><div class=\"gc-solution__votes\">" +
            window.icon("thumbs-up") +
            s.votes.toLocaleString() +
            "</div></div>" +
            "<pre><code>" + UI.esc(s.code) + "</code></pre>" +
            "</article>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderSubmissions() {
    var rows = [
      { verdict: "Accepted", tone: "easy", lang: "bash", checks: "4/4", when: "2 days ago" },
      { verdict: "Wrong Answer", tone: "hard", lang: "bash", checks: "2/4", when: "2 days ago" },
      { verdict: "Accepted", tone: "easy", lang: "bash", checks: "4/4", when: "1 week ago" }
    ];
    document.getElementById("gc-submissions").innerHTML =
      '<div class="gc-qbody"><h2 style="font-size:20px;line-height:28px;margin:0 0 14px">Submissions</h2>' +
      '<div class="gc-submission gc-submission--head"><span>Verdict</span><span>Shell</span><span>Checks</span><span>When</span></div>' +
      rows
        .map(function (r) {
          return (
            '<div class="gc-submission"><span class="gc-submission__verdict gc-chip--' +
            r.tone +
            '">' +
            (r.tone === "easy" ? window.icon("circle-check") : window.icon("circle-xmark")) +
            " " +
            r.verdict +
            "</span><span>" +
            r.lang +
            "</span><span>" +
            r.checks +
            "</span><span>" +
            r.when +
            "</span></div>"
          );
        })
        .join("") +
      '<div class="gc-callout" style="margin-top:18px">' +
      window.icon("circle-question") +
      '<div class="gc-callout__body"><strong>Preview only</strong>Submissions are static in this build. Running a task shows every result state without a backend.</div></div></div>';
  }

  /* -------------------------------------------------------------- terminal */

  function renderTerminal() {
    document.getElementById("gc-terminal").innerHTML = UI.renderTerminal(p);
  }

  function renderTerminalHelp() {
    document.getElementById("gc-terminal-help").innerHTML =
      '<div class="gc-workspacepane gc-qbody">' +
      '<h2 style="font-size:20px;line-height:28px;margin:0 0 14px">Terminal help</h2>' +
      "<p>The transcript shows the commands and output for this task. It is read-only; edit files in the Workspace pane.</p>" +
      '<dl class="gc-kv" style="margin:18px 0">' +
      "<dt>Run</dt><dd>⌘ + Enter</dd>" +
      "<dt>Submit</dt><dd>⌘ + Shift + Enter</dd>" +
      "<dt>Focus mode</dt><dd>O</dd>" +
      "<dt>Panels</dt><dd>Arrow keys on the splitter</dd>" +
      "<dt>Reset split</dt><dd>Double-click a splitter</dd>" +
      "</dl>" +
      '<div class="gc-callout">' +
      window.icon("terminal") +
      '<div class="gc-callout__body"><strong>Transcript only</strong>Commands are not executed. The Terminal tab is a faithful static record of the task state.</div></div>' +
      "</div>";
  }

  /* ------------------------------------------------------------- workspace */

  function workspaceFiles() {
    var changed = p.category === "conflicts" ? "src/total.ts" : p.category === "rewrite" ? "src/session.ts" : "package.json";
    var files = [
      { name: "src", dir: true },
      { name: "session.ts", pad: 1, file: true },
      { name: "total.ts", pad: 1, file: true },
      { name: "tests", dir: true },
      { name: "session.test.ts", pad: 1, file: true },
      { name: "db", dir: true },
      { name: "migrate", pad: 1, dir: true },
      { name: "014_invoices.sql", pad: 2, file: true },
      { name: ".gitignore", file: true },
      { name: "package.json", file: true },
      { name: "README.md", file: true }
    ];
    return files
      .map(function (f) {
        var path = f.name;
        var isChanged = changed.indexOf(f.name) !== -1 && !f.dir;
        return (
          '<div class="gc-tree__row' +
          (f.dir ? " gc-tree__row--dir" : "") +
          (isChanged ? " gc-tree__row--changed" : "") +
          '">' +
          (f.pad ? '<span class="gc-tree__pad"></span>'.repeat(f.pad) : "") +
          window.icon(f.dir ? "folder" : "file") +
          "<span>" +
          UI.esc(f.name) +
          "</span>" +
          (isChanged ? '<span class="gc-tree__status">M</span>' : "") +
          "</div>"
        );
      })
      .join("");
  }

  function hashFromExample() {
    var code = p.examples[0] ? p.examples[0].code : "";
    var m = code.match(/[0-9a-f]{7}/);
    return m ? m[0] : "c0ffee1";
  }

  function renderWorkspace() {
    var rows = [
      { hash: hashFromExample(), subject: "wip: " + p.title.toLowerCase(), refs: ["HEAD", "main"], head: true, merge: false },
      { hash: "b7c1d90", subject: "test: cover " + p.tags[0], refs: ["origin/main"], merge: false },
      { hash: "9d2e113", subject: "chore: refresh fixtures", refs: [], merge: true },
      { hash: "7a0be42", subject: "feat: add workbench shell", refs: [], merge: false },
      { hash: "4f1c9ab", subject: "docs: first commit", refs: [], merge: false }
    ];
    document.getElementById("gc-workspace").innerHTML =
      '<div class="gc-workspacepane">' +
      '<div class="gc-result-head" style="justify-content:space-between;align-items:center">' +
      '<div><div style="font-size:14px;font-weight:600">lab/"' + UI.esc(p.slug) + '"</div>' +
      '<div class="gc-result-sub">branch main · working tree clean</div></div>' +
      '<button class="gc-btn gc-btn--sm gc-btn--outline" data-run>Open terminal</button>' +
      "</div>" +
      '<dl class="gc-kv" style="margin-top:14px">' +
      "<dt>HEAD</dt><dd>" + hashFromExample() + " · wip</dd>" +
      "<dt>Branch</dt><dd>main</dd>" +
      "<dt>Upstream</dt><dd>origin/main · up to date</dd>" +
      "<dt>Conflicts</dt><dd>" + (p.category === "conflicts" ? "1 file" : "none") + "</dd>" +
      "<dt>Stashes</dt><dd>0</dd>" +
      "</dl>" +
      '<h2 style="font-size:12px;margin:20px 0 4px;color:hsl(var(--sd-muted-foreground));font-weight:600;text-transform:uppercase;letter-spacing:.02em">Files</h2>' +
      '<div class="gc-tree">' + workspaceFiles() + "</div>" +
      '<h2 style="font-size:12px;margin:20px 0 0;color:hsl(var(--sd-muted-foreground));font-weight:600;text-transform:uppercase;letter-spacing:.02em">Recent commits</h2>' +
      UI.renderGraph(rows) +
      '<div class="gc-callout">' +
      window.icon("lightbulb") +
      '<div class="gc-callout__body"><strong>Before you run</strong>Read the transcript in the Terminal pane. It shows the exact hashes and paths this task expects.</div></div>' +
      "</div>";
  }

  /* --------------------------------------------------------------- results */

  function computeChecks() {
    var state = p.status;
    var checks = [
      { name: "Repository is clean", pass: state !== null, detail: state === null ? "2 files still modified: src/session.ts, package.json" : "" },
      {
        name: "Target commit is reachable from main",
        pass: state === "solved",
        detail: state === "solved" ? "" : "git merge-base --is-ancestor " + hashFromExample() + " main\nexit 1"
      },
      { name: "No conflict markers remain", pass: p.category !== "conflicts" || state === "solved", detail: "" },
      { name: "History passes the task invariant", pass: state === "solved", detail: state === "solved" ? "" : "expected: final tree equals the pre-task tree" }
    ];
    return checks;
  }

  function renderResult(mode) {
    var host = document.getElementById("gc-result");
    if (mode !== "run") {
      host.innerHTML =
        '<div class="gc-empty">' +
        window.icon("flask") +
        '<div class="gc-empty__title">No test run yet</div>' +
        '<div class="gc-empty__text">Run the checks against this repository state. Nothing is executed; every result state is available for review.</div>' +
        '<button class="gc-btn gc-btn--outline" data-run>Run tests</button>' +
        "</div>";
      return;
    }

    var checks = computeChecks();
    var passed = checks.filter(function (c) { return c.pass; }).length;
    var all = passed === checks.length;
    var failed = checks.length - passed;
    var failTitle = failed + (failed === 1 ? " check failed" : " checks failed");
    host.innerHTML =
      '<div class="gc-results">' +
      '<div class="gc-result-head"><span class="gc-result-verdict ' +
      (all ? "gc-result-verdict--pass" : "gc-result-verdict--fail") +
      '">' +
      (all ? "Accepted" : "Wrong Answer") +
      '</span><span class="gc-result-sub">' +
      passed +
      " / " +
      checks.length +
      " checks passed · 128 ms</span></div>" +
      checks
        .map(function (c) {
          return (
            '<div class="gc-check ' +
            (c.pass ? "gc-check--pass" : "gc-check--fail") +
            '"><span class="gc-check__icon">' +
            window.icon(c.pass ? "circle-check" : "circle-xmark") +
            '</span><div><div class="gc-check__name">' +
            UI.esc(c.name) +
            "</div>" +
            (c.detail ? '<div class="gc-check__detail">' + UI.esc(c.detail) + "</div>" : "") +
            "</div></div>"
          );
        })
        .join("") +
      '<div class="gc-callout ' +
      (all ? "gc-callout--success" : "gc-callout--danger") +
      '">' +
      window.icon(all ? "circle-check" : "triangle-exclamation") +
      '<div class="gc-callout__body"><strong>' +
      (all ? "All checks passed" : failTitle) +
      "</strong>" +
      (all
        ? "The final tree matches the expected state. Submit to record the result."
        : "Read the failing " + (failed === 1 ? "check" : "checks") + ", adjust the repository state, and run again.") +
      "</div></div>" +
      '<div style="display:flex;gap:8px;margin-top:14px">' +
      '<button class="gc-btn gc-btn--outline gc-btn--sm" data-run>Run again</button>' +
      '<button class="gc-btn gc-btn--success gc-btn--sm" data-submit>Submit</button>' +
      "</div></div>";
  }

  /* --------------------------------------------------------------- actions */

  function run() {
    var group = document.getElementById("gc-result").closest("[data-tabgroup]");
    activePanel(group, "result");
    renderResult("run");
    UI.toast("Ran 4 checks", "flask");
  }

  function submit() {
    UI.openModal({
      title: "Submit " + p.n + ". " + p.title,
      body:
        '<p style="margin:0 0 12px">This is a front-end preview. Submitting would send the repository state to a grader; here it records nothing.</p>' +
        '<div class="gc-callout gc-callout--success" style="margin:0">' +
        window.icon("circle-check") +
        '<div class="gc-callout__body"><strong>UI state is complete</strong>The submit dialog, verdict, and toast are all implemented. Wire an endpoint when a backend exists.</div></div>',
      ok: "Record locally",
      onOk: function () {
        UI.toast("Submission recorded locally", "cloud-arrow-up");
      }
    });
  }

  function renderBookmark() {
    var btn = document.getElementById("gc-bookmark");
    if (!btn) return;
    var on = !!bookmarks[p.slug];
    btn.classList.toggle("is-on", on);
    btn.innerHTML = window.icon("star");
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? "Remove bookmark" : "Bookmark task");
    btn.title = on ? "Remove bookmark" : "Bookmark";
  }

  /* ------------------------------------------------------------------ bind */

  function bind() {
    document.getElementById("gc-run").addEventListener("click", run);
    document.getElementById("gc-submit").addEventListener("click", submit);

    var host = document.getElementById("gc-result");
    host.addEventListener("click", function (e) {
      if (e.target.closest("[data-run]")) run();
      if (e.target.closest("[data-submit]")) submit();
    });
    document.getElementById("gc-workspace").addEventListener("click", function (e) {
      if (e.target.closest("[data-run]")) {
        var top = document.getElementById("gc-terminal").closest("[data-tabgroup]");
        activePanel(top, "terminal");
        UI.toast("Terminal is already focused", "terminal");
      }
    });

    document.getElementById("gc-bookmark").addEventListener("click", function () {
      bookmarks[p.slug] = !bookmarks[p.slug];
      try {
        localStorage.setItem("gc-bookmarks", JSON.stringify(bookmarks));
      } catch (e) {}
      renderBookmark();
      UI.toast(bookmarks[p.slug] ? "Bookmarked" : "Bookmark removed", "star");
    });

    document.getElementById("gc-focus").addEventListener("click", function () {
      ide.classList.toggle("is-focus");
      UI.toast(ide.classList.contains("is-focus") ? "Focus mode on" : "Focus mode off", "expand");
    });

    document.getElementById("gc-clear").addEventListener("click", function () {
      document.getElementById("gc-terminal").innerHTML = UI.renderTerminal({ blank: true });
      UI.toast("Terminal cleared", "trash");
    });

    document.getElementById("gc-copy").addEventListener("click", function () {
      var text = document.getElementById("gc-terminal").innerText;
      copyText(text, "Transcript copied");
    });

    document.getElementById("gc-expand").addEventListener("click", function () {
      ide.classList.toggle("is-terminal");
      UI.toast(ide.classList.contains("is-terminal") ? "Terminal expanded" : "Terminal restored", "expand");
    });

    document.getElementById("gc-refresh").addEventListener("click", function () {
      renderWorkspace();
      UI.toast("Workspace refreshed", "arrows-rotate");
    });

    document.getElementById("gc-shell-select").addEventListener("click", function () {
      UI.toast("The lab shell is fixed to bash", "terminal");
    });

    document.querySelector("[data-copy-link]").addEventListener("click", function () {
      copyText(location.href, "Link copied");
    });

    document.querySelector("[data-goto-solutions]").addEventListener("click", function () {
      var group = document.getElementById("gc-solutions").closest("[data-tabgroup]");
      activePanel(group, "solutions");
      document.querySelector(".gc-pane--desc .gc-pane__body").scrollTop = 0;
      UI.toast("Showing community solutions", "code");
    });

    document.querySelector("[data-reset]").addEventListener("click", function () {
      UI.openModal({
        title: "Reset workspace",
        body: "<p style=\"margin:0\">This would discard local changes and restore the starting repository. The preview has nothing to reset.</p>",
        ok: "Reset",
        onOk: function () { UI.toast("Workspace reset (demo)", "rotate-right"); }
      });
    });

    document.addEventListener("keydown", function (e) {
      var meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        run();
      }
      if (meta && e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        submit();
      }
      if (e.key === "o" && !meta) {
        var tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        document.getElementById("gc-focus").click();
      }
    });
  }

  /* ------------------------------------------------------------------ boot */

  UI.ready(function () {
    renderHeader();
    renderTabLabels();
    renderDescription();
    renderEditorial();
    renderSolutions();
    renderSubmissions();
    renderTerminal();
    renderTerminalHelp();
    renderWorkspace();
    renderResult("empty");
    bind();

    document.getElementById("gc-foot-state").innerHTML =
      window.icon("code-branch") + " main · <span style=\"color:hsl(var(--sd-success))\">clean</span>";

    UI.initTheme();
    UI.initMenus();
    UI.initTabs();
    UI.initEdgeFades(".gc-tabbar__scroll");
    UI.initSplitters();
    UI.initGlobalKeys();
    renderBookmark();

    if (params.get("p") && !D.bySlug(params.get("p"))) {
      UI.toast("Task not found; showing the first task", "triangle-exclamation");
    }
  });
})();
