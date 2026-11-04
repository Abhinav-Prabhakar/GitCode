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

  var Progress = window.GCProgress;
  if (Progress) Progress.apply(D.problems);

  function trackProblems(track) {
    var href = track.href || "";
    var category = /[?&]category=([^&]+)/.exec(href);
    var tag = /[?&]tag=([^&]+)/.exec(href);
    if (category) {
      return D.problems.filter(function (p) { return p.category === decodeURIComponent(category[1]); });
    }
    if (tag) {
      return D.problems.filter(function (p) { return p.tags.indexOf(decodeURIComponent(tag[1])) !== -1; });
    }
    return D.problems.slice();
  }

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
    var art = {
      recovery:
        '<svg viewBox="0 0 270 135" fill="none" class="absolute inset-0 h-full w-full" aria-hidden="true"><g opacity=".16" stroke="#fff" stroke-width="1"><path d="M150 20v95M120 20v95M180 20v95"/><circle cx="150" cy="67" r="6" fill="#fff"/><circle cx="120" cy="40" r="4" fill="#fff"/><circle cx="180" cy="95" r="4" fill="#fff"/></g></svg>',
      conflicts:
        '<svg viewBox="0 0 270 135" fill="none" class="absolute inset-0 h-full w-full" aria-hidden="true"><g opacity=".18" stroke="#fff" stroke-width="1.4"><path d="M168 22v92M168 56c0 22 42 15 42 40M168 56c0 22-42 15-42 40"/><circle cx="168" cy="22" r="5" fill="#fff"/><circle cx="210" cy="96" r="5" fill="#fff"/><circle cx="126" cy="96" r="5" fill="#fff"/></g></svg>',
      rebase:
        '<svg viewBox="0 0 270 135" fill="none" class="absolute inset-0 h-full w-full" aria-hidden="true"><g opacity=".18" stroke="#fff" stroke-width="1.4"><path d="M80 22v92M80 22h95a25 25 0 0125 25v67"/><circle cx="80" cy="22" r="5" fill="#fff"/><circle cx="200" cy="114" r="5" fill="#fff"/><circle cx="130" cy="22" r="4" fill="#fff"/></g></svg>',
      debugging:
        '<svg viewBox="0 0 270 135" fill="none" class="absolute inset-0 h-full w-full" aria-hidden="true"><g opacity=".2" stroke="#fff" stroke-width="1.2"><path d="M60 100h35l20-28 24 42 24-54 28 40h30"/></g></svg>'
    };
    var tones = {
      recovery: "gc-promo--cream",
      conflicts: "gc-promo--navy",
      rebase: "gc-promo--green",
      debugging: "gc-promo--violet"
    };
    host.innerHTML = D.tracks
      .map(function (t) {
        var problems = trackProblems(t);
        var total = problems.length || t.total;
        var done = problems.filter(function (p) { return p.status === "solved"; }).length;
        var pct = total ? Math.round((done / total) * 100) : 0;
        return (
          '<a href="' +
          t.href +
          '" class="gc-promo-link block flex-none">' +
          '<div class="gc-promo ' +
          (tones[t.id] || "gc-promo--navy") +
          ' h-[135px] w-[270px] overflow-hidden rounded-sd-md">' +
          (art[t.id] || art.debugging) +
          '<div class="relative z-base-1 flex h-full flex-col p-4">' +
          '<div class="gc-promo__eyebrow">' +
          UI.esc(t.label) +
          "</div>" +
          '<div class="gc-promo__title">' +
          UI.esc(t.title) +
          "</div>" +
          '<div class="mt-auto flex items-end justify-between text-[12px] leading-4">' +
          '<span class="gc-promo__meta">' +
          UI.esc(String(t.meta || "").replace(/^\d+ tasks?/, total + " tasks")) +
          "</span>" +
          '<span class="gc-promo__count">' +
          done +
          "/" +
          total +
          "</span></div>" +
          '<span class="gc-promo__bar"><i style="width:' +
          pct +
          '%"></i></span>' +
          "</div></div></a>"
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
    function keyword(t, extra) {
      return (
        '<div class="group m-[10px] flex items-center' +
        (extra ? " gc-keyword-extra" : "") +
        '"' +
        (extra ? " hidden" : "") +
        '><a class="inline-flex items-center" href="index.html?tag=' +
        encodeURIComponent(t) +
        '"><span class="whitespace-nowrap group-hover:text-blue dark:group-hover:text-dark-blue text-label-1 dark:text-dark-label-1">' +
        UI.esc(t) +
        '</span><span class="ml-1 flex h-[18px] items-center justify-center rounded-[10px] px-1.5 text-xs font-normal text-label-3 dark:text-dark-label-3 bg-fill-3 dark:bg-dark-fill-3 group-hover:text-blue dark:group-hover:text-dark-blue group-hover:bg-blue-0 dark:group-hover:bg-dark-blue-0">' +
        totals[t] +
        "</span></a></div>"
      );
    }
    host.innerHTML =
      visible.map(function (t) { return keyword(t, false); }).join("") +
      (hidden.length
        ? '<div class="group m-[10px] flex items-center"><button class="flex items-center whitespace-nowrap text-label-2 dark:text-dark-label-2 hover:text-label-1 dark:hover:text-dark-label-1" type="button" data-expand-tags>Expand' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" class="ml-1 h-3.5 w-3.5"><path fill-rule="evenodd" d="M4.929 7.913l7.078 7.057 7.064-7.057a1 1 0 111.414 1.414l-7.77 7.764a1 1 0 01-1.415 0L3.515 9.328a1 1 0 011.414-1.414z" clip-rule="evenodd"></path></svg></button></div>' +
          hidden.map(function (t) { return keyword(t, true); }).join("")
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
    var tones = {
      all: "",
      recovery: "text-brand-orange",
      conflicts: "text-sd-blue-500",
      rewrite: "text-sd-purple-500",
      debugging: "text-sd-green-500",
      history: "text-sd-teal-500",
      collaboration: "text-sd-pink-500",
      safety: "text-sd-yellow-500"
    };
    host.innerHTML = D.categories
      .map(function (c) {
        var on = state.category === c.id;
        var base = on
          ? "bg-gray-8 dark:bg-white text-label-r dark:text-dark-label-r shadow-level2 dark:shadow-dark-level2"
          : "bg-fill-3 dark:bg-dark-fill-3 text-label-2 dark:text-dark-label-2 hover:bg-fill-2 dark:hover:bg-dark-fill-2 hover:text-label-2 dark:hover:text-dark-label-2";
        return (
          '<button class="relative last:mr-12" role="tab" aria-selected="' +
          on +
          '" data-category="' +
          c.id +
          '" title="' +
          categoryCount(c.id) +
          ' tasks">' +
          '<div class="flex items-center space-x-2 whitespace-nowrap rounded-full px-4 py-[10px] text-base leading-tight ' +
          base +
          '">' +
          '<span class="gc-pillicon mr-2 hidden h-[18px] w-[18px] lg:flex ' +
          (on ? "text-label-r dark:text-dark-label-r" : tones[c.id] || "") +
          '">' +
          window.icon(pillIcons[c.id] || c.icon) +
          "</span>" +
          UI.esc(c.label) +
          "</div></button>"
        );
      })
      .join("");
  }

  function syncPillsNav() {
    var host = UI.$("#gc-pills");
    var wrap = UI.$("#gc-pills-nav-wrap");
    if (!host || !wrap) return;
    var more = host.scrollWidth - host.clientWidth > 2;
    wrap.style.display = more ? "" : "none";
  }

  function syncPills() {
    renderPills();
  }

  /* --------------------------------------------------------------- rows */

  function statusSlot(p, daily) {
    if (daily) {
      return (
        '<div class="relative text-[14px] leading-[normal] p-[1px] before:block before:h-3.5 before:w-3.5 text-sd-blue-500">' +
        window.icon("calendar") +
        "</div>"
      );
    }
    if (p.status === "solved") {
      return (
        '<div class="relative text-[14px] leading-[normal] p-[1px] text-sd-green-500" title="Solved">' +
        window.icon("circle-check") +
        "</div>"
      );
    }
    if (p.status === "attempted") {
      return '<div class="relative flex h-4 w-4 items-center justify-center text-sd-yellow-500" title="Attempted"><span class="block h-2.5 w-2.5 rounded-full border-[1.5px] border-current"></span></div>';
    }
    return '<div class="h-4 w-4"></div>';
  }

  function row(p, index, daily) {
    var starred = bookmarks[p.slug];
    var bars = "";
    for (var b = 0; b < 8; b++) {
      bars += '<div class="h-2 w-0.5 rounded bg-sd-foreground opacity-20"></div>';
    }
    var lock = p.premium
      ? '<div class="text-[12px] leading-[normal] p-[1px] before:block before:h-3 before:w-3 absolute -translate-x-1/2 text-sd-brand-lc-gray -top-[3px] left-1/2">' +
        window.icon("lock-keyhole") +
        "</div>"
      : "";
    var diffCls =
      p.difficulty === "Easy"
        ? "text-sd-easy"
        : p.difficulty === "Medium"
        ? "text-sd-medium"
        : "text-sd-hard";
    return (
      '<a class="group flex flex-col rounded-[8px] duration-300' +
      (index % 2 === 0 ? " bg-fill-quaternary dark:bg-fill-quaternary" : "") +
      '" href="problem.html?p=' +
      encodeURIComponent(p.slug) +
      '" role="listitem" data-slug="' +
      p.slug +
      '">' +
      '<div class="flex h-[44px] w-full items-center space-x-3 px-4">' +
      '<div><div>' +
      statusSlot(p, daily) +
      "</div></div>" +
      '<div class="relative flex h-full w-full cursor-pointer items-center">' +
      '<div class="flex w-0 flex-1 items-center space-x-2">' +
      '<div class="max-w-full text-body font-medium text-sd-foreground"><div class="ellipsis line-clamp-1">' +
      p.n +
      ". " +
      UI.esc(p.title) +
      "</div></div></div>" +
      '<div class="flex w-[70px] items-center justify-center text-sm text-sd-muted-foreground opacity-0 group-hover:opacity-100 lc-md:opacity-100">' +
      p.acceptance.toFixed(1) +
      "%</div>" +
      '<p class="mx-0 text-[14px] ' +
      diffCls +
      ' lc-xl:mx-4">' +
      p.difficulty +
      "</p></div>" +
      '<div><div class="relative flex gap-0.5 px-1 cursor-pointer">' +
      bars +
      lock +
      "</div></div>" +
      '<div class="flex items-center"><button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded hover:bg-sd-accent' +
      (starred ? " opacity-100 text-brand-orange" : " opacity-0 group-hover:opacity-100 text-sd-muted-foreground") +
      '" data-star="' +
      p.slug +
      '" type="button" aria-label="' +
      (starred ? "Remove bookmark" : "Bookmark") +
      " " +
      UI.esc(p.title) +
      '" aria-pressed="' +
      starred +
      '">' +
      window.icon("star") +
      "</button></div></div></a>"
    );
  }

  function renderRows() {
    var list = filtered();
    var host = UI.$("#gc-list");
    var empty = UI.$("#gc-empty");
    if (!host) return;

    host.innerHTML = list
      .map(function (p, i) {
        return row(p, i, p.slug === D.daily.slug);
      })
      .join("");
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
        '<div class="flex items-center gap-1"><div class="relative flex h-4.5 w-4.5 items-center justify-center">' +
        UI.progressRing(solved, D.problems.length, 18) +
        '</div><div class="text-sd-muted-foreground">' +
        solved +
        "/" +
        D.problems.length +
        " Solved</div></div>";
    }
  }

  /* -------------------------------------------------------------- aside */

  function renderAside() {
    var host = UI.$("#gc-aside");
    if (!host) return;
    var monthShort = new Date().toLocaleString(undefined, { month: "short" }).toUpperCase();
    var day = new Date().getDate();
    var activity = Progress && Progress.activity ? Progress.activity() : { streak: 0, daysThisWeek: 0, activeDays: {} };
    var remaining = 18 + ":" + String(31 - (new Date().getMinutes() % 30)).padStart(2, "0") + ":07";

    host.innerHTML =
      '<div class="pt-0.5 md:top-3">' +
      '<div class="bg-layer-1 dark:bg-dark-layer-1 shadow-down-01 dark:shadow-dark-down-01 rounded-lg relative flex flex-col py-2 pb-[2px]">' +
      '<div class="flex h-9 items-center py-[6px] pl-[15px] justify-between pr-3">' +
      '<div class="flex shrink-0 items-center">' +
      '<div class="text-sm lg:block text-label-2 dark:text-dark-label-2">Day ' + day + "</div>" +
      '<div class="ml-[4px] text-[10px] tracking-tighter text-label-4 dark:text-dark-label-4">' + remaining + " left</div>" +
      '<div class="inline-flex items-center rounded-sd-md border-transparent h-[18px] border-0 bg-sd-accent px-1.5 py-0 text-[11px] font-medium leading-4 tracking-[0.2px] text-sd-muted-foreground ml-1">UTC</div>' +
      "</div>" +
      '<div class="flex max-w-[100px] items-center md:ml-[8px]">' +
      '<button class="focus:outline-none text-label-2 dark:text-dark-label-2" aria-label="Prev">' +
      window.icon("chevron-left") +
      "</button>" +
      '<span class="gc-monthbadge mx-1"><b>' + monthShort + "</b><i>" + day + "</i></span>" +
      '<button class="focus:outline-none text-label-4 dark:text-dark-label-4" aria-label="Next" disabled>' +
      window.icon("chevron-right") +
      "</button>" +
      "</div></div>" +
      '<div class="mx-[10px] grid grid-cols-7 text-xs text-label-3 dark:text-dark-label-3">' +
      UI.renderCalendar(activity.activeDays) +
      "</div>" +
      '<div class="mx-[10px] mb-2 mt-3 overflow-hidden rounded-md gc-daily">' +
      '<div class="flex items-center justify-between px-3 pt-2 text-xs">' +
      '<span class="font-medium text-brand-orange">Daily challenge</span>' +
      '<span class="text-label-3 dark:text-dark-label-3">' + UI.esc(D.daily.date) + "</span></div>" +
      '<a class="block px-3 pt-1 text-[14px] font-medium text-label-1 dark:text-dark-label-1 hover:underline" href="problem.html?p=' + D.daily.slug + '">' +
      D.daily.n + ". " + UI.esc(D.daily.title) + "</a>" +
      '<div class="flex items-center gap-2 px-3 pb-2 pt-1.5 text-xs text-label-3 dark:text-dark-label-3">' +
      '<span class="text-sd-easy">' + D.daily.difficulty + "</span>" +
      '<span class="text-label-4 dark:text-dark-label-4">·</span>' +
      "<span>" + D.daily.acceptance.toFixed(1) + "% acceptance</span>" +
      '<a class="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-brand-orange hover:underline" href="problem.html?p=' + D.daily.slug + '">Start' +
      window.icon("arrow-up-right-from-square") + "</a></div></div>" +
      '<div class="mx-4 flex items-center justify-between border-t border-sd-border py-2 text-xs text-label-3 dark:text-dark-label-3">' +
      '<span class="flex items-center gap-1"><span class="text-brand-orange">' + window.icon("fire") + "</span>" + (activity.streak ? activity.streak + "-day streak" : "No streak yet") + "</span>" +
      "<span>" + (activity.daysThisWeek ? activity.daysThisWeek + (activity.daysThisWeek === 1 ? " day" : " days") + " this week" : "No activity this week") + "</span></div>" +
      "</div></div>" +

      '<div class="mt-4 pt-0.5 md:top-3">' +
      '<div class="bg-layer-1 dark:bg-dark-layer-1 shadow-down-01 dark:shadow-dark-down-01 rounded-lg px-4 pb-1 pt-2">' +
      '<div class="flex h-[36px] items-center justify-between">' +
      '<div class="text-sm font-medium text-label-2 dark:text-dark-label-2">Trending commands</div>' +
      '<div class="flex items-center gap-1 text-label-2 dark:text-dark-label-2">' +
      '<button class="focus:outline-none hover:text-label-1" aria-label="Previous">' + window.icon("chevron-left") + "</button>" +
      '<button class="focus:outline-none text-label-4" aria-label="Next" disabled>' + window.icon("chevron-right") + "</button>" +
      "</div></div>" +
      '<div class="relative mb-2">' +
      '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-3 dark:text-dark-label-3">' + window.icon("magnifying-glass") + "</span>" +
      '<input class="h-8 w-full rounded-lg border-none bg-fill-3 dark:bg-dark-fill-3 pl-9 pr-3 text-sm text-label-1 dark:text-dark-label-1 placeholder:text-label-3 dark:placeholder:text-dark-label-3 outline-none" placeholder="Search a command..." aria-label="Search a command">' +
      "</div>" +
      D.trending
        .map(function (t, i) {
          var tag = t.label.replace(/^git /, "").split(" ")[0];
          return (
            '<a class="flex items-center gap-3 rounded px-1 py-[7px] text-sm text-label-1 dark:text-dark-label-1 hover:bg-fill-3 dark:hover:bg-dark-fill-3" href="index.html?tag=' +
            encodeURIComponent(tag) +
            '"><span class="w-3 shrink-0 text-right text-xs text-label-3 dark:text-dark-label-3">' +
            (i + 1) +
            '</span><span class="truncate font-menlo text-[13px]">' +
            UI.esc(t.label) +
            '</span><span class="ml-auto shrink-0 text-xs text-label-3 dark:text-dark-label-3">' +
            UI.esc(t.value.replace(" attempts", "")) +
            "</span></a>"
          );
        })
        .join("") +
      "</div></div>" +

      '<div class="mt-4 flex flex-col gap-1 px-1 text-xs text-label-3 dark:text-dark-label-3">' +
      '<div class="flex flex-wrap items-center gap-x-2 gap-y-1">' +
      '<a class="hover:text-label-1 dark:hover:text-dark-label-1" href="index.html?view=cli">Download App</a><span>|</span>' +
      '<a class="hover:text-label-1 dark:hover:text-dark-label-1" href="index.html?view=support">Support</a><span>|</span>' +
      '<a class="hover:text-label-1 dark:hover:text-dark-label-1" href="index.html?view=terms">Terms</a></div>' +
      '<div class="flex flex-wrap items-center gap-x-2 gap-y-1">' +
      '<a class="hover:text-label-1 dark:hover:text-dark-label-1" href="index.html?view=privacy">Privacy Policy</a><span>|</span>' +
      '<a class="hover:text-label-1 dark:hover:text-dark-label-1" href="index.html?view=more">More</a></div>' +
      '<div class="mt-1">Copyright © 2026 GitCode</div>' +
      '<div class="mt-1 flex items-center gap-1"><span class="gc-flag"></span>India</div>' +
      "</div>";
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
    if (window.gcSyncRail) window.gcSyncRail();
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
        var extra = UI.$$(".gc-keyword-extra", keywords);
        var show = extra.length && extra[0].hidden;
        extra.forEach(function (el) { el.hidden = !show; });
        expand.innerHTML = show
          ? 'Collapse<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" class="ml-1 h-3.5 w-3.5"><path fill-rule="evenodd" d="M4.929 7.913l7.078 7.057 7.064-7.057a1 1 0 111.414 1.414l-7.77 7.764a1 1 0 01-1.415 0L3.515 9.328a1 1 0 011.414-1.414z" clip-rule="evenodd"></path></svg>'
          : 'Expand<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" class="ml-1 h-3.5 w-3.5"><path fill-rule="evenodd" d="M4.929 7.913l7.078 7.057 7.064-7.057a1 1 0 111.414 1.414l-7.77 7.764a1 1 0 01-1.415 0L3.515 9.328a1 1 0 011.414-1.414z" clip-rule="evenodd"></path></svg>';
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

  /* --------------------------------------------------------- left rail */

  function renderRail() {
    var host = UI.$("#sidebarWidthContainer");
    var toggle = UI.$("#gc-rail-toggle");
    if (!host || !toggle) return;

    UI.$$("[data-rail-icon]", toggle).forEach(function (n) {
      n.innerHTML = window.icon(n.getAttribute("data-rail-icon"));
    });

    var solved = D.problems.filter(function (p) { return p.status === "solved"; }).length;
    var pct = Math.round((solved / D.problems.length) * 100);

    host.innerHTML =
      '<div class="gc-rail__group">' +
      '<a class="gc-rail__row" href="index.html"><span class="gc-rail__icon">' + window.icon("books") + "</span>Problem list</a>" +
      '<a class="gc-rail__row" href="problem.html?p=' + encodeURIComponent(D.daily.slug) + '"><span class="gc-rail__icon">' + window.icon("calendar") + "</span>Daily challenge</a>" +
      "</div>" +
      '<div class="gc-rail__group"><div class="gc-rail__label">Topics</div>' +
      D.categories
        .map(function (c) {
          return (
            '<button type="button" class="gc-rail__row" data-rail-category="' + c.id + '">' +
            '<span class="gc-rail__icon">' + window.icon(c.icon) + "</span>" + UI.esc(c.label) +
            '<span class="gc-rail__count">' + categoryCount(c.id) + "</span></button>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="gc-rail__foot">' +
      '<div class="text-sm font-medium">' + solved + " / " + D.problems.length + " solved</div>" +
      '<div class="gc-rail__bar"><span style="width:' + pct + '%"></span></div>' +
      "</div>";

    var open = false;
    var panel = UI.$("#nav-panel-scroll");
    function setOpen(next) {
      open = next;
      panel.classList.toggle("gc-rail-open", open);
      host.classList.toggle("gc-rail-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    }
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!open);
    });
    host.addEventListener("click", function (e) {
      var row = e.target.closest("[data-rail-category]");
      if (!row) {
        if (e.target.closest("a")) setOpen(false);
        return;
      }
      state.category = row.getAttribute("data-rail-category");
      state.tag = "";
      apply();
      syncRailSelection();
      setOpen(false);
    });
    function syncRailSelection() {
      UI.$$("[data-rail-category]", host).forEach(function (n) {
        n.classList.toggle("is-on", n.getAttribute("data-rail-category") === state.category);
      });
    }
    syncRailSelection();
    document.addEventListener("click", function (e) {
      if (!open) return;
      if (e.target.closest("#nav-panel-scroll") || e.target.closest("#gc-rail-toggle")) return;
      setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (open && e.key === "Escape") setOpen(false);
    });
    window.gcSyncRail = syncRailSelection;
  }

  /* --------------------------------------------------------------- boot */

  UI.ready(function () {
    renderBanners();
    renderKeywords();
    renderPills();
    renderAside();
    renderRail();
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
      UI.toast("No streak yet — solve a task to start one.", "fire");
    }
  });
})();
