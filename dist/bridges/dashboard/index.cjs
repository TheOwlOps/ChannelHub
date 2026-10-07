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

// src/bridges/dashboard/index.ts
var exports_dashboard = {};
__export(exports_dashboard, {
  DashboardBridge: () => DashboardBridge
});
module.exports = __toCommonJS(exports_dashboard);
var import_node_http = require("node:http");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_crypto = require("node:crypto");

// src/core/stats.ts
var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
