import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult } from "../../core/types";
import type { CalendarAdapterConfig } from "./types";
/**
 * CalendarChannelAdapter — Google Calendar Integration.
 * SendText uses Google's Natural Language QuickAdd: "Meeting with Ryan tomorrow at 2pm"
 * SendMedia can be used to pass full CalendarEventPayload (JSON buffer).
 */
export declare class CalendarChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    private config;
    private apiUrl;
    private calendarId;
    constructor(config: CalendarAdapterConfig);
    connect(_signal?: AbortSignal): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * sendText triggers Google Calendar QuickAdd.
     * AI can pass natural language: "Dinner with John tomorrow at 7pm"
     */
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    /**
     * sendMedia abused here to send a full structured CalendarEventPayload as a JSON Buffer.
     */
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    private headers;
}
