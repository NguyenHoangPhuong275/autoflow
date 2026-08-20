export interface GoogleSession {
    accessToken: string;
    expiresAt: number;
    email?: string;
}
export interface SheetTabInfo {
    title: string;
    sheetId: number;
}

export interface GoogleTokenResponse {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
}

export interface GoogleTokenClient {
    requestAccessToken(): void;
}

export interface GoogleOAuth2ClientConfig {
    client_id: string;
    scope: string;
    callback(response: GoogleTokenResponse): void | Promise<void>;
}

declare global {
    interface Window {
        google?: {
            accounts?: {
                oauth2?: {
                    initTokenClient(config: GoogleOAuth2ClientConfig): GoogleTokenClient;
                };
            };
        };
    }
}
