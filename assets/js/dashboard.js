// Dashboard behaviour: filtering, sorting, pagination, and the right rail.
// All state is local. Nothing here talks to a server.

(function () {
  var D = window.GCData;
  var UI = window.GCUI;
  var PAGE_SIZE = 15;
  var params = new URLSearchParams(location.search);

  var state = {
    category: params.get("category") || "all",
    tag: params.get("tag") || "",
    status: params.get("status") || (params.get("view") === "bookmarks" ? "bookmarked" : "all"),
    sort: params.get("sort") || "number",
    search: params.get("q") || "",
    page: Math.max(1, parseInt(params.get("page"), 10) || 1)
  };

  var statusLabels = {
    all: "All statuses",
    solved: "Solved",
    attempted: "Attempted",
    todo: "Not started",
    bookmarked: "Bookmarked"
  };
  var statusIcons = {
    all: "objects-column",
    solved: "square-check",
    attempted: "clock-rotate-left",
    todo: "circle-check",
    bookmarked: "star"
  };
  var sortLabels = {
    number: "Number",
    difficulty: "Difficulty",
    acceptance: "Acceptance",
    title: "Title"
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

  /* ---------------------------------------------------------------- rail */

  function renderRail() {
    var host = UI.$("#gc-rail");
    if (!host) return;
    var solved = count(function (p) { return p.status === "solved"; });
    var attempted = count(function (p) { return p.status === "attempted"; });
    var starred = count(function (p) { return bookmarks[p.slug]; });

    var cats = D.categories
      .filter(function (c) { return c.id !== "all"; })
      .map(function (c) {
        var color = {
          recovery: "#4c9aff",
          conflicts: "#46c6c2",
          rewrite: "#fac31d",
          debugging: "#a78bfa",
          history: "#ffa116",
          collaboration: "#f8615c",
          safety: "#e879f9"
        }[c.id];
        return (
          '<a class="gc-rail__item gc-rail__item--sub" href="index.html?category=' +
          c.id +
          '" data-rail-category="' +
          c.id +
          '"><span class="gc-rail__dot" style="background:' +
          color +
          '"></span>' +
          c.label +
          '<span class="gc-rail__count">' +
          categoryCount(c.id) +
          "</span></a>"
        );
      })
      .join("");

    host.innerHTML =
      '<div class="gc-rail__group">' +
      '<a class="gc-rail__item is-active" href="index.html">' +
      window.icon("objects-column") +
      "Practice</a>" +
      '<a class="gc-rail__item" href="index.html#tracks">' +
      window.icon("code-branch") +
      "Tracks</a>" +
      '<a class="gc-rail__item" href="index.html?view=playground">' +
      window.icon("terminal") +
      "Playground</a>" +
      '<a class="gc-rail__item gc-rail__item--brand" href="index.html?premium=1">' +
      window.icon("trophy") +
      "Premium" +
      '<span class="gc-rail__count">new</span></a>' +
      "</div>" +
      '<div class="gc-rail__rule"></div>' +
      '<div class="gc-rail__group">' +
      '<div class="gc-rail__label">My lists</div>' +
      '<a class="gc-rail__item gc-rail__item--sub" href="index.html?status=solved" data-rail-status="solved"><span class="gc-rail__dot" style="background:#46c6c2"></span>Solved<span class="gc-rail__count">' +
      solved +
      "</span></a>" +
      '<a class="gc-rail__item gc-rail__item--sub" href="index.html?status=attempted" data-rail-status="attempted"><span class="gc-rail__dot" style="background:#fac31d"></span>Attempted<span class="gc-rail__count">' +
      attempted +
      "</span></a>" +
      '<a class="gc-rail__item gc-rail__item--sub" href="index.html?status=bookmarked" data-rail-status="bookmarked"><span class="gc-rail__dot" style="background:#ffa116"></span>Bookmarked<span class="gc-rail__count">' +
      starred +
      "</span></a>" +
      "</div>" +
      '<div class="gc-rail__rule"></div>' +
      '<div class="gc-rail__group"><div class="gc-rail__label">Categories</div>' +
      cats +
      "</div>" +
      '<div class="gc-rail__rule"></div>' +
      '<div class="gc-rail__group">' +
      '<div class="gc-rail__label">Daily</div>' +
      '<a class="gc-rail__item gc-rail__item--sub" href="problem.html?p=' +
      D.daily.slug +
      '"><span class="gc-rail__dot" style="background:#ffa116"></span>Today\'s task<span class="gc-rail__count">18h</span></a>' +
      "</div>";
  }

  /* --------------------------------------------------------------- tracks */

  function renderTracks() {
    var host = UI.$("#gc-tracks");
    if (!host) return;
    host.innerHTML = D.tracks
      .map(function (t) {
        var pct = Math.round((t.done / t.total) * 100);
        return (
          '<a class="gc-track" href="' +
          t.href +
          '" style="--track-color:' +
          t.color +
          ";--track-tint:" +
          t.tint +
          '">' +
          '<div class="gc-track__top"><span class="gc-track__icon">' +
          window.icon(t.icon) +
          "</span>" +
          t.label +
          '<span style="margin-left:auto;font-weight:500;color:hsl(var(--sd-muted-foreground))">' +
          t.done +
          "/" +
          t.total +
          "</span></div>" +
          '<div><div class="gc-track__title">' +
          t.title +
          '</div><div class="gc-track__meta">' +
          t.meta +
          "</div>" +
          '<div class="gc-track__bar"><i style="width:' +
          pct +
          '%"></i></div></div></a>'
        );
      })
      .join("");
  }

  function scrollTracks(dir) {
    var strip = UI.$("#gc-tracks");
    if (strip) strip.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  /* ---------------------------------------------------------------- pills */

  function renderPills() {
    var host = UI.$("#gc-pills");
    if (!host) return;
    host.innerHTML = D.categories
      .map(function (c) {
        var on = state.category === c.id;
        return (
          '<button class="gc-pill" role="tab" aria-selected="' +
          on +
          '" data-category="' +
          c.id +
          '">' +
          window.icon(c.icon) +
          c.label +
          '<span class="gc-pill__count">' +
          categoryCount(c.id) +
          "</span></button>"
        );
      })
      .join("");
  }

  function syncPills() {
    UI.$$("[data-category]", UI.$("#gc-pills")).forEach(function (btn) {
      btn.setAttribute("aria-selected", String(btn.getAttribute("data-category") === state.category));
    });
  }

  /* --------------------------------------------------------------- rows */

  function row(p) {
    var premium = p.premium
      ? '<span class="gc-row__lock" title="Premium task">' + window.icon("lock-keyhole") + "</span>"
      : '<span class="gc-row__lock"></span>';
    var starred = bookmarks[p.slug];
    return (
      '<a class="gc-row" href="problem.html?p=' +
      encodeURIComponent(p.slug) +
      '" role="listitem" data-slug="' +
      p.slug +
      '">' +
      UI.statusGlyph(p.status, p.premium) +
      '<span class="gc-row__num">' +
      p.n +
      ".</span>" +
      '<span class="gc-row__main"><span class="gc-row__title">' +
      UI.esc(p.title) +
      '</span><span class="gc-row__tag">#' +
      UI.esc(p.tags[0]) +
      "</span></span>" +
      '<span class="gc-row__accept">' +
      p.acceptance.toFixed(1) +
      "%</span>" +
      '<span class="gc-row__diff ' +
      UI.difficultyClass(p.difficulty) +
      '">' +
      p.difficulty +
      "</span>" +
      premium +
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
    var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    var start = (state.page - 1) * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);
    var host = UI.$("#gc-list");
    var empty = UI.$("#gc-empty");

    host.innerHTML = slice.map(row).join("");
    empty.innerHTML = list.length
      ? ""
      : '<div class="gc-empty">' +
        window.icon("magnifying-glass") +
        '<div class="gc-empty__title">No tasks match</div>' +
        '<div class="gc-empty__text">Try a broader search, or clear the category and status filters.</div>' +
        '<button class="gc-btn gc-btn--outline" data-clear-filters>Clear filters</button></div>';

    renderPagination(pages, list.length);
    renderProgress(list.length);
  }

  function renderPagination(pages, total) {
    var host = UI.$("#gc-pagination");
    if (!host) return;
    if (!total) {
      host.innerHTML = "";
      return;
    }
    var page = state.page;
    var buttons = [];
    buttons.push(
      '<button class="gc-page" data-page="' +
        (page - 1) +
        '" aria-label="Previous page"' +
        (page === 1 ? " disabled" : "") +
        ">" +
        window.icon("chevron-left") +
        "</button>"
    );

    var numbers = [];
    for (var i = 1; i <= pages; i++) {
      if (pages <= 7 || i === 1 || i === pages || Math.abs(i - page) <= 1) numbers.push(i);
      else if (numbers[numbers.length - 1] !== "…") numbers.push("…");
    }
    numbers.forEach(function (n) {
      if (n === "…") {
        buttons.push('<span class="gc-page" aria-hidden="true">…</span>');
      } else {
        buttons.push(
          '<button class="gc-page" data-page="' +
            n +
            '"' +
            (n === page ? ' aria-current="page"' : "") +
            ">" +
            n +
            "</button>"
        );
      }
    });

    buttons.push(
      '<button class="gc-page" data-page="' +
        (page + 1) +
        '" aria-label="Next page"' +
        (page === pages ? " disabled" : "") +
        ">" +
        window.icon("chevron-right") +
        "</button>"
    );
    host.innerHTML = buttons.join("");
  }

  function renderProgress(visible) {
    var solved = count(function (p) { return p.status === "solved"; });
    var host = UI.$("#gc-progress");
    if (host) {
      host.innerHTML =
        UI.progressRing(solved, D.problems.length, 18) +
        "<span><strong style=\"font-weight:600;color:hsl(var(--sd-foreground))\">" +
        solved +
        "</strong> / " +
        D.problems.length +
        " solved</span>";
    }
    var label = UI.$("#gc-result-count");
    if (label) label.textContent = visible + " tasks";
  }

  /* -------------------------------------------------------------- aside */

  function renderAside() {
    var host = UI.$("#gc-aside");
    if (!host) return;
    var solved = count(function (p) { return p.status === "solved"; });
    var attempted = count(function (p) { return p.status === "attempted"; });
    var pct = Math.round((solved / D.problems.length) * 100);
    var month = new Date().toLocaleString(undefined, { month: "long", year: "numeric" });

    host.innerHTML =
      '<section class="gc-card">' +
      '<div class="gc-card__head"><span class="gc-card__title">Daily challenge</span>' +
      '<span class="gc-daily__date">' +
      window.icon("calendar") +
      D.daily.date +
      "</span></div>" +
      '<div class="gc-card__body gc-daily">' +
      '<a class="gc-daily__title" href="problem.html?p=' +
      D.daily.slug +
      '">' +
      D.daily.n +
      ". " +
      UI.esc(D.daily.title) +
      "</a>" +
      '<div class="gc-daily__meta">' +
      UI.difficultyChip(D.daily.difficulty) +
      "<span>" +
      D.daily.acceptance.toFixed(1) +
      "% acceptance</span></div>" +
      '<a class="gc-btn gc-btn--brand gc-btn--block" href="problem.html?p=' +
      D.daily.slug +
      '">Start today\'s task</a>' +
      "</div>" +
      '<div class="gc-card__foot"><span>' +
      window.icon("fire") +
      " " +
      D.daily.day +
      "-day streak</span><span>Ends in 18h</span></div>" +
      "</section>" +

      '<section class="gc-card" id="progress">' +
      '<div class="gc-card__head"><span class="gc-card__title">Your progress</span>' +
      '<a class="gc-progress" href="index.html?status=solved">View all</a></div>' +
      '<div class="gc-card__body">' +
      '<div class="gc-stat"><span class="gc-stat__value">' +
      solved +
      '</span><span class="gc-stat__label">of ' +
      D.problems.length +
      " solved</span></div>" +
      '<div class="gc-track__bar" style="margin:10px 0 12px"><i style="width:' +
      pct +
      '%;background:hsl(var(--sd-success))"></i></div>' +
      '<div class="gc-daily__meta" style="justify-content:space-between">' +
      '<span><span class="gc-dot" style="display:inline-block;background:#46c6c2"></span> ' +
      solved +
      " solved</span>" +
      '<span><span class="gc-dot" style="display:inline-block;background:#fac31d"></span> ' +
      attempted +
      " attempted</span>" +
      '<span><span class="gc-dot" style="display:inline-block;background:hsl(var(--sd-muted-foreground)/.4)"></span> ' +
      (D.problems.length - solved - attempted) +
      " left</span></div>" +
      "</div>" +
      '<div class="gc-card__foot"><span>' +
      window.icon("stopwatch") +
      " 187 submissions</span><span>" +
      D.stats.acceptance +
      "% accepted</span></div>" +
      "</section>" +

      '<section class="gc-card">' +
      '<div class="gc-card__head"><span class="gc-card__title">' +
      month +
      '</span><span class="gc-daily__date">' +
      window.icon("fire") +
      "12</span></div>" +
      '<div class="gc-card__body">' +
      UI.renderCalendar() +
      "</div>" +
      '<div class="gc-card__foot"><span>3 days this week</span><span>Keep the streak</span></div>' +
      "</section>" +

      '<section class="gc-card">' +
      '<div class="gc-card__head"><span class="gc-card__title">Trending commands</span>' +
      '<span class="gc-daily__date">This week</span></div>' +
      '<div class="gc-card__body gc-trend">' +
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
            UI.esc(t.value) +
            "</span></a>"
          );
        })
        .join("") +
      "</div></section>";
  }

  /* ------------------------------------------------------------- filters */

  function syncMenus() {
    UI.$$("[data-status]").forEach(function (btn) {
      btn.setAttribute("aria-checked", String(btn.getAttribute("data-status") === state.status));
    });
    UI.$$("[data-sort]").forEach(function (btn) {
      btn.setAttribute("aria-checked", String(btn.getAttribute("data-sort") === state.sort));
    });
    var sl = UI.$("#gc-status-label");
    if (sl) sl.textContent = statusLabels[state.status] || "All statuses";
    var si = UI.$("#gc-status-icon");
    if (si) si.innerHTML = window.icon(statusIcons[state.status] || "objects-column");
    var ol = UI.$("#gc-sort-label");
    if (ol) ol.textContent = sortLabels[state.sort] || "Number";
    var oi = UI.$("#gc-sort-icon");
    if (oi) oi.innerHTML = window.icon("arrow-down-arrow-up");
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
    if (state.page > 1) p.set("page", state.page);
    else p.delete("page");
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
    state.page = 1;
    UI.$$("[data-global-search]").forEach(function (input) { input.value = ""; });
    apply();
  }

  /* ------------------------------------------------------------- events */

  function bind() {
    function setSearch(value, source) {
      state.search = value;
      state.page = 1;
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
        state.page = 1;
        apply();
        var railActive = UI.$('.gc-rail [data-rail-category][href*="' + state.category + '"]');
        UI.$$(".gc-rail__item").forEach(function (i) { i.classList.remove("is-active"); });
        if (railActive) railActive.classList.add("is-active");
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
        renderRail();
        renderRows();
        syncMenus();
        UI.toast(bookmarks[slug] ? "Bookmarked " + item.title : "Bookmark removed", "star");
        return;
      }
      var status = e.target.closest("[data-status]");
      if (status) {
        state.status = status.getAttribute("data-status");
        state.page = 1;
        apply();
        return;
      }
      var sort = e.target.closest("[data-sort]");
      if (sort) {
        state.sort = sort.getAttribute("data-sort");
        state.page = 1;
        apply();
        return;
      }
      var page = e.target.closest(".gc-page[data-page]");
      if (page && !page.disabled) {
        state.page = parseInt(page.getAttribute("data-page"), 10);
        renderRows();
        syncURL();
        UI.$("#gc-list").scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
      if (e.target.closest("[data-clear-tag]")) {
        state.tag = "";
        state.page = 1;
        apply();
        return;
      }
      if (e.target.closest("[data-clear-filters]")) {
        clearFilters();
        return;
      }
      var railCat = e.target.closest("[data-rail-category]");
      if (railCat) {
        e.preventDefault();
        state.category = railCat.getAttribute("data-rail-category");
        state.tag = "";
        state.page = 1;
        apply();
        UI.$$(".gc-rail__item").forEach(function (i) { i.classList.remove("is-active"); });
        railCat.classList.add("is-active");
        UI.$("#gc-list").scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
      var railStatus = e.target.closest("[data-rail-status]");
      if (railStatus) {
        e.preventDefault();
        state.status = railStatus.getAttribute("data-rail-status");
        state.page = 1;
        apply();
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

    var prev = UI.$("#gc-track-prev");
    var next = UI.$("#gc-track-next");
    if (prev) { prev.innerHTML = window.icon("chevron-left"); prev.addEventListener("click", function () { scrollTracks(-1); }); }
    if (next) { next.innerHTML = window.icon("chevron-right"); next.addEventListener("click", function () { scrollTracks(1); }); }

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

    var more = UI.$("#gc-more");
    if (more) more.innerHTML = window.icon("ellipsis");

    var progress = UI.$("#gc-progress");
    if (progress) {
      progress.addEventListener("click", function (e) {
        e.preventDefault();
        var card = UI.$("#progress");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    var railToggle = UI.$("[data-rail-toggle]");
    if (railToggle) {
      railToggle.addEventListener("click", function () {
        var rail = UI.$("#gc-rail");
        if (rail) rail.classList.toggle("is-open");
      });
    }

    document.addEventListener("click", function (e) {
      var rail = UI.$("#gc-rail");
      if (!rail || !rail.classList.contains("is-open")) return;
      if (!rail.contains(e.target) && !e.target.closest("[data-rail-toggle]")) {
        rail.classList.remove("is-open");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var rail = UI.$("#gc-rail");
      if (rail) rail.classList.remove("is-open");
    });
  }

  /* --------------------------------------------------------------- boot */

  UI.ready(function () {
    renderRail();
    renderTracks();
    renderPills();
    renderAside();
    bind();
    apply();
    UI.initEdgeFades("#gc-tracks, #gc-pills");
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
