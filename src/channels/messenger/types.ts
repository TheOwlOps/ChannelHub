export interface MessengerAdapterConfig {
  pageAccessToken: string;
  accountId?: string;
  verifyToken?: string;
  /** App Secret from Meta Developer Dashboard to verify X-Hub-Signature-256 */
  appSecret?: string;
  port?: number;
  webhookPath?: string;
  apiVersion?: string;
  /** Automatically subscribe Page to Webhook events on connect. Default: false */
  autoSubscribePage?: boolean;
  /** Custom Webhook fields to subscribe to. Defaults to messages & postbacks. */
  subscribedFields?: string[];
  /** Check and warn if required messaging permissions are missing on connect. Default: true */
  checkPermissionsOnConnect?: boolean;
}

export interface MessengerPermission {
  permission: string;
  status: "granted" | "declined";
}

export type MessengerMessageType = "RESPONSE" | "UPDATE" | "MESSAGE_TAG";
export type MessengerMessageTag =
  | "CONFIRMED_EVENT_UPDATE"
  | "POST_PURCHASE_UPDATE"
  | "ACCOUNT_UPDATE"
  | "HUMAN_AGENT";

export interface MessengerSendOptions {
  messagingType?: MessengerMessageType;
  tag?: MessengerMessageTag;
}
