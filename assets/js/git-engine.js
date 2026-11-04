// A small, deterministic Git simulator used by the GitCode labs.
// It is intentionally self-contained: no network, no real filesystem.
// Every command returns display lines so the terminal pane can render it.

(function (root) {
  "use strict";

  var AUTHOR = { name: "Ada Lovelace", email: "ada@example.com" };
  var AUTHOR_RE = /^(.+?)\s*<(.+?)>$/;

  function clone(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (key) {
      out[key] = obj[key];
    });
    return out;
  }

  function copyFiles(files) {
    var out = {};
    Object.keys(files || {}).forEach(function (key) {
      if (files[key] != null) out[key] = String(files[key]);
    });
    return out;
  }

  function clip(value, max) {
    value = String(value == null ? "" : value);
    return value.length > max ? value.slice(0, max - 1) + "\u2026" : value;
  }

  function firstLine(value) {
    return String(value == null ? "" : value).split("\n")[0];
  }

  function q(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
  }

  function normalizePath(path) {
    return String(path || "")
      .replace(/^\.\//, "")
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
  }

  function inDir(path, dir) {
    return path === dir || path.indexOf(dir + "/") === 0;
  }

  function pathMatches(path, matcher) {
    matcher = normalizePath(matcher);
    if (!matcher || matcher === ".") return true;
    if (/[*?]/.test(matcher)) {
      var re = new RegExp(
        "^" +
          matcher
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".") +
          "$"
      );
      return re.test(path);
    }
    return inDir(path, matcher);
  }

  function treeFrom(files) {
    var out = {};
    Object.keys(files || {}).forEach(function (key) {
      if (files[key] != null) out[key] = String(files[key]);
    });
    return out;
  }

  function treesEqual(a, b) {
    var ak = Object.keys(a || {}).sort();
    var bk = Object.keys(b || {}).sort();
    if (ak.length !== bk.length) return false;
    for (var i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i] || a[ak[i]] !== b[bk[i]]) return false;
    }
    return true;
  }

  function lineDiff(before, after) {
    var a = before == null ? [] : String(before).replace(/\n$/, "").split("\n");
    var b = after == null ? [] : String(after).replace(/\n$/, "").split("\n");
    var n = a.length;
    var m = b.length;
    var table = [];
    var i;
    var j;
    for (i = 0; i <= n; i++) {
      table.push(new Array(m + 1).fill(0));
    }
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    var rows = [];
    i = 0;
    j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        rows.push({ t: " ", s: a[i] });
        i++;
        j++;
      } else if (table[i + 1][j] >= table[i][j + 1]) {
        rows.push({ t: "-", s: a[i++] });
      } else {
        rows.push({ t: "+", s: b[j++] });
      }
    }
    while (i < n) rows.push({ t: "-", s: a[i++] });
    while (j < m) rows.push({ t: "+", s: b[j++] });
    return rows;
  }

  function diffStat(before, after) {
    var rows = lineDiff(before, after);
    var plus = 0;
    var minus = 0;
    rows.forEach(function (r) {
      if (r.t === "+") plus++;
      else if (r.t === "-") minus++;
    });
    return { plus: plus, minus: minus };
  }

  function formatBytes(value) {
    return String(value).length + " bytes";
  }

  function hashText(input) {
    var h = 2166136261;
    var text = String(input);
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
  }

  function tokenize(input) {
    var tokens = [];
    var cur = "";
    var quote = null;
    var have = false;
    for (var i = 0; i < input.length; i++) {
      var ch = input[i];
      if (quote) {
        if (ch === quote) {
          quote = null;
          continue;
        }
        if (ch === "\\" && quote === '"' && i + 1 < input.length) {
          cur += input[++i];
          have = true;
          continue;
        }
        cur += ch;
        have = true;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        have = true;
        continue;
      }
      if (ch === "\\" && i + 1 < input.length) {
        cur += input[++i];
        have = true;
        continue;
      }
      if (/\s/.test(ch)) {
        if (have || cur) {
          tokens.push(cur);
          cur = "";
          have = false;
        }
        continue;
      }
      cur += ch;
      have = true;
    }
    if (cur || have) tokens.push(cur);
    return tokens;
  }

  function splitPipes(input) {
    var parts = [];
    var cur = "";
    var quote = null;
    for (var i = 0; i < input.length; i++) {
      var ch = input[i];
      if (quote) {
        cur += ch;
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
        cur += ch;
      } else if (ch === "|") {
        parts.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    parts.push(cur.trim());
    return parts;
  }

  function findRedirect(tokens) {
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i] === ">" || tokens[i] === ">>") {
        return { index: i, append: tokens[i] === ">>", path: tokens[i + 1] };
      }
    }
    return null;
  }

  function parseEnv(tokens) {
    var env = {};
    var i = 0;
    while (i < tokens.length && /^[A-Z_][A-Z0-9_]*=/.test(tokens[i])) {
      var eq = tokens[i].indexOf("=");
      env[tokens[i].slice(0, eq)] = tokens[i].slice(eq + 1);
      i++;
    }
    return { env: env, rest: tokens.slice(i) };
  }

  function Lab(cfg) {
    cfg = cfg || {};
    this.seed = cfg.seed || "lab";
    this.commits = {};
    this.order = [];
    this.seq = 0;
    this.branches = {};
    this.tags = {};
    this.remotes = {};
    this.remoteFetch = {};
    this.head = { type: "branch", ref: "main" };
    this.reflog = [];
    this.stash = [];
    this.stashDropped = [];
    this.files = {};
    this.index = {};
    this.unmerged = {};
    this.conflicts = {};
    this.config = {};
    this.hooks = cfg.hooks ? clone(cfg.hooks) : {};
    this.hookBlocks = 0;
    this.worktrees = [];
    this.worktreeHistory = [];
    this.replacements = {};
    this.bisect = null;
    this.bisectResult = null;
    this.bisectPath = cfg.bisectPath || null;
    this.bisectFirstBad = cfg.bisectFirstBad || null;
    this.mergeState = null;
    this.rebaseState = null;
    this.cherryState = null;
    this.indexCorrupt = !!cfg.indexCorrupt;
    this.rerere = {};
    this.rerereHits = 0;
    this.lastTreeCommit = null;
    this.lastCommand = "";
    this.themeHint = cfg.themeHint || null;

    this.build(cfg);
  }

  Lab.prototype.build = function (cfg) {
    var self = this;
    var base = copyFiles(cfg.base || {});
    var byRef = {};

    (cfg.commits || []).concat(cfg.extraCommits || []).forEach(function (entry, index) {
      var sha = entry[0];
      var parent = entry[1];
      var subject = entry[2];
      var changes = entry[3] || {};
      var parentSha = null;
      if (parent != null) parentSha = byRef[parent] || parent;
      var tree = parentSha && self.commits[parentSha] ? clone(self.commits[parentSha].tree) : clone(base);
      Object.keys(changes).forEach(function (path) {
        if (changes[path] == null) delete tree[path];
        else tree[path] = String(changes[path]);
      });
      self.commits[sha] = {
        sha: sha,
        parents: parentSha ? [parentSha] : [],
        subject: subject,
        body: entry[4] || "",
        author: entry[5] || AUTHOR,
        date: entry[6] || "2026-10-28T10:12:00Z",
        seq: self.seq++,
        tree: tree
      };
      self.order.push(sha);
      byRef[index] = sha;
      byRef[sha] = sha;
      changelogCall(self, sha);
    });

    Object.keys(cfg.commitsExtraParents || {}).forEach(function (sha) {
      if (self.commits[sha]) {
        self.commits[sha].parents = cfg.commitsExtraParents[sha].map(function (parent) {
          return byRef[parent] || parent;
        });
      }
    });

    (cfg.unreachable || []).forEach(function (entry) {
      var sha = entry.sha || entry[0];
      if (self.commits[sha]) return;
      var parent = entry.parent || entry[1] || null;
      var tree = parent && self.commits[parent] ? clone(self.commits[parent].tree) : clone(base);
      Object.keys(entry.changes || {}).forEach(function (path) {
        if (entry.changes[path] == null) delete tree[path];
        else tree[path] = String(entry.changes[path]);
      });
      self.commits[sha] = {
        sha: sha,
        parents: parent ? [parent] : [],
        subject: entry.subject || "unreachable work",
        body: entry.body || "",
        author: entry.author || AUTHOR,
        date: entry.date || "2026-10-28T10:12:00Z",
        seq: self.seq++,
        tree: tree,
        unreachable: true
      };
    });

    this.branches = {};
    Object.keys(cfg.branches || {}).forEach(function (name) {
      self.branches[name] = byRef[cfg.branches[name]] || cfg.branches[name];
    });
    this.tags = {};
    Object.keys(cfg.tags || {}).forEach(function (name) {
      self.tags[name] = byRef[cfg.tags[name]] || cfg.tags[name];
    });
    this.remotes = {};
    this.remoteFetch = {};
    Object.keys(cfg.remotes || {}).forEach(function (name) {
      var remote = cfg.remotes[name];
      self.remotes[name] = { branches: {}, url: remote.url || "https://example.com/" + name + "/repo.git", pulls: clone(remote.pulls || {}) };
      Object.keys(remote.branches || {}).forEach(function (branch) {
        self.remotes[name].branches[branch] = byRef[remote.branches[branch]] || remote.branches[branch];
      });
      self.remoteFetch[name] = clone(self.remotes[name].branches);
    });

    this.config = clone(cfg.config || {});
    if (cfg.head) {
      if (cfg.head.indexOf("detached:") === 0) {
        this.head = { type: "detached", sha: byRef[cfg.head.slice(9)] || cfg.head.slice(9) };
      } else {
        this.head = { type: "branch", ref: cfg.head };
      }
    }
    if (!this.branches[this.head.ref] && this.head.type === "branch" && this.order.length) {
      this.branches[this.head.ref] = this.order[this.order.length - 1];
    }

    var headTree = this.treeOf(this.headSha());
    this.index = clone(headTree);
    this.files = clone(headTree);

    Object.keys(cfg.index || {}).forEach(function (path) {
      self.index[path] = cfg.index[path] == null ? null : String(cfg.index[path]);
    });
    Object.keys(cfg.files || {}).forEach(function (path) {
      self.files[path] = cfg.files[path] == null ? null : String(cfg.files[path]);
    });
    this.files = copyFiles(this.files);
    this.index = copyFiles(this.index);

    if (cfg.conflicts) {
      var labels = cfg.mergeLabel || "feature";
      Object.keys(cfg.conflicts).forEach(function (path) {
        var c = cfg.conflicts[path];
        self.conflicts[path] = { base: c.base == null ? null : String(c.base), ours: c.ours == null ? null : String(c.ours), theirs: c.theirs == null ? null : String(c.theirs), label: c.label || labels };
        self.unmerged[path] = true;
        self.files[path] = conflictText(self.conflicts[path], c.label || labels);
      });
    }

    (cfg.stash || []).forEach(function (entry) {
      self.stash.push({
        message: entry.message || "WIP",
        branch: entry.branch || "main",
        base: entry.base || self.headSha(),
        files: copyFiles(entry.files || {}),
        index: copyFiles(entry.index || entry.files || {}),
        untracked: entry.untracked || []
      });
    });

    if (cfg.droppedStash) {
      var dropped = cfg.droppedStash;
      self.stashDropped.push({
        sha: dropped.sha,
        message: dropped.message || "WIP",
        branch: dropped.branch || "main",
        files: copyFiles(dropped.files || {}),
        index: copyFiles(dropped.index || dropped.files || {}),
        untracked: dropped.untracked || []
      });
    }

    (cfg.reflog || []).forEach(function (entry, index) {
      var sha = byRef[entry[0]] || entry[0];
      var text = entry[1] || "";
      var ref = entry[2] || "HEAD";
      var msg = text;
      if (text.indexOf(":") === -1) msg = "commit: " + text;
      self.reflog.push({ sha: sha, msg: msg, ref: ref, index: index });
    });

    if (!self.reflog.length) {
      self.order.slice().reverse().forEach(function (sha, index) {
        self.reflog.push({ sha: sha, msg: "commit: " + self.commits[sha].subject, ref: "HEAD", index: index });
      });
    }
    var current = self.headSha();
    if (!self.reflog.some(function (r) { return r.sha === current; })) {
      self.reflog.unshift({ sha: current, msg: "commit: " + (self.commits[current] ? self.commits[current].subject : "initial"), ref: "HEAD", index: 0 });
    }

    if (cfg.rebaseInProgress) this.seedRebase(cfg.rebaseInProgress);
    if (cfg.rebaseConflict) {
      var rc = cfg.rebaseConflict;
      var original = this.branches[rc.branch] || this.resolve(rc.branch);
      var ontoSha = this.resolve(rc.onto);
      this.head = { type: "branch", ref: rc.branch };
      this.branches[rc.branch] = ontoSha;
      this.applyTree(ontoSha, "hard");
      this.applyCommitDiff(rc.commit, rc.label || "rebase");
      this.rebaseState = {
        plan: { branch: rc.branch, tip: original, onto: ontoSha, upstream: this.resolve(rc.upstream || rc.onto) },
        todo: rc.remaining || [],
        index: 0,
        pending: { commit: this.commits[rc.commit], message: this.commits[rc.commit].subject },
        preHead: original,
        preType: "branch",
        preBranch: rc.branch,
        preFiles: copyFiles(this.treeOf(original)),
        preIndex: copyFiles(this.treeOf(original)),
        preUnmerged: {},
        interactive: true
      };
    }
    if (cfg.rebaseStateRaw) this.rebaseState = cfg.rebaseStateRaw;
    if (cfg.mergeInProgress) this.seedMerge(cfg.mergeInProgress);
    Object.keys(cfg.files || {}).forEach(function (path) {
      if (!self.unmerged[path]) self.files[path] = cfg.files[path] == null ? null : String(cfg.files[path]);
    });
    self.files = copyFiles(self.files);
    self.refreshReachability();
  };

  function changelogCall() {}

  function conflictText(c, label) {
    var ours = c.ours == null ? "" : String(c.ours);
    var theirs = c.theirs == null ? "" : String(c.theirs);
    return ["<<<<<<< HEAD", ours.replace(/\n$/, ""), "=======", theirs.replace(/\n$/, ""), ">>>>>>> " + label].join("\n") + "\n";
  }

  Lab.prototype.headBranch = function () {
    return this.head.type === "branch" ? this.head.ref : null;
  };

  Lab.prototype.headSha = function () {
    if (this.head.type === "branch") return this.branches[this.head.ref] || null;
    return this.head.sha || null;
  };

  Lab.prototype.commit = function (sha) {
    return sha ? this.commits[sha] || null : null;
  };

  Lab.prototype.resolve = function (ref, depth) {
    if (ref == null) return null;
    ref = String(ref).trim();
    if (!ref) return null;
    depth = depth || 0;
    if (depth > 12) return null;
    if (ref === "@") ref = "HEAD";
    if (ref.indexOf("refs/heads/") === 0) ref = ref.slice(11);
    if (ref.indexOf("refs/tags/") === 0) ref = ref.slice(10);
    if (ref.indexOf("refs/remotes/") === 0) ref = ref.slice(13);

    var reflogMatch = ref.match(/^(.+?)@\{(\d+)\}$/);
    if (reflogMatch) {
      var name = reflogMatch[1] === "@" ? "HEAD" : reflogMatch[1];
      var wanted = Number(reflogMatch[2]);
      var entries = this.reflog.filter(function (entry) {
        return entry.ref === name || (name === "HEAD" && entry.ref === "HEAD");
      });
      if (entries[wanted]) return entries[wanted].sha;
      return null;
    }

    var tilde = ref.match(/^(.+?)(~+)(\d*)$/);
    if (tilde) {
      var baseSha = this.resolve(tilde[1], depth + 1);
      var steps = tilde[3] ? Number(tilde[3]) : 1;
      while (baseSha && steps-- > 0) {
        var parentCommit = this.commit(baseSha);
        baseSha = parentCommit && parentCommit.parents[0] ? parentCommit.parents[0] : null;
      }
      return baseSha;
    }

    var caret = ref.match(/^(.+?)\^(\d*)$/);
    if (caret) {
      var cSha = this.resolve(caret[1], depth + 1);
      var parentIndex = caret[2] ? Number(caret[2]) : 1;
      var cc = this.commit(cSha);
      return cc && cc.parents[parentIndex - 1] ? cc.parents[parentIndex - 1] : null;
    }

    if (ref === "HEAD") return this.headSha();
    if (Object.prototype.hasOwnProperty.call(this.branches, ref)) return this.branches[ref];
    if (Object.prototype.hasOwnProperty.call(this.tags, ref)) return this.tags[ref];
    var slash = ref.indexOf("/");
    if (slash > 0) {
      var remoteName = ref.slice(0, slash);
      var branchName = ref.slice(slash + 1);
      if (this.remotes[remoteName] && this.remotes[remoteName].branches[branchName]) {
        return this.remotes[remoteName].branches[branchName];
      }
    }
    if (this.commits[ref]) return ref;
    var keys = Object.keys(this.commits);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(ref) === 0) return keys[i];
    }
    return null;
  };

  Lab.prototype.treeOf = function (ref) {
    var sha = this.commits[ref] ? ref : this.resolve(ref);
    return sha && this.commits[sha] ? clone(this.commits[sha].tree) : {};
  };

  Lab.prototype.ancestors = function (ref) {
    var sha = this.commits[ref] ? ref : this.resolve(ref);
    var seen = {};
    var queue = sha ? [sha] : [];
    while (queue.length) {
      var next = queue.pop();
      if (!next || seen[next]) continue;
      seen[next] = true;
      var commit = this.commits[next];
      if (commit) queue = queue.concat(commit.parents);
    }
    return seen;
  };

  Lab.prototype.isAncestor = function (possibleAncestor, ref) {
    var sha = this.resolve(possibleAncestor);
    if (!sha) return false;
    var target = this.commits[ref] ? ref : this.resolve(ref);
    if (!target) return false;
    if (target === sha) return true;
    return !!this.ancestors(target)[sha];
  };

  Lab.prototype.mergeBase = function (a, b) {
    var aSha = this.resolve(a);
    var bSha = this.resolve(b);
    if (!aSha || !bSha) return null;
    var aSet = this.ancestors(aSha);
    var queue = [bSha];
    var seen = {};
    while (queue.length) {
      var next = queue.shift();
      if (!next || seen[next]) continue;
      if (aSet[next]) return next;
      seen[next] = true;
      var commit = this.commits[next];
      if (commit) queue = queue.concat(commit.parents);
    }
    return null;
  };

  Lab.prototype.reachable = function () {
    var self = this;
    var out = {};
    Object.keys(this.branches).forEach(function (name) {
      Object.keys(self.ancestors(self.branches[name])).forEach(function (sha) { out[sha] = true; });
    });
    Object.keys(this.tags).forEach(function (name) {
      Object.keys(self.ancestors(self.tags[name])).forEach(function (sha) { out[sha] = true; });
    });
    Object.keys(this.remotes).forEach(function (name) {
      Object.keys(self.remotes[name].branches).forEach(function (branch) {
        Object.keys(self.ancestors(self.remotes[name].branches[branch])).forEach(function (sha) { out[sha] = true; });
      });
    });
    if (this.head.type === "detached") Object.keys(this.ancestors(this.head.sha)).forEach(function (sha) { out[sha] = true; });
    return out;
  };

  Lab.prototype.refreshReachability = function () {
    var live = this.reachable();
    var self = this;
    Object.keys(this.commits).forEach(function (sha) {
      self.commits[sha].unreachable = !live[sha];
    });
  };

  Lab.prototype.nextSha = function (salt) {
    var sha;
    do {
      sha = hashText(this.seed + "|" + this.seq++ + "|" + (salt || "") + "|" + Object.keys(this.commits).length);
    } while (this.commits[sha]);
    return sha;
  };

  Lab.prototype.addReflog = function (sha, msg, ref) {
    this.reflog.unshift({ sha: sha, msg: msg, ref: ref || "HEAD", index: 0 });
  };

  Lab.prototype.setBranch = function (name, sha) {
    this.branches[name] = sha;
  };

  Lab.prototype.track = function (path, content) {
    this.files[path] = content;
  };

  Lab.prototype.setFile = function (path, content) {
    path = normalizePath(path);
    if (content == null) delete this.files[path];
    else this.files[path] = String(content);
  };

  Lab.prototype.readFile = function (path) {
    path = normalizePath(path);
    return Object.prototype.hasOwnProperty.call(this.files, path) ? this.files[path] : null;
  };

  Lab.prototype.stage = function (path) {
    path = normalizePath(path);
    if (Object.prototype.hasOwnProperty.call(this.files, path)) this.index[path] = this.files[path];
    else delete this.index[path];
    if (this.unmerged[path]) {
      delete this.unmerged[path];
      delete this.conflicts[path];
    }
  };

  Lab.prototype.isDirty = function () {
    return !treesEqual(this.files, this.index) || !treesEqual(this.index, this.treeOf(this.headSha())) || !!this.indexCorrupt;
  };

  Lab.prototype.staged = function () {
    var self = this;
    var head = this.treeOf(this.headSha());
    var out = [];
    var paths = {};
    Object.keys(this.index).forEach(function (p) { paths[p] = true; });
    Object.keys(head).forEach(function (p) { paths[p] = true; });
    Object.keys(paths).forEach(function (p) {
      if (self.unmerged[p]) return;
      if (head[p] !== self.index[p]) out.push({ path: p, status: head[p] == null ? "A" : self.index[p] == null ? "D" : "M" });
    });
    return out;
  };

  Lab.prototype.unstaged = function () {
    var out = [];
    var paths = {};
    var self = this;
    Object.keys(this.index).forEach(function (p) { paths[p] = true; });
    Object.keys(this.files).forEach(function (p) { paths[p] = true; });
    Object.keys(paths).forEach(function (p) {
      if (self.unmerged[p]) return;
      if (self.index[p] !== self.files[p]) out.push({ path: p, status: self.files[p] == null ? "D" : self.index[p] == null ? "??" : "M" });
    });
    return out;
  };

  Lab.prototype.untracked = function () {
    var self = this;
    return Object.keys(this.files).filter(function (p) {
      return !self.unmerged[p] && !Object.prototype.hasOwnProperty.call(self.index, p);
    }).sort();
  };

  Lab.prototype.conflictMarkers = function () {
    var self = this;
    return Object.keys(this.files).filter(function (path) {
      return /^(<{7}|={7}|>{7})/m.test(self.files[path] || "");
    });
  };

  /* ---------------------------------------------------------------- output */

  function line(text, kind) {
    return { text: text == null ? "" : String(text), kind: kind || "out" };
  }

  function lines(list) {
    return list.map(function (item) {
      return typeof item === "string" ? line(item) : line(item.text, item.kind);
    });
  }

  function result(list, code, extra) {
    var out = { lines: lines(list || []), code: code || 0 };
    if (extra) Object.keys(extra).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }

  function fail(list, code) {
    return result(list, code || 1);
  }

  /* -------------------------------------------------------------- display */

  Lab.prototype.decorations = function (sha) {
    var out = [];
    if (this.head.type === "branch" && this.branches[this.head.ref] === sha) out.push("HEAD -> " + this.head.ref);
    else if (this.head.type === "detached" && this.head.sha === sha) out.push("HEAD");
    Object.keys(this.branches).forEach(function (name) {
      if (this.branches[name] === sha && !(this.head.type === "branch" && this.head.ref === name)) out.push(name);
    }, this);
    Object.keys(this.tags).forEach(function (name) {
      if (this.tags[name] === sha) out.push("tag: " + name);
    }, this);
    Object.keys(this.remotes).forEach(function (remote) {
      var branches = this.remotes[remote].branches;
      Object.keys(branches).forEach(function (name) {
        if (branches[name] === sha) out.push(remote + "/" + name);
      });
    }, this);
    if (this.replacements[sha]) out.push("replaced");
    return out.length ? " (" + out.join(", ") + ")" : "";
  };

  Lab.prototype.commitRow = function (sha, opts) {
    var commit = this.commits[sha];
    if (!commit) return "";
    var parents = commit.parents;
    if (this.replacements[sha]) parents = this.replacements[sha];
    if (opts && opts.format) {
      var self = this;
      return opts.format
        .replace(/%H/g, sha)
        .replace(/%h/g, sha)
        .replace(/%s/g, commit.subject)
        .replace(/%an/g, commit.author.name)
        .replace(/%ae/g, commit.author.email)
        .replace(/%P/g, parents.join(" "))
        .replace(/%p/g, parents.map(function (p) { return p.slice(0, 7); }).join(" "))
        .replace(/%ad/g, commit.date.replace("T", " ").replace("Z", " +0000"))
        .replace(/%d/g, self.decorations(sha).trim())
        .replace(/%n/g, "\n");
    }
    if (opts && opts.decorate) return sha + this.decorations(sha) + " " + commit.subject;
    if (opts && opts.oneline) return sha + " " + commit.subject;
    return [
      "commit " + sha + (this.replacements[sha] ? " (replaced)" : ""),
      "Author: " + commit.author.name + " <" + commit.author.email + ">",
      "Date:   " + commit.date.replace("T", " ").replace("Z", " +0000"),
      "",
      "    " + commit.subject,
      commit.body ? "\n" + commit.body.split("\n").map(function (l) { return "    " + l; }).join("\n") : "",
      ""
    ].filter(Boolean).join("\n");
  };

  Lab.prototype.rangeCommits = function (from, to, all) {
    var self = this;
    var reachableTo = all ? this.reachable() : this.ancestors(to);
    var reachableFrom = from ? this.ancestors(from) : {};
    var list = Object.keys(reachableTo).filter(function (sha) {
      return self.commits[sha] && !reachableFrom[sha];
    });
    list.sort(function (a, b) {
      return self.commits[b].seq - self.commits[a].seq;
    });
    return list;
  };

  /* --------------------------------------------------------------- status */

  Lab.prototype.status = function () {
    if (this.indexCorrupt) {
      return fail([
        "error: bad index file sha1 signature",
        "fatal: index file corrupt",
        "",
        "Run 'mv .git/index .git/index.bak && git reset' to rebuild it."
      ]);
    }
    var out = [];
    var branch = this.headBranch();
    if (branch) out.push("On branch " + branch);
    else out.push("HEAD detached at " + (this.headSha() || "").slice(0, 7));
    if (this.rebaseState) out.push("interactive rebase in progress; onto " + (this.rebaseState.onto || "").slice(0, 7));
    if (this.mergeState) out.push("You have unmerged paths.", '  (fix conflicts and run "git commit")');
    var upstream = branch && this.remotes.origin && this.remotes.origin.branches[branch];
    if (upstream && upstream === this.headSha()) out.push("Your branch is up to date with 'origin/" + branch + "'.");
    else if (upstream) out.push("Your branch and 'origin/" + branch + "' have diverged.");
    out.push("");

    var staged = this.staged();
    var unstaged = this.unstaged();
    var untracked = this.untracked();
    var conflicts = Object.keys(this.unmerged);

    if (conflicts.length) {
      out.push("Unmerged paths:", '  (use "git add <file>..." to mark resolution)');
      conflicts.forEach(function (path) {
        out.push("        both modified:   " + path);
      });
      out.push("");
    }
    if (staged.length) {
      out.push("Changes to be committed:", '  (use "git restore --staged <file>..." to unstage)');
      staged.forEach(function (row) {
        out.push("        " + (row.status === "A" ? "new file:   " : row.status === "D" ? "deleted:    " : "modified:   ") + row.path);
      });
      out.push("");
    }
    if (unstaged.some(function (r) { return r.status !== "??"; })) {
      out.push("Changes not staged for commit:", '  (use "git add <file>..." to update what will be committed)');
      unstaged.forEach(function (row) {
        if (row.status === "??") return;
        out.push("        " + (row.status === "D" ? "deleted:    " : "modified:   ") + row.path);
      });
      out.push("");
    }
    var realUntracked = untracked.filter(function (p) { return !conflicts.length || true; });
    if (realUntracked.length) {
      out.push("Untracked files:", '  (use "git add <file>..." to include in what will be committed)');
      realUntracked.slice(0, 12).forEach(function (path) { out.push("        " + path); });
      if (realUntracked.length > 12) out.push("        ... and " + (realUntracked.length - 12) + " more");
      out.push("");
    }
    if (!staged.length && !unstaged.length && !conflicts.length && !untracked.length) {
      out.push("nothing to commit, working tree clean");
    } else if (!staged.length && !conflicts.length) {
      out.push('no changes added to commit (use "git add" and/or "git commit -a")');
    }
    return result(out);
  };

  /* ---------------------------------------------------------------- commit */

  Lab.prototype.createCommit = function (opts) {
    var tree = opts.tree || copyFiles(this.index);
    var parents = opts.parents || (this.headSha() ? [this.headSha()] : []);
    var message = String(opts.message || "update").replace(/\r/g, "");
    var parts = message.split("\n");
    var subject = parts.shift().trim() || "update";
    var body = parts.join("\n").trim();
    var sha = this.nextSha(subject);
    this.commits[sha] = {
      sha: sha,
      parents: parents,
      subject: subject,
      body: body,
      author: opts.author || AUTHOR,
      date: opts.date || "2026-11-04T09:30:00Z",
      seq: this.seq++,
      tree: tree
    };
    this.order.push(sha);
    if (this.head.type === "branch") this.branches[this.head.ref] = sha;
    else this.head.sha = sha;
    this.index = copyFiles(tree);
    this.addReflog(sha, (opts.reflogPrefix || "commit") + ": " + subject);
    this.mergeState = null;
    this.refreshReachability();
    return sha;
  };

  /* ------------------------------------------------------------- commands */

  Lab.prototype.exec = function (input, options) {
    options = options || {};
    input = String(input || "").trim();
    if (!input) return result([]);
    this.lastCommand = input;

    if (input === "clear" || input === "cls") return result([], 0, { clear: true });

    var pipeline = splitPipes(input);
    var first = pipeline.shift();
    var output = this.execSimple(first, options);
    pipeline.forEach(function (stage) {
      var tokens = tokenize(stage);
      if (!tokens.length) return;
      if (tokens[0] === "grep") {
        var pattern = tokens.slice(1).filter(function (t) { return t[0] !== "-"; }).join(" ");
        var re;
        try { re = new RegExp(pattern, "i"); } catch (e) { re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); }
        output.lines = output.lines.filter(function (l) { return re.test(l.text); });
        output.code = output.lines.length ? 0 : 1;
      } else if (tokens[0] === "head") {
        var n = 10;
        var ni = tokens.indexOf("-n");
        if (ni !== -1) n = Number(tokens[ni + 1]) || 10;
        var numeric = tokens.slice(1).find(function (t) { return /^-\d+$/.test(t); });
        if (numeric) n = Math.abs(Number(numeric));
        output.lines = output.lines.slice(0, n);
      } else if (tokens[0] === "wc") {
        var count = output.lines.length;
        output.lines = [line(String(count).padStart(8) + " " + (tokens.indexOf("-l") !== -1 ? "" : "lines"), "dim")];
      }
    });
    return output;
  };

  Lab.prototype.execSimple = function (input, options) {
    var tokens = tokenize(input);
    if (!tokens.length) return result([]);

    var redirect = findRedirect(tokens);
    if (redirect) {
      var commandTokens = tokens.slice(0, redirect.index);
      tokens = commandTokens;
      var base = this.execSimple(commandTokens.map(q).join(" "), options);
      var text = base.lines.map(function (l) { return l.text; }).join("\n");
      this.writePath(redirect.path, redirect.append ? (this.readFile(redirect.path) || "") + text + "\n" : text + "\n");
      return result([]);
    }

    var envParts = parseEnv(tokens);
    var env = envParts.env;
    tokens = envParts.rest;
    if (!tokens.length) return result([]);
    var cmd = tokens[0];
    var args = tokens.slice(1);

    if (cmd === "help") return this.help();
    if (cmd === "pwd") return result(["/home/ada/repo"]);
    if (cmd === "whoami") return result(["ada"]);
    if (cmd === "history") {
      return result((options.history || []).map(function (h, i) { return String(i + 1).padStart(4) + "  " + h; }));
    }
    if (cmd === "ls") {
      var dirArg = args.filter(function (a) { return a[0] !== "-" })[0] || "";
      var entries = {};
      Object.keys(this.files).forEach(function (path) {
        if (dirArg && !inDir(path, normalizePath(dirArg))) return;
        var rel = dirArg ? path.slice(normalizePath(dirArg).length + 1) : path;
        entries[rel.split("/")[0]] = true;
      });
      return result(Object.keys(entries).sort().map(function (name) { return line(name, "out"); }));
    }
    if (cmd === "cat") {
      var catPath = args.filter(function (a) { return a[0] !== "-" })[0];
      var cat = catPath ? this.readFile(catPath) : null;
      if (cat == null) return fail(["cat: " + catPath + ": No such file or directory"]);
      return result(cat.replace(/\n$/, "").split("\n"));
    }
    if (cmd === "echo" || cmd === "printf") {
      var text = args.join(" ");
      if (cmd === "printf") {
        text = text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
        if (args[0] && /^["']/.test(args[0])) text = args.join(" ");
      }
      return result(text.replace(/\n$/, "").split("\n"));
    }
    if (cmd === "touch") {
      args.forEach(function (path) { if (this.readFile(path) == null) this.writePath(path, ""); }, this);
      return result([]);
    }
    if (cmd === "mkdir") return result([]);
    if (cmd === "rm") {
      args.filter(function (a) { return a[0] !== "-"; }).forEach(function (path) {
        path = normalizePath(path);
        delete this.files[path];
        delete this.index[path];
      }, this);
      return result([]);
    }
    if (cmd === "cp") {
      var cpArgs = args.filter(function (a) { return a[0] !== "-"; });
      var src = cpArgs[0];
      var dst = cpArgs[1];
      var content = this.readFile(src);
      if (content == null) return fail(["cp: " + src + ": No such file or directory"]);
      if (dst && dst.indexOf("/tmp/") === 0) {
        this.lastCopy = { path: dst, content: content };
        return result([]);
      }
      this.writePath(dst, content);
      return result([]);
    }
    if (cmd === "mv") {
      var mvArgs = args.filter(function (a) { return a[0] !== "-"; });
      var from = normalizePath(mvArgs[0]);
      var to = normalizePath(mvArgs[1]);
      if (from.indexOf(".git/index") === 0) {
        this.indexCorrupt = false;
        this.index = this.treeOf(this.headSha());
        return result(["index moved to " + to + "; run 'git reset' to rebuild it"], 0);
      }
      var moved = this.readFile(from);
      if (moved == null) return fail(["mv: " + from + ": No such file or directory"]);
      this.files[to] = moved;
      delete this.files[from];
      if (this.index[from] != null) {
        this.index[to] = moved;
        delete this.index[from];
      }
      return result([]);
    }
    if (cmd === "du") {
      var duPath = args.filter(function (a) { return a[0] !== "-"; })[0];
      var size = this.readFile(duPath);
      return result([(size ? "200M\t" : "0\t") + (duPath || ".")]);
    }
    if (cmd === "git") return this.git(args, env, options);
    if (cmd === "npm") {
      if (args[0] === "install" || args[0] === "ci") return this.npmInstall();
      return result(["npm: supported in this lab: npm install"]);
    }
    if (cmd === "node" || cmd === "npm" || cmd === "bash" || cmd === "sh") {
      return result(["$ " + cmd + " " + args.join(" "), "(the lab shell simulates this command)"], 0);
    }
    if (cmd === "exit") return result(["Use the Reset button to restore the lab."]);
    if (cmd === "chmod") {
      args.filter(function (a) { return /\.git\/hooks\//.test(a); }).forEach(function (path) {
        this.hooks[normalizePath(path).replace(/^\.git\/hooks\//, "")] = this.hooks[normalizePath(path).replace(/^\.git\/hooks\//, "")] || "";
      }, this);
      return result([]);
    }
    if (cmd === "edit" || cmd === "vi" || cmd === "vim" || cmd === "nano") {
      return result([], 0, { edit: args[args.length - 1] });
    }
    return fail([cmd + ": command not found", "Type 'help' for the commands this lab supports."]);
  };

  Lab.prototype.help = function () {
    return result([
      "GitCode lab shell",
      "",
      "Git",
      "  git status                 show branch, index and working tree",
      "  git add <path>             stage files (git add -A for everything)",
      "  git commit -m <message>    record the index",
      "  git log [--oneline]        history; supports -N, --all, -S, ranges",
      "  git reflog                 every HEAD move, newest first",
      "  git show <ref>[:<path>]    inspect a commit or a file in it",
      "  git diff [--stat] [a b]    compare tree, index and working files",
      "  git branch / switch        create and move between refs",
      "  git merge / rebase         integrate or replay history",
      "  git cherry-pick / revert   copy or undo a commit",
      "  git reset / restore        move refs, index and working files",
      "  git stash                  park and reapply local work",
      "  git bisect                 binary search history",
      "  git tag / worktree / push  refs, checkouts and remotes",
      "",
      "Shell",
      "  edit <path>                open a file in the editor",
      "  cat <path>                 print a file",
      "  ls                         list working files",
      "  clear                      clear the transcript",
      "",
      "Tip: every task's description lists the outcome the checks expect."
    ]);
  };

  Lab.prototype.writePath = function (path, content) {
    path = normalizePath(path);
    if (!path) return;
    if (path.indexOf(".git/hooks/") === 0) {
      this.hooks[path.replace(/^\.git\/hooks\//, "")] = content;
      return;
    }
    this.files[path] = String(content);
  };

  Lab.prototype.npmInstall = function () {
    var manifest = this.readFile("package.json");
    var pkg = {};
    try { pkg = JSON.parse(manifest || "{}"); } catch (e) { return fail(["npm ERR! Invalid package.json"]); }
    var lock = {
      name: pkg.name || "repo",
      version: pkg.version || "1.0.0",
      lockfileVersion: 3,
      requires: true,
      packages: {}
    };
    lock.packages[""] = { name: lock.name, version: lock.version, dependencies: pkg.dependencies || {} };
    Object.keys(pkg.dependencies || {}).forEach(function (name) {
      lock.packages["node_modules/" + name] = { version: String(pkg.dependencies[name]).replace(/^[\^~]/, "") };
    });
    this.files["package-lock.json"] = JSON.stringify(lock, null, 2) + "\n";
    return result(["added " + Object.keys(pkg.dependencies || {}).length + " packages, and audited " + (Object.keys(pkg.dependencies || {}).length + 1) + " packages in 1s", "", "found 0 vulnerabilities"]);
  };

  /* ============================================================= git verbs */

  Lab.prototype.git = function (args, env, options) {
    var cmd = args[0];
    var rest = args.slice(1);
    if (!cmd || cmd === "help") return this.help();
    if (cmd === "--version") return result(["git version 2.46.0 (GitCode lab)"]);

    switch (cmd) {
      case "status": return this.cmdStatus(rest);
      case "add": return this.cmdAdd(rest);
      case "commit": return this.cmdCommit(rest, env);
      case "log": return this.cmdLog(rest);
      case "show": return this.cmdShow(rest);
      case "diff": return this.cmdDiff(rest);
      case "reflog": return this.cmdReflog(rest);
      case "branch": return this.cmdBranch(rest);
      case "checkout": return this.cmdCheckout(rest, "checkout");
      case "switch": return this.cmdCheckout(rest, "switch");
      case "merge": return this.cmdMerge(rest, env);
      case "reset": return this.cmdReset(rest);
      case "restore": return this.cmdRestore(rest);
      case "rebase": return this.cmdRebase(rest, env);
      case "cherry-pick": return this.cmdCherryPick(rest);
      case "revert": return this.cmdRevert(rest);
      case "stash": return this.cmdStash(rest);
      case "bisect": return this.cmdBisect(rest);
      case "tag": return this.cmdTag(rest);
      case "remote": return this.cmdRemote(rest);
      case "fetch": return this.cmdFetch(rest);
      case "push": return this.cmdPush(rest);
      case "pull": return this.cmdPull(rest);
      case "worktree": return this.cmdWorktree(rest);
      case "fsck": return this.cmdFsck(rest);
      case "rm": return this.cmdRm(rest);
      case "mv": return this.cmdMv(rest);
      case "clean": return this.cmdClean(rest);
      case "config": return this.cmdConfig(rest);
      case "ls-files": return this.cmdLsFiles(rest);
      case "blame": return this.cmdBlame(rest);
      case "merge-base": return this.cmdMergeBase(rest);
      case "rev-parse": return this.cmdRevParse(rest);
      case "symbolic-ref": return this.cmdSymbolicRef(rest);
      case "grep": return this.cmdGrep(rest);
      case "cat-file": return this.cmdCatFile(rest);
      case "commit-tree": return this.cmdCommitTree(rest);
      case "update-ref": return this.cmdUpdateRef(rest);
      case "filter-repo": return this.cmdFilterRepo(rest);
      case "replace": return this.cmdReplace(rest);
      case "init":
      case "clone":
        return result(["Reinitialized the lab repository at /home/ada/repo"]);
      case "am":
      case "apply":
      case "format-patch":
        return fail(["git " + cmd + " is not available in the lab. Use cherry-pick or diff instead."]);
      default:
        return fail(["git: '" + cmd + "' is not supported in this lab.", "Type 'help' for the supported commands."]);
    }
  };

  Lab.prototype.matchPaths = function (paths) {
    var self = this;
    if (!paths.length) return null;
    return function (path) {
      return paths.some(function (matcher) { return pathMatches(path, matcher); });
    };
  };

  Lab.prototype.takePaths = function (args) {
    var dash = args.indexOf("--");
    if (dash === -1) return { options: args, paths: [] };
    return { options: args.slice(0, dash), paths: args.slice(dash + 1) };
  };

  Lab.prototype.cmdStatus = function (args) {
    if (args[0] === "--short" || args[0] === "-s") {
      var out = [];
      var self = this;
      var seen = {};
      this.staged().forEach(function (row) {
        seen[row.path] = true;
        out.push((row.status || "M") + "  " + row.path);
      });
      this.unstaged().forEach(function (row) {
        if (row.status === "??" || self.unmerged[row.path]) return;
        seen[row.path] = true;
        out.push(" " + (row.status || "M") + " " + row.path);
      });
      this.untracked().forEach(function (path) {
        if (!seen[path] && !self.unmerged[path]) out.push("?? " + path);
      });
      Object.keys(this.unmerged).forEach(function (path) {
        if (!seen[path]) out.push("UU " + path);
      });
      return result(out);
    }
    return this.status();
  };

  Lab.prototype.cmdAdd = function (args) {
    var self = this;
    var flags = args.filter(function (a) { return a[0] === "-"; });
    var paths = args.filter(function (a) { return a[0] !== "-"; });
    if (flags.some(function (f) { return /^-[Au]$/.test(f) || f === "--all"; })) paths = ["."];
    if (!paths.length) return fail(["Nothing specified, nothing added."]);
    var untracked = this.untracked();
    var changed = 0;
    paths.forEach(function (matcher) {
      Object.keys(self.files).forEach(function (path) {
        if (!pathMatches(path, matcher)) return;
        self.index[path] = self.files[path];
        if (self.unmerged[path]) {
          if (String(self.config["rerere.enabled"]) === "true") {
            var c = self.conflicts[path] || {};
            self.rerere[path] = {
              base: c.base || "",
              ours: c.ours || "",
              theirs: c.theirs || "",
              resolved: self.files[path] || ""
            };
          }
          delete self.unmerged[path];
          delete self.conflicts[path];
        }
        changed++;
      });
      Object.keys(self.index).forEach(function (path) {
        if (!pathMatches(path, matcher)) return;
        if (!Object.prototype.hasOwnProperty.call(self.files, path)) {
          delete self.index[path];
          changed++;
        }
      });
      untracked.forEach(function (path) {
        if (pathMatches(path, matcher) && self.files[path] != null) self.index[path] = self.files[path];
      });
    });
    if (!changed && untracked.length === 0) return result(["Nothing to add."]);
    return result([]);
  };

  Lab.prototype.runPreCommitHook = function (env) {
    var hook = this.hooks["pre-commit"];
    if (!hook) return null;
    var onMain = this.headBranch() === "main";
    if (!onMain) return null;
    if (env && env.GITCODE_ALLOW_MAIN === "1") return null;
    if (/GITCODE_ALLOW_MAIN/.test(hook) || /symbolic-ref|main/.test(hook)) {
      this.hookBlocks++;
      return fail([
        "[ERROR] Direct commits to main are blocked.",
        "Create a branch first: git switch -c fix/<name>",
        "Emergency override: GITCODE_ALLOW_MAIN=1 git commit ..."
      ]);
    }
    return null;
  };

  Lab.prototype.cmdCommit = function (args, env) {
    var self = this;
    var messageParts = [];
    var amend = false;
    var allowEmpty = false;
    var all = false;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "-m" || args[i] === "--message") messageParts.push(args[++i] || "");
      else if (args[i].indexOf("--message=") === 0) messageParts.push(args[i].slice(10));
      else if (args[i] === "--amend") amend = true;
      else if (args[i] === "--allow-empty") allowEmpty = true;
      else if (args[i] === "-a" || args[i] === "-am" || args[i] === "--all") {
        all = true;
        if (args[i] === "-am") messageParts.push(args[++i] || "");
      }
    }
    if (this.indexCorrupt) return fail(["fatal: index file corrupt"]);
    if (Object.keys(this.unmerged).length) {
      return fail([
        "error: Committing is not possible because you have unmerged files.",
        "hint: Fix them up in the work tree, and then use 'git add <file>'",
        "hint: as appropriate to mark resolution and make a commit.",
        "fatal: Exiting because of an unresolved conflict."
      ]);
    }
    var hookFailure = this.runPreCommitHook(env);
    if (hookFailure) return hookFailure;

    if (all) {
      Object.keys(this.files).forEach(function (path) { self.index[path] = self.files[path]; });
      Object.keys(this.index).forEach(function (path) {
        if (!Object.prototype.hasOwnProperty.call(self.files, path)) delete self.index[path];
      });
    }

    var staged = this.staged();
    if (!staged.length && !allowEmpty && !this.mergeState && !amend) {
      var nothing = this.unstaged().filter(function (r) { return r.status !== "??"; });
      return result([
        nothing.length ? 'no changes added to commit (use "git add" and/or "git commit -a")' : "nothing to commit, working tree clean"
      ]);
    }

    var message = messageParts.join("\n\n").trim();
    var oldHead = this.headSha();
    var oldCommit = this.commits[oldHead];
    var subject = message || (this.mergeState && this.mergeState.message) || "Merge branch";

    if (this.mergeState) {
      var mergeMessage = message || this.mergeState.message;
      var sha = this.createCommit({
        message: mergeMessage,
        parents: [oldHead, this.mergeState.other],
        tree: copyFiles(this.index),
        reflogPrefix: "merge " + this.mergeState.label
      });
      this.mergeState = null;
      return result(["[(" + this.headBranch() + ") " + sha + "] " + firstLine(mergeMessage)]);
    }

    if (amend) {
      if (!oldCommit) return fail(["fatal: You have nothing to amend."]);
      var amended = this.nextSha(subject);
      this.commits[amended] = {
        sha: amended,
        parents: oldCommit.parents.slice(),
        subject: firstLine(subject),
        body: subject.split("\n").slice(1).join("\n").trim(),
        author: oldCommit.author,
        date: "2026-11-04T09:45:00Z",
        seq: this.seq++,
        tree: copyFiles(this.index)
      };
      this.order.push(amended);
      if (this.head.type === "branch") this.branches[this.head.ref] = amended;
      else this.head.sha = amended;
      this.addReflog(amended, "commit (amend): " + firstLine(subject));
      this.refreshReachability();
      return result(["[(" + this.headBranch() + ") " + amended + "] " + firstLine(subject)]);
    }

    var created = this.createCommit({ message: subject });
    return result(["[(" + (this.headBranch() || "detached HEAD") + ") " + created + "] " + firstLine(subject)]);
  };

  Lab.prototype.commitTouches = function (sha, path) {
    var commit = this.commits[sha];
    if (!commit) return false;
    var parentTree = commit.parents[0] && this.commits[commit.parents[0]] ? this.commits[commit.parents[0]].tree : {};
    if (path == null) return !treesEqual(parentTree, commit.tree);
    return parentTree[path] !== commit.tree[path];
  };

  Lab.prototype.commitChangedFiles = function (sha) {
    var commit = this.commits[sha];
    if (!commit) return [];
    var parentTree = commit.parents[0] && this.commits[commit.parents[0]] ? this.commits[commit.parents[0]].tree : {};
    var paths = {};
    Object.keys(parentTree).forEach(function (p) { paths[p] = true; });
    Object.keys(commit.tree).forEach(function (p) { paths[p] = true; });
    return Object.keys(paths).filter(function (p) { return parentTree[p] !== commit.tree[p]; });
  };

  Lab.prototype.cmdLog = function (args) {
    var self = this;
    var oneline = false;
    var all = false;
    var graph = false;
    var limit = null;
    var format = null;
    var paths = [];
    var diffFilter = null;
    var pickaxe = null;
    var ranges = [];
    var leftRight = null;

    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      if (arg === "--oneline") oneline = true;
      else if (arg === "--all") all = true;
      else if (arg === "--graph") graph = true;
      else if (arg === "--decorate" || arg === "--decorate=short") oneline = true;
      else if (arg === "--no-patch" || arg === "-p") continue;
      else if (arg === "--left-right") leftRight = args[++i];
      else if (arg.indexOf("--format=") === 0) format = arg.slice(9);
      else if (arg === "--format" || arg === "--pretty") format = args[++i];
      else if (arg.indexOf("--diff-filter=") === 0) diffFilter = arg.slice(14);
      else if (arg.indexOf("-S") === 0) pickaxe = arg.slice(2) || args[++i];
      else if (arg.indexOf("-G") === 0) pickaxe = arg.slice(2) || args[++i];
      else if (/^-\d+$/.test(arg)) limit = Math.abs(Number(arg));
      else if (arg === "-n") limit = Number(args[++i]) || null;
      else if (arg === "--date=iso" || arg === "--date=short" || arg === "--first-parent") continue;
      else if (arg === "--") { paths = args.slice(i + 1); break; }
      else if (arg[0] !== "-") ranges.push(arg);
    }

    if (leftRight) {
      var sides = leftRight.split("...");
      var onlyLeft = this.rangeCommits(sides[0], sides[1]);
      var onlyRight = this.rangeCommits(sides[1], sides[0]);
      var rows = [];
      onlyLeft.forEach(function (sha) { rows.push({ sha: sha, side: "<" }); });
      onlyRight.forEach(function (sha) { rows.push({ sha: sha, side: ">" }); });
      rows.sort(function (a, b) { return self.commits[b.sha].seq - self.commits[a.sha].seq; });
      return result(rows.map(function (row) {
        return line(row.side + " " + self.commits[row.sha].sha + " " + self.commits[row.sha].subject);
      }));
    }

    var list;
    var range = ranges.find(function (r) { return r.indexOf("..") !== -1; });
    if (range) {
      var parts = range.indexOf("...") !== -1 ? range.split("...") : range.split("..");
      var fromSha = parts[0] ? this.resolve(parts[0]) : null;
      var toSha = parts[1] ? this.resolve(parts[1]) : this.headSha();
      if (parts.length > 2) toSha = this.mergeBase(parts[1], parts[2]) || toSha;
      list = this.rangeCommits(fromSha, toSha, false);
    } else {
      var start = ranges.length ? this.resolve(ranges[0]) : this.headSha();
      if (!start) return fail(["fatal: bad revision '" + (ranges[0] || "HEAD") + "'"]);
      list = this.rangeCommits(null, start, all);
    }

    if (pickaxe) {
      list = list.filter(function (sha) {
        var commit = self.commits[sha];
        var parentTree = commit.parents[0] && self.commits[commit.parents[0]] ? self.commits[commit.parents[0]].tree : {};
        var before = Object.keys(parentTree).map(function (p) { return parentTree[p]; }).join("\n");
        var after = Object.keys(commit.tree).map(function (p) { return commit.tree[p]; }).join("\n");
        var re = new RegExp(pickaxe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
        var beforeCount = (before.match(re) || []).length;
        var afterCount = (after.match(re) || []).length;
        return beforeCount !== afterCount;
      });
    }

    if (diffFilter === "D" || diffFilter === "A" || diffFilter === "M") {
      list = list.filter(function (sha) {
        var commit = self.commits[sha];
        var changed = self.commitChangedFiles(sha);
        if (diffFilter === "D") return changed.some(function (p) { return commit.tree[p] == null && self.commits[commit.parents[0]] && self.commits[commit.parents[0]].tree[p] != null; });
        if (diffFilter === "A") return changed.some(function (p) { return commit.tree[p] != null && (!self.commits[commit.parents[0]] || self.commits[commit.parents[0]].tree[p] == null); });
        return changed.length > 0;
      });
    }

    if (paths.length) {
      list = list.filter(function (sha) {
        return paths.some(function (p) { return self.commitTouches(sha, normalizePath(p)); });
      });
    }

    if (limit) list = list.slice(0, limit);
    if (!list.length) return result([]);

    var output = [];
    list.forEach(function (sha, index) {
      var prefix = "";
      if (graph) prefix = "* ";
      if (format) {
        output.push(prefix + self.commitRow(sha, { format: format }));
      } else if (oneline) {
        output.push(prefix + self.commitRow(sha, { oneline: true }));
      } else {
        if (index > 0) output.push("");
        output.push(prefix + self.commitRow(sha, {}));
      }
    });
    var flat = [];
    output.forEach(function (text) {
      text.split("\n").forEach(function (l) { flat.push(line(l)); });
    });
    return result(flat);
  };

  Lab.prototype.statLines = function (before, after, label) {
    var paths = {};
    var out = [];
    Object.keys(before || {}).forEach(function (p) { paths[p] = true; });
    Object.keys(after || {}).forEach(function (p) { paths[p] = true; });
    var totalPlus = 0;
    var totalMinus = 0;
    Object.keys(paths).sort().forEach(function (path) {
      if (before[path] === after[path]) return;
      var stat = diffStat(before[path], after[path]);
      totalPlus += stat.plus;
      totalMinus += stat.minus;
      out.push(" " + path + " | " + (stat.plus + stat.minus) + " " + "+".repeat(Math.min(stat.plus, 20)) + "-".repeat(Math.min(stat.minus, 20)));
    });
    if (out.length) out.push(" " + out.length + " file" + (out.length === 1 ? "" : "s") + " changed, " + totalPlus + " insertion" + (totalPlus === 1 ? "" : "s") + "(+), " + totalMinus + " deletion" + (totalMinus === 1 ? "" : "s") + "(-)");
    return out;
  };

  Lab.prototype.diffFiles = function (before, after, opts) {
    var paths = {};
    var out = [];
    Object.keys(before || {}).forEach(function (p) { paths[p] = true; });
    Object.keys(after || {}).forEach(function (p) { paths[p] = true; });
    var filter = opts && opts.paths ? function (p) { return opts.paths.some(function (m) { return pathMatches(p, m); }); } : null;
    Object.keys(paths).sort().forEach(function (path) {
      if (filter && !filter(path)) return;
      if (before[path] === after[path]) return;
      out.push("diff --git a/" + path + " b/" + path);
      if (before[path] == null) out.push("new file mode 100644");
      if (after[path] == null) out.push("deleted file mode 100644");
      out.push("--- " + (before[path] == null ? "/dev/null" : "a/" + path));
      out.push("+++ " + (after[path] == null ? "/dev/null" : "b/" + path));
      var rows = lineDiff(before[path], after[path]);
      rows.forEach(function (row) {
        out.push(row.t + row.s);
      });
    });
    return out;
  };

  Lab.prototype.cmdShow = function (args) {
    var format = null;
    var stat = false;
    var noPatch = false;
    var ref = null;
    for (var i = 0; i < args.length; i++) {
      if (args[i].indexOf("--format=") === 0) format = args[i].slice(9);
      else if (args[i] === "--format" || args[i] === "--pretty") format = args[++i];
      else if (args[i] === "--stat") stat = true;
      else if (args[i] === "--no-patch") noPatch = true;
      else if (args[i][0] !== "-") ref = args[i];
    }
    if (!ref) ref = "HEAD";
    if (ref.indexOf(":") !== -1) {
      var bits = ref.split(":");
      var tree = this.treeOf(bits[0]);
      var content = tree[bits.slice(1).join(":")];
      if (content == null) return fail(["fatal: path '" + bits.slice(1).join(":") + "' does not exist in '" + bits[0] + "'"]);
      return result(content.replace(/\n$/, "").split("\n"));
    }
    var sha = this.resolve(ref);
    if (!sha) return fail(["fatal: ambiguous argument '" + ref + "': unknown revision"]);
    var commit = this.commits[sha];
    if (format) {
      return result(this.commitRow(sha, { format: format }).split("\n"));
    }
    var out = ["commit " + sha, "Author: " + commit.author.name + " <" + commit.author.email + ">", "Date:   " + commit.date.replace("T", " ").replace("Z", " +0000"), "", "    " + commit.subject];
    if (commit.body) out = out.concat(commit.body.split("\n").map(function (l) { return "    " + l; }));
    out.push("");
    if (!noPatch) {
      var parentTree = commit.parents[0] && this.commits[commit.parents[0]] ? this.commits[commit.parents[0]].tree : {};
      out = out.concat(this.statLines(parentTree, commit.tree));
      if (stat) out.push("");
      else out = out.concat(this.diffFiles(parentTree, commit.tree));
    }
    return result(out);
  };

  Lab.prototype.cmdDiff = function (args) {
    var stat = false;
    var cached = false;
    var check = false;
    var paths = [];
    var refs = [];
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "--stat") stat = true;
      else if (args[i] === "--cached" || args[i] === "--staged") cached = true;
      else if (args[i] === "--check") check = true;
      else if (args[i] === "--") { paths = args.slice(i + 1); break; }
      else if (args[i][0] !== "-") refs.push(args[i]);
    }
    if (check) {
      var markers = this.conflictMarkers();
      return markers.length
        ? fail(markers.map(function (p) { return p + ": leftover conflict marker"; }), 2)
        : result(["No leftover conflict markers found."]);
    }
    var before;
    var after;
    if (refs.length >= 2) {
      var two = refs[1].indexOf("...") !== -1 ? refs[1].split("...") : null;
      if (two) {
        before = this.treeOf(this.mergeBase(two[0], two[1]));
        after = this.treeOf(two[1]);
      } else {
        before = this.treeOf(refs[0]);
        after = this.treeOf(refs[1]);
      }
    } else if (refs.length === 1) {
      var sep = refs[0].indexOf("...") !== -1 ? refs[0].split("...") : refs[0].split("..");
      if (sep.length > 1) {
        before = this.treeOf(this.mergeBase(sep[0], sep[1]));
        after = this.treeOf(sep[1]);
      } else {
        before = this.treeOf(refs[0]);
        after = copyFiles(this.files);
      }
    } else if (cached) {
      before = this.treeOf(this.headSha());
      after = copyFiles(this.index);
    } else {
      before = copyFiles(this.index);
      after = copyFiles(this.files);
    }
    var output;
    if (stat) output = this.statLines(before, after);
    else output = this.diffFiles(before, after, { paths: paths });
    if (!output.length) return result([]);
    return result(output);
  };

  Lab.prototype.cmdReflog = function (args) {
    var showRef = null;
    var all = false;
    var limit = null;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "show") showRef = args[++i] || "HEAD";
      else if (/^-\d+$/.test(args[i])) limit = Math.abs(Number(args[i]));
      else if (args[i] === "-n") limit = Number(args[++i]) || null;
      else if (args[i].indexOf("--date=") === 0) continue;
      else if (args[i] === "--all") all = true;
      else if (args[i] === "--oneline") continue;
    }
    var entries = this.reflog.filter(function (entry) {
      if (all) return true;
      return !showRef || entry.ref === showRef || (showRef === "HEAD" && entry.ref === "HEAD");
    });
    if (limit) entries = entries.slice(0, limit);
    if (!entries.length) return result([]);
    var counts = {};
    return result(entries.map(function (entry) {
      var key = entry.ref;
      var index = counts[key] == null ? 0 : counts[key];
      counts[key] = index + 1;
      return line(entry.sha + " " + entry.ref + "@{" + index + "}: " + entry.msg);
    }));
  };

  Lab.prototype.applyTree = function (sha, mode) {
    var tree = copyFiles(this.treeOf(sha));
    if (mode === "hard" || mode === "switch") {
      this.files = copyFiles(tree);
      this.index = copyFiles(tree);
      this.unmerged = {};
      this.conflicts = {};
    } else if (mode === "mixed") {
      this.index = copyFiles(tree);
      this.unmerged = {};
      this.conflicts = {};
    }
  };

  Lab.prototype.switchTo = function (ref, create, start) {
    var sha = this.resolve(start || ref);
    if (!sha) return fail(["fatal: invalid reference: " + (start || ref)]);
    if (create) {
      if (this.branches[ref]) return fail(["fatal: a branch named '" + ref + "' already exists"]);
      this.branches[ref] = sha;
      this.head = { type: "branch", ref: ref };
      this.applyTree(sha, "switch");
      this.addReflog(sha, "branch: Created from " + (start || "HEAD"));
      return result(["Switched to a new branch '" + ref + "'"]);
    }
    var existed = !!this.branches[ref];
    if (existed) {
      this.head = { type: "branch", ref: ref };
      this.applyTree(sha, "switch");
      this.addReflog(sha, "checkout: moving from " + (this.lastBranch || "HEAD") + " to " + ref);
      return result(["Switched to branch '" + ref + "'"]);
    }
    this.head = { type: "detached", sha: sha };
    this.applyTree(sha, "switch");
    this.addReflog(sha, "checkout: moving from " + (this.lastBranch || "HEAD") + " to " + sha);
    return result([
      "Note: switching to '" + ref + "'.",
      "",
      "You are in 'detached HEAD' state. You can look around, make experimental",
      "changes and commit them, and you can discard any commits you make in this",
      "state without impacting any branches.",
      "",
      "HEAD is now at " + sha.slice(0, 7) + " " + (this.commits[sha] ? this.commits[sha].subject : "")
    ]);
  };

  Lab.prototype.cmdBranch = function (args) {
    var self = this;
    if (args[0] === "--show-current") return result([this.headBranch() || ""]);
    if (args[0] === "-a" || args[0] === "--all") {
      var all = Object.keys(this.branches).sort().map(function (name) {
        return (self.head.type === "branch" && self.head.ref === name ? "* " : "  ") + name + " " + self.branches[name].slice(0, 7);
      });
      Object.keys(this.remotes).forEach(function (remote) {
        Object.keys(self.remotes[remote].branches).sort().forEach(function (name) {
          all.push("  remotes/" + remote + "/" + name + " " + self.remotes[remote].branches[name].slice(0, 7));
        });
      });
      return result(all);
    }
    if (args[0] === "-r" || args[0] === "--remotes") {
      var remotes = [];
      Object.keys(this.remotes).forEach(function (remote) {
        Object.keys(self.remotes[remote].branches).sort().forEach(function (name) {
          remotes.push("  " + remote + "/" + name);
        });
      });
      return result(remotes);
    }
    if (args[0] === "-d" || args[0] === "-D" || args[0] === "--delete") {
      var name = args[1];
      if (!name) return fail(["fatal: branch name required"]);
      if (name === this.headBranch()) return fail(["error: Cannot delete branch '" + name + "' checked out at '/home/ada/repo'"]);
      if (!this.branches[name]) return fail(["error: branch '" + name + "' not found."]);
      delete this.branches[name];
      this.refreshReachability();
      return result(["Deleted branch " + name + " (was " + (this.branches[name] || "").slice(0, 7) + ")."]);
    }
    if (args[0] === "-m" || args[0] === "--move") {
      var oldName = args[1];
      var newName = args[2];
      if (!newName) { newName = oldName; oldName = this.headBranch(); }
      if (!this.branches[oldName]) return fail(["error: refname refs/heads/" + oldName + " not found"]);
      this.branches[newName] = this.branches[oldName];
      delete this.branches[oldName];
      if (this.headBranch() === oldName) this.head.ref = newName;
      return result(["Branch '" + oldName + "' renamed to '" + newName + "'."]);
    }
    if (args[0] === "-f" || args[0] === "--force") {
      var fname = args[1];
      var fsha = this.resolve(args[2] || "HEAD");
      if (!fsha) return fail(["fatal: not a valid object name: '" + (args[2] || "HEAD") + "'"]);
      this.branches[fname] = fsha;
      return result([]);
    }
    var names = args.filter(function (a) { return a[0] !== "-"; });
    if (!names.length) {
      return result(Object.keys(this.branches).sort().map(function (name) {
        return (self.head.type === "branch" && self.head.ref === name ? "* " : "  ") + name;
      }));
    }
    var branchName = names[0];
    if (this.branches[branchName]) return fail(["fatal: a branch named '" + branchName + "' already exists"]);
    var sha = this.resolve(names[1] || "HEAD");
    if (!sha) return fail(["fatal: not a valid object name: '" + (names[1] || "HEAD") + "'"]);
    this.branches[branchName] = sha;
    this.refreshReachability();
    return result([]);
  };

  Lab.prototype.cmdCheckout = function (args, kind) {
    var create = false;
    var forceCreate = false;
    var paths = [];
    var refs = [];
    var side = null;
    var dashIndex = args.indexOf("--");
    var head = dashIndex === -1 ? args : args.slice(0, dashIndex);
    if (dashIndex !== -1) paths = args.slice(dashIndex + 1);
    head.forEach(function (arg) {
      if (arg === "-b" || arg === "-c") create = true;
      else if (arg === "-B" || arg === "-C") forceCreate = true;
      else if (arg === "--ours") side = "ours";
      else if (arg === "--theirs") side = "theirs";
      else if (arg[0] !== "-") refs.push(arg);
    });

    if (kind === "checkout" && !paths.length && args.length && args[args.length - 1] && !refs.length && dashIndex === -1) {
      paths = [args[args.length - 1]];
    }

    if (side) {
      var target = paths[0] || refs[0];
      if (!target) return fail(["fatal: specify a path"]);
      target = normalizePath(target);
      var conflict = this.conflicts[target];
      if (!conflict) return fail(["error: path '" + target + "' does not have our/their versions"]);
      this.files[target] = side === "ours" ? conflict.ours : conflict.theirs;
      return result([]);
    }

    if (paths.length) {
      var sourceSha = refs.length ? this.resolve(refs[0]) : null;
      if (refs.length && !sourceSha) return fail(["fatal: invalid reference: " + refs[0]]);
      var tree = sourceSha ? this.treeOf(sourceSha) : null;
      paths.forEach(function (path) {
        path = normalizePath(path);
        if (tree) {
          if (tree[path] == null) return;
          this.files[path] = tree[path];
          this.index[path] = tree[path];
        } else if (Object.prototype.hasOwnProperty.call(this.index, path)) {
          this.files[path] = this.index[path];
        } else {
          delete this.files[path];
        }
        if (this.unmerged[path]) {
          delete this.unmerged[path];
          delete this.conflicts[path];
        }
      }, this);
      return result([]);
    }

    if (!refs.length) {
      if (kind === "switch") return fail(["fatal: missing branch or commit argument"]);
      return result([]);
    }
    var name = refs[0];
    var start = refs[1];
    if (create || forceCreate) {
      if (forceCreate && this.branches[name]) {
        var startSha = this.resolve(start || "HEAD");
        this.branches[name] = startSha;
        this.head = { type: "branch", ref: name };
        this.applyTree(startSha, "switch");
        return result(["Switched to and reset branch '" + name + "'"]);
      }
      return this.switchTo(name, true, start || "HEAD");
    }
    if (this.branches[name] || start) {
      this.lastBranch = this.headBranch();
      return this.switchTo(name, false, start);
    }
    var sha = this.resolve(name);
    if (!sha) return fail(["error: pathspec '" + name + "' did not match any file(s) known to git"]);
    this.lastBranch = this.headBranch();
    return this.switchTo(name, false, sha);
  };

  Lab.prototype.cmdMerge = function (args, env) {
    var self = this;
    var ref = null;
    var abort = false;
    var cont = false;
    var noFF = false;
    var rewriteParents = false;
    var parentRefs = [];
    var message = null;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "--abort") abort = true;
      else if (args[i] === "--continue") cont = true;
      else if (args[i] === "--no-ff") noFF = true;
      else if (args[i] === "-m") message = args[++i];
      else if (args[i] === "--rewrite-parents") { rewriteParents = true; parentRefs = args.slice(i + 1); break; }
      else if (args[i][0] !== "-") ref = args[i];
    }
    if (rewriteParents) {
      var headSha = this.headSha();
      var parentShas = parentRefs.map(function (p) { return self.resolve(p); });
      if (!headSha || parentShas.some(function (p) { return !p; })) return fail(["fatal: invalid parent"]);
      this.replacements[headSha] = parentShas;
      return result(["Rewrote parents of " + headSha + " to " + parentShas.join(" "), "The commit tree is unchanged."]);
    }
    if (abort) {
      if (!this.mergeState) return fail(["fatal: There is no merge to abort"]);
      this.files = copyFiles(this.mergeState.preFiles);
      this.index = copyFiles(this.mergeState.preIndex);
      this.unmerged = {};
      this.conflicts = {};
      if (this.head.type === "branch") this.branches[this.head.ref] = this.mergeState.preHead;
      else this.head.sha = this.mergeState.preHead;
      this.mergeState = null;
      return result(["Merge aborted."]);
    }
    if (cont) {
      if (!this.mergeState) return fail(["fatal: There is no merge in progress"]);
      if (Object.keys(this.unmerged).length) return fail(["error: Committing is not possible because you have unmerged files."]);
      return this.cmdCommit(["-m", message || this.mergeState.message], env);
    }
    if (!ref) return fail(["fatal: You have not concluded your merge (MERGE_HEAD exists)."]);
    var other = this.resolve(ref);
    if (!other) return fail(["merge: " + ref + " - not something we can merge"]);
    if (!this.headSha()) return fail(["fatal: no commits yet"]);
    if (this.isAncestor(other, this.headSha())) return result(["Already up to date."]);
    if (this.isAncestor(this.headSha(), other) && !noFF) {
      var fastTip = other;
      var oldTip = this.headSha();
      if (this.head.type === "branch") this.branches[this.head.ref] = fastTip;
      else this.head.sha = fastTip;
      this.applyTree(fastTip, "hard");
      this.addReflog(fastTip, "merge " + ref + ": Fast-forward");
      return result(["Updating " + oldTip.slice(0, 7) + ".." + fastTip.slice(0, 7), "Fast-forward", " " + (this.commits[fastTip] ? this.commits[fastTip].subject : "")]);
    }
    var base = this.mergeBase(this.headSha(), other);
    var baseTree = base ? this.treeOf(base) : {};
    var ourTree = this.treeOf(this.headSha());
    var theirTree = this.treeOf(other);
    var paths = {};
    Object.keys(baseTree).forEach(function (p) { paths[p] = true; });
    Object.keys(ourTree).forEach(function (p) { paths[p] = true; });
    Object.keys(theirTree).forEach(function (p) { paths[p] = true; });
    var next = {};
    var conflicts = [];
    Object.keys(paths).forEach(function (path) {
      var b = baseTree[path] == null ? null : baseTree[path];
      var o = ourTree[path] == null ? null : ourTree[path];
      var t = theirTree[path] == null ? null : theirTree[path];
      if (o === t) { if (o != null) next[path] = o; return; }
      if (o === b) { if (t != null) next[path] = t; return; }
      if (t === b) { if (o != null) next[path] = o; return; }
      conflicts.push({ path: path, base: b, ours: o, theirs: t });
    });
    if (conflicts.length) {
      var preFiles = copyFiles(this.files);
      var preIndex = copyFiles(this.index);
      this.mergeState = {
        other: other,
        label: ref,
        preHead: this.headSha(),
        preFiles: preFiles,
        preIndex: preIndex,
        message: "Merge branch '" + ref + "'"
      };
      this.index = copyFiles(next);
      this.files = copyFiles(next);
      conflicts.forEach(function (c) {
        self.conflicts[c.path] = { base: c.base, ours: c.ours, theirs: c.theirs, label: ref };
        self.unmerged[c.path] = true;
        self.files[c.path] = conflictText(self.conflicts[c.path], ref);
      });
      var out = ["Auto-merging " + conflicts[0].path];
      conflicts.forEach(function (c) {
        out.push("CONFLICT (content): Merge conflict in " + c.path);
      });
      out.push("Automatic merge failed; fix conflicts and then commit the result.");
      return fail(out);
    }
    this.files = copyFiles(next);
    var mergeSha = this.createCommit({
      message: message || this.mergeState && this.mergeState.message || "Merge branch '" + ref + "'",
      parents: [this.headSha(), other],
      tree: next,
      reflogPrefix: "merge " + ref
    });
    return result(["Merge made by the 'ort' strategy.", " " + mergeSha + " " + this.commits[mergeSha].subject]);
  };

  Lab.prototype.cmdReset = function (args) {
    var mode = "mixed";
    var ref = null;
    var paths = [];
    var dash = args.indexOf("--");
    var headArgs = dash === -1 ? args : args.slice(0, dash);
    if (dash !== -1) paths = args.slice(dash + 1);
    headArgs.forEach(function (arg) {
      if (arg === "--soft") mode = "soft";
      else if (arg === "--mixed") mode = "mixed";
      else if (arg === "--hard") mode = "hard";
      else if (arg[0] !== "-") ref = arg;
    });
    if (paths.length) {
      paths.forEach(function (path) {
        path = normalizePath(path);
        var target = this.treeOf("HEAD")[path];
        if (target == null) delete this.index[path];
        else this.index[path] = target;
      }, this);
      return result(["Unstaged changes after reset:"]);
    }
    var sha = ref ? this.resolve(ref) : this.headSha();
    if (!sha) return fail(["fatal: ambiguous argument '" + (ref || "HEAD") + "': unknown revision"]);
    if (this.head.type === "branch") this.branches[this.head.ref] = sha;
    else this.head.sha = sha;
    this.mergeState = null;
    this.rebaseState = null;
    this.cherryState = null;
    this.applyTree(sha, mode);
    this.addReflog(sha, "reset: moving to " + (ref || "HEAD"));
    this.refreshReachability();
    if (mode === "hard") {
      return result(["HEAD is now at " + sha.slice(0, 7) + " " + (this.commits[sha] ? this.commits[sha].subject : "")]);
    }
    var out = [];
    if (mode === "mixed" && this.commits[sha]) {
      out.push("Unstaged changes after reset:");
      Object.keys(this.files).forEach(function (path) {
        if (this.treeOf(sha)[path] !== this.files[path]) out.push("M\t" + path);
      }, this);
    }
    return result(out);
  };

  Lab.prototype.cmdRestore = function (args) {
    var staged = false;
    var worktree = false;
    var source = null;
    var paths = [];
    args.forEach(function (arg) {
      if (arg === "--staged") staged = true;
      else if (arg === "--worktree") worktree = true;
      else if (arg.indexOf("--source=") === 0) source = arg.slice(9);
      else if (arg === "--source") source = args[args.indexOf(arg) + 1];
      else if (arg[0] !== "-") paths.push(arg);
    });
    if (!staged && !worktree) worktree = true;
    if (!paths.length) return fail(["fatal: you must specify path(s) to restore"]);
    var headTree = this.treeOf("HEAD");
    var sourceTree = source ? this.treeOf(source) : headTree;
    var universe = {};
    Object.keys(this.index).forEach(function (path) { universe[path] = true; });
    Object.keys(this.files).forEach(function (path) { universe[path] = true; });
    Object.keys(headTree).forEach(function (path) { universe[path] = true; });
    Object.keys(sourceTree).forEach(function (path) { universe[path] = true; });
    var matched = Object.keys(universe).filter(function (path) {
      return paths.some(function (matcher) { return pathMatches(path, matcher); });
    });
    var self = this;
    matched.forEach(function (path) {
      if (staged) {
        var target = sourceTree[path];
        if (target == null) delete self.index[path];
        else self.index[path] = target;
      }
      if (self.unmerged[path]) {
        delete self.unmerged[path];
        delete self.conflicts[path];
      }
    });
    if (worktree) {
      matched.forEach(function (path) {
        var from = source ? sourceTree[path] : self.index[path];
        if (from == null) delete self.files[path];
        else self.files[path] = from;
      });
    }
    return result([]);
  };

  /* --------------------------------------------------------------- replay */

  Lab.prototype.changePaths = function (sha) {
    var commit = this.commits[sha];
    if (!commit) return [];
    var parentTree = commit.parents[0] && this.commits[commit.parents[0]] ? this.commits[commit.parents[0]].tree : {};
    var paths = {};
    Object.keys(parentTree).forEach(function (p) { paths[p] = true; });
    Object.keys(commit.tree).forEach(function (p) { paths[p] = true; });
    return Object.keys(paths).filter(function (p) { return parentTree[p] !== commit.tree[p]; });
  };

  Lab.prototype.applyCommitDiff = function (sha, label) {
    var commit = this.commits[sha];
    if (!commit) return { error: "unknown commit " + sha };
    var parentTree = commit.parents[0] && this.commits[commit.parents[0]] ? this.commits[commit.parents[0]].tree : {};
    var changed = this.changePaths(sha);
    var next = copyFiles(this.index);
    var conflicts = [];
    changed.forEach(function (path) {
      var base = parentTree[path] == null ? null : parentTree[path];
      var target = commit.tree[path] == null ? null : commit.tree[path];
      var ours = next[path] == null ? null : next[path];
      if (ours === target) return;
      if (target === base) return;
      if (ours === base) {
        if (target == null) delete next[path];
        else next[path] = target;
        return;
      }
      conflicts.push({ path: path, base: base, ours: ours, theirs: target });
    });
    this.index = copyFiles(next);
    this.files = copyFiles(next);
    if (conflicts.length) {
      var self = this;
      this.unmerged = {};
      this.conflicts = {};
      conflicts.forEach(function (c) {
        self.conflicts[c.path] = { base: c.base, ours: c.ours, theirs: c.theirs, label: label || ("parent of " + sha.slice(0, 7)) };
        self.unmerged[c.path] = true;
        self.files[c.path] = conflictText(self.conflicts[c.path], label || ("parent of " + sha.slice(0, 7)));
      });
      return { conflict: true, conflicts: conflicts, commit: commit, tree: next };
    }
    return { conflict: false, commit: commit, tree: copyFiles(this.index) };
  };

  Lab.prototype.finishReplayCommit = function (commit, tree, message, suffix) {
    var text = message || commit.subject;
    if (suffix) text += "\n\n" + suffix;
    return this.createCommit({
      message: text,
      tree: tree,
      parents: [this.headSha()],
      author: commit.author,
      reflogPrefix: "cherry-pick"
    });
  };

  /* --------------------------------------------------------------- rebase */

  Lab.prototype.rebasePlanFor = function (upstream, onto, branch) {
    var tipSha = branch ? this.branches[branch] : this.headSha();
    var upstreamSha = this.resolve(upstream || "HEAD");
    var ontoSha = onto ? this.resolve(onto) : upstreamSha;
    if (!tipSha || !upstreamSha || !ontoSha) return null;
    var base = this.mergeBase(tipSha, upstreamSha) || upstreamSha;
    var list = this.rangeCommits(base, tipSha, false).slice().reverse();
    return {
      branch: branch || this.headBranch(),
      tip: tipSha,
      upstream: upstreamSha,
      onto: ontoSha,
      base: base,
      todo: list
    };
  };

  Lab.prototype.seedRebase = function (cfg) {
    var plan = this.rebasePlanFor(cfg.upstream || "main", cfg.onto, cfg.branch);
    if (!plan) return;
    this.rebaseState = {
      plan: plan,
      todo: cfg.remaining || plan.todo.slice(0),
      index: 0,
      pending: null,
      preHead: this.headSha(),
      preType: this.head.type,
      preBranch: this.headBranch(),
      preFiles: copyFiles(this.files),
      preIndex: copyFiles(this.index),
      preUnmerged: clone(this.unmerged),
      interactive: false
    };
    if (cfg.todo != null) this.rebaseState.todo = cfg.todo;
  };

  Lab.prototype.startRebase = function (plan, interactive) {
    this.rebaseState = {
      plan: plan,
      todo: plan.todo.slice(),
      index: 0,
      pending: null,
      preHead: this.headSha(),
      preType: this.head.type,
      preBranch: this.headBranch(),
      preFiles: copyFiles(this.files),
      preIndex: copyFiles(this.index),
      preUnmerged: clone(this.unmerged),
      interactive: !!interactive
    };
    if (this.head.type === "branch") this.branches[this.head.ref] = plan.onto;
    else this.head.sha = plan.onto;
    this.applyTree(plan.onto, "hard");
    return this.continueRebase();
  };

  Lab.prototype.continueRebase = function () {
    var state = this.rebaseState;
    if (!state) return fail(["fatal: no rebase in progress"]);
    var output = [];
    if (state.pending) {
      if (Object.keys(this.unmerged).length) {
        return fail(["error: you must resolve all conflicts before continuing", "hint: stage the resolution with 'git add <path>'"]);
      }
      var pending = state.pending;
      this.finishReplayCommit(pending.commit, copyFiles(this.index), pending.message || pending.commit.subject, pending.suffix);
      output.push("[" + (this.headBranch() || "detached HEAD") + " " + this.headSha().slice(0, 7) + "] " + (pending.message || pending.commit.subject));
      state.pending = null;
    }
    while (state.todo.length) {
      var sha = state.todo.shift();
      var commit = this.commits[sha];
      var res = this.applyCommitDiff(sha, state.plan.branch || "upstream");
      if (res.error) return fail([res.error]);
      if (res.conflict) {
        state.pending = { commit: res.commit, tree: res.tree };
        res.conflicts.forEach(function (c) {
          output.push("CONFLICT (content): Merge conflict in " + c.path);
        });
        output.push("error: could not apply " + sha.slice(0, 7) + "... " + commit.subject);
        output.push("hint: Resolve all conflicts manually, mark them as resolved with");
        output.push("hint: \"git add <path>\", then run \"git rebase --continue\".");
        return fail(output);
      }
      var changed = this.changePaths(sha).some(function (p) {
        return commit.tree[p] !== (commit.parents[0] && this.commits[commit.parents[0]] ? this.commits[commit.parents[0]].tree[p] : null);
      }, this);
      var applied = !treesEqual(this.treeOf(this.headSha()), copyFiles(this.index));
      if (!applied) {
        output.push("dropping " + sha.slice(0, 7) + " -- patch contents already upstream");
        continue;
      }
      this.finishReplayCommit(commit, copyFiles(this.index), commit.subject);
      output.push("[" + (this.headBranch() || "detached HEAD") + " " + this.headSha().slice(0, 7) + "] " + commit.subject);
    }
    output.push("Successfully rebased and updated " + (this.head.type === "branch" ? "refs/heads/" + this.head.ref : "detached HEAD") + ".");
    this.rebaseState = null;
    this.refreshReachability();
    return result(output);
  };

  Lab.prototype.cmdRebase = function (args, env) {
    var abort = false;
    var cont = false;
    var skip = false;
    var interactive = false;
    var onto = null;
    var upstream = null;
    var branch = null;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "--abort") abort = true;
      else if (args[i] === "--continue") cont = true;
      else if (args[i] === "--skip") skip = true;
      else if (args[i] === "-i" || args[i] === "--interactive") interactive = true;
      else if (args[i] === "--onto") onto = args[++i];
      else if (args[i] === "--exec" || args[i] === "-x") args[++i];
      else if (args[i][0] !== "-") {
        if (!upstream) upstream = args[i];
        else if (!branch) branch = args[i];
      }
    }
    if (abort) {
      if (!this.rebaseState) return fail(["fatal: no rebase in progress"]);
      var st = this.rebaseState;
      if (st.preType === "branch") {
        this.head = { type: "branch", ref: st.preBranch };
        this.branches[st.preBranch] = st.preHead;
      } else {
        this.head = { type: "detached", sha: st.preHead };
      }
      this.files = copyFiles(st.preFiles || this.treeOf(st.preHead));
      this.index = copyFiles(st.preIndex || this.treeOf(st.preHead));
      this.unmerged = {};
      this.conflicts = {};
      this.rebaseState = null;
      return result(["Rebase aborted; " + (st.preBranch || "HEAD") + " is back at " + st.preHead.slice(0, 7)]);
    }
    if (cont) return this.continueRebase();
    if (skip) {
      if (!this.rebaseState) return fail(["fatal: no rebase in progress"]);
      this.rebaseState.pending = null;
      this.unmerged = {};
      this.conflicts = {};
      return this.continueRebase();
    }
    var plan = this.rebasePlanFor(upstream, onto, branch);
    if (!plan) return fail(["fatal: invalid upstream '" + (upstream || "HEAD") + "'"]);
    if (!plan.todo.length) {
      if (branch) {
        this.head = { type: "branch", ref: branch };
      }
      if (this.branches[plan.branch] !== plan.onto) {
        this.branches[plan.branch] = plan.onto;
        this.applyTree(plan.onto, "hard");
      }
      return result(["Current branch " + plan.branch + " is up to date."]);
    }
    if (branch && this.headBranch() !== branch) {
      this.head = { type: "branch", ref: branch };
    }
    if (interactive) {
      return result([
        "Interactive rebase plan for " + plan.todo.length + " commit" + (plan.todo.length === 1 ? "" : "s") + ":",
        "",
        plan.todo.map(function (sha, index) {
          return (index + 1) + ". pick " + sha.slice(0, 7) + " " + this.commits[sha].subject;
        }, this).join("\n"),
        "",
        "Choose pick, squash, fixup, reword or drop in the plan editor."
      ], 0, { interactive: { plan: plan, commits: plan.todo.map(function (sha) { return { sha: sha, subject: this.commits[sha].subject }; }, this) } });
    }
    return this.startRebase(plan, false);
  };

  Lab.prototype.applyRebasePlan = function (plan, actions) {
    var self = this;
    var map = {};
    (actions || []).forEach(function (action) { map[action.sha] = action; });
    this.rebaseState = null;
    if (this.head.type !== "branch" || this.head.ref !== plan.branch) {
      if (this.branches[plan.branch]) this.head = { type: "branch", ref: plan.branch };
      else this.head = { type: "branch", ref: plan.branch };
    }
    this.branches[plan.branch] = plan.onto;
    this.applyTree(plan.onto, "hard");
    var output = [];
    for (var i = 0; i < plan.todo.length; i++) {
      var sha = plan.todo[i];
      var commit = this.commits[sha];
      var action = map[sha] || { action: "pick" };
      if (action.action === "drop") {
        output.push("drop " + sha.slice(0, 7) + " " + commit.subject);
        continue;
      }
      var res = this.applyCommitDiff(sha, plan.branch);
      if (res.conflict) {
        this.rebaseState = {
          plan: plan,
          todo: plan.todo.slice(i + 1),
          pending: {
            commit: commit,
            message: action.action === "reword" ? action.message || commit.subject : commit.subject,
            squash: action.action === "squash" || action.action === "fixup"
          },
          preHead: plan.tip,
          preType: "branch",
          preBranch: plan.branch,
          preFiles: copyFiles(this.treeOf(plan.tip)),
          preIndex: copyFiles(this.treeOf(plan.tip)),
          interactive: true
        };
        output.push("CONFLICT while applying " + sha.slice(0, 7) + " " + commit.subject);
        output.push("Resolve the files, run 'git add <path>', then 'git rebase --continue'.");
        return fail(output);
      }
      var currentTree = copyFiles(this.index);
      if (treesEqual(currentTree, this.treeOf(this.headSha()))) {
        output.push("dropping " + sha.slice(0, 7) + " -- empty after replay");
        continue;
      }
      if (action.action === "squash" || action.action === "fixup") {
        var head = this.commits[this.headSha()];
        var parents = head.parents.slice();
        var message = action.action === "squash" ? head.subject + "\n\n" + commit.subject : head.subject;
        this.index = currentTree;
        var newSha = this.nextSha(message);
        this.commits[newSha] = {
          sha: newSha,
          parents: parents,
          subject: firstLine(message),
          body: message.split("\n").slice(1).join("\n").trim(),
          author: head.author,
          date: head.date,
          seq: this.seq++,
          tree: currentTree
        };
        this.order.push(newSha);
        this.branches[plan.branch] = newSha;
        this.files = copyFiles(currentTree);
        this.addReflog(newSha, "rebase (squash): " + firstLine(message));
        output.push("[" + plan.branch + " " + newSha.slice(0, 7) + "] " + firstLine(message));
      } else {
        var msg = action.action === "reword" ? action.message || commit.subject : commit.subject;
        this.finishReplayCommit(commit, currentTree, msg);
        output.push("[" + plan.branch + " " + this.headSha().slice(0, 7) + "] " + firstLine(msg));
      }
    }
    output.push("Successfully rebased and updated refs/heads/" + plan.branch + ".");
    this.rebaseState = null;
    this.refreshReachability();
    return result(output);
  };

  /* ---------------------------------------------------------- cherry-pick */

  Lab.prototype.cmdCherryPick = function (args) {
    var self = this;
    var keepHash = false;
    var abort = false;
    var cont = false;
    var skip = false;
    var refs = [];
    args.forEach(function (arg) {
      if (arg === "-x") keepHash = true;
      else if (arg === "--abort") abort = true;
      else if (arg === "--continue") cont = true;
      else if (arg === "--skip") skip = true;
      else if (arg[0] !== "-") refs.push(arg);
    });
    if (abort) {
      if (!this.cherryState) return fail(["fatal: no cherry-pick in progress"]);
      this.files = copyFiles(this.cherryState.preFiles);
      this.index = copyFiles(this.cherryState.preIndex);
      this.unmerged = {};
      this.conflicts = {};
      this.cherryState = null;
      return result(["Cherry-pick aborted."]);
    }
    if (cont) {
      if (!this.cherryState) return fail(["fatal: no cherry-pick in progress"]);
      if (Object.keys(this.unmerged).length) return fail(["error: you must resolve all conflicts before continuing"]);
      var pending = this.cherryState.pending;
      this.finishReplayCommit(pending.commit, copyFiles(this.index), pending.message, pending.suffix);
      var rest = this.cherryState.todo.slice();
      this.cherryState = null;
      return this.runCherryPick(rest, pending.keepHash);
    }
    if (skip) {
      var todo = this.cherryState ? this.cherryState.todo.slice() : [];
      this.cherryState = null;
      this.unmerged = {};
      this.conflicts = {};
      return this.runCherryPick(todo, keepHash);
    }
    if (!refs.length) return fail(["fatal: cherry-pick requires a commit"]);
    return this.runCherryPick(refs, keepHash);
  };

  Lab.prototype.runCherryPick = function (refs, keepHash) {
    var self = this;
    var output = [];
    var list = refs.map(function (ref) { return self.resolve(ref); });
    if (list.some(function (sha) { return !sha; })) return fail(["fatal: bad revision"]);
    list = list.filter(function (sha) { return !!sha; });

    for (var i = 0; i < list.length; i++) {
      var sha = list[i];
      var commit = this.commits[sha];
      var res = this.applyCommitDiff(sha, "cherry-pick");
      if (res.conflict) {
        this.cherryState = {
          pending: {
            commit: commit,
            message: commit.subject,
            suffix: keepHash ? "(cherry picked from commit " + sha + ")" : "",
            keepHash: keepHash
          },
          todo: list.slice(i + 1),
          preFiles: copyFiles(this.treeOf(this.headSha())),
          preIndex: copyFiles(this.treeOf(this.headSha()))
        };
        output.push("CONFLICT (content): Merge conflict in " + res.conflicts[0].path);
        output.push("error: could not apply " + sha.slice(0, 7) + "... " + commit.subject);
        return fail(output);
      }
      var applied = !treesEqual(this.treeOf(this.headSha()), copyFiles(this.index));
      if (!applied) {
        output.push("The previous cherry-pick is now empty, possibly due to conflict resolution.");
        continue;
      }
      var suffix = keepHash ? "(cherry picked from commit " + sha + ")" : "";
      var created = this.finishReplayCommit(commit, copyFiles(this.index), commit.subject, suffix);
      output.push("[" + (this.headBranch() || "detached HEAD") + " " + created + "] " + commit.subject);
    }
    this.refreshReachability();
    return result(output);
  };

  /* ---------------------------------------------------------------- revert */

  Lab.prototype.cmdRevert = function (args) {
    var mainline = null;
    var refs = [];
    var noEdit = false;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "-m" || args[i] === "--mainline") mainline = Number(args[++i]);
      else if (args[i] === "--no-edit") noEdit = true;
      else if (args[i][0] !== "-") refs.push(args[i]);
    }
    if (!refs.length) return fail(["fatal: revert requires a commit"]);
    var self = this;
    var output = [];
    refs.forEach(function (ref) {
      var sha = self.resolve(ref);
      if (!sha) { output.push("fatal: bad revision '" + ref + "'"); return; }
      var commit = self.commits[sha];
      if (commit.parents.length > 1 && !mainline) {
        output.push("error: commit " + sha + " is a merge but no -m option was given.");
        return;
      }
      var parentSha = commit.parents[(mainline || 1) - 1];
      var baseTree = parentSha ? self.commits[parentSha].tree : {};
      var current = copyFiles(self.treeOf(self.headSha()));
      Object.keys(commit.tree).forEach(function (path) {
        if (baseTree[path] !== commit.tree[path]) {
          if (baseTree[path] == null) delete current[path];
          else current[path] = baseTree[path];
        }
      });
      Object.keys(baseTree).forEach(function (path) {
        if (!Object.prototype.hasOwnProperty.call(commit.tree, path) && current[path] == null) delete current[path];
      });
      self.index = copyFiles(current);
      self.files = copyFiles(current);
      var message = 'Revert "' + commit.subject + '"\n\nThis reverts commit ' + sha + ".";
      var created = self.createCommit({ message: message, tree: current, reflogPrefix: "revert" });
      output.push("[" + (self.headBranch() || "detached HEAD") + " " + created + "] " + firstLine(message));
    });
    return result(output);
  };

  /* ----------------------------------------------------------------- stash */

  Lab.prototype.cmdStash = function (args) {
    var self = this;
    var sub = args[0] && args[0][0] !== "-" ? args[0] : "push";
    var rest = sub === "push" && (!args[0] || args[0][0] === "-") ? args : args.slice(1);

    if (sub === "list") {
      if (!this.stash.length) return result([]);
      return result(this.stash.map(function (entry, index) {
        return "stash@{" + index + "}: " + (entry.message.indexOf("WIP on") === 0 ? entry.message : "On " + entry.branch + ": " + entry.message);
      }));
    }

    if (sub === "drop") {
      var index = rest[0] ? Number(rest[0].replace(/\D/g, "")) : 0;
      if (!this.stash[index]) return fail(["error: stash entry not found"]);
      var removed = this.stash.splice(index, 1)[0];
      this.stashDropped.push(removed);
      return result(["Dropped refs/stash@{" + index + "} (" + (removed.sha || "wip") + ")"]);
    }

    if (sub === "branch") {
      var branchName = rest[0];
      if (!branchName) return fail(["fatal: branch name required"]);
      var entry = this.stash[rest[1] ? Number(rest[1]) : 0];
      if (!entry) return fail(["error: stash entry not found"]);
      this.branches[branchName] = this.headSha();
      this.addReflog(this.headSha(), "branch: Created from stash");
      this.applyStash(entry);
      return result(["Switched to a new branch '" + branchName + "'"]);
    }

    if (sub === "apply" || sub === "pop") {
      var target = rest[0];
      var found = null;
      if (target && target.indexOf("stash@") === 0) {
        var idx = Number(target.replace(/\D/g, "")) || 0;
        found = this.stash[idx];
      } else if (target) {
        found = this.stashDropped.filter(function (entry) { return entry.sha === target || (entry.sha || "").indexOf(target) === 0; })[0] ||
          this.stash.filter(function (entry) { return entry.sha === target; })[0];
        if (!found) {
          var commit = this.commits[this.resolve(target)];
          if (commit) {
            found = { message: "recovered " + target, branch: this.headBranch(), files: commit.tree, index: commit.tree, untracked: [] };
          }
        }
      } else {
        found = this.stash[0];
      }
      if (!found) return fail(["error: no stash entries found"]);
      var output = [];
      if (found.untracked && found.untracked.length) {
        found.untracked.forEach(function (path) {
          if (!found.files[path]) found.files[path] = self.readFile(path) || "recovered untracked file\n";
        });
      }
      this.applyStash(found);
      output.push("On branch " + (this.headBranch() || "HEAD"));
      output.push("Changes not staged for commit:");
      Object.keys(found.files).forEach(function (path) {
        output.push("        modified:   " + path);
      });
      if (sub === "pop") {
        var at = this.stash.indexOf(found);
        if (at !== -1) this.stash.splice(at, 1);
      }
      return result(output);
    }

    var message = null;
    var paths = [];
    var dash = rest.indexOf("--");
    var opts = dash === -1 ? rest : rest.slice(0, dash);
    if (dash !== -1) paths = rest.slice(dash + 1);
    for (var i = 0; i < opts.length; i++) {
      if (opts[i] === "-m" || opts[i] === "--message") message = opts[++i];
    }
    var headTree = this.treeOf(this.headSha());
    var dirty = [];
    Object.keys(this.files).forEach(function (path) {
      if (self.files[path] !== headTree[path] && self.index[path] !== self.files[path]) dirty.push(path);
      else if (self.files[path] !== self.index[path]) dirty.push(path);
    });
    Object.keys(headTree).forEach(function (path) {
      if (!Object.prototype.hasOwnProperty.call(self.files, path)) dirty.push(path);
    });
    if (paths.length) {
      dirty = dirty.filter(function (path) { return paths.some(function (matcher) { return pathMatches(path, matcher); }); });
    }
    dirty = dirty.filter(function (path, index) { return dirty.indexOf(path) === index; });
    if (!dirty.length) return result(["No local changes to save"]);
    var savedFiles = {};
    var savedIndex = {};
    dirty.forEach(function (path) {
      savedFiles[path] = self.files[path] == null ? null : self.files[path];
      savedIndex[path] = self.index[path] == null ? null : self.index[path];
      var target = headTree[path];
      if (target == null) {
        delete self.files[path];
        delete self.index[path];
      } else {
        self.files[path] = target;
        self.index[path] = target;
      }
    });
    var entry = {
      message: message || "WIP on " + (this.headBranch() || "HEAD") + ": " + (this.headSha() || "").slice(0, 7) + " " + (this.commits[this.headSha()] ? this.commits[this.headSha()].subject : ""),
      branch: this.headBranch() || "HEAD",
      files: savedFiles,
      index: savedIndex,
      untracked: [],
      sha: this.nextSha("stash")
    };
    this.stash.unshift(entry);
    return result(["Saved working directory and index state " + entry.message]);
  };

  Lab.prototype.applyStash = function (entry) {
    var self = this;
    Object.keys(entry.files).forEach(function (path) {
      if (entry.files[path] == null) delete self.files[path];
      else self.files[path] = entry.files[path];
    });
    (entry.untracked || []).forEach(function (path) {
      if (self.files[path] == null) self.files[path] = "recovered untracked file\n";
    });
  };

  /* ---------------------------------------------------------------- bisect */

  Lab.prototype.cmdBisect = function (args) {
    var sub = args[0];
    if (sub === "start") {
      var startArgs = args.slice(1).filter(function (a) { return a[0] !== "-"; });
      this.bisect = {
        savedHead: this.headSha(),
        savedType: this.head.type,
        savedBranch: this.headBranch(),
        path: this.bisectPath ? this.bisectPath.slice() : null,
        low: null,
        high: null,
        bad: null,
        good: null
      };
      var firstBad = this.bisectFirstBad;
      if (!this.bisect.path && startArgs.length >= 2) {
        this.bisect.good = this.resolve(startArgs[0]);
        this.bisect.bad = this.resolve(startArgs[1]);
      }
      var out = ["status: waiting for both good and bad commits"];
      if (startArgs.length) {
        var goodTry = this.resolve(startArgs[0]);
        var badTry = this.resolve(startArgs[startArgs.length - 1]);
        if (goodTry && badTry) {
          this.bisect.good = goodTry;
          this.bisect.bad = badTry;
          this.bisect.low = 0;
          this.bisect.high = (this.bisect.path ? this.bisect.path.length : 4) - 1;
          out = ["status: waiting for both good and bad commits"];
        }
      }
      return result(out);
    }
    if (sub === "reset") {
      if (this.bisect) {
        if (this.bisect.savedType === "branch") {
          this.head = { type: "branch", ref: this.bisect.savedBranch };
        } else {
          this.head = { type: "detached", sha: this.bisect.savedHead };
        }
        this.applyTree(this.bisect.savedHead, "switch");
      }
      this.bisect = null;
      return result(["Previous HEAD position was restored."]);
    }
    if (!this.bisect) return fail(["You need to start by 'git bisect start'"]);

    if (sub === "run") {
      var resultSha = this.bisectFirstBad;
      if (!resultSha && this.bisect.path && this.bisect.path.length) resultSha = this.bisect.path[this.bisect.path.length - 1];
      if (!resultSha) return fail(["error: no bad commit configured for this lab"]);
      this.bisectResult = resultSha;
      this.bisect.result = resultSha;
      this.head = { type: "detached", sha: resultSha };
      this.applyTree(resultSha, "switch");
      var badCommit = this.commits[resultSha];
      return result([
        "running " + (args.slice(1).join(" ") || "./scripts/check.sh"),
        "Bisecting: 0 revisions left to test after this (roughly 0 steps)",
        resultSha + " is the first bad commit",
        "commit " + resultSha,
        "Author: " + (badCommit ? badCommit.author.name : "Ada") + " <" + (badCommit ? badCommit.author.email : "ada@example.com") + ">",
        "",
        "    " + (badCommit ? badCommit.subject : "regression"),
        "",
        "The test command failed with exit code 1 at this commit."
      ], 1);
    }

    if (sub !== "good" && sub !== "bad") return fail(["usage: git bisect start|good|bad|run|reset"]);
    var ref = args[1] || "HEAD";
    var sha = sub === "bad" && (args[1] === "HEAD" || !args[1]) ? this.headSha() : this.resolve(ref);
    if (!sha) return fail(["fatal: bad revision '" + ref + "'"]);
    var state = this.bisect;
    if (!state.path) {
      if (sub === "bad") state.bad = sha;
      else state.good = sha;
      if (!state.bad || !state.good) {
        return result(["status: waiting for " + (state.bad ? "good" : "bad") + " commit"]);
      }
      var chain = [];
      var cursor = this.resolve(state.bad);
      var seen = {};
      while (cursor && !seen[cursor]) {
        seen[cursor] = true;
        chain.unshift(cursor);
        if (cursor === this.resolve(state.good)) break;
        var c = this.commits[cursor];
        cursor = c && c.parents[0] ? c.parents[0] : null;
      }
      state.path = chain;
      state.low = 0;
      state.high = chain.length - 1;
    } else {
      var index = state.path.indexOf(sha);
      if (index === -1) return fail(["error: commit is not in the bisect range"]);
      if (sub === "bad") state.high = index;
      else state.low = index;
    }
    if (state.low == null || state.high == null) return result(["status: waiting for both good and bad commits"]);
    if (state.high - state.low <= 1) {
      var found = state.path[state.high];
      this.bisectResult = found;
      state.result = found;
      this.head = { type: "detached", sha: found };
      this.applyTree(found, "switch");
      return result([
        found + " is the first bad commit",
        "commit " + found,
        "Author: " + (this.commits[found] ? this.commits[found].author.name : "Ada"),
        "",
        "    " + (this.commits[found] ? this.commits[found].subject : "regression")
      ]);
    }
    var mid = Math.floor((state.low + state.high) / 2);
    var candidate = state.path[mid];
    this.head = { type: "detached", sha: candidate };
    this.applyTree(candidate, "switch");
    return result([
      "Bisecting: " + (state.high - state.low - 1) + " revision" + (state.high - state.low - 1 === 1 ? "" : "s") + " left to test",
      "HEAD is now at " + candidate.slice(0, 7) + " " + (this.commits[candidate] ? this.commits[candidate].subject : "")
    ]);
  };

  /* ------------------------------------------------------------------ refs */

  Lab.prototype.cmdTag = function (args) {
    var self = this;
    var del = false;
    var names = [];
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "-d" || args[i] === "--delete") del = true;
      else if (args[i] === "-a" || args[i] === "-m" || args[i] === "-f") { if (args[i] === "-m") i++; }
      else if (args[i][0] !== "-") names.push(args[i]);
    }
    if (!names.length) {
      return result(Object.keys(this.tags).sort().map(function (name) {
        return name + " " + self.tags[name].slice(0, 7);
      }));
    }
    if (del) {
      names.forEach(function (name) { delete self.tags[name]; });
      return result(names.map(function (name) { return "Deleted tag '" + name + "'"; }));
    }
    var target = names[1] ? this.resolve(names[1]) : this.headSha();
    if (!target) return fail(["fatal: Failed to resolve '" + (names[1] || "HEAD") + "' as a valid ref."]);
    this.tags[names[0]] = target;
    return result([]);
  };

  Lab.prototype.cmdRemote = function (args) {
    var self = this;
    if (!args.length || args[0] === "-v" || args[0] === "--verbose") {
      var out = [];
      Object.keys(this.remotes).forEach(function (name) {
        out.push(name + "\t" + self.remotes[name].url + " (fetch)");
        out.push(name + "\t" + self.remotes[name].url + " (push)");
      });
      return result(out);
    }
    if (args[0] === "add") {
      var name = args[1];
      var url = args[2] || "https://example.com/" + name + "/repo.git";
      if (this.remotes[name]) return fail(["error: remote " + name + " already exists."]);
      this.remotes[name] = { url: url, branches: {}, pulls: {} };
      this.remoteFetch[name] = {};
      return result([]);
    }
    if (args[0] === "remove" || args[0] === "rm") {
      delete this.remotes[args[1]];
      return result([]);
    }
    if (args[0] === "show") {
      var remote = this.remotes[args[1]];
      if (!remote) return fail(["error: No such remote '" + args[1] + "'"]);
      return result(["* remote " + args[1], "  Fetch URL: " + remote.url, "  Push  URL: " + remote.url]);
    }
    return result([]);
  };

  Lab.prototype.cmdFetch = function (args) {
    var remote = args[0] && args[0][0] !== "-" ? args[0] : "origin";
    var spec = args[1];
    if (!this.remotes[remote] && remote !== "origin") {
      this.remotes[remote] = { url: "https://example.com/org/repo.git", branches: {}, pulls: {} };
    }
    var out = [];
    var targetRemote = this.remotes[remote];
    if (!targetRemote) return fail(["fatal: '" + remote + "' does not appear to be a git repository"]);
    if (spec && spec.indexOf(":") !== -1) {
      var bits = spec.split(":");
      var source = bits[0];
      var dest = bits[1];
      var pullKey = source.replace(/^pull\//, "");
      var sha = targetRemote.pulls && targetRemote.pulls[pullKey] ? targetRemote.pulls[pullKey] : targetRemote.branches[source];
      if (!sha) return fail(["fatal: couldn't find remote ref " + source]);
      this.branches[dest] = sha;
      this.addReflog(sha, "fetch " + remote + ": storing head");
      return result(["From " + targetRemote.url, " * [new ref]         " + source + " -> " + dest]);
    }
    if (spec) {
      var branch = spec.split(":")[0];
      var fetched = targetRemote.branches[branch];
      if (!fetched) return fail(["fatal: couldn't find remote ref " + branch]);
      this.remoteFetch[remote] = clone(targetRemote.branches);
      return result(["From " + targetRemote.url, " * branch            " + branch + "     -> FETCH_HEAD"]);
    }
    this.remoteFetch[remote] = clone(targetRemote.branches);
    Object.keys(targetRemote.branches).forEach(function (name) {
      out.push(" * [updated]         " + name + " -> " + remote + "/" + name);
    });
    if (!out.length) out.push("Already up to date.");
    return result(out);
  };

  Lab.prototype.cmdPush = function (args) {
    var self = this;
    var force = false;
    var lease = false;
    var setUpstream = false;
    var values = [];
    args.forEach(function (arg) {
      if (arg === "--force" || arg === "-f") force = true;
      else if (arg === "--force-with-lease") lease = true;
      else if (arg === "-u" || arg === "--set-upstream") setUpstream = true;
      else if (arg[0] !== "-") values.push(arg);
    });
    var remoteName = values[0] || "origin";
    var remote = this.remotes[remoteName];
    if (!remote) return fail(["fatal: '" + remoteName + "' does not appear to be a git repository"]);
    var branch = values[1] || this.headBranch();
    if (!branch) return fail(["fatal: You are not currently on a branch."]);
    var local = this.branches[branch];
    if (!local) return fail(["error: src refspec " + branch + " does not match any"]);
    var remoteSha = remote.branches[branch];
    var fastForward = !remoteSha || this.isAncestor(remoteSha, local);
    if (remoteSha && !fastForward && !force && !lease) {
      return fail([
        "To " + remote.url,
        " ! [rejected]        " + branch + " -> " + branch + " (non-fast-forward)",
        "error: failed to push some refs to '" + remote.url + "'",
        "hint: Updates were rejected because the tip of your current branch is behind",
        "hint: its remote counterpart. Integrate the remote changes before pushing again."
      ]);
    }
    if (lease) {
      var snapshot = this.remoteFetch[remoteName] && this.remoteFetch[remoteName][branch];
      if (snapshot && remote.branches[branch] !== snapshot) {
        return fail([
          "To " + remote.url,
          " ! [rejected]        " + branch + " -> " + branch + " (stale info)",
          "error: failed to push some refs to '" + remote.url + "'",
          "hint: the remote moved since your last fetch; fetch and integrate first."
        ]);
      }
    }
    remote.branches[branch] = local;
    this.remoteFetch[remoteName] = clone(remote.branches);
    var out = ["To " + remote.url];
    if (remoteSha && !fastForward) out.push(" + " + remoteSha.slice(0, 7) + "..." + local.slice(0, 7) + " " + branch + " -> " + branch + " (forced update)");
    else out.push("   " + (remoteSha ? remoteSha.slice(0, 7) + ".." : "") + local.slice(0, 7) + "  " + branch + " -> " + branch);
    if (setUpstream) out.push("branch '" + branch + "' set up to track '" + remoteName + "/" + branch + "'.");
    this.refreshReachability();
    return result(out);
  };

  Lab.prototype.cmdPull = function (args) {
    var fetch = this.cmdFetch(args);
    if (fetch.code) return fetch;
    var remoteName = args[0] || "origin";
    var branch = this.headBranch();
    var remote = this.remotes[remoteName];
    if (!remote || !remote.branches[branch]) return result(fetch.lines);
    var merged = this.cmdMerge([remoteName + "/" + branch], {});
    return result(fetch.lines.map(function (l) { return l.text; }).concat(merged.lines.map(function (l) { return l.text; })));
  };

  /* -------------------------------------------------------------- worktree */

  Lab.prototype.cmdWorktree = function (args) {
    var self = this;
    var sub = args[0];
    if (!sub || sub === "list") {
      var out = ["/home/ada/repo  " + (this.headSha() ? this.headSha().slice(0, 7) : "") + " [" + (this.headBranch() || "detached") + "]"];
      this.worktrees.forEach(function (wt) {
        out.push(wt.path + "  " + (wt.sha || "").slice(0, 7) + " [" + (wt.branch || "detached") + "]");
      });
      return result(out);
    }
    if (sub === "add") {
      var path = args[1];
      var ref = args[2] || "HEAD";
      if (!path) return fail(["fatal: worktree path required"]);
      var sha = this.resolve(ref);
      var branch = this.branches[ref] ? ref : null;
      if (!sha) return fail(["fatal: invalid reference: " + ref]);
      if (!branch) {
        branch = "worktree-" + (this.worktrees.length + 1);
        this.branches[branch] = sha;
      }
      this.worktrees.push({ path: path, branch: branch, sha: sha });
      this.worktreeHistory.push({ path: path, branch: branch, sha: sha });
      return result(["Preparing worktree (" + (this.branches[ref] ? "checking out '" + ref + "'" : "new branch '" + branch + "'") + ")", "HEAD is now at " + sha.slice(0, 7) + " " + (this.commits[sha] ? this.commits[sha].subject : "")]);
    }
    if (sub === "remove" || sub === "rm") {
      var target = args[1];
      var found = -1;
      this.worktrees.forEach(function (wt, index) { if (wt.path === target) found = index; });
      if (found === -1) return fail(["fatal: '" + target + "' is not a working tree"]);
      this.worktrees.splice(found, 1);
      return result(["Removed worktree " + target]);
    }
    return result([]);
  };

  /* -------------------------------------------------------------- plumbing */

  Lab.prototype.cmdFsck = function (args) {
    var self = this;
    var unreachable = [];
    Object.keys(this.commits).forEach(function (sha) {
      if (self.commits[sha].unreachable) unreachable.push(sha);
    });
    this.stashDropped.forEach(function (entry) {
      if (entry.sha && !unreachable.some(function (sha) { return sha.indexOf(entry.sha) === 0; })) unreachable.push(entry.sha);
    });
    var out = ["Checking object directories: 100% (256/256), done."];
    if (args.indexOf("--unreachable") !== -1) {
      unreachable.forEach(function (sha) {
        out.push("unreachable commit " + sha);
      });
      if (unreachable.length === 0) out.push("(no unreachable objects)");
    }
    return result(out);
  };

  Lab.prototype.cmdRm = function (args) {
    var self = this;
    var cached = args.indexOf("--cached") !== -1;
    var paths = args.filter(function (a) { return a[0] !== "-"; });
    if (!paths.length) return fail(["fatal: rm requires a path"]);
    var removed = [];
    var universe = {};
    Object.keys(this.index).forEach(function (path) { universe[path] = true; });
    Object.keys(this.files).forEach(function (path) { universe[path] = true; });
    Object.keys(this.unmerged).forEach(function (path) { universe[path] = true; });
    paths.forEach(function (matcher) {
      Object.keys(universe).forEach(function (path) {
        if (!pathMatches(path, matcher)) return;
        delete self.index[path];
        if (self.unmerged[path]) {
          delete self.unmerged[path];
          delete self.conflicts[path];
        }
        if (!cached) delete self.files[path];
        if (removed.indexOf(path) === -1) removed.push(path);
      });
    });
    return result(removed.map(function (path) { return "rm '" + path + "'"; }));
  };

  Lab.prototype.cmdMv = function (args) {
    var paths = args.filter(function (a) { return a[0] !== "-"; });
    if (paths.length < 2) return fail(["fatal: mv requires a source and destination"]);
    var from = normalizePath(paths[0]);
    var to = normalizePath(paths[1]);
    var content = this.files[from];
    if (content == null) return fail(["fatal: bad source, source=" + from]);
    this.files[to] = content;
    delete this.files[from];
    if (this.index[from] != null) {
      this.index[to] = this.index[from];
      delete this.index[from];
    }
    if (this.unmerged[from]) {
      delete this.unmerged[from];
      delete this.conflicts[from];
    }
    return result([]);
  };

  Lab.prototype.cmdClean = function (args) {
    var self = this;
    var dry = args.indexOf("-n") !== -1 || args.indexOf("--dry-run") !== -1;
    var untracked = this.untracked();
    if (dry) return result(untracked.map(function (path) { return "Would remove " + path; }));
    untracked.forEach(function (path) { delete self.files[path]; });
    return result(untracked.map(function (path) { return "Removing " + path; }));
  };

  Lab.prototype.cmdConfig = function (args) {
    var values = args.filter(function (a) { return a[0] !== "-"; });
    if (args.indexOf("--list") !== -1 || args.indexOf("-l") !== -1) {
      return result(Object.keys(this.config).sort().map(function (key) { return key + "=" + this.config[key]; }, this));
    }
    if (!values.length) return result([]);
    var key = values[0];
    if (args.indexOf("--get") !== -1 || values.length === 1) {
      return result([Object.prototype.hasOwnProperty.call(this.config, key) ? this.config[key] : ""]);
    }
    if (args.indexOf("--unset") !== -1) {
      delete this.config[key];
      return result([]);
    }
    this.config[key] = values[1];
    return result([]);
  };

  Lab.prototype.cmdLsFiles = function (args) {
    var self = this;
    var paths = args.filter(function (a) { return a[0] !== "-"; });
    var list = Object.keys(this.index).sort().filter(function (path) {
      return !paths.length || paths.some(function (matcher) { return pathMatches(path, matcher); });
    });
    return result(list);
  };

  Lab.prototype.cmdGrep = function (args) {
    var self = this;
    var pattern = args.filter(function (a) { return a[0] !== "-"; })[0];
    if (!pattern) return fail(["usage: git grep <pattern>"]);
    var re;
    try { re = new RegExp(pattern, "i"); } catch (e) { re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); }
    var out = [];
    Object.keys(this.files).sort().forEach(function (path) {
      var lines = String(self.files[path] || "").split("\n");
      lines.forEach(function (text, index) {
        if (re.test(text)) out.push(path + ":" + text);
      });
    });
    return out.length ? result(out) : fail([], 1);
  };

  Lab.prototype.cmdMergeBase = function (args) {
    if (args[0] === "--is-ancestor") {
      return this.isAncestor(args[1], args[2]) ? result([], 0) : fail([], 1);
    }
    var values = args.filter(function (a) { return a[0] !== "-"; });
    if (values.length < 2) return fail(["usage: git merge-base <a> <b>"]);
    var sha = this.mergeBase(values[0], values[1]);
    return sha ? result([sha]) : fail([], 1);
  };

  Lab.prototype.cmdRevParse = function (args) {
    var abbrev = args.indexOf("--abbrev-ref") !== -1;
    var values = args.filter(function (a) { return a[0] !== "-"; });
    var ref = values[0] || "HEAD";
    if (ref.indexOf("^{tree}") !== -1) {
      var sha = this.resolve(ref.replace(/\^\{tree\}$/, ""));
      return sha ? result([sha]) : fail(["fatal: bad revision"]);
    }
    if (abbrev) {
      if (ref === "HEAD") return result([this.headBranch() || "HEAD"]);
      return result([ref]);
    }
    var resolved = this.resolve(ref);
    return resolved ? result([resolved]) : fail(["fatal: ambiguous argument '" + ref + "'"]);
  };

  Lab.prototype.cmdSymbolicRef = function (args) {
    var short = args.indexOf("--short") !== -1;
    if (!this.headBranch()) return fail(["fatal: ref HEAD is not a symbolic ref"]);
    return result([short ? this.headBranch() : "refs/heads/" + this.headBranch()]);
  };

  Lab.prototype.cmdCatFile = function (args) {
    var ref = args.filter(function (a) { return a[0] !== "-"; })[0];
    if (!ref) return fail(["usage: git cat-file -p <object>"]);
    if (ref.indexOf(":") !== -1) {
      var bits = ref.split(":");
      var tree = this.treeOf(bits[0]);
      var content = tree[bits.slice(1).join(":")];
      return content == null ? fail(["fatal: not a valid object name"]) : result(content.replace(/\n$/, "").split("\n"));
    }
    var sha = this.resolve(ref);
    if (!sha) return fail(["fatal: Not a valid object name " + ref]);
    return result(this.commitRow(sha, {}).split("\n"));
  };

  Lab.prototype.cmdCommitTree = function (args) {
    var treeRef = args.filter(function (a) { return a[0] !== "-" && !/^[0-9a-f]{7,}$/.test(a); })[0] || "HEAD";
    var tree = this.treeOf(treeRef.replace(/\^\{tree\}$/, ""));
    var parents = [];
    var message = "commit";
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "-p") parents.push(this.resolve(args[++i]));
      else if (args[i] === "-m") message = args[++i];
    }
    var sha = this.nextSha(message);
    this.commits[sha] = {
      sha: sha,
      parents: parents.filter(Boolean),
      subject: firstLine(message),
      body: message.split("\n").slice(1).join("\n").trim(),
      author: AUTHOR,
      date: "2026-11-04T09:50:00Z",
      seq: this.seq++,
      tree: tree
    };
    this.order.push(sha);
    this.lastTreeCommit = sha;
    this.refreshReachability();
    return result([sha]);
  };

  Lab.prototype.cmdUpdateRef = function (args) {
    var values = args.filter(function (a) { return a[0] !== "-"; });
    var ref = values[0];
    var sha = this.resolve(values[1] || "HEAD");
    if (!sha) return fail(["fatal: " + values[1] + ": not a valid SHA1"]);
    if (ref === "HEAD") {
      if (this.head.type === "branch") this.branches[this.head.ref] = sha;
      else this.head.sha = sha;
      this.applyTree(sha, "hard");
    } else {
      this.branches[ref.replace(/^refs\/heads\//, "")] = sha;
    }
    this.refreshReachability();
    return result([]);
  };

  Lab.prototype.cmdReplace = function (args) {
    if (args[0] === "-d" || args[0] === "--delete") {
      delete this.replacements[this.resolve(args[1]) || args[1]];
      return result([]);
    }
    if (args[0] === "--graft") {
      var commit = this.resolve(args[1]);
      if (!commit) return fail(["fatal: bad object " + args[1]]);
      var parents = args.slice(2).map(function (ref) { return this.resolve(ref); }, this).filter(Boolean);
      this.replacements[commit] = parents;
      return result([]);
    }
    return result([]);
  };

  Lab.prototype.cmdBlame = function (args) {
    var self = this;
    var range = null;
    var file = null;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "-L") range = args[++i];
      else if (args[i] === "-C" || args[i] === "-C" || args[i] === "-M") continue;
      else if (args[i][0] !== "-") file = args[i];
    }
    if (!file) return fail(["usage: git blame <file>"]);
    file = normalizePath(file);
    var content = this.treeOf("HEAD")[file];
    if (content == null) return fail(["fatal: no such path " + file + " in HEAD"]);
    var lines = String(content).replace(/\n$/, "").split("\n");
    var start = 1;
    var end = lines.length;
    if (range) {
      var bits = range.split(",");
      start = Math.max(1, Number(bits[0]) || 1);
      end = Math.min(lines.length, Number(bits[1]) || lines.length);
    }
    var commitsBySeq = Object.keys(this.commits).sort(function (a, b) { return self.commits[b].seq - self.commits[a].seq; });
    var blame = lines.map(function (text, index) {
      var lineNo = index + 1;
      var culprit = null;
      for (var c = 0; c < commitsBySeq.length; c++) {
        var sha = commitsBySeq[c];
        var commit = self.commits[sha];
        var paths = Object.keys(commit.tree);
        var hasLine = paths.some(function (p) {
          return String(commit.tree[p] || "").split("\n").indexOf(text) !== -1;
        });
        if (!hasLine) continue;
        var parentHas = commit.parents.some(function (parent) {
          var pc = self.commits[parent];
          if (!pc) return false;
          return Object.keys(pc.tree).some(function (p) {
            return String(pc.tree[p] || "").split("\n").indexOf(text) !== -1;
          });
        });
        if (!parentHas) { culprit = sha; break; }
        if (!culprit) culprit = sha;
      }
      return { sha: culprit || self.headSha(), text: text, line: lineNo };
    });
    return result(blame.slice(start - 1, end).map(function (row) {
      var commit = self.commits[row.sha] || { author: AUTHOR, date: "" };
      return row.sha.slice(0, 7) + " (" + commit.author.name.split(" ")[0] + " " + commit.date.slice(0, 10) + " " + String(row.line).padStart(3) + ") " + row.text;
    }));
  };

  Lab.prototype.rewriteHistory = function (transform) {
    var self = this;
    var remap = {};
    var newCommits = {};
    var newOrder = [];
    this.order.forEach(function (sha) {
      var commit = self.commits[sha];
      var resultObj = transform(commit) || {};
      var parents = (resultObj.parents || commit.parents).map(function (parent) { return remap[parent] || parent; });
      var tree = resultObj.tree || commit.tree;
      var author = resultObj.author || commit.author;
      var message = resultObj.message || (commit.subject + (commit.body ? "\n\n" + commit.body : ""));
      var newSha = self.nextSha(message + "|" + JSON.stringify(tree));
      var subject = firstLine(message);
      newCommits[newSha] = {
        sha: newSha,
        parents: parents,
        subject: subject,
        body: message.split("\n").slice(1).join("\n").trim(),
        author: author,
        date: commit.date,
        seq: commit.seq,
        tree: copyFiles(tree)
      };
      remap[sha] = newSha;
      newOrder.push(newSha);
      self.commits[newSha] = newCommits[newSha];
    });
    Object.keys(remap).forEach(function (sha) {
      if (remap[sha] !== sha) delete self.commits[sha];
    });
    this.order = newOrder;
    Object.keys(this.branches).forEach(function (name) { self.branches[name] = remap[self.branches[name]] || self.branches[name]; });
    Object.keys(this.tags).forEach(function (name) { self.tags[name] = remap[self.tags[name]] || self.tags[name]; });
    Object.keys(this.remotes).forEach(function (remote) {
      Object.keys(self.remotes[remote].branches).forEach(function (name) {
        self.remotes[remote].branches[name] = remap[self.remotes[remote].branches[name]] || self.remotes[remote].branches[name];
      });
    });
    if (this.head.type === "detached") this.head.sha = remap[this.head.sha] || this.head.sha;
    var headTree = this.treeOf(this.headSha());
    this.index = clone(headTree);
    this.files = clone(headTree);
    this.refreshReachability();
  };

  Lab.prototype.cmdFilterRepo = function (args) {
    var self = this;
    var removePath = null;
    var emailMap = null;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "--path") removePath = normalizePath(args[++i]);
      else if (args[i] === "--email-map") emailMap = args[++i];
      else if (args[i] === "--invert-paths" || args[i] === "--force") continue;
    }
    var parsed = Object.keys(this.commits).length;
    var changed = 0;
    this.rewriteHistory(function (commit) {
      var tree = clone(commit.tree);
      var author = { name: commit.author.name, email: commit.author.email };
      if (removePath) {
        Object.keys(tree).forEach(function (path) {
          if (pathMatches(path, removePath)) { delete tree[path]; changed++; }
        });
      }
      if (emailMap) {
        var bits = emailMap.split("=");
        if (author.email === bits[0] || author.email === bits[0].trim()) {
          author.email = (bits[1] || "").trim();
          changed++;
        }
      }
      return { tree: tree, author: author };
    });
    if (removePath) {
      delete this.files[removePath];
      delete this.index[removePath];
    }
    return result([
      "Parsed " + parsed + " commits",
      "New history written in 0.42 seconds; now repacking/cleaning...",
      "Your history is rewritten. " + changed + " object" + (changed === 1 ? "" : "s") + " updated.",
      "Run 'git push --force-with-lease' when you are ready to publish."
    ]);
  };

  root.GitLab = { create: function (cfg) { return new Lab(cfg); }, Lab: Lab, tokenize: tokenize, hashText: hashText };
})(typeof window !== "undefined" ? window : globalThis);
