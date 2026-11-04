// Dashboard behaviour: filtering, sorting, search, bookmarks, and the rail.
// All state is local. Nothing here talks to a server.

(function () {
  var D = window.GCData;
  var UI = window.GCUI;
  var params = new URLSearchParams(location.search);

  var state = {
    category: params.get("category") || "all",
    tag: params.get("tag") || "",
    status: params.get("status") || (params.get("view") === "bookmarks" ? "bookmarked" : "all"),
    sort: params.get("sort") || "number",
    search: params.get("q") || ""
  };

  var statusLabels = {
    all: "All statuses",
    solved: "Solved",
    attempted: "Attempted",
    todo: "Not started",
    bookmarked: "Bookmarked"
  };
  var sortLabels = {
    number: "Number",
    difficulty: "Difficulty",
    acceptance: "Acceptance",
    title: "Title"
  };
  var bannerTones = {
    recovery: "dark-blue",
    conflicts: "dark-green",
    rebase: "dark-orange",
    bisect: "dark-purple",
    "cherry-pick": "dark-red",
    history: "dark-gray"
  };

  var bookmarks = {};
  D.problems.forEach(function (p) {
    bookmarks[p.slug] = !!p.starred;
  });
  try {
    var saved = JSON.parse(localStorage.getItem("gc-bookmarks") || "null");
    if (saved && typeof saved === "object") {
      Object.keys(saved).forEach(function (k) {
        if (k in bookmarks) bookmarks[k] = !!saved[k];
      });
    }
  } catch (e) {}
  D.problems.forEach(function (p) {
    p.starred = !!bookmarks[p.slug];
  });

  function saveBookmarks() {
    try {
      localStorage.setItem("gc-bookmarks", JSON.stringify(bookmarks));
    } catch (e) {}
  }

  function count(predicate) {
    return D.problems.filter(predicate).length;
  }

  function categoryCount(id) {
    return id === "all" ? D.problems.length : count(function (p) { return p.category === id; });
  }

  function tagCount(tag) {
    return count(function (p) { return p.tags.indexOf(tag) !== -1; });
  }

  function filtered() {
    var q = state.search.trim().toLowerCase().replace(/^#/, "");
    var list = D.problems.filter(function (p) {
      if (state.category !== "all" && p.category !== state.category) return false;
      if (state.tag && p.tags.indexOf(state.tag) === -1) return false;
      if (state.status === "solved" && p.status !== "solved") return false;
      if (state.status === "attempted" && p.status !== "attempted") return false;
      if (state.status === "todo" && p.status) return false;
      if (state.status === "bookmarked" && !bookmarks[p.slug]) return false;
      if (q) {
        var hay = (p.n + " " + p.title + " " + p.slug + " " + p.tags.join(" ") + " #" + p.tags.join(" #")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var diffRank = { Easy: 0, Medium: 1, Hard: 2 };
    list.sort(function (a, b) {
      if (state.sort === "difficulty") {
        return diffRank[a.difficulty] - diffRank[b.difficulty] || a.n - b.n;
      }
      if (state.sort === "acceptance") {
        return b.acceptance - a.acceptance || a.n - b.n;
      }
      if (state.sort === "title") {
        return a.title.localeCompare(b.title);
      }
      return a.n - b.n;
    });
    return list;
  }

  /* -------------------------------------------------------------- navbar */

  UI.renderNav("dashboard");

  /* ------------------------------------------------------------- banners */

  function renderBanners() {
    var host = UI.$("#gc-tracks");
    if (!host) return;
    host.innerHTML = D.tracks
      .map(function (t) {
        var pct = Math.round((t.done / t.total) * 100);
        var tone = bannerTones[t.id] || "dark-gray";
        return (
          '<a class="gc-banner background_cover-background__OCnoq ' +
          tone +
          '" href="' +
          t.href +
          '">' +
          '<span class="gc-banner__icon">' +
          window.icon(t.icon) +
          "</span>" +
          '<span class="gc-banner__eyebrow">' +
          UI.esc(t.label) +
          "</span>" +
          '<span class="gc-banner__title">' +
          UI.esc(t.title) +
          "</span>" +
          '<span class="gc-banner__meta">' +
          UI.esc(t.meta) +
          '<span class="gc-banner__count">' +
          t.done +
          "/" +
          t.total +
          "</span></span>" +
          '<span class="gc-banner__bar"><i style="width:' +
          pct +
          '%"></i></span></a>'
        );
      })
      .join("");
  }

  /* ------------------------------------------------------------ keywords */

  function renderKeywords() {
    var host = UI.$("#gc-keywords");
    if (!host) return;
    var totals = {};
    D.problems.forEach(function (p) {
      p.tags.forEach(function (t) {
        totals[t] = (totals[t] || 0) + 1;
      });
    });
    var tags = Object.keys(totals).sort(function (a, b) {
      return totals[b] - totals[a] || a.localeCompare(b);
    });
    var visible = tags.slice(0, 9);
    var hidden = tags.slice(9);
    host.innerHTML =
      visible
        .map(function (t) {
          return (
            '<a class="gc-keyword" href="index.html?tag=' +
            encodeURIComponent(t) +
            '"><span>' +
            UI.esc(t) +
            '</span><span class="gc-keyword__count">' +
            totals[t] +
            "</span></a>"
          );
        })
        .join("") +
      (hidden.length
        ? '<button class="gc-keyword gc-keyword--expand" type="button" data-expand-tags>Expand' +
          window.icon("chevron-down") +
          "</button>" +
          hidden
            .map(function (t) {
              return (
                '<a class="gc-keyword is-extra" href="index.html?tag=' +
                encodeURIComponent(t) +
                '" hidden><span>' +
                UI.esc(t) +
                '</span><span class="gc-keyword__count">' +
                totals[t] +
                "</span></a>"
              );
            })
            .join("")
        : "");
  }

  /* --------------------------------------------------------------- pills */

  var pillIcons = {
    all: "objects-column",
    recovery: "clock-rotate-left",
    conflicts: "code-merge",
    rewrite: "code-branch",
    debugging: "diagram-project",
    history: "rotate-right",
    collaboration: "arrow-right-arrow-left",
    safety: "shield-halved"
  };
  var pillTones = {
    all: "",
    recovery: "text-brand-orange",
    conflicts: "text-blue",
    rewrite: "text-purple",
    debugging: "text-green-s",
    history: "text-teal",
    collaboration: "text-pink",
    safety: "text-yellow"
  };

  function renderPills() {
    var host = UI.$("#gc-pills");
    if (!host) return;
    host.innerHTML = D.categories
      .map(function (c) {
        var on = state.category === c.id;
        return (
          '<button class="gc-pillbtn" role="tab" aria-selected="' +
          on +
          '" data-category="' +
          c.id +
          '" title="' +
          categoryCount(c.id) +
          ' tasks">' +
          '<span class="gc-pill' +
          (on ? " is-active" : "") +
          '">' +
          '<span class="gc-pill__icon ' +
          (pillTones[c.id] || "") +
          '">' +
          window.icon(pillIcons[c.id] || c.icon) +
          "</span>" +
          UI.esc(c.label) +
          "</span></button>"
        );
      })
      .join("");
  }

  function syncPillsNav() {
    var host = UI.$("#gc-pills");
    var btn = UI.$("#gc-pills-nav");
    if (!host || !btn) return;
    var more = host.scrollWidth - host.clientWidth > 2;
    btn.hidden = !more || host.scrollLeft + host.clientWidth >= host.scrollWidth - 2;
  }

  function syncPills() {
    UI.$$("[data-category]", UI.$("#gc-pills")).forEach(function (btn) {
      var on = btn.getAttribute("data-category") === state.category;
      btn.setAttribute("aria-selected", String(on));
      var pill = UI.$(".gc-pill", btn);
      if (pill) pill.classList.toggle("is-active", on);
    });
  }

  /* --------------------------------------------------------------- rows */

  function row(p) {
    var starred = bookmarks[p.slug];
    var bars = "";
    for (var b = 0; b < 8; b++) bars += "<i></i>";
    var meter =
      '<span class="gc-row__meter" aria-hidden="true">' +
      bars +
      (p.premium ? '<span class="gc-row__lock">' + window.icon("lock-keyhole") + "</span>" : "") +
      "</span>";
    return (
      '<a class="gc-row" href="problem.html?p=' +
      encodeURIComponent(p.slug) +
      '" role="listitem" data-slug="' +
      p.slug +
      '">' +
      '<span class="gc-row__status">' +
      UI.statusGlyph(p.status, p.premium) +
      "</span>" +
      '<span class="gc-row__body">' +
      '<span class="gc-row__title">' +
      p.n +
      ". " +
      UI.esc(p.title) +
      "</span>" +
      '<span class="gc-row__accept">' +
      p.acceptance.toFixed(1) +
      "%</span>" +
      '<span class="gc-row__diff ' +
      UI.difficultyClass(p.difficulty) +
      '">' +
      p.difficulty +
      "</span>" +
      meter +
      "</span>" +
      '<span class="gc-row__star' +
      (starred ? " is-on" : "") +
      '" role="button" tabindex="0" data-star="' +
      p.slug +
      '" aria-label="' +
      (starred ? "Remove bookmark" : "Bookmark") +
      " " +
      UI.esc(p.title) +
      '" aria-pressed="' +
      starred +
      '">' +
      window.icon("star") +
      "</span></a>"
    );
  }

  function renderRows() {
    var list = filtered();
    var host = UI.$("#gc-list");
    var empty = UI.$("#gc-empty");
    if (!host) return;

    host.innerHTML = list.map(row).join("");
    empty.innerHTML = list.length
      ? ""
      : '<div class="gc-empty">' +
        window.icon("magnifying-glass") +
        '<div class="gc-empty__title">No tasks match</div>' +
        '<div class="gc-empty__text">Try a broader search, or clear the category and status filters.</div>' +
        '<button class="gc-btn gc-btn--outline" data-clear-filters>Clear filters</button></div>';

    renderProgress();
  }

  function renderProgress() {
    var solved = count(function (p) { return p.status === "solved"; });
    var host = UI.$("#gc-progress");
    if (host) {
      host.innerHTML =
        UI.progressRing(solved, D.problems.length, 18) +
        '<span class="gc-progress__text">' +
        solved +
        "/" +
        D.problems.length +
        " Solved</span>";
    }
  }

  /* -------------------------------------------------------------- aside */

  function renderAside() {
    var host = UI.$("#gc-aside");
    if (!host) return;
    var month = new Date().toLocaleString(undefined, { month: "long", year: "numeric" });
    var monthShort = new Date()
      .toLocaleString(undefined, { month: "short" })
      .toUpperCase();
    var day = new Date().getDate();
    var solved = count(function (p) { return p.status === "solved"; });

    host.innerHTML =
      '<section class="gc-calcard">' +
      '<div class="gc-calhead">' +
      '<div class="gc-calhead__left">' +
      '<span class="gc-calhead__day">Day ' +
      day +
      '</span><span class="gc-calhead__time">18:31:07 left</span>' +
      '<span class="gc-calhead__utc">UTC</span>' +
      "</div>" +
      '<div class="gc-calhead__right">' +
      '<button class="gc-calnav" type="button" aria-label="Previous month">' +
      window.icon("chevron-left") +
      "</button>" +
      '<span class="gc-monthchip"><b>' +
      monthShort +
      "</b><i>" +
      day +
      "</i></span>" +
      '<button class="gc-calnav" type="button" aria-label="Next month" disabled>' +
      window.icon("chevron-right") +
      "</button>" +
      "</div></div>" +
      '<div class="gc-calbody">' +
      UI.renderCalendar() +
      "</div>" +
      '<div class="gc-dailybanner style_bannerBg__0aztv">' +
      '<div class="gc-dailybanner__head"><span>Daily challenge</span><span class="gc-dailybanner__date">' +
      UI.esc(D.daily.date) +
      "</span></div>" +
      '<a class="gc-dailybanner__title" href="problem.html?p=' +
      D.daily.slug +
      '">' +
      D.daily.n +
      ". " +
      UI.esc(D.daily.title) +
      "</a>" +
      '<div class="gc-dailybanner__meta">' +
      UI.difficultyChip(D.daily.difficulty) +
      "<span>" +
      D.daily.acceptance.toFixed(1) +
      "% acceptance</span>" +
      '<a class="gc-dailybanner__go" href="problem.html?p=' +
      D.daily.slug +
      '">Start' +
      window.icon("arrow-up-right-from-square") +
      "</a></div></div>" +
      '<div class="gc-calcard__foot"><span>' +
      window.icon("fire") +
      " " +
      D.daily.day +
      "-day streak</span><span>3 days this week</span></div>" +
      "</section>" +

      '<section class="gc-trendcard">' +
      '<div class="gc-trendcard__head"><span>Trending commands</span>' +
      '<div class="gc-trendcard__nav">' +
      '<button class="gc-calnav" type="button" aria-label="Previous">' +
      window.icon("chevron-left") +
      "</button>" +
      '<button class="gc-calnav" type="button" aria-label="Next" disabled>' +
      window.icon("chevron-right") +
      "</button></div></div>" +
      '<div class="gc-railsearch">' +
      window.icon("magnifying-glass") +
      "<span>Search a command…</span></div>" +
      '<div class="gc-trend">' +
      D.trending
        .map(function (t, i) {
          var tag = t.label.replace(/^git /, "").split(" ")[0];
          return (
            '<a class="gc-trend__row" href="index.html?tag=' +
            encodeURIComponent(tag) +
            '"><span class="gc-trend__rank">' +
            (i + 1) +
            '</span><span class="gc-trend__name">' +
            UI.esc(t.label) +
            '</span><span class="gc-trend__val">' +
            UI.esc(t.value.replace(" attempts", "")) +
            "</span></a>"
          );
        })
        .join("") +
      "</div></section>" +

      '<footer class="gc-railfoot">' +
      '<div class="gc-railfoot__row"><a href="index.html?view=cli">Install CLI</a><span>|</span><a href="index.html?view=support">Support</a><span>|</span><a href="index.html?view=terms">Terms</a></div>' +
      '<div class="gc-railfoot__row"><a href="index.html?view=privacy">Privacy Policy</a><span>|</span><a href="index.html?view=more">More</a></div>' +
      '<div class="gc-railfoot__copy">Copyright © 2026 GitCode</div>' +
      "</footer>";
  }

  /* ------------------------------------------------------------- filters */

  function syncMenus() {
    UI.$$("[data-status]").forEach(function (btn) {
      btn.setAttribute("aria-checked", String(btn.getAttribute("data-status") === state.status));
    });
    UI.$$("[data-sort]").forEach(function (btn) {
      btn.setAttribute("aria-checked", String(btn.getAttribute("data-sort") === state.sort));
    });
    var si = UI.$("#gc-status-icon");
    if (si) si.innerHTML = window.icon("filter");
    var dot = UI.$("#gc-status-dot");
    if (dot) dot.hidden = false;
    var statusBtn = UI.$("#gc-status-button");
    if (statusBtn) statusBtn.setAttribute("title", "Filter: " + (statusLabels[state.status] || "All statuses"));
    var oi = UI.$("#gc-sort-icon");
    if (oi) oi.innerHTML = window.icon("arrow-down-arrow-up");
    var sortBtn = oi && oi.closest("button");
    if (sortBtn) sortBtn.setAttribute("title", "Sort: " + (sortLabels[state.sort] || "Number"));
  }

  function syncTagChip() {
    var host = UI.$("#gc-tag-filter");
    if (!host) return;
    host.hidden = !state.tag;
    host.innerHTML = state.tag
      ? '<span class="hash">#</span>' + UI.esc(state.tag) +
        '<button type="button" data-clear-tag aria-label="Remove tag filter">' +
        window.icon("xmark") + "</button>"
      : "";
  }

  function syncURL() {
    var url = new URL(location.href);
    var p = url.searchParams;
    if (state.category && state.category !== "all") p.set("category", state.category);
    else p.delete("category");
    if (state.tag) p.set("tag", state.tag);
    else p.delete("tag");
    if (state.status && state.status !== "all") p.set("status", state.status);
    else p.delete("status");
    if (state.sort && state.sort !== "number") p.set("sort", state.sort);
    else p.delete("sort");
    if (state.search) p.set("q", state.search);
    else p.delete("q");
    p.delete("page");
    p.delete("view");
    p.delete("premium");
    p.delete("streak");
    history.replaceState({}, "", url);
  }

  function apply() {
    syncPills();
    syncMenus();
    syncTagChip();
    renderRows();
    syncURL();
  }

  function clearFilters() {
    state.category = "all";
    state.tag = "";
    state.status = "all";
    state.search = "";
    UI.$$("[data-global-search]").forEach(function (input) { input.value = ""; });
    apply();
  }

  /* ------------------------------------------------------------- events */

  function bind() {
    function setSearch(value, source) {
      state.search = value;
      UI.$$("[data-global-search]").forEach(function (input) {
        if (input !== source) input.value = value;
      });
      apply();
    }

    UI.$$("[data-global-search]").forEach(function (input) {
      input.value = state.search;
      input.addEventListener("input", function () {
        setSearch(input.value, input);
      });
    });

    var pills = UI.$("#gc-pills");
    if (pills) {
      pills.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-category]");
        if (!btn) return;
        state.category = btn.getAttribute("data-category");
        state.tag = "";
        apply();
      });
    }

    var pillsNav = UI.$("#gc-pills-nav");
    if (pillsNav) {
      pillsNav.innerHTML = window.icon("angles-right");
      pillsNav.addEventListener("click", function () {
        var host = UI.$("#gc-pills");
        if (host) host.scrollBy({ left: 240, behavior: "smooth" });
      });
    }

    var pillRow = UI.$("#gc-pills");
    if (pillRow) {
      pillRow.addEventListener("scroll", syncPillsNav, { passive: true });
      window.addEventListener("resize", syncPillsNav);
    }

    var keywords = UI.$("#gc-keywords");
    if (keywords) {
      keywords.addEventListener("click", function (e) {
        var expand = e.target.closest("[data-expand-tags]");
        if (!expand) return;
        var extra = UI.$$(".gc-keyword.is-extra", keywords);
        var show = extra.length && extra[0].hidden;
        extra.forEach(function (el) { el.hidden = !show; });
        expand.innerHTML = show
          ? "Collapse" + window.icon("chevron-up")
          : "Expand" + window.icon("chevron-down");
      });
    }

    document.addEventListener("click", function (e) {
      var star = e.target.closest("[data-star]");
      if (star) {
        e.preventDefault();
        e.stopPropagation();
        var slug = star.getAttribute("data-star");
        bookmarks[slug] = !bookmarks[slug];
        var item = D.bySlug(slug);
        if (item) item.starred = bookmarks[slug];
        saveBookmarks();
        renderRows();
        syncMenus();
        UI.toast(bookmarks[slug] ? "Bookmarked " + item.title : "Bookmark removed", "star");
        return;
      }
      var status = e.target.closest("[data-status]");
      if (status) {
        state.status = status.getAttribute("data-status");
        apply();
        return;
      }
      var sort = e.target.closest("[data-sort]");
      if (sort) {
        state.sort = sort.getAttribute("data-sort");
        apply();
        return;
      }
      if (e.target.closest("[data-clear-tag]")) {
        state.tag = "";
        apply();
        return;
      }
      if (e.target.closest("[data-clear-filters]")) {
        clearFilters();
        return;
      }
    });

    document.addEventListener("keydown", function (e) {
      var star = e.target.closest && e.target.closest("[data-star]");
      if (star && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        star.click();
      }
    });

    var shuffle = UI.$("#gc-shuffle");
    if (shuffle) {
      shuffle.innerHTML = window.icon("shuffle");
      shuffle.addEventListener("click", function () {
        var list = filtered();
        if (!list.length) {
          UI.toast("No tasks match the current filters", "triangle-exclamation");
          return;
        }
        var pick = list[Math.floor(Math.random() * list.length)];
        location.href = "problem.html?p=" + encodeURIComponent(pick.slug);
      });
    }
  }

  /* --------------------------------------------------------------- boot */

  UI.ready(function () {
    renderBanners();
    renderKeywords();
    renderPills();
    renderAside();
    bind();
    apply();
    syncPillsNav();
    UI.initEdgeFades("#gc-tracks, #gc-keywords");
    UI.initTheme();
    UI.initMenus();
    UI.initGlobalKeys();
    UI.$$(".check").forEach(function (c) { c.innerHTML = window.icon("check"); });
    UI.$$(".gc-menu [role=menuitemradio]").forEach(function (item) {
      item.setAttribute("aria-checked", item.getAttribute("aria-checked") || "false");
    });

    if (params.get("view") && params.get("view") !== "bookmarks") {
      UI.toast("This view is a design preview. The dashboard is the live surface.", "circle-question");
    }
    if (params.get("premium")) {
      UI.toast("Premium is a visual state in this build.", "trophy");
    }
    if (params.get("streak")) {
      UI.toast("12-day streak — keep it going.", "fire");
    }
  });
})();
