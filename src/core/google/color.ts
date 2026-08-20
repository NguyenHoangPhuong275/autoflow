const VIETNAMESE_COLOR_NAMES: Record<string, string> = {
    'đỏ': 'red',
    'xanh dương': 'blue',
    'xanh lá': 'green',
    'vàng': 'gold',
    'cam': 'orange',
    'tím': 'purple',
    'hồng': 'pink',
    'đen': 'black',
    'trắng': 'white',
    'xám': 'gray',
    'nâu': 'brown',
    'xanh ngọc': 'cyan',
};
export interface GoogleRgbColor {
    red: number;
    green: number;
    blue: number;
}
export function detectColorToGoogleRgb(color: string): GoogleRgbColor {
    const raw = color.trim().toLowerCase();
    const targetColor = VIETNAMESE_COLOR_NAMES[raw] || raw;
    if (typeof document !== 'undefined') {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context) {
                context.fillStyle = targetColor;
                context.fillRect(0, 0, 1, 1);
                const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
                return {
                    red: red / 255,
                    green: green / 255,
                    blue: blue / 255,
                };
            }
        }
        catch (error) {
            console.warn('[GoogleColor] Canvas color auto-detect error:', error);
        }
    }
    let hex = targetColor.replace(/[^0-9a-f]/gi, '');
    if (hex.length === 3) {
        hex = hex.split('').map((character) => character + character).join('');
    }
    if (hex.length >= 6) {
        const value = parseInt(hex.slice(0, 6), 16);
        return {
            red: ((value >> 16) & 255) / 255,
            green: ((value >> 8) & 255) / 255,
            blue: (value & 255) / 255,
        };
    }
    return { red: 0.1, green: 0.1, blue: 0.1 };
}
