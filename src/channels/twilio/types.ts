/**
 * Twilio Omnichannel Adapter (SMS, MMS, WhatsApp, RCS).
 */
export interface TwilioAdapterConfig {
  /** Twilio Account SID (starts with AC...) */
  accountSid: string;
  /** Twilio Auth Token (used for API requests and HMAC-SHA1 signature verification) */
  authToken: string;
  /** Default Twilio sender phone number or WhatsApp ID (e.g. "+1234567890" or "whatsapp:+1234567890") */
  fromNumber: string;
  /** Public webhook URL registered in Twilio Console (required for X-Twilio-Signature validation) */
  webhookUrl?: string;
  /** Optional custom API root. Defaults to "https://api.twilio.com" */
  apiRoot?: string;
}

export interface TwilioInboundPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body?: string;
  NumMedia?: string;
  [key: `MediaUrl${number}`]: string | undefined;
  [key: `MediaContentType${number}`]: string | undefined;
  [key: string]: any;
}
