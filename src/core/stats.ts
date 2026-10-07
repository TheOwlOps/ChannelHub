import type { UnifiedMessage } from "./types";

export interface StatsCollectorOptions {
  /** How many days of hourly/daily buckets to keep. Default: 30 */
  retentionDays?: number;
  /** Maximum unique users tracked per day (memory guard). Default: 5000 */
  maxUsersPerDay?: number;
  /** Number of entries returned in `snapshot().topUsers`. Default: 10 */
  topUsersLimit?: number;
}

export interface ChannelStats {
  inbound: number;
  outbound: number;
  errors: number;
  lastInbound: number | null;
  lastOutbound: number | null;
}

export interface UserStat {
  id: string;
  name: string;
  channel: string;
  count: number;
  lastSeen: number;
}

export interface StatsSnapshot {
  generatedAt: number;
  totals: { inbound: number; outbound: number; errors: number };
  today: { inbound: number; outbound: number; activeUsers: number };
  activeUsers: { today: number; last7d: number };
  perChannel: Array<{
    channel: string;
    inbound: number;
    outbound: number;
    errors: number;
    lastInbound: number | null;
    lastOutbound: number | null;
  }>;
  /** 24 buckets, oldest first, ending at the current hour */
  hourly24: Array<{ key: string; label: string; inbound: number; outbound: number }>;
  /** 7 entries, 6 days ago → today, each with 24 hourly inbound counts */
  heatmap: Array<{ date: string; weekday: string; hours: number[] }>;
  /** 14 entries, oldest first, ending today */
  daily14: Array<{ date: string; inbound: number; outbound: number }>;
  topUsers: Array<UserStat>;
}

interface HourlyBucket {
  inbound: number;
  outbound: number;
}

interface DailyBucket {
  inbound: number;
  outbound: number;
  users: Map<string, UserStat>;
  overflow: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function hourKey(ts: number): string {
  const d = new Date(ts);
  return `${dayKey(ts)}T${pad2(d.getHours())}`;
}

/**
 * In-memory traffic recorder backing the live dashboard.
 * Tracks inbound/outbound message volume per channel and per hour,
 * daily active users, and errors. Pure data — persistence is handled
 * by the caller (see DashboardBridge) via toJSON()/hydrate().
 */
export class StatsCollector {
  readonly startedAt: number;
  private readonly retentionDays: number;
  private readonly maxUsersPerDay: number;
  private readonly topUsersLimit: number;
  private totals = { inbound: 0, outbound: 0, errors: 0 };
  private channels = new Map<string, ChannelStats>();
  private hourly = new Map<string, HourlyBucket>();
  private daily = new Map<string, DailyBucket>();

  constructor(options: StatsCollectorOptions = {}) {
    this.retentionDays = options.retentionDays ?? 30;
    this.maxUsersPerDay = options.maxUsersPerDay ?? 5000;
    this.topUsersLimit = options.topUsersLimit ?? 10;
    this.startedAt = Date.now();
  }

  /** Records an inbound message (call after dedup so retries are not double-counted). */
  recordInbound(msg: Pick<UnifiedMessage, "channel" | "sender">, ts: number = Date.now()): void {
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

    // Users are keyed by sender id alone so a person messaging from two
    // channels is one active user; `channel` tracks their most recent one.
    const id = String(msg.sender?.id ?? "unknown");
    const name = msg.sender?.name || msg.sender?.username || id;
    const existing = d.users.get(id);
    if (existing) {
      existing.count++;
      existing.lastSeen = ts;
      existing.channel = channel;
      if (msg.sender?.name) existing.name = name;
    } else if (d.users.size < this.maxUsersPerDay) {
      d.users.set(id, { id, name, channel, count: 1, lastSeen: ts });
    } else {
      d.overflow++;
    }
  }

  /** Records a successful outbound send on a channel. */
  recordOutbound(channel: string, ts: number = Date.now()): void {
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

  /** Records an error observed on a channel. */
  recordError(channel: string): void {
    this.totals.errors++;
    this.channelEntry(channel).errors++;
  }

  /** Builds the JSON payload consumed by the dashboard UI. */
  snapshot(now: number = Date.now()): StatsSnapshot {
    this.prune(now);

    const perChannel = Array.from(this.channels.entries())
      .map(([channel, s]) => ({ channel, ...s }))
      .sort((a, b) => b.inbound + b.outbound - (a.inbound + a.outbound));

    const endHour = new Date(now);
    endHour.setMinutes(0, 0, 0);
    const hourly24: StatsSnapshot["hourly24"] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(endHour);
      d.setHours(endHour.getHours() - i);
      const key = hourKey(d.getTime());
      const b = this.hourly.get(key) ?? { inbound: 0, outbound: 0 };
      hourly24.push({
        key,
        label: `${pad2(d.getHours())}:00 ${dayKey(d.getTime()).slice(5)}`,
        inbound: b.inbound,
        outbound: b.outbound,
      });
    }

    const heatmap: StatsSnapshot["heatmap"] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dk = dayKey(d.getTime());
      const hours: number[] = [];
      for (let h = 0; h < 24; h++) {
        hours.push(this.hourly.get(`${dk}T${pad2(h)}`)?.inbound ?? 0);
      }
      heatmap.push({ date: dk, weekday: WEEKDAYS[d.getDay()], hours });
    }

