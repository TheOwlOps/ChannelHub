export interface CalendarAdapterConfig {
  /** OAuth2 Access Token or Service Account Token */
  accessToken: string;
  /** Calendar ID (defaults to "primary") */
  defaultCalendarId?: string;
  /** API Base URL (defaults to https://www.googleapis.com/calendar/v3) */
  apiUrl?: string;
}

export interface CalendarEventPayload {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
}
