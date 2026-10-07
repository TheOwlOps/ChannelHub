var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res, err) => () => {
  if (fn)
    try {
      res = fn(fn = 0);
    } catch (e) {
      err = [e];
    }
  if (err)
    throw err[0];
  return res;
};

// src/core/stats.ts
function pad2(n) {
  return String(n).padStart(2, "0");
}
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function hourKey(ts) {
  const d = new Date(ts);
  return `${dayKey(ts)}T${pad2(d.getHours())}`;
}

class StatsCollector {
  startedAt;
  retentionDays;
  maxUsersPerDay;
  topUsersLimit;
  totals = { inbound: 0, outbound: 0, errors: 0 };
  channels = new Map;
  hourly = new Map;
  daily = new Map;
  constructor(options = {}) {
    this.retentionDays = options.retentionDays ?? 30;
    this.maxUsersPerDay = options.maxUsersPerDay ?? 5000;
    this.topUsersLimit = options.topUsersLimit ?? 10;
    this.startedAt = Date.now();
  }
  recordInbound(msg, ts = Date.now()) {
    const channel = String(msg.channel || "unknown");
    this.totals.inbound++;
    const c = this.channelEntry(channel);
    c.inbound++;
    c.lastInbound = ts;
    const hk = hourKey(ts);
    const h = this.hourly.get(hk) ?? { inbound: 0, outbound: 0 };
    h.inbound++;
    this.hourly.set(hk, h);
    const dk = dayKey(ts);
    const d = this.dailyEntry(dk);
    d.inbound++;
    const id = String(msg.sender?.id ?? "unknown");
    const name = msg.sender?.name || msg.sender?.username || id;
    const existing = d.users.get(id);
    if (existing) {
      existing.count++;
      existing.lastSeen = ts;
      existing.channel = channel;
      if (msg.sender?.name)
        existing.name = name;
    } else if (d.users.size < this.maxUsersPerDay) {
      d.users.set(id, { id, name, channel, count: 1, lastSeen: ts });
    } else {
      d.overflow++;
    }
  }
  recordOutbound(channel, ts = Date.now()) {
    this.totals.outbound++;
    const c = this.channelEntry(channel);
    c.outbound++;
    c.lastOutbound = ts;
    const hk = hourKey(ts);
    const h = this.hourly.get(hk) ?? { inbound: 0, outbound: 0 };
    h.outbound++;
    this.hourly.set(hk, h);
    this.dailyEntry(dayKey(ts)).outbound++;
  }
  recordError(channel) {
    this.totals.errors++;
    this.channelEntry(channel).errors++;
  }
  snapshot(now = Date.now()) {
    this.prune(now);
    const perChannel = Array.from(this.channels.entries()).map(([channel, s]) => ({ channel, ...s })).sort((a, b) => b.inbound + b.outbound - (a.inbound + a.outbound));
    const endHour = new Date(now);
    endHour.setMinutes(0, 0, 0);
    const hourly24 = [];
    for (let i = 23;i >= 0; i--) {
      const d = new Date(endHour);
      d.setHours(endHour.getHours() - i);
      const key = hourKey(d.getTime());
      const b = this.hourly.get(key) ?? { inbound: 0, outbound: 0 };
      hourly24.push({
        key,
        label: `${pad2(d.getHours())}:00 ${dayKey(d.getTime()).slice(5)}`,
        inbound: b.inbound,
        outbound: b.outbound
      });
    }
    const heatmap = [];
    for (let i = 6;i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dk = dayKey(d.getTime());
      const hours = [];
      for (let h = 0;h < 24; h++) {
        hours.push(this.hourly.get(`${dk}T${pad2(h)}`)?.inbound ?? 0);
      }
      heatmap.push({ date: dk, weekday: WEEKDAYS[d.getDay()], hours });
    }
    const daily14 = [];
    for (let i = 13;i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dk = dayKey(d.getTime());
      const b = this.daily.get(dk);
      daily14.push({
        date: dk,
        inbound: b?.inbound ?? 0,
        outbound: b?.outbound ?? 0
      });
    }
    const cutoff7d = dayKey(now - 6 * 86400000);
    const merged = new Map;
    for (const [date, bucket] of this.daily) {
      if (date < cutoff7d)
        continue;
      for (const [ukey, u] of bucket.users) {
        const agg = merged.get(ukey);
        if (agg) {
          agg.count += u.count;
          if (u.lastSeen > agg.lastSeen) {
            agg.lastSeen = u.lastSeen;
            agg.name = u.name;
          }
        } else {
          merged.set(ukey, { ...u });
        }
      }
    }
    const topUsers = Array.from(merged.values()).sort((a, b) => b.count - a.count).slice(0, this.topUsersLimit);
    const todayBucket = this.daily.get(dayKey(now));
    return {
      generatedAt: now,
      totals: { ...this.totals },
      today: {
        inbound: todayBucket?.inbound ?? 0,
        outbound: todayBucket?.outbound ?? 0,
        activeUsers: todayBucket?.users.size ?? 0
      },
      activeUsers: {
        today: todayBucket?.users.size ?? 0,
        last7d: merged.size
      },
      perChannel,
      hourly24,
      heatmap,
      daily14,
      topUsers
    };
  }
  prune(now = Date.now()) {
    const cutoffDay = dayKey(now - this.retentionDays * 86400000);
    for (const key of this.daily.keys()) {
      if (key < cutoffDay)
        this.daily.delete(key);
    }
    const cutoffHour = `${cutoffDay}T00`;
    for (const key of this.hourly.keys()) {
      if (key < cutoffHour)
        this.hourly.delete(key);
    }
  }
  toJSON() {
    this.prune();
    return {
      version: 1,
      startedAt: this.startedAt,
      totals: { ...this.totals },
      channels: Array.from(this.channels.entries(), ([channel, s]) => ({ channel, ...s })),
      hourly: Array.from(this.hourly.entries(), ([key, b]) => ({ key, ...b })),
      daily: Array.from(this.daily.entries(), ([date, d]) => ({
        date,
        inbound: d.inbound,
        outbound: d.outbound,
        overflow: d.overflow,
        users: Array.from(d.users.values())
      }))
    };
  }
  hydrate(data) {
    if (!data || typeof data !== "object")
      return false;
    const raw = data;
    if (raw.version !== 1)
      return false;
    if (!raw.totals || !Array.isArray(raw.channels) || !Array.isArray(raw.hourly) || !Array.isArray(raw.daily)) {
      return false;
    }
    this.totals = {
      inbound: Number(raw.totals.inbound) || 0,
      outbound: Number(raw.totals.outbound) || 0,
      errors: Number(raw.totals.errors) || 0
    };
    this.channels = new Map(raw.channels.filter((c) => c && typeof c.channel === "string").map((c) => [
      c.channel,
      {
        inbound: Number(c.inbound) || 0,
        outbound: Number(c.outbound) || 0,
        errors: Number(c.errors) || 0,
        lastInbound: c.lastInbound ?? null,
        lastOutbound: c.lastOutbound ?? null
      }
    ]));
    this.hourly = new Map(raw.hourly.filter((h) => h && typeof h.key === "string").map((h) => [
      h.key,
      { inbound: Number(h.inbound) || 0, outbound: Number(h.outbound) || 0 }
    ]));
    this.daily = new Map(raw.daily.filter((d) => d && typeof d.date === "string").map((d) => {
      const bucket = {
        inbound: Number(d.inbound) || 0,
        outbound: Number(d.outbound) || 0,
        users: new Map,
        overflow: Number(d.overflow) || 0
      };
      if (Array.isArray(d.users)) {
        for (const u of d.users) {
          if (!u || typeof u.id !== "string")
            continue;
          bucket.users.set(u.id, {
            id: u.id,
            name: String(u.name || u.id),
            channel: String(u.channel || "unknown"),
            count: Number(u.count) || 0,
            lastSeen: Number(u.lastSeen) || 0
          });
        }
      }
      return [d.date, bucket];
    }));
    this.prune();
    return true;
  }
  channelEntry(channel) {
    let c = this.channels.get(channel);
    if (!c) {
      c = { inbound: 0, outbound: 0, errors: 0, lastInbound: null, lastOutbound: null };
      this.channels.set(channel, c);
    }
    return c;
  }
  dailyEntry(date) {
    let d = this.daily.get(date);
    if (!d) {
      d = { inbound: 0, outbound: 0, users: new Map, overflow: 0 };
      this.daily.set(date, d);
    }
    return d;
  }
}
var WEEKDAYS;
var init_stats = __esm(() => {
  WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
});

