import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
} from "../../core/types";
import type { CalendarAdapterConfig, CalendarEventPayload } from "./types";

/**
 * CalendarChannelAdapter — Google Calendar Integration.
 * SendText uses Google's Natural Language QuickAdd: "Meeting with Ryan tomorrow at 2pm"
 * SendMedia can be used to pass full CalendarEventPayload (JSON buffer).
 */
export class CalendarChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "calendar" as ChannelType;
  private config: CalendarAdapterConfig;
  private apiUrl: string;
  private calendarId: string;

  constructor(config: CalendarAdapterConfig) {
    super();
    if (!config.accessToken) throw new Error("CalendarAdapterConfig.accessToken is required");
    this.config = config;
    this.apiUrl = (config.apiUrl || "https://www.googleapis.com/calendar/v3").replace(/\/+$/, "");
    this.calendarId = config.defaultCalendarId || "primary";
  }

  async connect(_signal?: AbortSignal): Promise<void> {
    // Verify token by listing calendars
    const res = await fetch(`${this.apiUrl}/users/me/calendarList?maxResults=1`, {
      headers: this.headers(),
      signal: _signal,
    });
    if (!res.ok) throw new Error(`Calendar auth failed: ${res.status}`);
    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    this.setConnected(false);
  }

  /**
   * sendText triggers Google Calendar QuickAdd.
   * AI can pass natural language: "Dinner with John tomorrow at 7pm"
   */
  async sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult> {
    const calId = chatId || this.calendarId;
    const res = await fetch(`${this.apiUrl}/calendars/${encodeURIComponent(calId)}/events/quickAdd?text=${encodeURIComponent(text)}`, {
      method: "POST",
      headers: this.headers(),
      signal: options?.signal,
    });
    if (!res.ok) throw new Error(`Calendar QuickAdd failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as any;
    return { messageId: String(data.id), chatId: calId, timestamp: Date.now() };
  }

  /**
   * sendMedia abused here to send a full structured CalendarEventPayload as a JSON Buffer.
   */
  async sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult> {
    const calId = chatId || this.calendarId;
    
    let payloadStr: string;
    if (Buffer.isBuffer(media.source) || media.source instanceof Uint8Array) {
      payloadStr = Buffer.from(media.source).toString("utf8");
    } else if (typeof media.source === "string") {
      if (media.source.startsWith("data:")) {
        payloadStr = Buffer.from(media.source.split(",")[1], "base64").toString("utf8");
      } else {
        payloadStr = media.source;
      }
    } else {
      throw new Error("CalendarAdapter sendMedia requires a JSON buffer or string representing a CalendarEventPayload.");
    }

    const res = await fetch(`${this.apiUrl}/calendars/${encodeURIComponent(calId)}/events`, {
      method: "POST",
      headers: this.headers(),
      body: payloadStr,
      signal: options?.signal,
    });
    if (!res.ok) throw new Error(`Calendar CreateEvent failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as any;
    return { messageId: String(data.id), chatId: calId, timestamp: Date.now() };
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      "Content-Type": "application/json",
    };
  }
}
