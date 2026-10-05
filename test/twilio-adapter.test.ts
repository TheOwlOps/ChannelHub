import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { TwilioChannelAdapter } from "../src/channels/twilio/adapter";
import type { TwilioInboundPayload } from "../src/channels/twilio/types";

describe("TwilioChannelAdapter", () => {
  const config = {
    accountSid: "AC12345",
    authToken: "super_secret_token",
    fromNumber: "+19998887777",
  };

  test("validates signature with sorted url-encoded params", () => {
    const adapter = new TwilioChannelAdapter(config);
    const url = "https://my.webhook.com/twilio";
    const postData = {
      To: "whatsapp:+111",
      From: "whatsapp:+222",
      Body: "Hello",
    };

    // Expected format: url + sorted keys/values joined
    // BodyHelloFromwhatsapp:+222Towhatsapp:+111
    const dataStr = url + "BodyHelloFromwhatsapp:+222Towhatsapp:+111";
    const hmac = createHmac("sha1", config.authToken).update(dataStr, "utf8").digest("base64");

    expect(adapter.verifySignature(hmac, url, postData)).toBe(true);
    expect(adapter.verifySignature("invalid", url, postData)).toBe(false);
  });

  test("normalizes SMS and WhatsApp payload into UnifiedMessage", () => {
    const adapter = new TwilioChannelAdapter(config);
    
    // SMS Test
    const smsRaw: TwilioInboundPayload = {
      MessageSid: "SM123",
      AccountSid: "AC123",
      From: "+15556667777",
      To: "+19998887777",
      Body: "SMS text here",
    };

    const smsMsg = adapter.normalizeMessage(smsRaw);
    expect(smsMsg).not.toBeNull();
    expect(smsMsg?.id).toBe("SM123");
    expect(smsMsg?.sender.id).toBe("+15556667777");
    expect(smsMsg?.content.text).toBe("SMS text here");
    expect((smsMsg as any).metadata.twilioChannel).toBe("sms");

    // WhatsApp Test
    const waRaw: TwilioInboundPayload = {
      MessageSid: "SM999",
      AccountSid: "AC123",
      From: "whatsapp:+15556667777",
      To: "whatsapp:+19998887777",
      Body: "WhatsApp text",
      NumMedia: "1",
      MediaUrl0: "https://example.com/img.png",
      MediaContentType0: "image/png",
    };

    const waMsg = adapter.normalizeMessage(waRaw);
    expect(waMsg).not.toBeNull();
    expect(waMsg?.content.attachments?.length).toBe(1);
    expect(waMsg?.content.attachments?.[0].type).toBe("image");
    expect(waMsg?.content.attachments?.[0].url).toBe("https://example.com/img.png");
    expect((waMsg as any).metadata.twilioChannel).toBe("whatsapp");
  });
});