// src/bridges/dashboard/html.ts
var DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ChannelHub &middot; Live Dashboard</title>
<style>
  :root {
    --bg: #0d1117; --panel: #161b22; --panel2: #1c2333;
    --border: #21262d; --text: #e6edf3; --muted: #8b949e;
    --accent: #8b5cf6; --accent2: #22d3ee; --green: #3fb950; --red: #f85149; --amber: #d29922;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px; line-height: 1.5;
    background-image: radial-gradient(1200px 400px at 50% -100px, rgba(139, 92, 246, 0.12), transparent);
  }
  header {
    max-width: 1100px; margin: 0 auto; padding: 28px 20px 8px;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand .logo { font-size: 26px; }
  .brand h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
  .brand h1 em { font-style: normal; background: linear-gradient(90deg, var(--accent), var(--accent2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .meta { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12.5px; flex-wrap: wrap; }
  .pill { padding: 2px 10px; border-radius: 999px; font-weight: 600; font-size: 11px; letter-spacing: 0.5px; }
  .pill.live { color: var(--green); background: rgba(63, 185, 80, 0.12); border: 1px solid rgba(63, 185, 80, 0.35); }
  .pill.down { color: var(--red); background: rgba(248, 81, 73, 0.12); border: 1px solid rgba(248, 81, 73, 0.35); }
  main { max-width: 1100px; margin: 0 auto; padding: 16px 20px 40px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
    padding: 14px 16px; position: relative; overflow: hidden;
  }
  .card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--accent); opacity: 0.7; }
  .card.c2::before { background: var(--accent2); }
  .card.c3::before { background: var(--green); }
  .card.c4::before { background: var(--red); }
  .card.c5::before { background: var(--amber); }
  .card.c6::before { background: #58a6ff; }
  .card .k { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; }
  .card .v { font-size: 26px; font-weight: 700; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .card .s { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .panel.wide { grid-column: 1 / -1; }
  .panel h2 { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
  .chart { width: 100%; height: auto; display: block; }
  .legend { display: flex; gap: 16px; margin-top: 8px; color: var(--muted); font-size: 12px; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  .hlabels { display: flex; justify-content: space-between; color: var(--muted); font-size: 11px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: var(--muted); font-weight: 500; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; border-bottom: 1px solid var(--border); }
  td { padding: 7px 8px; border-bottom: 1px solid rgba(33, 38, 45, 0.6); }
  tr:last-child td { border-bottom: none; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .who b { font-weight: 600; }
  .who span { display: block; color: var(--muted); font-size: 11.5px; }
  .tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.3); }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .dot.on { background: var(--green); box-shadow: 0 0 6px rgba(63, 185, 80, 0.8); }
  .dot.off { background: var(--muted); }
  .brow { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .brow .bname { width: 90px; color: var(--muted); font-size: 12.5px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .brow .btrack { flex: 1; height: 14px; background: var(--panel2); border-radius: 4px; overflow: hidden; }
  .brow .bfill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--accent), var(--accent2)); min-width: 2px; }
  .brow .bval { width: 60px; font-size: 12px; font-variant-numeric: tabular-nums; }
  .hm { display: flex; flex-direction: column; gap: 3px; }
  .hmrow { display: grid; grid-template-columns: 76px repeat(24, 1fr); gap: 3px; align-items: center; }
  .hmhead { margin-bottom: 2px; }
  .hmlabel { color: var(--muted); font-size: 11px; white-space: nowrap; }
  .hmhour { color: var(--muted); font-size: 10px; text-align: center; }
  .hmcell { height: 16px; border-radius: 3px; background: var(--panel2); }
  .foot { text-align: center; color: var(--muted); font-size: 12px; margin-top: 24px; }
  .empty { color: var(--muted); font-style: italic; padding: 8px; }
</style>
</head>
<body>
<header>
  <div class="brand"><span class="logo">&#127760;</span><h1>ChannelHub <em>Dashboard</em></h1></div>
  <div class="meta">
    <span id="status" class="pill live">&#9679; LIVE</span>
    <span id="uptime">&mdash;</span>
    <span id="updated">&mdash;</span>
  </div>
</header>
<main>
  <section id="cards" class="cards"></section>

  <section class="grid">
    <article class="panel wide">
      <h2>Messages &mdash; last 24 hours</h2>
      <div id="hourly"></div>
      <div class="legend"><span><i style="background:#8b5cf6"></i>Inbound</span><span><i style="background:#22d3ee"></i>Outbound</span></div>
      <div id="hourlyLabels" class="hlabels"></div>
    </article>
    <article class="panel wide">
      <h2>Daily traffic &mdash; last 14 days</h2>
      <div id="daily"></div>
      <div class="legend"><span><i style="background:#8b5cf6"></i>Inbound</span><span><i style="background:#22d3ee"></i>Outbound</span></div>
    </article>
    <article class="panel">
      <h2>Top channels</h2>
      <div id="channelBars"></div>
    </article>
    <article class="panel">
      <h2>Top users &mdash; 7 days</h2>
      <table id="topUsers"></table>
    </article>
    <article class="panel wide">
      <h2>Activity heatmap &mdash; 7 days &times; 24h (inbound)</h2>
      <div id="heatmap"></div>
    </article>
    <article class="panel wide">
      <h2>Channels</h2>
      <table id="channelTable"></table>
    </article>
  </section>

  <p class="foot">ChannelHub SDK &middot; <span id="gen">&mdash;</span></p>
</main>
<script>
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = null;
  try { KEY = sessionStorage.getItem("chkey"); } catch (e) {}

  function headers() {
    return KEY ? { "Authorization": "Bearer " + KEY } : {};
  }
  function fmt(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\\.0$/, "") + "k";
    return String(n);
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function timeAgo(ts) {
    if (!ts) return "never";
    var s = Math.max(0, Math.floor(Date.now() / 1000 - ts / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }
  function uptime(sec) {
    var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    return m + "m " + (sec % 60) + "s";
  }

  function load() {
    fetch("/api/stats", { headers: headers() }).then(function (r) {
      if (r.status === 401) {
        var k = window.prompt("Dashboard API key:");
        if (k !== null) {
          KEY = k;
          try { sessionStorage.setItem("chkey", k); } catch (e) {}
        }
        return null;
      }
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (s) {
      if (s) { $("status").className = "pill live"; render(s); }
    }).catch(function () {
      $("status").className = "pill down";
    });
  }

  function card(k, v, s, cls) {
    return '<div class="card ' + (cls || "") + '"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="s">' + s + "</div></div>";
  }

  function svgHourly(data) {
    var W = 760, H = 170, bw = W / 24, top = 26;
    var max = 1, i, d;
    for (i = 0; i < data.length; i++) max = Math.max(max, data[i].inbound, data[i].outbound);
    var grid = "";
    for (i = 1; i <= 3; i++) {
      var y = Math.round(H - (H - top) * i / 3);
      grid += '<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="#21262d" stroke-width="1"/>';
    }
    var bars = "";
    for (i = 0; i < data.length; i++) {
      d = data[i];
      var h1 = Math.round(d.inbound / max * (H - top));
      var h2 = Math.round(d.outbound / max * (H - top));
      var x = i * bw;
      bars += '<rect x="' + (x + 2).toFixed(1) + '" y="' + (H - h1) + '" width="' + (bw / 2 - 3).toFixed(1) + '" height="' + h1 + '" rx="2" fill="#8b5cf6"><title>' + esc(d.label) + " &middot; in " + d.inbound + "</title></rect>";
      bars += '<rect x="' + (x + bw / 2 + 1).toFixed(1) + '" y="' + (H - h2) + '" width="' + (bw / 2 - 3).toFixed(1) + '" height="' + h2 + '" rx="2" fill="#22d3ee"><title>' + esc(d.label) + " &middot; out " + d.outbound + "</title></rect>";
    }
    return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" class="chart" style="height:170px">' + grid + bars + "</svg>";
  }

  function svgDaily(data) {
    var W = 760, H = 150, top = 20;
    var n = data.length, max = 1, i;
    for (i = 0; i < n; i++) max = Math.max(max, data[i].inbound, data[i].outbound);
    var pts = [], ptsOut = [];
    for (i = 0; i < n; i++) {
      var x = n === 1 ? W / 2 : i * W / (n - 1);
      pts.push([x, H - Math.round(data[i].inbound / max * (H - top))]);
      ptsOut.push([x, H - Math.round(data[i].outbound / max * (H - top))]);
    }
    var line = pts.map(function (p) { return p[0].toFixed(1) + "," + p[1]; }).join(" ");
    var lineOut = ptsOut.map(function (p) { return p[0].toFixed(1) + "," + p[1]; }).join(" ");
    var area = "M0," + H + " L" + line.replace(/ /g, " L") + " L" + W + "," + H + " Z";
    var dots = "";
    for (i = 0; i < n; i++) {
      dots += '<circle cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1] + '" r="3" fill="#8b5cf6"><title>' + esc(data[i].date) + " &middot; " + data[i].inbound + " in / " + data[i].outbound + " out</title></circle>";
    }
    var labels = "";
    for (i = 0; i < n; i += 2) {
      var anchor = "middle";
      if (i === 0) anchor = "start";
      else if (i >= n - 2) anchor = "end";
      labels += '<text x="' + pts[i][0].toFixed(1) + '" y="' + (H - 4) + '" font-size="10" fill="#8b949e" text-anchor="' + anchor + '">' + data[i].date.slice(5) + "</text>";
    }
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" class="chart" style="height:150px">';
    svg += '<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35"/><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs>';
    svg += '<path d="' + area + '" fill="url(#ga)"/>';
    svg += '<polyline points="' + line + '" fill="none" stroke="#8b5cf6" stroke-width="2"/>';
    svg += '<polyline points="' + lineOut + '" fill="none" stroke="#22d3ee" stroke-width="2" opacity="0.85"/>';
    svg += dots + labels + "</svg>";
    return svg;
  }

  function renderHeatmap(days) {
    var max = 1, r, c;
    for (r = 0; r < days.length; r++) for (c = 0; c < 24; c++) max = Math.max(max, days[r].hours[c]);
    var html = '<div class="hm"><div class="hmrow hmhead"><div class="hmlabel"></div>';
    for (c = 0; c < 24; c++) html += '<div class="hmhour">' + (c % 3 === 0 ? c : "") + "</div>";
    html += "</div>";
    for (r = 0; r < days.length; r++) {
      html += '<div class="hmrow"><div class="hmlabel">' + esc(days[r].weekday + " " + days[r].date.slice(5)) + "</div>";
      for (c = 0; c < 24; c++) {
        var v = days[r].hours[c];
        var a = v === 0 ? 0 : Math.max(0.18, v / max);
        var bg = v === 0 ? "" : ' style="background:rgba(139,92,246,' + a.toFixed(2) + ')"';
        html += '<div class="hmcell"' + bg + ' title="' + esc(days[r].date) + " " + c + ":00 &middot; " + v + '"></div>';
      }
      html += "</div>";
    }
    return html + "</div>";
  }

  function render(s) {
    var t = s.totals, sum24 = 0, i;
    for (i = 0; i < s.hourly24.length; i++) sum24 += s.hourly24[i].inbound;
    var connected = 0;
    for (i = 0; i < s.runtime.channels.length; i++) if (s.runtime.channels[i].connected) connected++;

    $("cards").innerHTML =
      card("Messages in", fmt(t.inbound), "today " + fmt(s.today.inbound), "c1") +
      card("Messages out", fmt(t.outbound), "today " + fmt(s.today.outbound), "c2") +
      card("Active users", fmt(s.activeUsers.last7d), "today " + fmt(s.today.activeUsers), "c3") +
      card("Last 24h", fmt(sum24), "inbound messages", "c6") +
      card("Errors", fmt(t.errors), "all channels", "c4") +
      card("Channels", connected + "/" + s.runtime.channels.length, "connected", "c5");

    $("uptime").textContent = "uptime " + uptime(s.runtime.uptimeSec);
    $("updated").textContent = "updated " + new Date(s.generatedAt).toLocaleTimeString();
    $("gen").textContent = "snapshot " + new Date(s.generatedAt).toLocaleString();

    $("hourly").innerHTML = svgHourly(s.hourly24);
    var lbl = "", step = Math.ceil(s.hourly24.length / 8);
    for (i = 0; i < s.hourly24.length; i += step) lbl += "<span>" + s.hourly24[i].label + "</span>";
    $("hourlyLabels").innerHTML = lbl;
    $("daily").innerHTML = svgDaily(s.daily14);

    var bars = "", maxCh = 1;
    for (i = 0; i < s.perChannel.length; i++) maxCh = Math.max(maxCh, s.perChannel[i].inbound + s.perChannel[i].outbound);
    if (!s.perChannel.length) bars = '<div class="empty">No traffic recorded yet.</div>';
    for (i = 0; i < Math.min(s.perChannel.length, 8); i++) {
      var ch = s.perChannel[i], total = ch.inbound + ch.outbound;
      bars += '<div class="brow"><span class="bname">' + esc(ch.channel) + '</span><div class="btrack"><div class="bfill" style="width:' + Math.max(2, Math.round(total / maxCh * 100)) + '%"></div></div><span class="bval">' + fmt(total) + "</span></div>";
    }
    $("channelBars").innerHTML = bars;

    var tu = '<tr><th>#</th><th>User</th><th>Channel</th><th class="num">Msgs</th><th class="num">Last seen</th></tr>';
    if (!s.topUsers.length) tu += '<tr><td colspan="5" class="empty">No users recorded yet.</td></tr>';
    for (i = 0; i < s.topUsers.length; i++) {
      var u = s.topUsers[i];
      tu += '<tr><td class="num">' + (i + 1) + '</td><td class="who"><b>' + esc(u.name) + "</b><span>" + esc(u.id) + '</span></td><td><span class="tag">' + esc(u.channel) + '</span></td><td class="num">' + fmt(u.count) + '</td><td class="num">' + timeAgo(u.lastSeen) + "</td></tr>";
    }
    $("topUsers").innerHTML = tu;

    $("heatmap").innerHTML = renderHeatmap(s.heatmap);

    var ct = '<tr><th>Status</th><th>Channel</th><th class="num">In</th><th class="num">Out</th><th class="num">Errors</th><th class="num">Last in</th><th class="num">Last out</th></tr>';
    var rc = {};
    for (i = 0; i < s.runtime.channels.length; i++) rc[s.runtime.channels[i].key.split(":")[0]] = s.runtime.channels[i].connected;
    if (!s.perChannel.length) ct += '<tr><td colspan="7" class="empty">No channels recorded yet.</td></tr>';
    for (i = 0; i < s.perChannel.length; i++) {
      var p = s.perChannel[i];
      var on = rc[p.channel] !== undefined ? rc[p.channel] : s.runtime.channels.length === 0 ? false : true;
      ct += '<tr><td><span class="dot ' + (on ? "on" : "off") + '"></span>' + (on ? "online" : "offline") + '</td><td><b>' + esc(p.channel) + '</b></td><td class="num">' + fmt(p.inbound) + '</td><td class="num">' + fmt(p.outbound) + '</td><td class="num">' + fmt(p.errors) + '</td><td class="num">' + timeAgo(p.lastInbound) + '</td><td class="num">' + timeAgo(p.lastOutbound) + "</td></tr>";
    }
    $("channelTable").innerHTML = ct;
  }

  setInterval(load, 5000);
  load();
})();
</script>
</body>
</html>`;

// src/bridges/dashboard/index.ts
class DashboardBridge {
  hub;
  config;
  server = null;
  flushTimer = null;
  stats;
  constructor(hub, config = {}) {
    this.hub = hub;
    const dataFile = config.dataFile !== undefined ? config.dataFile : process.env.CHANNELHUB_STATS_FILE || null;
    this.stats = config.collector ?? hub.stats ?? new StatsCollector;
    hub.stats = this.stats;
    if (dataFile && !config.collector && import_node_fs.existsSync(dataFile)) {
      try {
        this.stats.hydrate(JSON.parse(import_node_fs.readFileSync(dataFile, "utf8")));
      } catch {}
    }
    this.config = {
      port: config.port ?? 8790,
      host: config.host ?? "127.0.0.1",
      pathPrefix: config.pathPrefix ?? "",
      apiKey: config.apiKey ?? process.env.CHANNELHUB_DASHBOARD_KEY ?? "",
      dataFile: dataFile ? import_node_path.resolve(dataFile) : null,
      flushIntervalMs: config.flushIntervalMs ?? 15000,
      collector: config.collector
    };
  }
  async start() {
    this.server = import_node_http.createServer((req, res) => this.handle(req, res));
    await new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => resolve());
    });
    if (this.config.dataFile) {
      this.flushTimer = setInterval(() => {
        try {
          this.flush();
        } catch {}
      }, this.config.flushIntervalMs);
      this.flushTimer.unref?.();
    }
  }
  async stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server.close((err) => err ? reject(err) : resolve());
      });
      this.server = null;
    }
    this.flush();
  }
  get endpoint() {
    if (!this.server)
      return null;
    const addr = this.server.address();
    if (!addr || typeof addr === "string")
      return null;
    return `http://${this.config.host}:${addr.port}`;
  }
  flush() {
    if (!this.config.dataFile)
      return;
    import_node_fs.mkdirSync(import_node_path.dirname(this.config.dataFile), { recursive: true });
    const tmp = `${this.config.dataFile}.tmp`;
    import_node_fs.writeFileSync(tmp, JSON.stringify(this.stats.toJSON()));
    import_node_fs.renameSync(tmp, this.config.dataFile);
  }
  path(req) {
    const bare = (req.url || "/").split("?")[0];
    return bare.startsWith(this.config.pathPrefix) ? bare.slice(this.config.pathPrefix.length) || "/" : bare;
  }
  authenticate(req) {
    const isLoopback = this.config.host === "127.0.0.1" || this.config.host === "localhost";
    if (!this.config.apiKey) {
      if (!isLoopback)
        return false;
      return true;
    }
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return false;
    const tokenBuf = Buffer.from(authHeader.slice(7).trim());
    const keyBuf = Buffer.from(this.config.apiKey);
    if (tokenBuf.length !== keyBuf.length)
      return false;
    return import_node_crypto.timingSafeEqual(tokenBuf, keyBuf);
  }
  handle(req, res) {
    const p = this.path(req);
    if (req.method === "GET" && (p === "/" || p === "/index.html")) {
      const body = Buffer.from(DASHBOARD_HTML);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": body.length,
        "Cache-Control": "no-store"
      });
      res.end(body);
      return;
    }
    if (req.method === "GET" && p === "/health") {
      return this.json(res, 200, { ok: true });
    }
    if (req.method === "GET" && p === "/api/stats") {
      if (!this.authenticate(req)) {
        return this.json(res, 401, { error: "Unauthorized: Invalid or missing API key" });
      }
      const uptimeSec = Math.max(0, Math.floor((Date.now() - this.stats.startedAt) / 1000));
      return this.json(res, 200, {
        ...this.stats.snapshot(),
        runtime: {
          startedAt: this.stats.startedAt,
          uptimeSec,
          channels: this.hub.listChannels().map((key) => ({
            key,
            connected: this.hub.getChannel(key)?.isConnected() ?? false
          }))
        }
      });
    }
    this.json(res, 404, { error: "Not found" });
  }
  json(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    });
    res.end(data);
  }
}
var import_node_http, import_node_fs, import_node_path, import_node_crypto;
var init_dashboard = __esm(() => {
  init_stats();
  import_node_http = require("node:http");
  import_node_fs = require("node:fs");
  import_node_path = require("node:path");
  import_node_crypto = require("node:crypto");
});

