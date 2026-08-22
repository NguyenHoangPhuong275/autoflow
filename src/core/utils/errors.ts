export function getErrorMessage(error: unknown, fallback = 'Đã xảy ra lỗi không xác định.'): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
        return error.message;
    }

    return fallback;
}

const TECHNICAL_ERROR_PATTERNS = [
    /^(TypeError|ReferenceError|SyntaxError|RangeError)\b/i,
    /failed to fetch|networkerror|network error/i,
    /cannot read properties|is not a function/i,
    /\b(?:api|oauth|access token|stack trace)\b/i,
    /\bHTTP\s+\d{3}\b/i,
    /\b(?:fileId|messageId|documentId|newName|sheetId|rowId|colKey)\b/i,
    /(?:Google|DeepSeek).*(?:báo lỗi|lỗi từ)/i,
];

export function getUserErrorMessage(error: unknown, fallback: string): string {
    const message = getErrorMessage(error, '');
    return message && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))
        ? message
        : fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export async function readJson<T>(response: Response, fallback: T): Promise<T> {
    try {
        return await response.json() as T;
    } catch {
        return fallback;
    }
}

export function toError(error: unknown, fallback = 'Đã xảy ra lỗi không xác định.'): Error {
    return error instanceof Error ? error : new Error(getErrorMessage(error, fallback));
}
