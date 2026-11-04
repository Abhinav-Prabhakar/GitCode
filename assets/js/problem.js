// Question page: renders one task, boots a deterministic lab repository, and
// wires the terminal, workspace, checks, editor and local submissions.

(function () {
  var D = window.GCData;
  var UI = window.GCUI;
  var Progress = window.GCProgress;
  var params = new URLSearchParams(location.search);
  var p = D.bySlug(params.get("p") || "") || D.problems[0];
  var ide = document.getElementById("gc-ide");
  var adjacent = D.adjacent(p.slug);
  var lab = (window.GCLabs || {})[p.slug] || null;

  var repo = null;
  var transcript = [];
  var commandHistory = [];
  var historyCursor = -1;
  var judging = false;

  var bookmarks = {};
  try {
    bookmarks = JSON.parse(localStorage.getItem("gc-bookmarks") || "null") || {};
  } catch (e) {}
  if (!(p.slug in bookmarks)) bookmarks[p.slug] = !!p.starred;

  // Per-task like / dislike is a local preference. There is no vote count to
  // report, so the buttons only reflect your own stored choice.
  var feedback = {};
  try {
    feedback = JSON.parse(localStorage.getItem("gc-feedback") || "null") || {};
  } catch (e) {}

  document.title = p.n + ". " + p.title + " · GitCode";

  var esc = UI.esc;

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

  var labStart = Date.now();

  function elapsedLabel() {
    var s = Math.max(0, Math.floor((Date.now() - labStart) / 1000));
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
  }

  function timerLabel() {
    var s = Math.max(0, Math.floor((Date.now() - labStart) / 1000));
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var hours = Math.floor(s / 3600);
    var label = pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
    return hours ? hours + ":" + label : label;
  }

  function startLabTimer() {
    var chip = document.getElementById("gc-timer");
    if (!chip) return;
    var text = document.getElementById("gc-timer-label");
    var tick = function () {
      var label = "Lab time " + elapsedLabel();
      if (text) text.textContent = timerLabel();
      chip.title = label;
      chip.setAttribute("aria-label", label);
    };
    tick();
    setInterval(tick, 1000);
    chip.addEventListener("click", function () {
      UI.toast("Lab time " + elapsedLabel(), "stopwatch");
    });
  }

  function renderHeader() {
    setIcon("gc-back-icon", "angle-left");
    setIcon("gc-run-icon", "play");
    setIcon("gc-submit-icon", "cloud-arrow-up");
    setIcon("gc-debug-icon", "bug");
    setIcon("gc-hint-icon", "sparkles");
    setIcon("gc-timer-icon", "stopwatch");
    var more = document.getElementById("gc-more");
    if (more) more.innerHTML = window.icon("gear");

    // Static nav icons authored as [data-icon] in problem.html.
    UI.$$("#gc-ide [data-icon]").forEach(function (node) {
      var name = node.getAttribute("data-icon");
      if (name && !node.firstChild) node.innerHTML = window.icon(name);
    });

    document.getElementById("gc-run").title = "Run checks (⌘↵)";
    document.getElementById("gc-submit").title = "Submit (⌘⇧↵)";

    var prevnext = document.getElementById("gc-prevnext");
    function step(kind, target, label) {
      var inner =
        '<span class="relative text-[16px] leading-[normal]">' +
        window.icon(kind === "prev" ? "chevron-left" : "chevron-right") +
        "</span>";
      var cls = "gc-navstep";
      if (target) {
        return (
          '<a class="' + cls + '" aria-label="' + label + '" href="problem.html?p=' +
          encodeURIComponent(target.slug) + '">' + inner + "</a>"
        );
      }
      return (
        '<span class="' + cls + '" aria-disabled="true" aria-label="No ' +
        (kind === "prev" ? "previous" : "next") + ' task">' + inner + "</span>"
      );
    }
    prevnext.innerHTML =
      '<div class="gc-navsep"></div>' +
      step("prev", adjacent.prev, "Previous task") +
      '<div class="gc-navsep"></div>' +
      step("next", adjacent.next, "Next task") +
      '<div class="gc-navsep"></div>';

    var logo = document.getElementById("gc-ide-logo");
    if (logo) logo.innerHTML = UI.logoMark;
  }

  /* ------------------------------------------------------------ tab labels */

  function renderTabLabels() {
    var labels = {
      desc: "file-lines",
      editorial: "book-open",
      solutions: "flask",
      submissions: "clock-rotate-left",
      terminal: "terminal",
      workspace: "list-tree",
      result: "flask"
    };
    Object.keys(labels).forEach(function (key) {
      var node = document.querySelector('[data-tab-icon="' + key + '"]');
      if (node) node.innerHTML = window.icon(labels[key]);
    });

    setIcon("gc-bookmark", "bookmark");
    setIcon("gc-focus", "expand");
    setIcon("gc-clear", "trash");
    setIcon("gc-copy", "copy");
    setIcon("gc-expand", "expand");
    setIcon("gc-refresh", "arrows-rotate");

    var acts = [
      ["gc-like", "thumbs-up", ""],
      ["gc-dislike", "thumbs-down", ""],
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
    var tags = p.tags
      .map(function (t) {
        return (
          '<a class="gc-chip" href="index.html?tag=' +
          encodeURIComponent(t) +
          '" title="Show tasks about ' +
          esc(UI.tagLabel(t)) +
          '">' +
          esc(UI.tagLabel(t)) +
          "</a>"
        );
      })
      .join("");
    var stored = Progress.status(p.slug);
    var statusChip = stored
      ? '<span class="gc-chip">' +
        window.icon(stored === "solved" ? "square-check" : "clock-rotate-left") +
        (stored === "solved" ? " Solved" : " Attempted") +
        "</span>"
      : "";

    document.getElementById("gc-desc").innerHTML =
      '<div class="gc-qhead"><h1 class="gc-qtitle">' +
      p.n +
      ". " +
      esc(p.title) +
      "</h1></div>" +
      '<div class="gc-qchips">' +
      UI.difficultyChip(p.difficulty) +
      '<span class="gc-chip">' + window.icon("tag") + "Topics</span>" +
      statusChip +
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
      "<pre><code>" + esc(firstCode) + "</code></pre>" +
      '<div class="gc-daily__meta" style="margin-top:16px">' +
      '<span class="gc-chip">' + esc(p.category) + "</span>" +
      p.tags.map(function (t) { return '<span class="gc-chip">#' + esc(t) + "</span>"; }).join("") +
      "</div></div>";
  }

  function renderSolutions() {
    var commands = lab && lab.solution ? lab.solution : [];
    var code = commands.length
      ? commands.join("\n")
      : (p.examples[0] ? p.examples[0].code : "");
    var count = commands.length;
    document.getElementById("gc-solutions").innerHTML =
      '<div class="gc-qbody"><h2 style="font-size:20px;line-height:28px;margin:0 0 14px">Solutions</h2>' +
      '<p class="text-sm" style="color:hsl(var(--sd-muted-foreground))">The official transcript is executable in this lab. Running it resets the sandbox first, so your own terminal work is discarded.</p>' +
      '<article class="gc-solution">' +
      '<div class="gc-solution__head"><div><div class="gc-solution__title">Official solution</div>' +
      '<div class="gc-solution__meta">GitCode · bash · ' +
      count +
      " command" + (count === 1 ? "" : "s") +
      "</div></div>" +
      '<button class="gc-btn gc-btn--outline gc-btn--sm" data-run-solution>' +
      window.icon("play") +
      "Run solution</button></div>" +
      "<pre><code>" + esc(code) + "</code></pre>" +
      "</article>" +
      '<div class="gc-callout" style="margin-top:18px">' +
      window.icon("terminal") +
      '<div class="gc-callout__body"><strong>Prefer to type it?</strong>Every line works in the terminal. Use <code>edit &lt;path&gt;</code> to open the file editor when a step changes content.</div></div>' +
      "</div>";
  }

  function renderSubmissions() {
    var list = Progress.submissions(p.slug);
    var host = document.getElementById("gc-submissions");
    if (!host) return;

    if (!list.length) {
      host.innerHTML =
        '<div class="gc-qbody"><h2 style="font-size:20px;line-height:28px;margin:0 0 14px">Submissions</h2>' +
        '<div class="gc-empty">' +
        window.icon("clock-rotate-left") +
        '<div class="gc-empty__title">No submissions yet</div>' +
        '<div class="gc-empty__text">Run the checks, then submit. Accepted and failed attempts are stored in this browser.</div>' +
        '<button class="gc-btn gc-btn--outline" data-run>Run visible checks</button>' +
        "</div></div>";
      return;
    }

    var accepted = list.filter(function (row) { return row.solved; }).length;
    host.innerHTML =
      '<div class="gc-qbody"><h2 style="font-size:20px;line-height:28px;margin:0 0 6px">Submissions</h2>' +
      '<p class="text-sm" style="color:hsl(var(--sd-muted-foreground));margin:0 0 12px">' +
      list.length +
      " attempt" + (list.length === 1 ? "" : "s") +
      " · " +
      accepted +
      " accepted · saved in this browser</p>" +
      '<div class="gc-submission gc-submission--head"><span>Verdict</span><span>Shell</span><span>Checks</span><span>When</span></div>' +
      list
        .map(function (row, index) {
          var ok = row.solved;
          var failures = row.failures && row.failures.length
            ? "Failed: " + row.failures.join(", ")
            : "All checks passed";
          return (
            '<button class="gc-submission gc-submission--row" type="button" data-submission="' +
            index +
            '" title="' +
            esc(failures) +
            '"><span class="gc-submission__verdict gc-chip--' +
            (ok ? "easy" : "hard") +
            '">' +
            (ok ? window.icon("circle-check") : window.icon("circle-xmark")) +
            " " +
            row.verdict +
            "</span><span>bash</span><span>" +
            row.passed +
            "/" +
            row.total +
            "</span><span>" +
            esc(Progress.relative(row.at)) +
            "</span></button>"
          );
        })
        .join("") +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px">' +
      '<button class="gc-btn gc-btn--ghost gc-btn--sm" data-clear-subs>' +
      window.icon("trash") +
      "Clear history</button></div></div>";
  }

  /* -------------------------------------------------------------- terminal */

  function shortSha(sha) {
    return sha ? String(sha).slice(0, 7) : "none";
  }

  function promptHtml(branch) {
    return (
      '<span class="gc-prompt"><span class="user">ada@gitcode</span> ' +
      '<span class="path">~/repo</span> <span class="branch">' +
      esc(branch || "detached") +
      '</span><span class="sign">$</span></span>'
    );
  }

  function lineKind(text, provided) {
    if (provided && provided !== "out") return provided;
    if (/^(fatal|error|CONFLICT|\[ERROR\]| ! \[rejected\]|error:)/.test(text)) return "err";
    if (/^(warning|hint:)/i.test(text)) return "warn";
    if (/is the first bad commit|Successfully|Fast-forward|Switched to|Accepted|All checks|Merge made/.test(text)) return "ok";
    return "out";
  }

  function currentBranchLabel() {
    if (!repo) return "main";
    return repo.headBranch() || "HEAD@" + shortSha(repo.headSha());
  }

  function renderTerminal() {
    var host = document.getElementById("gc-terminal");
    if (!host) return;
    var rows = transcript
      .map(function (entry) {
        if (entry.type === "cmd") {
          return (
            '<div class="gc-term-line gc-term-line--cmd">' +
            promptHtml(entry.branch) +
            esc(entry.text) +
            "</div>"
          );
        }
        var kind = lineKind(entry.text, entry.kind);
        return (
          '<div class="gc-term-line gc-term-line--' +
          kind +
          '">' +
          (entry.text === "" ? "&nbsp;" : esc(entry.text)) +
          "</div>"
        );
      })
      .join("");
    rows +=
      '<div class="gc-term-line gc-term-line--cmd gc-term-inputrow">' +
      promptHtml(currentBranchLabel()) +
      '<input class="gc-term-input" type="text" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      "</div>";
    host.innerHTML =
      '<div class="gc-terminal"><div class="gc-terminal__scroll gc-scroll" data-term-scroll>' +
      rows +
      "</div></div>";
    scrollTerminal();
    focusTerminal();
  }

  function scrollTerminal() {
    var box = document.querySelector("#gc-terminal [data-term-scroll]");
    if (box) box.scrollTop = box.scrollHeight;
  }

  function focusTerminal() {
    var modal = document.getElementById("gc-modal");
    if (modal && !modal.hidden) return;
    var input = document.querySelector("#gc-terminal .gc-term-input");
    if (input) {
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    }
  }

  function appendResult(res) {
    if (res.clear) {
      transcript = [];
      return;
    }
    (res.lines || []).forEach(function (line) {
      transcript.push({ type: "line", text: line.text, kind: line.kind || "out" });
    });
  }

  function execute(raw, opts) {
    opts = opts || {};
    var cmd = String(raw || "").trim();
    if (!cmd || !repo) return;
    transcript.push({ type: "cmd", text: cmd, branch: currentBranchLabel() });
    if (!opts.fromSolution) {
      commandHistory.push(cmd);
      historyCursor = -1;
    }
    var res;
    try {
      res = repo.exec(cmd, { history: commandHistory });
    } catch (e) {
      res = { lines: [{ text: "fatal: " + e.message, kind: "err" }], code: 1 };
    }
    appendResult(res);
    renderTerminal();
    refreshWorkspace();
    updateFoot();
    if (res.edit) openEditor(res.edit);
    if (res.interactive) openRebasePlan(res.interactive);
  }

  function introLines() {
    return [
      { type: "line", kind: "dim", text: "GitCode lab — " + p.n + ". " + p.title },
      { type: "line", kind: "dim", text: "This is a real sandbox. Type 'help' for commands; Run checks with ⌘↵." },
      { type: "line", kind: "out", text: "" }
    ];
  }

  /* --------------------------------------------------------------- editor */

  function writeFile(path, content) {
    if (!repo) return;
    path = String(path || "").replace(/^\.\//, "");
    if (path.indexOf(".git/hooks/") === 0) {
      repo.hooks[path.slice(".git/hooks/".length)] = content;
      return;
    }
    repo.setFile(path, content);
  }

  function openEditor(path) {
    var editor = null;
    var hook = String(path || "").indexOf(".git/hooks/") === 0;
    var current = hook
      ? repo.hooks[path.slice(".git/hooks/".length)] || ""
      : repo.readFile(path) || "";

    UI.openModal({
      wide: true,
      title: "Edit " + path,
      body:
        '<p style="margin:0 0 10px">Changes stay inside this lab. Save the file, then stage it from the terminal.</p>' +
        '<textarea class="gc-editor" id="gc-editor-text" spellcheck="false" aria-label="Contents of ' +
        esc(path) +
        '">' +
        esc(current) +
        "</textarea>",
      ok: "Save file",
      focus: "#gc-editor-text",
      onOpen: function (host) {
        editor = host.querySelector("#gc-editor-text");
        if (!editor) return;
        editor.addEventListener("keydown", function (e) {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            var ok = host.querySelector("[data-modal-ok]");
            if (ok) ok.click();
          }
        });
      },
      onOk: function () {
        var value = editor ? editor.value : "";
        writeFile(path, value);
        transcript.push({ type: "line", kind: "dim", text: "[editor] saved " + path });
        renderTerminal();
        refreshWorkspace();
        updateFoot();
        UI.toast("Saved " + path, "file");
      }
    });
  }

  /* --------------------------------------------------- interactive rebase */

  function openRebasePlan(interactive) {
    var commits = interactive.commits || [];
    var plan = interactive.plan;
    var host = null;

    var rows = commits
      .map(function (commit) {
        var options = ["pick", "squash", "fixup", "reword", "drop"]
          .map(function (action) {
            return '<option value="' + action + '">' + action + "</option>";
          })
          .join("");
        return (
          '<div class="gc-plan__row" data-sha="' +
          commit.sha +
          '"><select class="gc-plan__select" data-plan-action aria-label="Action for ' +
          esc(commit.subject) +
          '">' +
          options +
          '</select><code class="gc-plan__sha">' +
          shortSha(commit.sha) +
          '</code><span class="gc-plan__subject">' +
          esc(commit.subject) +
          '</span><input class="gc-plan__msg" data-plan-msg aria-label="New message" placeholder="New commit message" value="' +
          esc(commit.subject) +
          '" hidden></div>'
        );
      })
      .join("");

    UI.openModal({
      wide: true,
      title: "Interactive rebase plan",
      body:
        '<p style="margin:0 0 12px">Choose an action per commit. <code>squash</code> and <code>fixup</code> fold into the commit above; <code>drop</code> removes it; <code>reword</code> rewrites its message.</p>' +
        '<div class="gc-plan" id="gc-plan">' +
        rows +
        "</div>",
      ok: "Apply plan",
      onOpen: function (node) {
        host = node;
        UI.$$("[data-plan-action]", host).forEach(function (select) {
          select.addEventListener("change", function () {
            var row = select.closest(".gc-plan__row");
            var msg = row && row.querySelector("[data-plan-msg]");
            if (msg) msg.hidden = select.value !== "reword";
          });
        });
      },
      onOk: function () {
        if (!host || !plan) return;
        var actions = UI.$$(".gc-plan__row", host).map(function (row) {
          var select = row.querySelector("[data-plan-action]");
          var msg = row.querySelector("[data-plan-msg]");
          var action = select ? select.value : "pick";
          return {
            sha: row.getAttribute("data-sha"),
            action: action,
            message: action === "reword" && msg && msg.value.trim() ? msg.value.trim() : undefined
          };
        });
        var res = repo.applyRebasePlan(plan, actions);
        appendResult(res);
        renderTerminal();
        refreshWorkspace();
        updateFoot();
        UI.toast("Interactive plan applied", "code-branch");
      }
    });
  }

  /* ------------------------------------------------------------- workspace */

  function fileStatuses() {
    var headTree = repo.treeOf(repo.headSha());
    var map = {};
    function set(path, label, tone) {
      if (!map[path]) map[path] = { label: label, tone: tone };
    }
    Object.keys(repo.files).forEach(function (path) {
      if (repo.unmerged[path]) set(path, "C", "conflict");
    });
    Object.keys(repo.index).forEach(function (path) {
      if (repo.unmerged[path]) return;
      if (!Object.prototype.hasOwnProperty.call(headTree, path)) set(path, "A", "added");
      else if (headTree[path] !== repo.index[path]) set(path, "M", "staged");
    });
    Object.keys(headTree).forEach(function (path) {
      if (!Object.prototype.hasOwnProperty.call(repo.index, path)) set(path, "D", "deleted");
    });
    Object.keys(repo.files).forEach(function (path) {
      if (repo.unmerged[path]) return;
      if (!Object.prototype.hasOwnProperty.call(repo.index, path)) set(path, "U", "untracked");
      else if (repo.index[path] !== repo.files[path]) set(path, "M", "modified");
    });
    Object.keys(repo.index).forEach(function (path) {
      if (!Object.prototype.hasOwnProperty.call(repo.files, path) && !repo.unmerged[path]) {
        set(path, "D", "deleted");
      }
    });
    return map;
  }

  function treeRows() {
    var status = fileStatuses();
    var headTree = repo.treeOf(repo.headSha());
    var paths = {};
    Object.keys(repo.files).forEach(function (path) { paths[path] = true; });
    Object.keys(repo.index).forEach(function (path) { paths[path] = true; });
    Object.keys(headTree).forEach(function (path) { paths[path] = true; });
    Object.keys(status).forEach(function (path) { paths[path] = true; });

    var dirs = {};
    Object.keys(paths).forEach(function (path) {
      var parts = path.split("/");
      for (var i = 1; i < parts.length; i++) dirs[parts.slice(0, i).join("/")] = true;
    });

    var entries = Object.keys(dirs)
      .map(function (path) { return { path: path, dir: true }; })
      .concat(
        Object.keys(paths)
          .filter(function (path) { return !dirs[path]; })
          .map(function (path) { return { path: path, dir: false }; })
      );

    entries.sort(function (a, b) {
      if (a.path === b.path) return b.dir - a.dir;
      return a.path.localeCompare(b.path);
    });

    return entries
      .map(function (entry) {
        var depth = entry.path.split("/").length - 1;
        var name = entry.path.split("/").pop();
        var info = status[entry.path];
        var tone = entry.dir ? "" : info ? " gc-tree__row--changed" : "";
        return (
          '<div class="gc-tree__row gc-tree__row--' +
          (entry.dir ? "dir" : "file") +
          tone +
          '">' +
          '<span class="gc-tree__pad"></span>'.repeat(depth) +
          window.icon(entry.dir ? "folder" : "file") +
          "<span>" +
          esc(name) +
          "</span>" +
          (info
            ? '<span class="gc-tree__status gc-tree__status--' +
              info.tone +
              '">' +
              info.label +
              "</span>"
            : "") +
          "</div>"
        );
      })
      .join("");
  }

  function refsFor(sha) {
    var refs = [];
    if (repo.headSha() === sha) refs.push("HEAD");
    Object.keys(repo.branches).forEach(function (name) {
      if (repo.branches[name] === sha && refs.indexOf(name) === -1) refs.push(name);
    });
    Object.keys(repo.tags).forEach(function (name) {
      if (repo.tags[name] === sha) refs.push("tag: " + name);
    });
    Object.keys(repo.remotes).forEach(function (remote) {
      var branches = repo.remotes[remote].branches || {};
      Object.keys(branches).forEach(function (name) {
        if (branches[name] === sha) refs.push(remote + "/" + name);
      });
    });
    return refs;
  }

  function commitRows() {
    var head = repo.headSha();
    if (!head) return [];
    return repo.rangeCommits(null, head, true).slice(0, 6).map(function (sha) {
      var commit = repo.commits[sha];
      return {
        hash: sha,
        subject: commit ? commit.subject : "",
        refs: refsFor(sha),
        head: sha === head,
        merge: !!(commit && commit.parents.length > 1)
      };
    });
  }

  function upstreamLabel() {
    var branch = repo.headBranch();
    if (!branch) return "detached HEAD";
    var remotes = repo.remotes || {};
    var label = null;
    Object.keys(remotes).forEach(function (name) {
      var branches = remotes[name].branches || {};
      if (branches[branch] && !label) {
        var remoteSha = branches[branch];
        var localSha = repo.headSha();
        var state = "up to date";
        if (remoteSha !== localSha) {
          if (repo.isAncestor(remoteSha, localSha)) state = "ahead";
          else if (repo.isAncestor(localSha, remoteSha)) state = "behind";
          else state = "diverged";
        }
        label = name + "/" + branch + " · " + state;
      }
    });
    return label || "no upstream";
  }

  function refreshWorkspace() {
    var host = document.getElementById("gc-workspace");
    if (!host || !repo) return;
    var branch = repo.headBranch();
    var head = repo.headSha();
    var headCommit = head ? repo.commits[head] : null;
    var dirty = repo.isDirty() || Object.keys(repo.unmerged).length > 0;
    var conflicts = Object.keys(repo.unmerged).length;
    var stash = repo.stash ? repo.stash.length : 0;

    host.innerHTML =
      '<div class="gc-workspacepane">' +
      '<div class="gc-result-head" style="justify-content:space-between;align-items:center">' +
      '<div><div style="font-size:14px;font-weight:600">lab/"' +
      esc(p.slug) +
      '"</div>' +
      '<div class="gc-result-sub">' +
      (branch ? "branch " + esc(branch) : "detached HEAD at " + shortSha(head)) +
      " · " +
      (dirty ? "uncommitted changes" : "working tree clean") +
      "</div></div>" +
      '<button class="gc-btn gc-btn--sm gc-btn--outline" data-open-terminal>' +
      window.icon("terminal") +
      "Open terminal</button>" +
      "</div>" +
      '<dl class="gc-kv" style="margin-top:14px">' +
      "<dt>HEAD</dt><dd>" +
      shortSha(head) +
      " · " +
      esc(headCommit ? headCommit.subject : "no commits") +
      "</dd>" +
      "<dt>Branch</dt><dd>" +
      esc(branch || "detached") +
      "</dd>" +
      "<dt>Upstream</dt><dd>" +
      esc(upstreamLabel()) +
      "</dd>" +
      "<dt>Conflicts</dt><dd>" +
      (conflicts ? conflicts + " file" + (conflicts === 1 ? "" : "s") : "none") +
      "</dd>" +
      "<dt>Stashes</dt><dd>" +
      stash +
      "</dd>" +
      "</dl>" +
      '<h2 style="font-size:12px;margin:20px 0 4px;color:hsl(var(--sd-muted-foreground));font-weight:600;text-transform:uppercase;letter-spacing:.02em">Files</h2>' +
      '<div class="gc-tree">' +
      (treeRows() || '<div class="gc-tree__row"><span>No files</span></div>') +
      "</div>" +
      '<h2 style="font-size:12px;margin:20px 0 0;color:hsl(var(--sd-muted-foreground));font-weight:600;text-transform:uppercase;letter-spacing:.02em">Recent commits</h2>' +
      (commitRows().length
        ? UI.renderGraph(commitRows())
        : '<div class="gc-result-sub" style="padding:8px 0">No commits yet</div>') +
      '<div class="gc-callout" style="margin-top:16px">' +
      window.icon("lightbulb") +
      '<div class="gc-callout__body"><strong>Live workspace</strong>This tree refreshes after every command. Use <code>git status</code>, <code>git log</code>, and <code>git diff</code> to inspect it before running the checks.</div></div>' +
      "</div>";
  }

  function updateFoot() {
    var host = document.getElementById("gc-foot-state");
    if (!host || !repo) return;
    var branch = repo.headBranch();
    var dirty = repo.isDirty() || Object.keys(repo.unmerged).length > 0;
    host.innerHTML =
      window.icon("code-branch") +
      " " +
      esc(branch || "detached") +
      ' · <span style="color:' +
      (dirty ? "var(--gc-diff-medium)" : "hsl(var(--sd-success))") +
      '">' +
      (dirty ? "uncommitted changes" : "clean") +
      "</span>";
    var saved = document.getElementById("gc-saved");
    if (saved) saved.textContent = dirty ? "Unsaved" : "Saved";
  }

  /* --------------------------------------------------------------- results */

  function evaluate(includeHidden) {
    var checks = (lab && lab.checks ? lab.checks : [])
      .filter(function (check) { return includeHidden || !check.hidden; })
      .map(function (check) {
        var pass = false;
        var error = "";
        try {
          pass = !!check.test(repo);
        } catch (e) {
          error = e && e.message ? String(e.message) : String(e);
        }
        return {
          name: check.name,
          hidden: !!check.hidden,
          guard: !!check.guard,
          hint: check.hint || "",
          pass: pass,
          error: error
        };
      });
    var passed = checks.filter(function (check) { return check.pass; }).length;
    return {
      checks: checks,
      passed: passed,
      total: checks.length,
      includeHidden: !!includeHidden,
      solved: checks.length > 0 && passed === checks.length
    };
  }

  function resultHtml(result) {
    var ok = result.solved;
    var failed = result.total - result.passed;
    var includeHidden = !!result.includeHidden;
    var verdict = ok ? (includeHidden ? "Accepted" : "Ready to submit") : "Wrong Answer";
    var countLabel = includeHidden ? " checks passed · " : " visible checks passed · ";
    var checks = result.checks
      .map(function (check, index) {
        var name = check.hidden ? "Hidden check " + (index + 1) : check.name;
        var detail = check.pass ? "" : check.hint || check.error || "";
        return (
          '<div class="gc-check ' +
          (check.pass ? "gc-check--pass" : "gc-check--fail") +
          '"><span class="gc-check__icon">' +
          window.icon(check.pass ? "circle-check" : "circle-xmark") +
          '</span><div><div class="gc-check__name">' +
          esc(name) +
          "</div>" +
          (detail ? '<div class="gc-check__detail">' + esc(detail) + "</div>" : "") +
          "</div></div>"
        );
      })
      .join("");

    return (
      '<div class="gc-results"><div class="gc-result-head"><span class="gc-result-verdict ' +
      (ok ? (includeHidden ? "gc-result-verdict--pass" : "gc-result-verdict--idle") : "gc-result-verdict--fail") +
      '">' +
      verdict +
      '</span><span class="gc-result-sub">' +
      result.passed +
      " / " +
      result.total +
      countLabel +
      (result.ms || 1) +
      " ms" +
      (result.archived ? " · archived submission" : "") +
      "</span></div>" +
      checks +
      (includeHidden
        ? ""
        : '<div class="gc-callout" style="margin-top:12px">' +
          window.icon("lock-keyhole") +
          '<div class="gc-callout__body"><strong>Hidden check withheld</strong>Run shows the visible checks only. Submit adds the hidden objective check.</div></div>') +
      '<div class="gc-callout ' +
      (ok ? "gc-callout--success" : "gc-callout--danger") +
      '">' +
      window.icon(ok ? "circle-check" : "triangle-exclamation") +
      '<div class="gc-callout__body"><strong>' +
      (ok
        ? includeHidden
          ? "All checks passed"
          : "All visible checks passed"
        : failed + (failed === 1 ? " check failed" : " checks failed")) +
      "</strong>" +
      (ok
        ? includeHidden
          ? "The repository matches the expected outcome."
          : "Submit to run the hidden check and record the result."
        : "Read the failing check, adjust the repository in the terminal, and run again.") +
      "</div></div>" +
      '<div style="display:flex;gap:8px;margin-top:14px">' +
      '<button class="gc-btn gc-btn--outline gc-btn--sm" data-run>Run again</button>' +
      '<button class="gc-btn gc-btn--success gc-btn--sm" data-submit>Submit</button>' +
      "</div></div>"
    );
  }

  function renderResult(mode, result, includeHidden) {
    var host = document.getElementById("gc-result");
    if (!host) return;
    if (mode === "judging") {
      var total = (lab && lab.checks ? lab.checks : []).filter(function (check) {
        return includeHidden || !check.hidden;
      }).length;
      host.innerHTML =
        '<div class="gc-results"><div class="gc-result-head">' +
        '<span class="gc-result-verdict gc-result-verdict--idle">Judging…</span>' +
        '<span class="gc-result-sub">Running ' +
        total +
        (includeHidden ? " checks" : " visible checks") +
        " against the current repository state</span></div>" +
        '<div class="gc-callout">' +
        window.icon("flask") +
        '<div class="gc-callout__body"><strong>Working</strong>Reading the index, refs, and working tree.</div></div></div>';
      return;
    }
    if (mode === "empty" || !result) {
      host.innerHTML =
        '<div class="gc-empty">' +
        window.icon("flask") +
        '<div class="gc-empty__title">No test run yet</div>' +
        '<div class="gc-empty__text">Start in the terminal, then run the visible checks against the live repository. Submit adds the hidden check. Nothing leaves this browser.</div>' +
        '<button class="gc-btn gc-btn--outline" data-run>Run visible checks</button>' +
        "</div>";
      return;
    }
    host.innerHTML = resultHtml(result);
  }

  function showResultTab() {
    setMode(null);
    var tab = document.getElementById("gc-tab-result");
    if (tab) tab.click();
  }

  function run() {
    if (!repo || !lab) {
      UI.toast("This task has no lab yet", "triangle-exclamation");
      return;
    }
    if (judging) return;
    var started = Date.now();
    var result = evaluate(false);
    result.ms = Math.max(1, Date.now() - started);
    showResultTab();
    renderResult("run", result);
    Progress.attempt(p.slug, {
      solved: false,
      passed: result.passed,
      total: result.total
    });
    UI.toast(
      result.solved
        ? "All visible checks passed"
        : result.passed + "/" + result.total + " visible checks passed",
      result.solved ? "circle-check" : "flask"
    );
  }

  function submit() {
    if (!repo || !lab) {
      UI.toast("This task has no lab yet", "triangle-exclamation");
      return;
    }
    if (judging) return;
    judging = true;
    showResultTab();
    renderResult("judging", null, true);
    setTimeout(function () {
      var started = Date.now();
      var result = evaluate(true);
      result.ms = Math.max(1, Date.now() - started);
      judging = false;
      Progress.recordSubmission(p.slug, result);
      renderResult("submit", result);
      renderSubmissions();
      renderDescription();
      UI.toast(
        result.solved
          ? "Accepted · submission saved"
          : "Wrong Answer · " + result.passed + "/" + result.total,
        result.solved ? "circle-check" : "circle-xmark"
      );
    }, 380);
  }

  function runOfficialSolution() {
    if (!lab || !lab.solution || !lab.solution.length) {
      UI.toast("No official solution for this task", "triangle-exclamation");
      return;
    }
    UI.openModal({
      title: "Run the official solution?",
      body:
        '<p style="margin:0 0 12px">This resets the lab, then executes ' +
        lab.solution.length +
        " command" +
        (lab.solution.length === 1 ? "" : "s") +
        ". Your current terminal work will be discarded.</p>" +
        "<pre><code>" +
        esc(lab.solution.join("\n")) +
        "</code></pre>",
      ok: "Run solution",
      onOk: function () {
        resetRepo(false);
        lab.solution.forEach(function (cmd) {
          if (/^edit\s+/.test(cmd)) {
            var path = cmd.replace(/^edit\s+/, "").trim();
            var value = (lab.resolutions || {})[path];
            transcript.push({ type: "cmd", text: cmd, branch: currentBranchLabel() });
            if (value != null) {
              writeFile(path, value);
              transcript.push({ type: "line", kind: "dim", text: "[editor] saved " + path });
            }
            return;
          }
          execute(cmd, { fromSolution: true });
        });
        renderTerminal();
        refreshWorkspace();
        updateFoot();
        UI.toast("Official solution applied — run the checks", "circle-check");
      }
    });
  }

  /* ------------------------------------------------------------- bookmarks */

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

  function setFeedback(value) {
    feedback[p.slug] = value || "";
    try {
      localStorage.setItem("gc-feedback", JSON.stringify(feedback));
    } catch (e) {}
    var like = document.getElementById("gc-like");
    var dislike = document.getElementById("gc-dislike");
    if (like) {
      var liked = feedback[p.slug] === "like";
      like.classList.toggle("is-on", liked);
      like.setAttribute("aria-pressed", String(liked));
      like.setAttribute("aria-label", liked ? "Remove like" : "Like task");
      like.title = liked ? "Remove like" : "Like task";
    }
    if (dislike) {
      var disliked = feedback[p.slug] === "dislike";
      dislike.classList.toggle("is-on", disliked);
      dislike.setAttribute("aria-pressed", String(disliked));
      dislike.setAttribute("aria-label", disliked ? "Remove dislike" : "Dislike task");
      dislike.title = disliked ? "Remove dislike" : "Dislike task";
    }
  }

  /* ------------------------------------------------------------------ boot */

  function createRepo() {
    var config = {};
    Object.keys(lab || {}).forEach(function (key) { config[key] = lab[key]; });
    config.seed = p.slug;
    if (!window.GitLab) return null;
    if (!config.base) config.base = { "README.md": "# " + p.slug + "\n" };
    return window.GitLab.create(config);
  }

  function resetRepo(showToast) {
    repo = createRepo();
    transcript = introLines();
    commandHistory = [];
    historyCursor = -1;
    judging = false;
    renderTerminal();
    refreshWorkspace();
    updateFoot();
    renderResult("empty");
    renderSubmissions();
    if (showToast) UI.toast("Workspace reset", "rotate-right");
  }

  function renderTerminalHelp() {
    document.getElementById("gc-terminal-help").innerHTML =
      '<div class="gc-workspacepane gc-qbody">' +
      '<h2 style="font-size:20px;line-height:28px;margin:0 0 14px">Terminal help</h2>' +
      "<p>This is a working Git sandbox. Every command changes the lab repository, and the Workspace pane reflects it immediately. <code>edit &lt;path&gt;</code> opens a file editor.</p>" +
      '<dl class="gc-kv" style="margin:18px 0">' +
      "<dt>Run checks</dt><dd>⌘ + Enter</dd>" +
      "<dt>Submit</dt><dd>⌘ + Shift + Enter</dd>" +
      "<dt>Command history</dt><dd>↑ / ↓</dd>" +
      "<dt>Focus mode</dt><dd>O</dd>" +
      "<dt>Clear terminal</dt><dd>Ctrl + L</dd>" +
      "</dl>" +
      "<h4>Supported commands</h4>" +
      "<p><code>git status · add · commit · log · show · diff · reflog · branch · switch · checkout · merge · rebase · cherry-pick · revert · reset · restore · stash · bisect · tag · remote · fetch · push · pull · worktree · fsck · rm · mv · clean · config · blame · merge-base · filter-repo · replace</code></p>" +
      "<p>Shell: <code>cat · ls · echo · printf · touch · cp · mv · rm · npm install · edit</code>. Type <code>help</code> for the short list.</p>" +
      '<div class="gc-callout">' +
      window.icon("terminal") +
      '<div class="gc-callout__body"><strong>Unsupported commands</strong>Network access and real process execution are simulated. Commands outside the list return a clear error instead of failing silently.</div></div>' +
      "</div>";
  }

  function syncModeButtons() {
    var map = [
      ["gc-focus", "is-focus", "spread description", "focus mode"],
      ["gc-expand", "is-terminal", "terminal", "terminal"],
      ["gc-workbench-expand", "is-workbench", "workbench", "workbench"]
    ];
    map.forEach(function (entry) {
      var node = document.getElementById(entry[0]);
      if (!node) return;
      var on = ide.classList.contains(entry[1]);
      node.setAttribute("aria-pressed", String(on));
      node.setAttribute("aria-label", (on ? "Restore " : "Expand ") + entry[2]);
      node.title = (on ? "Restore " : "Expand ") + entry[3];
    });
  }

  function setMode(mode) {
    var active = mode && !ide.classList.contains(mode);
    ["is-focus", "is-terminal", "is-workbench"].forEach(function (name) {
      ide.classList.remove(name);
    });
    if (active) ide.classList.add(mode);
    syncModeButtons();
    return !!active;
  }

  function initLayoutSplitters() {
    var layout = ide.querySelector(".flexlayout__layout");
    var vert = document.getElementById("gc-split-vert");
    var horz = document.getElementById("gc-split-horz");
    if (!layout || !vert || !horz) return;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }
    function saved(key, fallback) {
      try {
        var raw = parseFloat(localStorage.getItem(key));
        return isFinite(raw) ? raw : fallback;
      } catch (e) {
        return fallback;
      }
    }
    function save(key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch (e) {}
    }

    var pane = saved("gc-layout-pane", 50);
    var bottom = saved("gc-layout-bottom", 26);

    function applyPane(pct, persist) {
      pane = clamp(pct, 25, 72);
      layout.style.setProperty("--gc-pane-w-user", pane + "%");
      vert.setAttribute("aria-valuenow", String(Math.round(pane)));
      if (persist) save("gc-layout-pane", Math.round(pane * 10) / 10);
    }
    function applyBottom(pct, persist) {
      bottom = clamp(pct, 15, 62);
      layout.style.setProperty("--gc-testcase-h-user", bottom + "%");
      horz.setAttribute("aria-valuenow", String(Math.round(bottom)));
      if (persist) save("gc-layout-bottom", Math.round(bottom * 10) / 10);
    }
    vert.setAttribute("aria-valuemin", "25");
    vert.setAttribute("aria-valuemax", "72");
    horz.setAttribute("aria-valuemin", "15");
    horz.setAttribute("aria-valuemax", "62");
    applyPane(pane, false);
    applyBottom(bottom, false);

    function drag(splitter, onMove) {
      var dragging = false;
      splitter.addEventListener("pointerdown", function (e) {
        dragging = true;
        try {
          splitter.setPointerCapture(e.pointerId);
        } catch (err) {}
        splitter.classList.add("is-dragging");
        document.body.classList.add("gc-resizing");
        document.body.style.cursor =
          splitter === vert ? "col-resize" : "row-resize";
        e.preventDefault();
      });
      splitter.addEventListener("pointermove", function (e) {
        if (dragging) onMove(e);
      });
      function end(e) {
        if (!dragging) return;
        dragging = false;
        splitter.classList.remove("is-dragging");
        document.body.classList.remove("gc-resizing");
        document.body.style.cursor = "";
        if (e && e.pointerId != null) {
          try {
            if (splitter.hasPointerCapture(e.pointerId)) splitter.releasePointerCapture(e.pointerId);
          } catch (err) {}
        }
      }
      splitter.addEventListener("pointerup", end);
      splitter.addEventListener("pointercancel", end);
    }

    drag(vert, function (e) {
      var rect = layout.getBoundingClientRect();
      if (!rect.width) return;
      applyPane(((e.clientX - rect.left) / rect.width) * 100, true);
    });
    drag(horz, function (e) {
      var rect = layout.getBoundingClientRect();
      if (!rect.height) return;
      applyBottom(((rect.bottom - e.clientY) / rect.height) * 100, true);
    });

    vert.addEventListener("dblclick", function () {
      applyPane(50, true);
    });
    horz.addEventListener("dblclick", function () {
      applyBottom(26, true);
    });
    vert.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        applyPane(pane - 2, true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        applyPane(pane + 2, true);
      } else if (e.key === "Home") {
        e.preventDefault();
        applyPane(50, true);
      }
    });
    horz.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        applyBottom(bottom + 2, true);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        applyBottom(bottom - 2, true);
      } else if (e.key === "Home") {
        e.preventDefault();
        applyBottom(26, true);
      }
    });
  }

  function bind() {
    document.getElementById("gc-run").addEventListener("click", run);
    document.getElementById("gc-submit").addEventListener("click", submit);

    var helpBtn = document.getElementById("gc-help");
    if (helpBtn) {
      helpBtn.addEventListener("click", function () {
        var body = document.getElementById("gc-terminal-help");
        UI.openModal({
          title: "Terminal help",
          body: body ? body.innerHTML.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, "") : "",
          ok: "Got it",
          cancel: "Close"
        });
      });
    }

    var debugBtn = document.getElementById("gc-debug");
    if (debugBtn) {
      debugBtn.addEventListener("click", function () {
        setMode(null);
        var group = document.getElementById("gc-terminal").closest("[data-tabgroup]");
        activePanel(group, "terminal");
        execute("git fsck");
        focusTerminal();
      });
    }

    var hintBtn = document.getElementById("gc-hint");
    if (hintBtn) {
      hintBtn.addEventListener("click", function () {
        setMode(null);
        var group = document.getElementById("gc-desc").closest("[data-tabgroup]");
        activePanel(group, "desc");
        var scroll = document.getElementById("gc-desc-scroll");
        var target = document.getElementById("gc-hints");
        if (!scroll || !target) return;
        // Reveal the next unrevealed hint, the same way a hint button walks
        // through hints one at a time.
        var folds = UI.$$(".gc-fold", target.parentElement);
        var next = null;
        for (var i = 0; i < folds.length; i++) {
          if (!folds[i].open) { next = folds[i]; break; }
        }
        if (next) next.open = true;
        var top =
          target.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top +
          scroll.scrollTop -
          12;
        scroll.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        if (!folds.length) UI.toast("No hints for this task", "lightbulb");
        else if (next) UI.toast("Hint revealed", "lightbulb");
        else UI.toast("All hints are already open", "lightbulb");
      });
    }

    startLabTimer();

    var resultHost = document.getElementById("gc-result");
    resultHost.addEventListener("click", function (e) {
      if (e.target.closest("[data-run]")) run();
      if (e.target.closest("[data-submit]")) submit();
    });

    var workspaceHost = document.getElementById("gc-workspace");
    workspaceHost.addEventListener("click", function (e) {
      if (e.target.closest("[data-open-terminal]")) {
        setMode(null);
        var top = document.getElementById("gc-terminal").closest("[data-tabgroup]");
        activePanel(top, "terminal");
        focusTerminal();
      }
    });

    var solutionsHost = document.getElementById("gc-solutions");
    solutionsHost.addEventListener("click", function (e) {
      if (e.target.closest("[data-run-solution]")) runOfficialSolution();
    });

    var submissionsHost = document.getElementById("gc-submissions");
    submissionsHost.addEventListener("click", function (e) {
      if (e.target.closest("[data-run]")) {
        run();
        return;
      }
      var clear = e.target.closest("[data-clear-subs]");
      if (clear) {
        UI.openModal({
          title: "Clear submission history?",
          body: "<p style=\"margin:0\">This removes the stored attempts for this task in this browser.</p>",
          ok: "Clear",
          onOk: function () {
            Progress.reset(p.slug);
            renderSubmissions();
            renderDescription();
            UI.toast("Submission history cleared", "trash");
          }
        });
        return;
      }
      var button = e.target.closest("[data-submission]");
      if (!button) return;
      var list = Progress.submissions(p.slug);
      var record = list[Number(button.getAttribute("data-submission"))];
      if (!record) return;
      var archived = {
        checks: record.checks,
        passed: record.passed,
        total: record.total,
        solved: record.solved,
        includeHidden: true,
        ms: record.ms,
        archived: true
      };
      showResultTab();
      renderResult("archive", archived);
    });

    var terminalHost = document.getElementById("gc-terminal");
    terminalHost.addEventListener("click", function (e) {
      if (e.target.closest(".gc-term-input")) return;
      var selection = window.getSelection && String(window.getSelection());
      if (selection) return;
      focusTerminal();
    });
    terminalHost.addEventListener("keydown", function (e) {
      var input = e.target.closest(".gc-term-input");
      if (!input) return;
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        var value = input.value;
        input.value = "";
        execute(value);
        return;
      }
      if (e.key === "ArrowUp") {
        if (!commandHistory.length) return;
        e.preventDefault();
        historyCursor =
          historyCursor === -1
            ? commandHistory.length - 1
            : Math.max(0, historyCursor - 1);
        input.value = commandHistory[historyCursor] || "";
        return;
      }
      if (e.key === "ArrowDown") {
        if (historyCursor === -1) return;
        e.preventDefault();
        historyCursor++;
        if (historyCursor >= commandHistory.length) {
          historyCursor = -1;
          input.value = "";
        } else {
          input.value = commandHistory[historyCursor] || "";
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        transcript = [];
        renderTerminal();
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

    var likeBtn = document.getElementById("gc-like");
    if (likeBtn) {
      likeBtn.addEventListener("click", function () {
        var next = feedback[p.slug] === "like" ? "" : "like";
        setFeedback(next);
        UI.toast(next ? "Liked this task" : "Like removed", "thumbs-up");
      });
    }
    var dislikeBtn = document.getElementById("gc-dislike");
    if (dislikeBtn) {
      dislikeBtn.addEventListener("click", function () {
        var next = feedback[p.slug] === "dislike" ? "" : "dislike";
        setFeedback(next);
        UI.toast(next ? "Feedback saved" : "Feedback removed", "thumbs-down");
      });
    }
    var shareBtn = document.getElementById("gc-share");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        copyText(location.href, "Task link copied");
      });
    }

    document.getElementById("gc-focus").addEventListener("click", function () {
      var on = setMode("is-focus");
      UI.toast(on ? "Focus mode on" : "Focus mode off", "expand");
    });

    document.getElementById("gc-clear").addEventListener("click", function () {
      transcript = [];
      renderTerminal();
      UI.toast("Terminal cleared", "trash");
    });

    document.getElementById("gc-copy").addEventListener("click", function () {
      copyText(document.getElementById("gc-terminal").innerText, "Transcript copied");
    });

    document.getElementById("gc-expand").addEventListener("click", function () {
      var on = setMode("is-terminal");
      UI.toast(on ? "Terminal expanded" : "Terminal restored", "expand");
      focusTerminal();
    });

    document.getElementById("gc-refresh").addEventListener("click", function () {
      refreshWorkspace();
      updateFoot();
      UI.toast("Workspace refreshed", "arrows-rotate");
    });

    var workbenchExpand = document.getElementById("gc-workbench-expand");
    if (workbenchExpand) {
      workbenchExpand.addEventListener("click", function () {
        var on = setMode("is-workbench");
        UI.toast(on ? "Workbench expanded" : "Workbench restored", "expand");
      });
    }

    document.querySelector("[data-copy-link]").addEventListener("click", function () {
      copyText(location.href, "Link copied");
    });

    document.querySelector("[data-goto-solutions]").addEventListener("click", function () {
      setMode(null);
      var group = document.getElementById("gc-solutions").closest("[data-tabgroup]");
      activePanel(group, "solutions");
      var scroll = document.getElementById("gc-desc-scroll");
      if (scroll) scroll.scrollTop = 0;
      UI.toast("Showing the official solution", "code");
    });

    document.querySelector("[data-reset]").addEventListener("click", function () {
      UI.openModal({
        title: "Reset workspace",
        body: "<p style=\"margin:0\">Restore the starting repository for this task. Your submission history is kept.</p>",
        ok: "Reset",
        onOk: function () { resetRepo(true); }
      });
    });

    document.addEventListener("keydown", function (e) {
      var meta = e.metaKey || e.ctrlKey;
      var tag = (e.target.tagName || "").toLowerCase();
      if (meta && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        run();
      }
      if (meta && e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        submit();
      }
      if (e.key === "o" && !meta && tag !== "input" && tag !== "textarea") {
        document.getElementById("gc-focus").click();
      }
    });
  }

  UI.ready(function () {
    renderHeader();
    renderTabLabels();
    renderDescription();
    renderEditorial();
    renderSolutions();
    renderSubmissions();
    renderTerminalHelp();
    bind();

    repo = createRepo();
    resetRepo(false);

    UI.initTheme();
    UI.initMenus();
    UI.initTabs();
    UI.initEdgeFades(".gc-tabbar__scroll");
    UI.initSplitters();
    UI.initGlobalKeys();
    initLayoutSplitters();
    setFeedback(feedback[p.slug] || "");
    syncModeButtons();
    renderBookmark();

    if (!lab) UI.toast("This task has no lab definition", "triangle-exclamation");
    if (params.get("p") && !D.bySlug(params.get("p"))) {
      UI.toast("Task not found; showing the first task", "triangle-exclamation");
    }
  });
})();