    const daily14: StatsSnapshot["daily14"] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dk = dayKey(d.getTime());
      const b = this.daily.get(dk);
      daily14.push({
        date: dk,
        inbound: b?.inbound ?? 0,
        outbound: b?.outbound ?? 0,
      });
    }

    const cutoff7d = dayKey(now - 6 * 86_400_000);
    const merged = new Map<string, UserStat>();
    for (const [date, bucket] of this.daily) {
      if (date < cutoff7d) continue;
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
    const topUsers = Array.from(merged.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, this.topUsersLimit);

    const todayBucket = this.daily.get(dayKey(now));

    return {
      generatedAt: now,
      totals: { ...this.totals },
      today: {
        inbound: todayBucket?.inbound ?? 0,
        outbound: todayBucket?.outbound ?? 0,
        activeUsers: todayBucket?.users.size ?? 0,
      },
      activeUsers: {
        today: todayBucket?.users.size ?? 0,
        last7d: merged.size,
      },
      perChannel,
      hourly24,
      heatmap,
      daily14,
      topUsers,
    };
  }

  /** Drops buckets older than the retention window. Called lazily by snapshot(). */
  prune(now: number = Date.now()): void {
    const cutoffDay = dayKey(now - this.retentionDays * 86_400_000);
    for (const key of this.daily.keys()) {
      if (key < cutoffDay) this.daily.delete(key);
    }
    const cutoffHour = `${cutoffDay}T00`;
    for (const key of this.hourly.keys()) {
      if (key < cutoffHour) this.hourly.delete(key);
    }
  }

  toJSON(): Record<string, unknown> {
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
        users: Array.from(d.users.values()),
      })),
    };
  }

  /** Replaces in-memory state with persisted data. Returns `false` for unknown payloads. */
  hydrate(data: unknown): boolean {
    if (!data || typeof data !== "object") return false;
    const raw = data as any;
    if (raw.version !== 1) return false;
    if (!raw.totals || !Array.isArray(raw.channels) || !Array.isArray(raw.hourly) || !Array.isArray(raw.daily)) {
      return false;
    }

    this.totals = {
      inbound: Number(raw.totals.inbound) || 0,
      outbound: Number(raw.totals.outbound) || 0,
      errors: Number(raw.totals.errors) || 0,
    };
    this.channels = new Map(
      raw.channels
        .filter((c: any) => c && typeof c.channel === "string")
        .map((c: any): [string, ChannelStats] => [
          c.channel,
          {
            inbound: Number(c.inbound) || 0,
            outbound: Number(c.outbound) || 0,
            errors: Number(c.errors) || 0,
            lastInbound: c.lastInbound ?? null,
            lastOutbound: c.lastOutbound ?? null,
          },
        ])
    );
    this.hourly = new Map(
      raw.hourly
        .filter((h: any) => h && typeof h.key === "string")
        .map((h: any): [string, HourlyBucket] => [
          h.key,
          { inbound: Number(h.inbound) || 0, outbound: Number(h.outbound) || 0 },
        ])
    );
    this.daily = new Map(
      raw.daily
        .filter((d: any) => d && typeof d.date === "string")
        .map((d: any): [string, DailyBucket] => {
          const bucket: DailyBucket = {
            inbound: Number(d.inbound) || 0,
            outbound: Number(d.outbound) || 0,
            users: new Map(),
            overflow: Number(d.overflow) || 0,
          };
          if (Array.isArray(d.users)) {
            for (const u of d.users) {
              if (!u || typeof u.id !== "string") continue;
              bucket.users.set(u.id, {
                id: u.id,
                name: String(u.name || u.id),
                channel: String(u.channel || "unknown"),
                count: Number(u.count) || 0,
                lastSeen: Number(u.lastSeen) || 0,
              });
            }
          }
          return [d.date, bucket];
        })
    );
    this.prune();
    return true;
  }

  private channelEntry(channel: string): ChannelStats {
    let c = this.channels.get(channel);
    if (!c) {
      c = { inbound: 0, outbound: 0, errors: 0, lastInbound: null, lastOutbound: null };
      this.channels.set(channel, c);
    }
    return c;
  }

  private dailyEntry(date: string): DailyBucket {
    let d = this.daily.get(date);
    if (!d) {
      d = { inbound: 0, outbound: 0, users: new Map(), overflow: 0 };
      this.daily.set(date, d);
    }
    return d;
  }
}