// src/core/index.ts
var exports_core = {};
__export(exports_core, {
  BaseChannel: () => BaseChannel,
  ChannelHub: () => ChannelHub,
  GroupManager: () => GroupManager,
  HumanHandoffManager: () => HumanHandoffManager,
  IdempotencyCache: () => IdempotencyCache,
  IdentityStitcher: () => IdentityStitcher,
  MediaTranscoder: () => MediaTranscoder,
  SharedTokenBucketLimiter: () => SharedTokenBucketLimiter,
  SmartStreamer: () => SmartStreamer,
  StatsCollector: () => StatsCollector,
  TokenBucketLimiter: () => TokenBucketLimiter,
  VideoEngine: () => VideoEngine,
  WebResearch: () => WebResearch,
  createMessageContext: () => createMessageContext
});
module.exports = __toCommonJS(exports_core);

// src/core/adapter.ts
var import_node_events = require("node:events");

class BaseChannel extends import_node_events.EventEmitter {
  get provider() {
    return this.name;
  }
  async dispatchMessage(msg) {
    const listeners = this.listeners("message");
    for (const listener of listeners) {
      try {
        await listener(msg);
      } catch (err) {
        this.emit("error", err);
      }
    }
  }
  get accountId() {
    return this.config?.accountId || "default";
  }
  _connected = false;
  isConnected() {
    return this._connected;
  }
  setConnected(value) {
    const changed = this._connected !== value;
    this._connected = value;
    if (changed) {
      this.emit("status", value ? "connected" : "disconnected");
    }
  }
  assertNotAborted(signal) {
    if (signal?.aborted) {
      throw signal.reason || new Error("Operation aborted");
    }
  }
  async sendGif(chatId, urlOrPath, caption, options) {
    return this.sendMedia(chatId, {
      type: "animation",
      source: urlOrPath,
      caption
    }, options);
  }
  async sendSticker(chatId, stickerIdOrUrl, options) {
    return this.sendMedia(chatId, {
      type: "sticker",
      source: stickerIdOrUrl
    }, options);
  }
}
// src/core/stream.ts
class SmartStreamer {
  adapter;
  options;
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.options = {
      editDebounceMs: 1000,
      typingIntervalMs: 4000,
      chunkMode: "sentence",
      minSentenceLength: 60,
      initialPlaceholder: "...",
      ...options
    };
  }
  async stream(chatId, tokenStream, sendOptions) {
    let typingActive = true;
    const triggerTyping = async () => {
      if (this.adapter.sendTyping) {
        try {
          await this.adapter.sendTyping(chatId);
        } catch {}
      }
    };
    await triggerTyping();
    const typingTimer = setInterval(() => {
      if (typingActive)
        triggerTyping();
    }, this.options.typingIntervalMs);
    try {
      if (typeof this.adapter.editText === "function") {
        return await this.streamWithEdit(chatId, tokenStream, sendOptions);
      } else {
        return await this.streamWithoutEdit(chatId, tokenStream, sendOptions);
      }
    } finally {
      typingActive = false;
      clearInterval(typingTimer);
    }
  }
  async streamWithEdit(chatId, tokenStream, sendOptions) {
    let accumulated = "";
    let sentMsg = null;
    let lastEditTime = 0;
    let pendingEditTimeout = null;
    const performEdit = async (text) => {
      if (sentMsg && this.adapter.editText) {
        await this.adapter.editText(chatId, sentMsg.messageId, text);
        lastEditTime = Date.now();
      }
    };
    for await (const chunk of tokenStream) {
      accumulated += chunk;
      if (!sentMsg) {
        sentMsg = await this.adapter.sendText(chatId, accumulated.trim() || this.options.initialPlaceholder, sendOptions);
        lastEditTime = Date.now();
        continue;
      }
      const now = Date.now();
      const elapsed = now - lastEditTime;
      if (elapsed >= this.options.editDebounceMs) {
        if (pendingEditTimeout) {
          clearTimeout(pendingEditTimeout);
          pendingEditTimeout = null;
        }
        await performEdit(accumulated);
      } else if (!pendingEditTimeout) {
        pendingEditTimeout = setTimeout(async () => {
          pendingEditTimeout = null;
          await performEdit(accumulated);
        }, this.options.editDebounceMs - elapsed);
      }
    }
    if (pendingEditTimeout) {
      clearTimeout(pendingEditTimeout);
      pendingEditTimeout = null;
    }
    if (sentMsg && accumulated) {
      await performEdit(accumulated);
      return [sentMsg];
    } else if (!sentMsg && accumulated) {
      const res = await this.adapter.sendText(chatId, accumulated, sendOptions);
      return [res];
    }
    return sentMsg ? [sentMsg] : [];
  }
  async streamWithoutEdit(chatId, tokenStream, sendOptions) {
    const results = [];
    if (this.options.chunkMode === "accumulate") {
      let accumulated = "";
      for await (const chunk of tokenStream) {
        accumulated += chunk;
      }
      if (accumulated.trim()) {
        const res = await this.adapter.sendText(chatId, accumulated, sendOptions);
        results.push(res);
      }
      return results;
    }
    let buffer = "";
    const sentenceEndRegex = /[.?!;\n]\s*$/;
    for await (const chunk of tokenStream) {
      buffer += chunk;
      if (buffer.length >= this.options.minSentenceLength && sentenceEndRegex.test(buffer.trimEnd())) {
        const textToSend = buffer.trim();
        if (textToSend) {
          const res = await this.adapter.sendText(chatId, textToSend, sendOptions);
          results.push(res);
          buffer = "";
        }
      }
    }
    if (buffer.trim()) {
      const res = await this.adapter.sendText(chatId, buffer.trim(), sendOptions);
      results.push(res);
    }
    return results;
  }
}

