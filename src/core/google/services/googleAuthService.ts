import { APP_CONFIG } from '../../config.ts';
import type { GoogleSession } from '../types.ts';
const STORAGE_KEY = 'autoflow_google_session';
export class GoogleAuthService {
    private static session: GoogleSession | null = null;
    public static tokenClient: any = null;
    public static init(): GoogleSession | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const session: GoogleSession = JSON.parse(saved);
                if (session.expiresAt > Date.now() + 60000) {
                    this.session = session;
                    return session;
                }
                else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        }
        catch (e) {
            console.warn('Failed to restore Google session:', e);
        }
        return null;
    }
    public static getSession(): GoogleSession | null {
        if (!this.session) {
            this.init();
        }
        return this.session;
    }
    public static getAccessToken(): string | null {
        const session = this.getSession();
        if (session && session.expiresAt > Date.now()) {
            return session.accessToken;
        }
        return null;
    }
    public static getUserEmail(): string | null {
        const session = this.getSession();
        return session && session.expiresAt > Date.now() ? (session.email || 'Google User') : null;
    }
    public static logout(): void {
        this.session = null;
        localStorage.removeItem(STORAGE_KEY);
    }
    public static async ensureGsiLoaded(): Promise<void> {
        if (typeof window === 'undefined')
            return;
        if ((window as any).google?.accounts?.oauth2)
            return;
        return new Promise((resolve, reject) => {
            const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (existing) {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if ((window as any).google?.accounts?.oauth2) {
                        clearInterval(interval);
                        resolve();
                    }
                    else if (attempts > 30) {
                        clearInterval(interval);
                        reject(new Error('Google Identity Services SDK tải quá lâu. Vui lòng kiểm tra kết nối mạng.'));
                    }
                }, 100);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if ((window as any).google?.accounts?.oauth2) {
                        clearInterval(interval);
                        resolve();
                    }
                    else if (attempts > 20) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            };
            script.onerror = () => reject(new Error('Không thể tải Google Identity Services SDK.'));
            document.head.appendChild(script);
        });
    }
    public static async loginWithGoogle(customClientId?: string): Promise<GoogleSession> {
        const clientId = customClientId?.trim() || APP_CONFIG.googleClientId;
        if (!clientId) {
            throw new Error('Chưa cấu hình VITE_GOOGLE_CLIENT_ID trong .env.');
        }
        await this.ensureGsiLoaded();
        return new Promise((resolve, reject) => {
            try {
                if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
                    throw new Error('Google Identity Services SDK chưa sẵn sàng. Vui lòng tải lại trang.');
                }
                const client = (window as any).google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: 'https://mail.google.com/ https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
                    callback: async (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            reject(new Error(tokenResponse.error_description || tokenResponse.error));
                            return;
                        }
                        const accessToken = tokenResponse.access_token;
                        const expiresIn = tokenResponse.expires_in || 3599;
                        const expiresAt = Date.now() + (expiresIn - 60) * 1000;
                        let email = '';
                        try {
                            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${accessToken}` },
                            });
                            if (userInfoRes.ok) {
                                const info = await userInfoRes.json();
                                email = info.email || '';
                            }
                        }
                        catch (e) {
                            console.warn('Failed to fetch user email:', e);
                        }
                        const session: GoogleSession = {
                            accessToken,
                            expiresAt,
                            email,
                        };
                        this.session = session;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
                        resolve(session);
                    },
                });
                this.tokenClient = client;
                client.requestAccessToken();
            }
            catch (err: any) {
                reject(err);
            }
        });
    }
}
