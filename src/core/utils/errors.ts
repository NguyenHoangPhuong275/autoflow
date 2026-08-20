export function getErrorMessage(error: unknown, fallback = 'Lỗi không xác định'): string {
    return error instanceof Error && error.message ? error.message : fallback;
}