// src/core/context.ts
function createMessageContext(message, channel, identity, handoffManager) {
  const isHandedOff = handoffManager ? handoffManager.isPaused(channel.name, message.chat.id) : false;
  return {
    message,
    channel,
    identity,
    isHandedOff,
    handoff: (durationMs, reason) => {
      if (handoffManager) {
        handoffManager.pause(channel.name, message.chat.id, durationMs, reason);
      }
    },
    resume: () => {
      return handoffManager ? handoffManager.resume(channel.name, message.chat.id) : false;
    },
    reply: (text, options) => channel.sendText(message.chat.id, text, {
      replyToId: message.id,
      ...options
    }),
    replyWithActions: (text, actions, options) => channel.sendText(message.chat.id, text, {
      replyToId: message.id,
      actions,
      ...options
    }),
    replyMedia: (media, options) => channel.sendMedia(message.chat.id, media, {
      replyToId: message.id,
      ...options
    }),
    react: async (emoji) => {
      if (channel.addReaction) {
        await channel.addReaction(message.chat.id, message.id, emoji);
      }
    },
    sendTyping: async () => {
      if (channel.sendTyping) {
        await channel.sendTyping(message.chat.id);
      }
    },
    stream: async (tokenStream, options) => {
      const streamer = new SmartStreamer(channel, options);
      return await streamer.stream(message.chat.id, tokenStream, {
        replyToId: message.id
      });
    }
  };
}
// src/core/bus.ts
var import_node_events2 = require("node:events");

