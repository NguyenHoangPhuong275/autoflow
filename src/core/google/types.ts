export interface GoogleSession {
    accessToken: string;
    expiresAt: number;
    email?: string;
}
export interface SheetTabInfo {
    title: string;
    sheetId: number;
}
