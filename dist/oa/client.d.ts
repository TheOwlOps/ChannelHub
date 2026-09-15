export interface OAResponse<T = any> {
    error: number;
    message: string;
    data?: T;
}
export declare class ZaloOABot {
    private accessToken;
    private baseUrl;
    constructor(accessToken?: string);
    setAccessToken(token: string): void;
    private request;
    sendConsultantText(userId: string, text: string): Promise<OAResponse<unknown>>;
    sendConsultantImage(userId: string, attachmentId: string, text?: string): Promise<OAResponse<unknown>>;
    sendTransactionMessage(userId: string, templateId: string, templateData: Record<string, any>): Promise<OAResponse<unknown>>;
    sendPromotionMessage(userId: string, templateId: string, templateData: Record<string, any>): Promise<OAResponse<unknown>>;
    getProfile(userId: string): Promise<OAResponse<unknown>>;
    getFollowers(offset?: number, count?: number): Promise<OAResponse<unknown>>;
    getTags(): Promise<OAResponse<unknown>>;
    tagUser(userId: string, tagName: string): Promise<OAResponse<unknown>>;
    removeTag(userId: string, tagName: string): Promise<OAResponse<unknown>>;
    uploadImage(imageBlob: Blob): Promise<OAResponse<{
        attachment_id: string;
    }>>;
    refreshAccessToken(refreshToken?: string): Promise<any>;
}