class ChannelEventBus extends import_node_events2.EventEmitter {
  emitMessage(msg) {
    return this.emit("message", msg);
  }
  emitError(err) {
    return this.emit("error", err);
  }
  emitStatus(status) {
    return this.emit("status", status);
  }
}

// src/core/dedup.ts
class IdempotencyCache {
  _maxEntries;
  _ttlMs;
  _map = new Map;
  constructor(options = {}) {
    this._maxEntries = options.maxEntries ?? 50000;
    this._ttlMs = options.ttlMs ?? 300000;
  }
  checkAndSet(id) {
    const now = Date.now();
    const existing = this._map.get(id);
    if (existing !== undefined) {
      if (now < existing) {
        return false;
      }
    }
    if (this._map.size >= this._maxEntries) {
      const oldestKey = this._map.keys().next().value;
      if (oldestKey)
        this._map.delete(oldestKey);
    }
    this._map.set(id, now + this._ttlMs);
    return true;
  }
  has(id) {
    const expiresAt = this._map.get(id);
    if (expiresAt === undefined)
      return false;
    if (Date.now() >= expiresAt) {
      this._map.delete(id);
      return false;
    }
    return true;
  }
  cleanup() {
    const now = Date.now();
    let purged = 0;
    for (const [key, expiresAt] of this._map.entries()) {
      if (now >= expiresAt) {
        this._map.delete(key);
        purged++;
      }
    }
    return purged;
  }
  get size() {
    return this._map.size;
  }
  clear() {
    this._map.clear();
  }
}

// src/core/identity.ts
class IdentityStitcher {
  _lookup = new Map;
  _identities = new Map;
  makeKey(channel, channelUserId) {
    return `${channel}:${channelUserId}`;
  }
  resolve(channel, channelUserId) {
    const key = this.makeKey(channel, channelUserId);
    const existingPrimaryId = this._lookup.get(key);
    if (existingPrimaryId && this._identities.has(existingPrimaryId)) {
      return this._identities.get(existingPrimaryId);
    }
    const primaryUserId = `usr_${Math.random().toString(36).substring(2, 10)}`;
    const identity = {
      primaryUserId,
      channels: { [channel]: channelUserId },
      createdAt: Date.now()
    };
    this._lookup.set(key, primaryUserId);
    this._identities.set(primaryUserId, identity);
    return identity;
  }
  link(primaryUserId, channel, channelUserId) {
    let identity = this._identities.get(primaryUserId);
    if (!identity) {
      identity = {
        primaryUserId,
        channels: {},
        createdAt: Date.now()
      };
      this._identities.set(primaryUserId, identity);
    }
    const key = this.makeKey(channel, channelUserId);
    this._lookup.set(key, primaryUserId);
    identity.channels[channel] = channelUserId;
    return identity;
  }
  merge(targetPrimaryId, sourcePrimaryId) {
    if (targetPrimaryId === sourcePrimaryId) {
      return this._identities.get(targetPrimaryId);
    }
    const target = this._identities.get(targetPrimaryId);
    const source = this._identities.get(sourcePrimaryId);
    if (!target || !source) {
      throw new Error(`Cannot merge identities: both target and source must exist.`);
    }
    for (const [ch, chUserId] of Object.entries(source.channels)) {
      const key = this.makeKey(ch, chUserId);
      this._lookup.set(key, targetPrimaryId);
      target.channels[ch] = chUserId;
    }
    target.metadata = { ...source.metadata, ...target.metadata };
    this._identities.delete(sourcePrimaryId);
    return target;
  }
  get(primaryUserId) {
    return this._identities.get(primaryUserId);
  }
  get count() {
    return this._identities.size;
  }
}

// src/core/handoff.ts
class HumanHandoffManager {
  _states = new Map;
  _getKey(channel, chatId) {
    return `${channel}:${chatId}`;
  }
  pause(channel, chatId, durationMs = 3600000, reason) {
    const key = this._getKey(channel, chatId);
    const pausedUntil = durationMs === Infinity ? Infinity : Date.now() + durationMs;
    this._states.set(key, { chatId, channel, pausedUntil, reason });
  }
  resume(channel, chatId) {
    const key = this._getKey(channel, chatId);
    return this._states.delete(key);
  }
  isPaused(channel, chatId) {
    const key = this._getKey(channel, chatId);
    const state = this._states.get(key);
    if (!state)
      return false;
    if (state.pausedUntil !== Infinity && Date.now() > state.pausedUntil) {
      this._states.delete(key);
      return false;
    }
    return true;
  }
  getState(channel, chatId) {
    if (!this.isPaused(channel, chatId))
      return;
    return this._states.get(this._getKey(channel, chatId));
  }
}

