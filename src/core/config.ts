export const APP_CONFIG = {
    googleClientId: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID?.trim()) || (typeof process !== 'undefined' ? process.env?.VITE_GOOGLE_CLIENT_ID : '') || '',
    deepSeekApiKey: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DEEPSEEK_API_KEY?.trim()) || (typeof process !== 'undefined' ? process.env?.VITE_DEEPSEEK_API_KEY : '') || '',
};
