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
      if (btn.classList.contains("gc-menu__item") || btn.classList.contains("gc-mobilemenu__row")) {
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

  function navLink(item, active) {
    var on = active === item.id;
    return (
      '<li class="gc-navitem' + (on ? " is-active" : "") + '">' +
      '<a class="gc-navlink' + (item.brand ? " gc-navlink--brand" : "") + '" href="' + item.href + '"' +
      (on ? ' aria-current="page"' : "") + ">" +
      item.label +
      "</a></li>"
    );
  }

  UI.renderNav = function (active) {
    var host = $("#gc-nav");
    if (!host) return;
    var daily = window.GCData && window.GCData.daily;
    var links = [
      { id: "practice", label: "Problems", href: "index.html" },
      {
        id: "daily",
        label: "Daily challenge",
        href: daily ? "problem.html?p=" + encodeURIComponent(daily.slug) : "index.html"
      },
      { id: "bookmarked", label: "Bookmarked", href: "index.html?status=bookmarked" }
    ];

    var linkHtml = links
      .map(function (l) {
        var on = active === "dashboard" ? l.id === "practice" : active === l.id;
        var cls =
          "relative whitespace-nowrap hover:text-text-primary dark:hover:text-text-primary flex items-center text-base leading-[22px] cursor-pointer " +
          (on
            ? "font-medium text-text-primary dark:text-text-primary"
            : l.brand
            ? "!text-brand-orange"
            : "text-text-secondary dark:text-text-secondary");
        var caret = l.caret
          ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" class="ml-1 h-[14px] w-[14px]" aria-hidden="true"><path fill-rule="evenodd" d="M4.929 7.913l7.078 7.057 7.064-7.057a1 1 0 111.414 1.414l-7.77 7.764a1 1 0 01-1.415 0L3.515 9.328a1 1 0 011.414-1.414z" clip-rule="evenodd"></path></svg>'
          : "";
        return (
          '<li class="relative flex h-full items-center text-sm' +
          (on ? " nav-li-after border-text-primary dark:border-text-primary" : "") +
          '"><a class="' +
          cls +
          '" href="' +
          l.href +
          '"' +
          (on ? ' aria-current="page"' : "") +
          ">" +
          l.label +
          caret +
          "</a></li>"
        );
      })
      .join("");

    host.className = "w-full";
    host.innerHTML =
      '<nav id="leetcode-navbar" class="flex h-[50px] w-full items-center border-b-[1px] border-solid border-border-tertiary dark:border-border-tertiary z-nav-9 bg-layer-1 dark:bg-dark-layer-1 nav-bar-container" aria-label="Primary">' +
      '<div class="hidden m-auto h-[50px] w-full items-center justify-center px-6 md:flex">' +
      '<a href="index.html" class="gc-brand mb-0.5 flex items-center mr-8" aria-label="GitCode">' +
      '<span class="flex h-[22px] items-center gap-2">' +
      '<span class="flex h-[22px] w-[22px] items-center justify-center">' +
      LOGO_MARK +
      "</span>" +
      '<span class="gc-brand__word text-[20px] font-semibold leading-[22px] tracking-[-0.02em] text-text-primary dark:text-text-primary">GitCode</span>' +
      "</span></a>" +
      '<ul class="relative m-0 flex h-full grow items-center gap-6 self-end p-0">' +
      linkHtml +
      "</ul>" +
      '<div class="relative flex h-full items-center">' +
      '<div class="relative flex items-center space-x-2">' +
      "<div>" +
      '<div class="relative inline-block h-8 w-8">' +
      '<div class="relative !absolute z-base-2 right-0 top-0 inline-block h-8 w-0 transition-[width] duration-300 ease-in-out [@media(min-width:1180px)]:w-[120px]">' +
      '<div class="h-full"><div class="relative h-full overflow-hidden rounded-md">' +
      '<div class="pointer-events-none absolute flex items-center pl-3 leading-none inset-y-0 left-0">' +
      '<span class="text-text-secondary dark:text-text-secondary">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="1em" height="1em" fill="none" class="w-4 h-4"><path d="M14.1057 14.2L17 17M16.0667 9.53333C16.0667 13.1416 13.1416 16.0667 9.53333 16.0667C5.92507 16.0667 3 13.1416 3 9.53333C3 5.92507 5.92507 3 9.53333 3C13.1416 3 16.0667 5.92507 16.0667 9.53333Z" stroke="currentColor" stroke-width="1.66667" stroke-linecap="round"></path></svg>' +
      "</span></div>" +
      '<input class="block h-full w-full rounded-full border-none py-1.5 pr-9 text-sm outline-none pl-9 bg-sd-accent text-sd-muted-foreground" type="search" placeholder="Search" aria-label="Search tasks" data-global-search autocomplete="off">' +
      "</div></div></div>" +
      '<a class="group relative z-base-1 flex h-full w-full cursor-pointer items-center justify-center rounded p-1 transition-all duration-200 [@media(min-width:1180px)]:opacity-0 [@media(min-width:1180px)]:delay-100 hover:bg-fill-3 dark:hover:bg-dark-fill-3" role="button" tabindex="0" aria-label="Focus search" data-focus-search>' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="1em" height="1em" fill="none" class="h-4 w-4 transition-colors hover:text-text-primary dark:hover:text-text-primary text-text-secondary dark:text-text-secondary"><path d="M14.1057 14.2L17 17M16.0667 9.53333C16.0667 13.1416 13.1416 16.0667 9.53333 16.0667C5.92507 16.0667 3 13.1416 3 9.53333C3 5.92507 5.92507 3 9.53333 3C13.1416 3 16.0667 5.92507 16.0667 9.53333Z" stroke="currentColor" stroke-width="1.66667" stroke-linecap="round"></path></svg></a>' +
      "</div></div>" +
      '<div class="flex items-center whitespace-nowrap">' +
      '<button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded text-text-secondary transition-colors hover:bg-fill-3 hover:text-text-primary dark:text-text-secondary dark:hover:bg-dark-fill-3 dark:hover:text-text-primary" data-theme-toggle aria-label="Toggle theme"></button>' +
      "</div>" +
      "</div></div></div>" +
      '<div class="flex h-[50px] w-full items-center justify-between pl-3 pr-[5px] md:hidden">' +
      '<a href="index.html" class="mb-0.5 flex items-center" aria-label="GitCode">' +
      '<span class="flex h-[22px] items-center gap-2">' +
      '<span class="flex h-[22px] w-[22px] items-center justify-center">' +
      LOGO_MARK +
      "</span>" +
      '<span class="text-[18px] font-semibold leading-[22px] tracking-[-0.02em] text-text-primary dark:text-text-primary">GitCode</span>' +
      "</span></a>" +
      '<div class="flex items-center gap-1">' +
      '<a class="inline-flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-fill-3 dark:hover:bg-dark-fill-3" href="index.html?status=bookmarked" aria-label="Bookmarked tasks" title="Bookmarked tasks">' +
      window.icon("star") +
      "</a>" +
      '<button class="inline-flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-fill-3 dark:hover:bg-dark-fill-3" data-theme-toggle aria-label="Toggle theme"></button>' +
      "</div></div>" +
      "</nav>";

    var mobileBtn = $("[data-mobile-nav]", host);
    var mobileMenu = $("#gc-mobilemenu");
    if (mobileBtn && mobileMenu) {
      mobileBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = mobileMenu.hidden;
        mobileMenu.hidden = !open;
        mobileBtn.setAttribute("aria-expanded", String(open));
        host.classList.toggle("is-menu-open", open);
      });
      mobileMenu.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          mobileMenu.hidden = true;
          mobileBtn.setAttribute("aria-expanded", "false");
          host.classList.remove("is-menu-open");
        }
        e.stopPropagation();
      });
    }
    $$("[data-focus-search]", host).forEach(function (btn) {
      function focusSearch() {
        var inputs = $$("[data-global-search]").filter(function (el) {
          return el.getClientRects().length > 0;
        });
        var input = inputs[0];
        if (input) {
          input.focus();
          input.select && input.select();
        }
      }
      btn.addEventListener("click", focusSearch);
      btn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          focusSearch();
        }
      });
    });
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
      var menu = document.getElementById("gc-mobilemenu");
      var btn = document.querySelector("[data-mobile-nav]");
      if (menu && !menu.hidden) {
        menu.hidden = true;
        if (btn) btn.setAttribute("aria-expanded", "false");
        var nav = btn && btn.closest(".gc-nav");
        if (nav) nav.classList.remove("is-menu-open");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeAll(null);
        var menu = document.getElementById("gc-mobilemenu");
        var btn = document.querySelector("[data-mobile-nav]");
        if (menu) menu.hidden = true;
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
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
        var anySelected = false;
        tabs.forEach(function (t) {
          var on = t === tab;
          anySelected = anySelected || on;
          t.setAttribute("aria-selected", String(on));
          t.setAttribute("tabindex", on ? "0" : "-1");
          t.classList.toggle("flexlayout__tab_button--selected", on);
          t.classList.toggle("flexlayout__tab_button--unselected", !on);
        });
        var bar = $(".flexlayout__tabset_tabbar_outer", group);
        if (bar) bar.classList.toggle("flexlayout__tabset-selected", anySelected);
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
      '<div class="gc-modal__panel' +
      (opts.wide ? " gc-modal__panel--wide" : "") +
      '" role="dialog" aria-modal="true" aria-labelledby="gc-modal-title">' +
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
    if (opts.onOpen) opts.onOpen(host);
    setTimeout(function () {
      var target = opts.focus ? $(opts.focus, host) : ok;
      if (target) target.focus();
    }, 30);
    return host;
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

  UI.statusGlyph = function (status) {
    if (status === "solved") {
      return '<span class="gc-status gc-status--solved" title="Solved">' + window.icon("square-check") + "</span>";
    }
    if (status === "attempted") {
      return '<span class="gc-status gc-status--attempted" title="Attempted">' + window.icon("clock-rotate-left") + "</span>";
    }
    return '<span class="gc-status"><span class="gc-status-ring"></span></span>';
  };

  // Tags are stored lowercase because they are also filter keys. Display them
  // as title-case labels ("reflog" -> "Reflog", "cherry-pick" -> "Cherry-pick")
  // while leaving acronyms such as HEAD untouched.
  UI.tagLabel = function (tag) {
    var value = String(tag == null ? "" : tag);
    if (!value) return "";
    if (value === value.toUpperCase()) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  UI.progressRing = function (done, total, size) {
    var pct = total ? done / total : 0;
    var circ = 2 * Math.PI * 42;
    var offset = circ * (1 - pct);
    var px = size || 18;
    return (
      '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="absolute h-full w-full fill-transparent left-0 top-0" style="stroke-width:11" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="42" class="stroke-sd-primary/20"></circle>' +
      '<circle cx="50" cy="50" r="42" class="stroke-sd-success" style="stroke-linecap:initial;stroke-dasharray:' +
      (circ * pct).toFixed(2) +
      ", " +
      circ.toFixed(2) +
      ";stroke-dashoffset:66" +
      '"></circle></svg>'
    );
  };

  UI.tagChips = function (tags) {
    return (tags || [])
      .map(function (t) {
        return '<a class="gc-chip" href="index.html?tag=' + encodeURIComponent(t) + '">' + esc(UI.tagLabel(t)) + "</a>";
      })
      .join("");
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
          esc((ex.label || "Example " + (i + 1)).replace(/ · /g, ": ")) +
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
          UI.statusGlyph(x.status) +
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

  UI.renderCalendar = function (activeDays) {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();
    var today = now.getDate();
    var first = new Date(year, month, 1).getDay();
    var days = new Date(year, month + 1, 0).getDate();
    var dows = ["S", "M", "T", "W", "T", "F", "S"];
    var out = dows
      .map(function (d) {
        return '<span class="text-label-4 dark:text-dark-label-4 pointer-events-none flex h-[26px] w-8 items-center justify-center" aria-hidden="true">' + d + "</span>";
      })
      .join("");
    for (var i = 0; i < first; i++) out += '<span class="h-8 w-8"></span>';
    function key(d) {
      return year + "-" + ("0" + (month + 1)).slice(-2) + "-" + ("0" + d).slice(-2);
    }
    for (var d = 1; d <= days; d++) {
      if (d === today) {
        out +=
          '<span class="group flex h-8 w-8 items-center justify-center" aria-current="date"><span class="h-7 w-7 bg-green-s dark:bg-dark-green-s text-white flex items-center justify-center rounded-full">' +
          d +
          "</span></span>";
      } else {
        var done = !!(activeDays && activeDays[key(d)]);
        out +=
          '<span class="group relative flex h-8 w-8 items-center justify-center rounded-full"' +
          (done ? ' title="Practised this day"' : "") +
          ">" +
          d +
          (done ? '<span class="absolute h-1 w-1 rounded-full bottom-[3px] bg-red-s dark:bg-dark-red-s"></span>' : "") +
          "</span>";
      }
    }
    return out;
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