// src/core/hub.ts
class ChannelHub {
  _channels = new Map;
  _bus = new ChannelEventBus;
  _messageHandlers = [];
  _middlewares = [];
  _dedupCache;
  _dlqHandler;
  _identityStitcher;
  _handoffManager;
  _stats;
  _instrumented = new WeakSet;
  _queue = [];
  _waiters = [];
  _queueDrainWaiters = [];
  _isClosed = false;
  constructor(options = {}) {
    if (options.enableDeduplication) {
      this._dedupCache = new IdempotencyCache(options.dedupOptions);
    }
    this._dlqHandler = options.onDeadLetter;
    this._identityStitcher = options.identityStitcher ?? new IdentityStitcher;
    this._handoffManager = new HumanHandoffManager;
    this._stats = options.stats ?? null;
  }
  get identityStitcher() {
    return this._identityStitcher;
  }
  get handoff() {
    return this._handoffManager;
  }
  get stats() {
    return this._stats;
  }
  set stats(collector) {
    this._stats = collector;
    if (collector) {
      for (const ch of new Set(this._channels.values())) {
        this._instrumentOutbound(ch);
      }
    }
  }
  use(middleware) {
    this._middlewares.push(middleware);
    return this;
  }
  register(channel) {
    const provider = channel.provider || channel.name;
    const accountId = channel.accountId || "default";
    const fullKey = `${provider}:${accountId}`;
    if (this._channels.has(fullKey)) {
      throw new Error(`Channel '${fullKey}' is already registered in ChannelHub.`);
    }
    this._channels.set(fullKey, channel);
    if (!this._channels.has(provider)) {
      this._channels.set(provider, channel);
    }
    if (!this._channels.has(channel.name)) {
      this._channels.set(channel.name, channel);
    }
    this._instrumentOutbound(channel);
    channel.on("message", async (msg) => {
      if (this._dedupCache && msg.id) {
        const isNew = this._dedupCache.checkAndSet(`${channel.name}:${msg.id}`);
        if (!isNew) {
          return;
        }
      }
      this._stats?.recordInbound(msg);
      this._bus.emitMessage(msg);
      const identity = this._identityStitcher.resolve(channel.name, msg.sender.id);
      const ctx = createMessageContext(msg, channel, identity, this._handoffManager);
      if (ctx.isHandedOff) {
        this._bus.emit("handoff", ctx);
      }
      if (this._waiters.length > 0) {
        const waiter = this._waiters.shift();
        waiter(ctx);
      } else {
        while (this._queue.length >= 2000 && !this._isClosed) {
          await new Promise((resolve) => this._queueDrainWaiters.push(resolve));
        }
        if (!this._isClosed) {
          this._queue.push(ctx);
        }
      }
      const executePipeline = async (index) => {
        if (index < this._middlewares.length) {
          const fn = this._middlewares[index];
          await fn(ctx, () => executePipeline(index + 1));
          return;
        }
        if (!ctx.isHandedOff) {
          for (const handler of this._messageHandlers) {
            await handler(ctx);
          }
        }
      };
      try {
        await executePipeline(0);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        this._stats?.recordError(channel.name);
        this._bus.emitError(errorObj);
        if (this._dlqHandler) {
          try {
            await this._dlqHandler({
              message: msg,
              error: errorObj,
              timestamp: Date.now(),
              retryCount: 0,
              channel: channel.name
            });
          } catch (dlqErr) {
            this._bus.emitError(dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)));
          }
        }
      }
    });
    channel.on("error", (err) => {
      this._stats?.recordError(channel.name);
      this._bus.emitError(err);
    });
    return this;
  }
  _instrumentOutbound(channel) {
    if (!this._stats || this._instrumented.has(channel))
      return;
    this._instrumented.add(channel);
    const hub = this;
    const wrap = (fn) => async (...args) => {
      const result = await fn(...args);
      hub._stats?.recordOutbound(channel.name);
      return result;
    };
    const target = channel;
    for (const method of ["sendText", "sendMedia"]) {
      const original = target[method];
      if (typeof original === "function") {
        target[method] = wrap(original.bind(channel));
      }
    }
  }
  getChannel(providerOrKey, accountId) {
    if (accountId) {
      return this._channels.get(`${providerOrKey}:${accountId}`);
    }
    return this._channels.get(providerOrKey);
  }
  listChannels() {
    const seen = new Set;
    const keys = [];
    for (const [key, ch] of this._channels.entries()) {
      if (!seen.has(ch)) {
        seen.add(ch);
        keys.push(key);
      }
    }
    return keys;
  }
  onMessage(handler) {
    this._messageHandlers.push(handler);
    return this;
  }
  on(event, handler) {
    if (event === "message") {
      this.onMessage(handler);
    } else if (event === "error") {
      this._bus.on("error", handler);
    } else if (event === "handoff") {
      this._bus.on("handoff", handler);
    }
    return this;
  }
  async* messages(signal) {
    while (!this._isClosed && !signal?.aborted) {
      if (this._queue.length > 0) {
        const item = this._queue.shift();
        if (this._queueDrainWaiters.length > 0) {
          const drain = this._queueDrainWaiters.shift();
          drain();
        }
        yield item;
        continue;
      }
      const next = await new Promise((resolve) => {
        const waiter = (ctx) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(ctx);
        };
        const onAbort = () => {
          const idx = this._waiters.indexOf(waiter);
          if (idx !== -1)
            this._waiters.splice(idx, 1);
          signal?.removeEventListener("abort", onAbort);
          resolve(null);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        this._waiters.push(waiter);
      });
      if (!next || signal?.aborted)
        break;
      yield next;
    }
  }
  async start(signal) {
    this._isClosed = false;
    const connected = [];
    const uniqueChannels = Array.from(new Set(this._channels.values()));
    try {
      for (const ch of uniqueChannels) {
        if (signal?.aborted) {
          throw signal.reason || new Error("Startup aborted");
        }
        await ch.connect(signal);
        connected.push(ch);
      }
    } catch (err) {
      await Promise.allSettled(connected.map((ch) => ch.disconnect()));
      throw err;
    }
  }
  async startAll(signal) {
    return this.start(signal);
  }
  async dashboard(options = {}) {
    await Promise.resolve().then(() => init_dashboard());
    const bridge = new DashboardBridge(this, options);
    await bridge.start();
    return bridge;
  }
  async stop(signal) {
    this._isClosed = true;
    for (const waiter of this._waiters) {
      waiter(null);
    }
    this._waiters = [];
    while (this._queueDrainWaiters.length > 0) {
      const drain = this._queueDrainWaiters.shift();
      drain();
    }
    const uniqueChannels = Array.from(new Set(this._channels.values()));
    await Promise.allSettled(uniqueChannels.map((ch) => ch.disconnect(signal)));
  }
}
// src/core/limiter.ts
class TokenBucketLimiter {
  _tokens;
  _capacity;
  _refillRate;
  _refillIntervalMs;
  _lastRefill;
  constructor(options) {
    this._capacity = Math.max(1, options.capacity);
    this._tokens = this._capacity;
    this._refillRate = Math.max(1, options.refillRate);
    this._refillIntervalMs = Math.max(1, options.refillIntervalMs);
    this._lastRefill = Date.now();
  }
  refill() {
    const now = Date.now();
    const elapsed = now - this._lastRefill;
    if (elapsed >= this._refillIntervalMs) {
      const intervals = Math.floor(elapsed / this._refillIntervalMs);
      const addedTokens = intervals * this._refillRate;
      this._tokens = Math.min(this._capacity, this._tokens + addedTokens);
      this._lastRefill += intervals * this._refillIntervalMs;
    }
  }
  async acquire(tokens = 1, maxWaitMs) {
    if (tokens > this._capacity) {
      throw new Error(`Cannot acquire ${tokens} tokens; exceeds bucket capacity of ${this._capacity}.`);
    }
    return new Promise((resolve, reject) => {
      let timeoutId;
      let intervalId;
      const start = Date.now();
      const tryAcquire = () => {
        this.refill();
        if (this._tokens >= tokens) {
          this._tokens -= tokens;
          cleanup();
          resolve(true);
          return true;
        }
        if (maxWaitMs !== undefined && Date.now() - start > maxWaitMs) {
          cleanup();
          reject(new Error(`Timeout of ${maxWaitMs}ms exceeded while waiting for rate limiter token.`));
          return true;
        }
        return false;
      };
      const cleanup = () => {
        if (timeoutId)
          clearTimeout(timeoutId);
        if (intervalId)
          clearInterval(intervalId);
      };
      if (tryAcquire())
        return;
      const pollMs = Math.min(this._refillIntervalMs, 50);
      intervalId = setInterval(tryAcquire, pollMs);
      if (maxWaitMs !== undefined) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout of ${maxWaitMs}ms exceeded while waiting for rate limiter token.`));
        }, maxWaitMs);
      }
    });
  }
  get tokensAvailable() {
    this.refill();
    return this._tokens;
  }
}
// src/core/shared-limiter.ts
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class SharedTokenBucketLimiter {
  maxTokens;
  refillRatePerSec;
  mem;
  TOKENS_MASK = (1n << 22n) - 1n;
  constructor(maxTokens, refillRatePerSec, sharedBuffer) {
    this.maxTokens = maxTokens;
    this.refillRatePerSec = refillRatePerSec;
    if (maxTokens > 4000000) {
      throw new Error("SharedTokenBucketLimiter supports max 4,000,000 tokens per bucket.");
    }
    const buffer = sharedBuffer ?? new SharedArrayBuffer(8);
    this.mem = new BigInt64Array(buffer);
    if (!sharedBuffer) {
      const initialPacked = this.pack(BigInt(Date.now()), BigInt(maxTokens));
      Atomics.store(this.mem, 0, initialPacked);
    }
  }
  get buffer() {
    return this.mem.buffer;
  }
  pack(timestampMs, tokens) {
    return timestampMs << 22n | tokens & this.TOKENS_MASK;
  }
  unpack(packed) {
    const tokens = packed & this.TOKENS_MASK;
    const timestampMs = packed >> 22n;
    return { timestampMs, tokens };
  }
  tryAcquire(cost = 1) {
    const costBn = BigInt(cost);
    let currentPacked = Atomics.load(this.mem, 0);
    while (true) {
      let { timestampMs, tokens } = this.unpack(currentPacked);
      const now = BigInt(Date.now());
      const elapsedMs = Number(now - timestampMs);
      if (elapsedMs > 0) {
        const added = Math.floor(elapsedMs / 1000 * this.refillRatePerSec);
        if (added > 0) {
          tokens = BigInt(Math.min(this.maxTokens, Number(tokens) + added));
          const msConsumed = added * 1000 / this.refillRatePerSec;
          timestampMs = timestampMs + BigInt(Math.floor(msConsumed));
        }
      }
      if (tokens < costBn) {
        return false;
      }
      const newPacked = this.pack(timestampMs, tokens - costBn);
      const actual = Atomics.compareExchange(this.mem, 0, currentPacked, newPacked);
      if (actual === currentPacked) {
        return true;
      }
      currentPacked = actual;
    }
  }
  async acquire(cost = 1, timeoutMs = 5000) {
    const start = Date.now();
    while (true) {
      if (this.tryAcquire(cost))
        return true;
      if (Date.now() - start > timeoutMs)
        return false;
      await delay(Math.max(10, Math.floor(1000 / this.refillRatePerSec)));
    }
  }
}
// src/core/transcoder.ts
class MediaTranscoder {
  static sharpCache = null;
  static async getSharp() {
    if (this.sharpCache)
      return this.sharpCache;
    try {
      const mod = await import("sharp");
      this.sharpCache = mod.default || mod;
      return this.sharpCache;
    } catch (e) {
      throw new Error("Cannot load optional dependency 'sharp'. Please install it: npm install sharp");
    }
  }
  static async transcodeImage(source, options = {}) {
    const sharp = await this.getSharp();
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 80,
      format = "webp",
      stripMetadata = true
    } = options;
    const sourceBuf = Buffer.isBuffer(source) ? source : Buffer.from(source);
    let pipeline = sharp(sourceBuf, { failOn: "none" });
    if (stripMetadata) {
      pipeline = pipeline.withMetadata(false);
    }
    pipeline = pipeline.rotate();
    pipeline = pipeline.resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true
    });
    let mimeType = "image/webp";
    if (format === "webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (format === "jpeg") {
      pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
      mimeType = "image/jpeg";
    } else if (format === "png") {
      pipeline = pipeline.png({ compressionLevel: 8, adaptiveFiltering: true });
      mimeType = "image/png";
    }
    const { data: outputBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      buffer: outputBuffer,
      format: info.format,
      mimeType,
      originalSize: sourceBuf.length,
      transcodedSize: outputBuffer.length,
      compressionRatio: outputBuffer.length / sourceBuf.length,
      width: info.width,
      height: info.height
    };
  }
}
// src/core/research.ts
class WebResearch {
  static async search(query, options = {}) {
    const { limit = 5, provider = "duckduckgo", apiKey, deepExtract = false, signal } = options;
    let results = [];
    if (provider === "tavily") {
      results = await this.searchTavily(query, apiKey, limit, signal);
    } else if (provider === "brave") {
      results = await this.searchBrave(query, apiKey, limit, signal);
    } else {
      results = await this.searchDuckDuckGo(query, limit, signal);
    }
    if (deepExtract && results.length > 0) {
      const topToExtract = results.slice(0, 3);
      await Promise.allSettled(topToExtract.map(async (r) => {
        try {
          const page = await this.extract(r.url, signal);
          r.content = page.content.slice(0, 5000);
        } catch {}
      }));
    }
    return results;
  }
  static async extract(url, signal) {
    try {
      const res = await fetch(`https://r.jina.ai/${encodeURI(url)}`, {
        headers: {
          Accept: "text/plain",
          "User-Agent": "ChannelHub-Agent/1.0"
        },
        signal
      });
      if (res.ok) {
        const text = await res.text();
        return {
          url,
          content: text.trim()
        };
      }
    } catch {}
    const rawRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal
    });
    const html = await rawRes.text();
    const clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      url,
      content: clean.slice(0, 1e4)
    };
  }
  static async searchDuckDuckGo(query, limit, signal) {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      },
      signal
    });
    if (!res.ok)
      throw new Error(`DuckDuckGo returned ${res.status}`);
    const html = await res.text();
    const results = [];
    const blockRegex = /<div class="result results_links results_links_deep web-result[\s\S]*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = blockRegex.exec(html)) !== null && results.length < limit) {
      const block = match[0];
      const titleMatch = block.match(/<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/);
      if (titleMatch) {
        let rawUrl = titleMatch[1];
        if (rawUrl.includes("uddg=")) {
          const extracted = rawUrl.split("uddg=")[1]?.split("&")[0];
          if (extracted)
            rawUrl = decodeURIComponent(extracted);
        }
        const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        if (rawUrl.startsWith("http")) {
          results.push({
            title,
            url: rawUrl,
            snippet
          });
        }
      }
    }
    return results;
  }
  static async searchTavily(query, apiKey, limit = 5, signal) {
    if (!apiKey)
      throw new Error("Tavily provider requires apiKey in options");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: limit
      }),
      signal
    });
    if (!res.ok)
      throw new Error(`Tavily error: ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content
    }));
  }
  static async searchBrave(query, apiKey, limit = 5, signal) {
    if (!apiKey)
      throw new Error("Brave provider requires apiKey in options");
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey
      },
      signal
    });
    if (!res.ok)
      throw new Error(`Brave search error: ${res.status}`);
    const data = await res.json();
    return (data.web?.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description
    }));
  }
}
// src/core/video.ts
var import_node_child_process = require("node:child_process");
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
var import_node_os = require("node:os");

class VideoEngine {
  static async createShort(options) {
    const {
      input,
      output,
      mode = "blur-backdrop",
      targetWidth = 1080,
      targetHeight = 1920,
      ffmpegPath = "ffmpeg"
    } = options;
    let filterGraph = "";
    if (mode === "blur-backdrop") {
      filterGraph = [
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=20:5[bg]`,
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg]`,
        `[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]`
      ].join(";");
    } else if (mode === "crop-center") {
      filterGraph = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}[outv]`;
    } else {
      filterGraph = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black[outv]`;
    }
    const args = [
      "-y",
      "-i",
      input,
      "-filter_complex",
      filterGraph,
      "-map",
      "[outv]",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async burnSubtitles(options) {
    const { input, output, subtitles, style = {}, ffmpegPath = "ffmpeg" } = options;
    let srtPath = subtitles;
    let tempCreated = false;
    if (!subtitles.endsWith(".srt") && !subtitles.endsWith(".vtt")) {
      srtPath = import_node_path2.join(import_node_os.tmpdir(), `sub_${Date.now()}_${Math.random().toString(36).slice(2)}.srt`);
      await import_node_fs2.promises.writeFile(srtPath, subtitles, "utf8");
      tempCreated = true;
    }
    try {
      const fontSize = style.fontSize || 24;
      const fontColor = style.fontColor || "&H00FFFFFF";
      const bold = style.bold ? 1 : 0;
      const safeSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
      const filter = `subtitles='${safeSrtPath}':force_style='FontSize=${fontSize},PrimaryColour=${fontColor},Bold=${bold}'`;
      const args = [
        "-y",
        "-i",
        input,
        "-vf",
        filter,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "copy",
        output
      ];
      await this.runProcess(ffmpegPath, args);
      return { output, command: [ffmpegPath, ...args] };
    } finally {
      if (tempCreated) {
        await import_node_fs2.promises.unlink(srtPath).catch(() => {});
      }
    }
  }
  static async addWatermark(options) {
    const {
      input,
      watermark,
      output,
      position = "top-right",
      opacity = 0.9,
      scale = 0.15,
      ffmpegPath = "ffmpeg"
    } = options;
    let posExpr = "W-w-20:20";
    if (position === "top-left")
      posExpr = "20:20";
    else if (position === "bottom-left")
      posExpr = "20:H-h-20";
    else if (position === "bottom-right")
      posExpr = "W-w-20:H-h-20";
    else if (position === "center")
      posExpr = "(W-w)/2:(H-h)/2";
    const filterGraph = [
      `[1:v]scale=iw*${scale}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm]`,
      `[0:v][wm]overlay=${posExpr}[outv]`
    ].join(";");
    const args = [
      "-y",
      "-i",
      input,
      "-i",
      watermark,
      "-filter_complex",
      filterGraph,
      "-map",
      "[outv]",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "copy",
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async extractThumbnail(options) {
    const { input, output, timestampSec = 1, width, ffmpegPath = "ffmpeg" } = options;
    const args = [
      "-y",
      "-ss",
      String(timestampSec),
      "-i",
      input,
      "-vframes",
      "1"
    ];
    if (width) {
      args.push("-vf", `scale=${width}:-1`);
    }
    args.push(output);
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async generateMemeGif(options) {
    const {
      input,
      output,
      startSec = 0,
      durationSec = 5,
      fps = 15,
      width = 480,
      topText,
      bottomText,
      ffmpegPath = "ffmpeg"
    } = options;
    const filterParts = [
      `fps=${fps}`,
      `scale=${width}:-1:flags=lanczos`
    ];
    if (topText) {
      filterParts.push(`drawtext=text='${topText.replace(/'/g, "")}':x=(w-text_w)/2:y=20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`);
    }
    if (bottomText) {
      filterParts.push(`drawtext=text='${bottomText.replace(/'/g, "")}':x=(w-text_w)/2:y=h-text_h-20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`);
    }
    const vf = `${filterParts.join(",")},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
    const args = [
      "-y",
      "-ss",
      String(startSec),
      "-t",
      String(durationSec),
      "-i",
      input,
      "-vf",
      vf,
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async renderShotstack(options) {
    const {
      timeline,
      apiKey,
      env = "stage",
      outputFormat = "mp4",
      aspectRatio = "9:16",
      signal
    } = options;
    const baseUrl = env === "v1" ? "https://api.shotstack.io/edit/v1" : "https://api.shotstack.io/edit/stage";
    const payload = {
      timeline,
      output: {
        format: outputFormat,
        aspectRatio,
        fps: 30
      }
    };
    const res = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(payload),
      signal
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shotstack render error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return {
      renderId: data.response?.id,
      status: data.response?.status || "queued",
      url: data.response?.url
    };
  }
  static runProcess(cmd, args) {
    return new Promise((resolve, reject) => {
      const child = import_node_child_process.spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (err) => {
        reject(new Error(`Failed to execute ${cmd}: ${err.message}`));
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${cmd} exited with code ${code}. Details:
${stderr.slice(-500)}`));
        }
      });
    });
  }
}

