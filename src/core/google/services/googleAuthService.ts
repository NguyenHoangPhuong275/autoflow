import { APP_CONFIG } from '../../config.ts';
import { getErrorMessage, readJson } from '../../utils/errors.ts';
import type { GoogleSession, GoogleTokenClient, GoogleTokenResponse } from '../types.ts';

const STORAGE_KEY = 'autoflow_google_session';
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const GOOGLE_SCOPES = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

interface GoogleUserInfo {
    email?: string;
}

export class GoogleAuthService {
    private static session: GoogleSession | null = null;
    public static tokenClient: GoogleTokenClient | null = null;

    public static init(): GoogleSession | null {
        try {
            const savedSession = localStorage.getItem(STORAGE_KEY);
            if (!savedSession) {
                return null;
            }

            const session = JSON.parse(savedSession) as GoogleSession;
            if (session.expiresAt > Date.now() + 60_000) {
                this.session = session;
                return session;
            }

            localStorage.removeItem(STORAGE_KEY);
        } catch (error: unknown) {
            console.warn(`Không thể khôi phục phiên Google: ${getErrorMessage(error)}`);
        }

        return null;
    }

    public static getSession(): GoogleSession | null {
        return this.session ?? this.init();
    }

    public static getAccessToken(): string | null {
        const session = this.getSession();
        return session && session.expiresAt > Date.now() ? session.accessToken : null;
    }

    public static getUserEmail(): string | null {
        const session = this.getSession();
        return session && session.expiresAt > Date.now() ? session.email || 'Google User' : null;
    }

    public static logout(): void {
        this.session = null;
        localStorage.removeItem(STORAGE_KEY);
    }

    public static async ensureGsiLoaded(): Promise<void> {
        if (typeof window === 'undefined' || window.google?.accounts?.oauth2) {
            return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
        if (!existingScript) {
            await this.loadGsiScript();
        }

        await this.waitForGsi();
    }

    public static async loginWithGoogle(customClientId?: string): Promise<GoogleSession> {
        const clientId = customClientId?.trim() || APP_CONFIG.googleClientId;
        if (!clientId) {
            throw new Error('Chưa cấu hình VITE_GOOGLE_CLIENT_ID trong .env.');
        }

        await this.ensureGsiLoaded();
        const oauth2 = window.google?.accounts?.oauth2;
        if (!oauth2) {
            throw new Error('Google Identity Services SDK chưa sẵn sàng. Vui lòng tải lại trang.');
        }

        return new Promise((resolve, reject) => {
            this.tokenClient = oauth2.initTokenClient({
                client_id: clientId,
                scope: GOOGLE_SCOPES,
                callback: async (tokenResponse) => {
                    try {
                        const session = await this.createSession(tokenResponse);
                        this.session = session;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
                        resolve(session);
                    } catch (error: unknown) {
                        reject(error instanceof Error ? error : new Error(getErrorMessage(error)));
                    }
                },
            });

            this.tokenClient.requestAccessToken();
        });
    }

    private static loadGsiScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = GOOGLE_IDENTITY_SCRIPT;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Không thể tải Google Identity Services SDK.'));
            document.head.appendChild(script);
        });
    }

    private static waitForGsi(): Promise<void> {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const interval = window.setInterval(() => {
                attempts += 1;
                if (window.google?.accounts?.oauth2) {
                    window.clearInterval(interval);
                    resolve();
                    return;
                }

                if (attempts >= 30) {
                    window.clearInterval(interval);
                    reject(new Error('Google Identity Services SDK tải quá lâu. Vui lòng kiểm tra kết nối mạng.'));
                }
            }, 100);
        });
    }

    private static async createSession(tokenResponse: GoogleTokenResponse): Promise<GoogleSession> {
        if (tokenResponse.error) {
            throw new Error(tokenResponse.error_description || tokenResponse.error);
        }

        const accessToken = tokenResponse.access_token;
        if (!accessToken) {
            throw new Error('Google không trả về access token hợp lệ.');
        }

        const expiresIn = tokenResponse.expires_in || 3599;
        return {
            accessToken,
            expiresAt: Date.now() + (expiresIn - 60) * 1000,
            email: await this.fetchUserEmail(accessToken),
        };
    }

    private static async fetchUserEmail(accessToken: string): Promise<string> {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!response.ok) {
                console.warn(`Không thể đọc email người dùng Google: HTTP ${response.status}`);
                return '';
            }

            const userInfo = await readJson<GoogleUserInfo>(response, {});
            return userInfo.email || '';
        } catch (error: unknown) {
            console.warn(`Không thể đọc email người dùng Google: ${getErrorMessage(error)}`);
            return '';
        }
    }
}
