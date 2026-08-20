export const APP_CONFIG = {
    googleClientId: import.meta.env?.VITE_GOOGLE_CLIENT_ID?.trim() ?? '',
    deepSeekApiKey: import.meta.env?.VITE_DEEPSEEK_API_KEY?.trim() ?? '',
};
