import { CONFIG } from "../config/env.js";

export interface OAResponse<T = any> {
  error: number;
  message: string;
  data?: T;
}

export class ZaloOABot {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken = CONFIG.OA.ACCESS_TOKEN) {
    this.accessToken = accessToken;
    this.baseUrl = CONFIG.OA.BASE_URL;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<OAResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      access_token: this.accessToken,
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    return (await res.json()) as OAResponse<T>;
  }

  // ==========================================
  // 1. GỬI TIN NHẮN TƯ VẤN (CS - CONSULTANT)
  // ==========================================
  async sendConsultantText(userId: string, text: string) {
    return await this.request("/message/cs", {
      method: "POST",
      body: JSON.stringify({ recipient: { user_id: userId }, message: { text } })
    });
  }

  async sendConsultantImage(userId: string, attachmentId: string, text = "") {
    return await this.request("/message/cs", {
      method: "POST",
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: {
          text,
          attachment: {
            type: "template",
            payload: {
              template_type: "media",
              elements: [{ media_type: "image", attachment_id: attachmentId }]
            }
          }
        }
      })
    });
  }

  // ==========================================
  // 2. GỬI TIN NHẮN GIAO DỊCH & THÔNG BÁO (TRANSACTION / PROMOTION)
  // ==========================================
  async sendTransactionMessage(userId: string, templateId: string, templateData: Record<string, any>) {
    return await this.request("/message/transaction", {
      method: "POST",
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "transaction",
              template_id: templateId,
              template_data: templateData
            }
          }
        }
      })
    });
  }

  async sendPromotionMessage(userId: string, templateId: string, templateData: Record<string, any>) {
    return await this.request("/message/promotion", {
      method: "POST",
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "promotion",
              template_id: templateId,
              template_data: templateData
            }
          }
        }
      })
    });
  }

  // ==========================================
  // 3. QUẢN LÝ NGƯỜI QUAN TÂM (USERS & FOLLOWERS)
  // ==========================================
  async getProfile(userId: string) {
    return await this.request(`/user/detail?data=${encodeURIComponent(JSON.stringify({ user_id: userId }))}`, {
      method: "GET"
    });
  }

  async getFollowers(offset = 0, count = 50) {
    return await this.request(`/user/getlist?data=${encodeURIComponent(JSON.stringify({ offset, count }))}`, {
      method: "GET"
    });
  }

  // ==========================================
  // 4. QUẢN LÝ NHÃN (TAGS)
  // ==========================================
  async getTags() {
    return await this.request("/tag/gettagsofoa", { method: "GET" });
  }

  async tagUser(userId: string, tagName: string) {
    return await this.request("/tag/taguser", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, tag_name: tagName })
    });
  }

  async removeTag(userId: string, tagName: string) {
    return await this.request("/tag/rmuserfromtag", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, tag_name: tagName })
    });
  }

  // ==========================================
  // 5. UPLOAD MEDIA (ẢNH & TÀI LIỆU)
  // ==========================================
  async uploadImage(imageBlob: Blob): Promise<OAResponse<{ attachment_id: string }>> {
    const formData = new FormData();
    formData.append("file", imageBlob);

    const res = await fetch("https://openapi.zalo.me/v2.0/oa/upload/image", {
      method: "POST",
      headers: { access_token: this.accessToken },
      body: formData
    });
    return await res.json();
  }

  // ==========================================
  // 6. OAUTH2 & TOKEN REFRESH
  // ==========================================
  async refreshAccessToken(refreshToken = CONFIG.OA.REFRESH_TOKEN): Promise<any> {
    const params = new URLSearchParams({
      app_id: CONFIG.OA.APP_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });

    const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: CONFIG.OA.APP_SECRET
      },
      body: params.toString()
    });

    const data = await res.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
    }
    return data;
  }
}
