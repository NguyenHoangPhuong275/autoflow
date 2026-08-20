export function getErrorMessage(error: unknown, fallback = 'Lỗi không xác định'): string {
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

export function toError(error: unknown, fallback = 'Lỗi không xác định'): Error {
    return error instanceof Error ? error : new Error(getErrorMessage(error, fallback));
}