// src/core/index.ts
init_stats();

// src/core/group-manager.ts
class GroupManager {
  userMessageHistory = new Map;
  reminders = new Map;
  pendingChallenges = new Map;
  chatActivities = new Map;
  warnings = new Map;
  polls = new Map;
  generateRecap(messages) {
    const participants = Array.from(new Set(messages.map((m) => m.sender || m.senderId || "Unknown")));
    const keyTopics = [];
    const decisions = [];
    const actionItems = [];
    for (const msg of messages) {
      const text = msg.text.trim();
      const lower = text.toLowerCase();
      if (lower.startsWith("chốt:") || lower.startsWith("quyết định:") || lower.includes("thống nhất") || lower.startsWith("agree:") || lower.startsWith("decided:")) {
        decisions.push(text);
      }
      if (lower.includes("cần làm") || lower.includes("todo:") || lower.includes("giao cho") || lower.includes("hạn chót") || lower.startsWith("task:")) {
        actionItems.push({
          task: text,
          assignee: msg.sender
        });
      }
      if (text.length > 15 && !keyTopics.includes(text) && keyTopics.length < 5) {
        if (!decisions.includes(text) && !actionItems.some((a) => a.task === text)) {
          keyTopics.push(text.length > 80 ? text.slice(0, 77) + "..." : text);
        }
      }
    }
    const summaryLines = [
      `\uD83D\uDCCA **Tóm tắt cuộc thảo luận (${messages.length} tin nhắn)**:`,
      `\uD83D\uDC65 **Thành viên tham gia:** ${participants.join(", ") || "Không có"}`,
      `\uD83D\uDCCC **Chủ đề chính:** ${keyTopics.length > 0 ? keyTopics.join(" | ") : "Thảo luận thông thường"}`,
      `✅ **Quyết định đã chốt:** ${decisions.length > 0 ? decisions.join("; ") : "Không có"}`,
      `\uD83D\uDCDD **Đầu việc (Action items):** ${actionItems.length > 0 ? actionItems.map((a) => a.task).join("; ") : "Không có"}`
    ];
    return {
      totalMessages: messages.length,
      participants,
      keyTopics,
      decisions,
      actionItems,
      summaryText: summaryLines.join(`
`)
    };
  }
  checkSpam(senderId, text, options = {}) {
    const now = Date.now();
    const windowMs = options.windowMs || 1e4;
    const maxMessages = options.maxMessagesPerWindow || 5;
    const blacklisted = options.blacklistedDomains || ["t.me/", "bit.ly/", "cutt.ly/", "tini.vn/"];
    const urlMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
    if (options.disallowLinks && urlMatches.length > 0) {
      return {
        isSpam: true,
        reason: "links_disabled",
        recommendedAction: "delete",
        messageCountInWindow: 1
      };
    }
    for (const url of urlMatches) {
      if (blacklisted.some((bad) => url.toLowerCase().includes(bad.toLowerCase()))) {
        return {
          isSpam: true,
          reason: "blacklisted_link",
          recommendedAction: "kick",
          messageCountInWindow: 1
        };
      }
    }
    const userHistory = this.userMessageHistory.get(senderId) || [];
    const validHistory = userHistory.filter((item) => now - item.timestamp < windowMs);
    const identicalCount = validHistory.filter((item) => item.text === text).length;
    if (identicalCount >= 2) {
      return {
        isSpam: true,
        reason: "repetitive_text",
        recommendedAction: "warn",
        messageCountInWindow: validHistory.length + 1
      };
    }
    validHistory.push({ text, timestamp: now });
    this.userMessageHistory.set(senderId, validHistory);
    if (validHistory.length >= maxMessages) {
      return {
        isSpam: true,
        reason: "flood",
        recommendedAction: "warn",
        messageCountInWindow: validHistory.length
      };
    }
    return {
      isSpam: false,
      recommendedAction: "allow",
      messageCountInWindow: validHistory.length
    };
  }
  registerNewMember(chatId, member, groupRules = "Vui lòng tôn trọng thành viên và không gửi link quảng cáo.", timeoutSeconds = 60) {
    const a = Math.floor(Math.random() * 8) + 1;
    const b = Math.floor(Math.random() * 8) + 1;
    const answer = String(a + b);
    const expiresAt = Date.now() + timeoutSeconds * 1000;
    const challengeKey = `${chatId}:${member.id}`;
    const challenge = {
      memberId: member.id,
      memberName: member.name,
      welcomeMessage: `\uD83C\uDF89 Chào mừng **${member.name}** đã tham gia nhóm!
\uD83D\uDCDC Nội quy: ${groupRules}
\uD83D\uDD12 Để tránh tài khoản clone, bạn hãy trả lời câu hỏi bảo mật trong vòng ${timeoutSeconds}s:`,
      question: `Bạn hãy tính: ${a} + ${b} = ?`,
      expectedAnswer: answer,
      expiresAt
    };
    this.pendingChallenges.set(challengeKey, challenge);
    return challenge;
  }
  verifyMember(chatId, memberId, answer) {
    const challengeKey = `${chatId}:${memberId}`;
    const challenge = this.pendingChallenges.get(challengeKey);
    if (!challenge)
      return true;
    if (Date.now() > challenge.expiresAt) {
      this.pendingChallenges.delete(challengeKey);
      return false;
    }
    if (answer.trim() === challenge.expectedAnswer) {
      this.pendingChallenges.delete(challengeKey);
      return true;
    }
    return false;
  }
  scheduleReminder(chatId, text, triggerAt, recurringIntervalMs) {
    const id = `remind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = typeof triggerAt === "number" ? triggerAt : triggerAt.getTime();
    const reminder = {
      id,
      chatId,
      text,
      triggerAt: timestamp,
      recurringIntervalMs,
      executed: false
    };
    this.reminders.set(id, reminder);
    return reminder;
  }
  pollDueReminders() {
    const now = Date.now();
    const dueList = [];
    for (const [id, r] of this.reminders.entries()) {
      if (!r.executed && r.triggerAt <= now) {
        dueList.push({ ...r });
        if (r.recurringIntervalMs && r.recurringIntervalMs > 0) {
          r.triggerAt = now + r.recurringIntervalMs;
        } else {
          r.executed = true;
          this.reminders.delete(id);
        }
      }
    }
    return dueList;
  }
  recordActivity(chatId, senderId, senderName = senderId, timestamp = Date.now()) {
    let groupMap = this.chatActivities.get(chatId);
    if (!groupMap) {
      groupMap = new Map;
      this.chatActivities.set(chatId, groupMap);
    }
    const current = groupMap.get(senderId) || {
      userId: senderId,
      name: senderName,
      messageCount: 0,
      lastActiveAt: timestamp
    };
    current.messageCount += 1;
    current.name = senderName;
    current.lastActiveAt = timestamp;
    groupMap.set(senderId, current);
  }
  getLeaderboard(chatId, limit = 10) {
    const groupMap = this.chatActivities.get(chatId);
    if (!groupMap)
      return [];
    return Array.from(groupMap.values()).sort((a, b) => b.messageCount - a.messageCount).slice(0, limit);
  }
  getInactiveMembers(chatId, cutoffDays = 7) {
    const groupMap = this.chatActivities.get(chatId);
    if (!groupMap)
      return [];
    const threshold = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
    return Array.from(groupMap.values()).filter((m) => m.lastActiveAt < threshold);
  }
  checkProfanity(text, badWords = ["dm", "vcl", "fuck", "bitch", "scam", "lua dao"]) {
    const lower = text.toLowerCase();
    const flagged = [];
    for (const w of badWords) {
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9_])${w}([^a-zA-Z0-9_]|\\s|$)`, "i");
      if (regex.test(lower)) {
        flagged.push(w);
      }
    }
    return {
      isClean: flagged.length === 0,
      flaggedWords: flagged
    };
  }
  issueWarning(chatId, userId, reason, maxStrikes = 3) {
    let chatMap = this.warnings.get(chatId);
    if (!chatMap) {
      chatMap = new Map;
      this.warnings.set(chatId, chatMap);
    }
    const userWarns = chatMap.get(userId) || [];
    userWarns.push({ reason, timestamp: Date.now() });
    chatMap.set(userId, userWarns);
    return {
      strikes: userWarns.length,
      action: userWarns.length >= maxStrikes ? "kick" : "warn"
    };
  }
  getWarnings(chatId, userId) {
    return this.warnings.get(chatId)?.get(userId) || [];
  }
  clearWarnings(chatId, userId) {
    this.warnings.get(chatId)?.delete(userId);
  }
  createPoll(chatId, creatorId, question, options) {
    const id = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const poll = {
      id,
      chatId,
      creatorId,
      question,
      options,
      votes: new Map,
      active: true
    };
    this.polls.set(id, poll);
    return poll;
  }
  castVote(pollId, voterId, optionIndex) {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.active || optionIndex < 0 || optionIndex >= poll.options.length) {
      return false;
    }
    poll.votes.set(voterId, optionIndex);
    return true;
  }
  getPollResults(pollId) {
    const poll = this.polls.get(pollId);
    if (!poll)
      return null;
    const counts = new Array(poll.options.length).fill(0);
    for (const optIdx of poll.votes.values()) {
      counts[optIdx]++;
    }
    const total = poll.votes.size;
    const results = poll.options.map((option, idx) => ({
      option,
      votes: counts[idx],
      percentage: total > 0 ? Math.round(counts[idx] / total * 100) : 0
    }));
    return {
      question: poll.question,
      totalVotes: total,
      active: poll.active,
      results
    };
  }
  closePoll(pollId, creatorId) {
    const poll = this.polls.get(pollId);
    if (!poll)
      return false;
    if (creatorId && poll.creatorId !== creatorId)
      return false;
    poll.active = false;
    return true;
  }
}
