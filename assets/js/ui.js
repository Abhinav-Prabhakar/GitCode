// Shared UI helpers. Everything here is DOM-only: no fetch, no storage beyond
// the theme preference. Pages call UI.init*() after their own render pass.

(function () {
  var UI = {};

  var LOGO_MARK =
    '<svg class="gc-logo__mark" viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect width="24" height="24" rx="6" fill="#ffa116"></rect>' +
    '<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round">' +
    '<path d="M12 7v10"></path>' +
    '<path d="M12 10.6c0 2.1 4 1.7 4 4"></path>' +
    "</g>" +
    '<circle cx="12" cy="5.4" r="1.7" fill="#fff"></circle>' +
    '<circle cx="12" cy="18.6" r="1.7" fill="#fff"></circle>' +
    '<circle cx="16" cy="16.4" r="1.6" fill="#fff"></circle>' +
    "</svg>";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  UI.esc = esc;
  UI.$ = $;
  UI.$$ = $$;
  UI.logoMark = LOGO_MARK;

  /* ---------------------------------------------------------------- theme */

  function currentTheme() {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }

  function applyTheme(theme, persist) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    if (persist !== false) {
      try {
        localStorage.setItem("gc-theme", theme);
      } catch (e) {}
      // A forced ?theme= review link should not override the next toggle.
      try {
        var url = new URL(location.href);
        if (url.searchParams.has("theme")) {
          url.searchParams.delete("theme");
          history.replaceState({}, "", url);
        }
      } catch (e) {}
    }
    $$("[data-theme-toggle]").forEach(function (btn) {
      if (btn.classList.contains("gc-menu__item")) {
        btn.innerHTML =
          window.icon(theme === "dark" ? "sun" : "moon") +
          "<span>" + (theme === "dark" ? "Light mode" : "Dark mode") + "</span>";
      } else {
        btn.innerHTML = window.icon(theme === "dark" ? "sun" : "moon");
      }
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      btn.title = theme === "dark" ? "Light mode" : "Dark mode";
    });
  }

  UI.applyTheme = applyTheme;

  UI.initTheme = function () {
    applyTheme(currentTheme(), false);
    $$("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
      });
    });
  };

  /* ------------------------------------------------------------- navigation */

  function navLink(item, active, compact) {
    var current = active === item.id ? ' aria-current="page"' : "";
    var cls = "gc-navlink" + (item.brand ? " gc-navlink--brand" : "");
    return (
      '<a class="' + cls + '" href="' + item.href + '"' + current + ">" + item.label + "</a>"
    );
  }

  UI.renderNav = function (active) {
    var host = $("#gc-nav");
    if (!host) return;
    var links = [
      { id: "practice", label: "Practice", href: "index.html" },
      { id: "tracks", label: "Tracks", href: "index.html#tracks" },
      { id: "playground", label: "Playground", href: "index.html?view=playground" },
      { id: "discuss", label: "Discuss", href: "index.html?view=discuss" }
    ];
    host.className = "gc-nav";
    host.innerHTML =
      '<a class="gc-logo" href="index.html" aria-label="GitCode home">' +
      LOGO_MARK +
      '<span class="gc-logo__word">GitCode</span></a>' +
      '<nav class="gc-navlinks" aria-label="Primary">' +
      links
        .map(function (l) {
          return navLink(l, active === "dashboard" && l.id === "practice" ? "practice" : active);
        })
        .join("") +
      '<a class="gc-navlink gc-navlink--brand" href="index.html?premium=1">Premium</a>' +
      "</nav>" +
      '<span class="gc-nav-spacer"></span>' +
      '<div class="gc-nav-actions">' +
      '<div class="gc-search">' +
      window.icon("magnifying-glass") +
      '<input type="search" placeholder="Search tasks" aria-label="Search tasks" data-global-search>' +
      "<kbd>/</kbd></div>" +
      '<a class="gc-streak" href="index.html?streak=1" title="12 day streak">' +
      window.icon("fire") +
      "<span>12</span></a>" +
      '<button class="gc-iconbtn" data-theme-toggle aria-label="Toggle theme"></button>' +
      '<div class="gc-menu-anchor">' +
      '<button class="gc-avatar" aria-label="Account menu" aria-haspopup="menu" data-menu-button>AD</button>' +
      '<div class="gc-menu gc-menu--right" role="menu" hidden>' +
      '<div class="gc-menu__label">ada@gitcode.dev</div>' +
      '<a class="gc-menu__item" role="menuitem" href="index.html?view=profile">' +
      window.icon("circle-user") +
      "Profile</a>" +
      '<a class="gc-menu__item" role="menuitem" href="index.html?view=bookmarks">' +
      window.icon("bookmark") +
      "Bookmarks</a>" +
      '<a class="gc-menu__item" role="menuitem" href="index.html?view=submissions">' +
      window.icon("clock-rotate-left") +
      "Submissions</a>" +
      '<div class="gc-menu__sep"></div>' +
      '<button class="gc-menu__item" role="menuitem" data-theme-toggle>' +
      window.icon("moon") +
      '<span data-theme-label>Theme</span></button>' +
      '<div class="gc-menu__item" role="menuitem" aria-disabled="true">' +
      window.icon("gear") +
      "Settings" +
      '<span class="gc-menu__right">soon</span></div>' +
      "</div></div>" +
      '<button class="gc-iconbtn gc-only-lg" data-rail-toggle aria-label="Toggle sidebar">' +
      window.icon("bars") +
      "</button>" +
      "</div>";
  };

  /* ---------------------------------------------------------------- menus */

  UI.initMenus = function () {
    function closeAll(except) {
      $$("[data-menu-button]").forEach(function (btn) {
        var menu = btn.parentElement.querySelector(".gc-menu");
        if (menu && menu !== except) {
          menu.hidden = true;
          btn.setAttribute("aria-expanded", "false");
        }
      });
    }

    $$("[data-menu-button]").forEach(function (btn) {
      var menu = btn.parentElement.querySelector(".gc-menu");
      if (!menu) return;
      btn.setAttribute("aria-haspopup", "menu");
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var willOpen = menu.hidden;
        closeAll(menu);
        menu.hidden = !willOpen;
        btn.setAttribute("aria-expanded", String(willOpen));
      });
      menu.addEventListener("click", function (e) {
        if (e.target.closest("[role=menuitem]")) {
          menu.hidden = true;
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });

    document.addEventListener("click", function () {
      closeAll(null);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll(null);
    });
  };

  UI.initEdgeFades = function (selector) {
    $$(selector).forEach(function (el) {
      if (el.__gcFade) return;
      el.__gcFade = true;
      el.classList.add("gc-fade-x");
      var update = function () {
        var more = el.scrollWidth - el.clientWidth > 2;
        el.classList.toggle("is-fade-left", more && el.scrollLeft > 2);
        el.classList.toggle("is-fade-right", more && el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
      };
      el.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      update();
    });
  };

  /* ---------------------------------------------------------------- tabs */

  UI.initTabs = function (root) {
    $$("[data-tabgroup]", root || document).forEach(function (group) {
      var tablist = $('[role="tablist"]', group);
      if (!tablist) return;
      var tabs = $$('[role="tab"]', tablist);
      var panels = $$("[data-panel]", group);

      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", String(on));
          t.setAttribute("tabindex", on ? "0" : "-1");
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-panel") !== tab.getAttribute("data-tab");
        });
        // Keep the selected tab inside the horizontally scrolling strip.
        var strip = tab.parentElement;
        if (strip && strip.scrollWidth > strip.clientWidth) {
          var tRect = tab.getBoundingClientRect();
          var sRect = strip.getBoundingClientRect();
          if (tRect.left < sRect.left) {
            strip.scrollLeft -= sRect.left - tRect.left + 4;
          } else if (tRect.right > sRect.right) {
            strip.scrollLeft += tRect.right - sRect.right + 4;
          }
        }
        if (focus) tab.focus();
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () {
          select(tab, false);
        });
        tab.addEventListener("keydown", function (e) {
          var next = null;
          if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
          if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
          if (e.key === "Home") next = tabs[0];
          if (e.key === "End") next = tabs[tabs.length - 1];
          if (next) {
            e.preventDefault();
            select(next, true);
          }
        });
      });

      var initial = tabs.filter(function (t) {
        return t.getAttribute("aria-selected") === "true";
      })[0] || tabs[0];
      if (initial) select(initial, false);
    });
  };

  /* ------------------------------------------------------------- splitters */

  UI.initSplitters = function () {
    $$(".gc-splitter").forEach(function (splitter) {
      var parent = splitter.parentElement;
      var row = splitter.classList.contains("gc-splitter--row");
      var pane = $(
        row ? ".gc-vsplit__pane--top" : ".gc-split__pane--left",
        parent
      );
      if (!pane) return;
      var dragging = false;

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function apply(pct) {
        var safe = clamp(pct, 28, 74);
        parent.style.setProperty(row ? "--split-b" : "--split-a", safe + "%");
        splitter.setAttribute("aria-valuenow", String(Math.round(safe)));
        try {
          localStorage.setItem("gc-split-" + (row ? "row" : "col"), String(safe));
        } catch (e) {}
      }

      function ratio(e) {
        var rect = parent.getBoundingClientRect();
        var raw = row
          ? ((e.clientY - rect.top) / rect.height) * 100
          : ((e.clientX - rect.left) / rect.width) * 100;
        return clamp(raw, 28, 74);
      }

      try {
        var saved = localStorage.getItem("gc-split-" + (row ? "row" : "col"));
        if (saved) apply(parseFloat(saved));
      } catch (e) {}

      splitter.addEventListener("pointerdown", function (e) {
        dragging = true;
        splitter.setPointerCapture(e.pointerId);
        splitter.classList.add("is-dragging");
        document.body.classList.add("gc-resizing");
        document.body.style.cursor = row ? "row-resize" : "col-resize";
        e.preventDefault();
      });
      splitter.addEventListener("pointermove", function (e) {
        if (dragging) apply(ratio(e));
      });
      function end(e) {
        if (!dragging) return;
        dragging = false;
        splitter.classList.remove("is-dragging");
        document.body.classList.remove("gc-resizing");
        document.body.style.cursor = "";
        if (e && e.pointerId != null && splitter.hasPointerCapture(e.pointerId)) {
          splitter.releasePointerCapture(e.pointerId);
        }
      }
      splitter.addEventListener("pointerup", end);
      splitter.addEventListener("pointercancel", end);
      splitter.addEventListener("dblclick", function () {
        apply(row ? 50 : 50);
      });
      splitter.addEventListener("keydown", function (e) {
        var attr = row ? "--split-b" : "--split-a";
        var now = parseFloat(parent.style.getPropertyValue(attr)) || 50;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          apply(now - 2);
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          apply(now + 2);
        } else if (e.key === "Home") {
          e.preventDefault();
          apply(row ? 50 : 50);
        }
      });
    });
  };

  /* ---------------------------------------------------------------- toast */

  var toastTimer = null;
  UI.toast = function (message, iconName) {
    var node = $(".gc-toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "gc-toast";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      document.body.appendChild(node);
    }
    node.innerHTML = window.icon(iconName || "circle-check") + "<span>" + esc(message) + "</span>";
    node.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove("is-on");
    }, 2600);
  };

  /* -------------------------------------------------------------- modal */

  UI.openModal = function (opts) {
    var host = $("#gc-modal");
    if (!host) {
      host = document.createElement("div");
      host.id = "gc-modal";
      host.className = "gc-modal";
      host.hidden = true;
      document.body.appendChild(host);
    }
    host.innerHTML =
      '<div class="gc-modal__panel" role="dialog" aria-modal="true" aria-labelledby="gc-modal-title">' +
      '<div class="gc-modal__head"><div class="gc-modal__title" id="gc-modal-title">' +
      esc(opts.title || "") +
      '</div><button class="gc-iconbtn" data-modal-close aria-label="Close dialog">' +
      window.icon("xmark") +
      "</button></div>" +
      '<div class="gc-modal__body">' +
      (opts.body || "") +
      "</div>" +
      '<div class="gc-modal__foot">' +
      '<button class="gc-btn gc-btn--ghost" data-modal-close>' +
      esc(opts.cancel || "Cancel") +
      "</button>" +
      '<button class="gc-btn gc-btn--primary" data-modal-ok>' +
      esc(opts.ok || "OK") +
      "</button></div></div>";
    host.hidden = false;
    function close() {
      host.hidden = true;
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    $$("[data-modal-close]", host).forEach(function (b) {
      b.addEventListener("click", close);
    });
    var ok = $("[data-modal-ok]", host);
    if (ok) {
      ok.addEventListener("click", function () {
        close();
        if (opts.onOk) opts.onOk();
      });
    }
    setTimeout(function () {
      if (ok) ok.focus();
    }, 30);
  };

  /* ------------------------------------------------------------ primitives */

  UI.difficultyClass = function (difficulty) {
    return "gc-row__diff--" + String(difficulty).toLowerCase();
  };

  UI.difficultyChip = function (difficulty) {
    return (
      '<span class="gc-chip gc-chip--' +
      String(difficulty).toLowerCase() +
      '">' +
      esc(difficulty) +
      "</span>"
    );
  };

  UI.statusGlyph = function (status, premium) {
    if (status === "solved") {
      return '<span class="gc-status gc-status--solved" title="Solved">' + window.icon("square-check") + "</span>";
    }
    if (status === "attempted") {
      return '<span class="gc-status gc-status--attempted" title="Attempted">' + window.icon("clock-rotate-left") + "</span>";
    }
    if (premium) {
      return '<span class="gc-status gc-status--locked" title="Premium">' + window.icon("lock-keyhole") + "</span>";
    }
    return '<span class="gc-status"><span class="gc-status-ring"></span></span>';
  };

  UI.progressRing = function (done, total, size) {
    var pct = total ? done / total : 0;
    var circ = 2 * Math.PI * 42;
    var offset = circ * (1 - pct);
    var px = size || 18;
    return (
      '<svg class="gc-progress__ring" viewBox="0 0 100 100" width="' +
      px +
      '" height="' +
      px +
      '" aria-hidden="true">' +
      '<circle class="track" cx="50" cy="50" r="42"></circle>' +
      '<circle class="arc" cx="50" cy="50" r="42" stroke-dasharray="' +
      circ.toFixed(1) +
      '" stroke-dashoffset="' +
      offset.toFixed(1) +
      '"></circle></svg>'
    );
  };

  UI.tagChips = function (tags) {
    return (tags || [])
      .map(function (t) {
        return '<a class="gc-chip" href="index.html?tag=' + encodeURIComponent(t) + '">#' + esc(t) + "</a>";
      })
      .join("");
  };

  UI.attempts = function (p) {
    return ((p.n * 431 + 1200) / 1000).toFixed(1) + "k";
  };

  /* ---------------------------------------------------------- statement */

  var CALLOUTS = {
    recovery: {
      tone: "",
      icon: "clock-rotate-left",
      title: "The reflog is local",
      text: "Reflog entries are per-clone and expire. Recover the commit before the repository is garbage-collected."
    },
    conflicts: {
      tone: "",
      icon: "code-merge",
      title: "Resolve intent, not text",
      text: "Both sides usually need to survive. Read the surrounding code before deleting either hunk."
    },
    rewrite: {
      tone: "gc-callout--warn",
      icon: "triangle-exclamation",
      title: "This rewrites history",
      text: "Commit hashes will change. Coordinate with anyone who has the branch before you publish it."
    },
    debugging: {
      tone: "",
      icon: "diagram-project",
      title: "Bisect needs a predicate",
      text: "Use a command that fails deterministically. A flaky check produces a confident, wrong answer."
    },
    history: {
      tone: "gc-callout--warn",
      icon: "rotate-right",
      title: "Compare the endpoints",
      text: "Before and after the rewrite, <code>git diff</code> must be empty. If it is not, the tree changed."
    },
    collaboration: {
      tone: "",
      icon: "arrow-right-arrow-left",
      title: "Fetch before you force",
      text: "A lease-protected push refuses to overwrite work you have not seen. Plain <code>--force</code> does not."
    },
    safety: {
      tone: "gc-callout--danger",
      icon: "shield-halved",
      title: "Shared branches are public",
      text: "Prefer reverts over rewrites once other people have pulled the branch."
    }
  };

  UI.renderStatement = function (p) {
    var examples = (p.examples || [])
      .map(function (ex, i) {
        return (
          '<div class="gc-example">' +
          '<div class="gc-example__label">' +
          esc(ex.label || "Example " + (i + 1)) +
          "</div>" +
          "<pre><code>" +
          esc(ex.code) +
          "</code></pre></div>"
        );
      })
      .join("");

    var hints = (p.hints || [])
      .map(function (hint, i) {
        return (
          '<details class="gc-fold">' +
          '<summary class="gc-fold__head">' +
          window.icon("lightbulb") +
          "<span>Hint " +
          (i + 1) +
          "</span>" +
          window.icon("chevron-down", "gc-fold__chev") +
          "</summary>" +
          '<div class="gc-fold__body"><p>' +
          hint +
          "</p></div></details>"
        );
      })
      .join("");

    var callout = CALLOUTS[p.category] || CALLOUTS.debugging;
    var related = window.GCData.problems
      .filter(function (x) {
        return x.category === p.category && x.slug !== p.slug;
      })
      .slice(0, 4)
      .map(function (x) {
        return (
          '<a class="gc-related__row" href="problem.html?p=' +
          encodeURIComponent(x.slug) +
          '">' +
          UI.statusGlyph(x.status, x.premium) +
          "<span>" +
          x.n +
          ". " +
          esc(x.title) +
          "</span>" +
          '<span class="gc-related__diff ' +
          UI.difficultyClass(x.difficulty) +
          '">' +
          esc(x.difficulty) +
          "</span></a>"
        );
      })
      .join("");

    return (
      '<div class="gc-qbody">' +
      "<p>" +
      p.scenario +
      "</p>" +
      "<p>" +
      p.task +
      "</p>" +
      examples +
      '<div class="gc-callout ' +
      callout.tone +
      '">' +
      window.icon(callout.icon) +
      '<div class="gc-callout__body"><strong>' +
      esc(callout.title) +
      "</strong>" +
      callout.text +
      "</div></div>" +
      '<h4 id="gc-hints">Hints</h4>' +
      hints +
      '<div class="gc-qmeta">' +
      '<div class="gc-qmeta__cell"><span class="gc-qmeta__label">Acceptance</span><span class="gc-qmeta__value">' +
      p.acceptance.toFixed(1) +
      "%</span></div>" +
      '<div class="gc-qmeta__cell"><span class="gc-qmeta__label">Attempts</span><span class="gc-qmeta__value">' +
      UI.attempts(p) +
      "</span></div>" +
      '<div class="gc-qmeta__cell"><span class="gc-qmeta__label">Category</span><span class="gc-qmeta__value" style="font-size:14px;font-weight:500">' +
      esc(p.category.charAt(0).toUpperCase() + p.category.slice(1)) +
      "</span></div>" +
      "</div>" +
      "</div>" +
      '<div class="gc-related"><h4 style="font-size:14px;font-weight:600;margin:22px 0 4px">Related tasks</h4>' +
      related +
      "</div>"
    );
  };

  /* ------------------------------------------------------------ terminal */

  UI.termLine = function (kind, html) {
    return '<div class="gc-term-line gc-term-line--' + kind + '">' + html + "</div>";
  };

  UI.renderTerminal = function (p) {
    var code = p.blank
      ? ""
      : (p.examples && p.examples[0] && p.examples[0].code) || "$ git status\nOn branch main\nnothing to commit, working tree clean";
    var lines = code ? code.split("\n").map(function (line) {
      if (line.indexOf("$ ") === 0) {
        return (
          '<div class="gc-term-line gc-term-line--cmd">' +
          '<span class="gc-prompt"><span class="user">ada@gitcode</span> ' +
          '<span class="path">~/repo</span> <span class="branch">main</span>' +
          '<span class="sign">$</span></span>' +
          esc(line.slice(2)) +
          "</div>"
        );
      }
      var kind = "out";
      if (/fatal|error|CONFLICT|rejected|\[ERROR\]/.test(line)) kind = "err";
      else if (/warning|\[WARN\]|hint:/.test(line)) kind = "warn";
      else if (/✔|\[release\/|Successfully|CONFLICT.*fixed/.test(line)) kind = "ok";
      return '<div class="gc-term-line gc-term-line--' + kind + '">' + esc(line) + "</div>";
    }) : [];
    lines.push(
      '<div class="gc-term-line gc-term-line--cmd">' +
        '<span class="gc-prompt"><span class="user">ada@gitcode</span> ' +
        '<span class="path">~/repo</span> <span class="branch">main</span>' +
        '<span class="sign">$</span></span><span class="gc-cursor"></span></div>'
    );
    return '<div class="gc-terminal"><div class="gc-terminal__scroll gc-scroll">' + lines.join("") + "</div></div>";
  };

  /* --------------------------------------------------------- commit graph */

  UI.graphRow = function (row, index) {
    var lane = row.lane == null ? 0 : row.lane;
    var color = ["#4c9aff", "#46c6c2", "#fac31d", "#a78bfa", "#f8615c"][lane % 5];
    var head = row.head;
    var merge = row.merge;
    var svg =
      '<svg width="44" height="26" viewBox="0 0 44 26" aria-hidden="true">' +
      '<line x1="22" y1="0" x2="22" y2="26" stroke="' +
      color +
      '" stroke-opacity=".32" stroke-width="1.5"></line>';
    if (merge) {
      svg +=
        '<path d="M22 13 C22 5, 34 5, 34 13" fill="none" stroke="' +
        color +
        '" stroke-opacity=".5" stroke-width="1.5"></path>' +
        '<circle cx="34" cy="13" r="2.5" fill="' +
        color +
        '"></circle>';
    }
    svg +=
      '<circle cx="22" cy="13" r="' +
      (head ? 4 : 3.2) +
      '" fill="' +
      color +
      '"' +
      (head ? ' stroke="currentColor" stroke-width="1.5"' : "") +
      "></circle></svg>";
    var refs = (row.refs || [])
      .map(function (r) {
        var cls = "gc-ref";
        if (r === "HEAD") cls += " gc-ref--head";
        else if (r === "main" || r === "master") cls += " gc-ref--main";
        else if (r.indexOf("origin/") === 0) cls += " gc-ref--remote";
        return '<span class="' + cls + '">' + esc(r) + "</span>";
      })
      .join("");
    return (
      '<div class="gc-graph__row">' +
      '<div class="gc-graph__lane">' +
      svg +
      "</div>" +
      '<div class="gc-graph__hash">' +
      esc(row.hash) +
      "</div>" +
      '<div class="gc-graph__subject">' +
      esc(row.subject) +
      "</div>" +
      '<div class="gc-graph__refs">' +
      refs +
      "</div></div>"
    );
  };

  UI.renderGraph = function (rows) {
    return '<div class="gc-graph">' + rows.map(UI.graphRow).join("") + "</div>";
  };

  /* ------------------------------------------------------------ calendar */

  UI.renderCalendar = function () {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var today = now.getDate();
    var first = new Date(year, month, 1).getDay();
    var days = new Date(year, month + 1, 0).getDate();
    var dows = ["S", "M", "T", "W", "T", "F", "S"];
    var out = dows
      .map(function (d) {
        return '<span class="dow">' + d + "</span>";
      })
      .join("");
    for (var i = 0; i < first; i++) out += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var cls = "day";
      if (d === today) cls += " is-today";
      else if (d >= today - 3 && d < today) cls += " is-done";
      out += '<span class="' + cls + '">' + d + "</span>";
    }
    return '<div class="gc-cal">' + out + "</div>";
  };

  /* --------------------------------------------------------- global keys */

  UI.initGlobalKeys = function () {
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (e.key === "/" && !typing) {
        var inputs = $$("[data-global-search]");
        var input = inputs.filter(function (el) {
          return el.getClientRects().length > 0;
        })[0] || $("[data-global-search]") || $("[data-search]");
        if (input) {
          e.preventDefault();
          input.focus();
          input.select && input.select();
        }
      }
      if (e.key === "Escape" && document.activeElement && document.activeElement.matches("[data-global-search]")) {
        document.activeElement.blur();
      }
    });
  };

  UI.ready = function (fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  };

  window.GCUI = UI;
})();
