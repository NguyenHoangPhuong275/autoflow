import { useCallback, useEffect, useRef, useState } from 'react';

export function useClipboardFeedback(resetDelayMs = 1500) {
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState<string | null>(null);
    const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearResetTimeout = useCallback(() => {
        if (resetTimeoutRef.current !== null) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }
    }, []);

    useEffect(() => clearResetTimeout, [clearResetTimeout]);

    const reportCopyFailure = useCallback(() => {
        setCopied(false);
        setCopyError('Không thể sao chép nội dung. Hãy kiểm tra quyền truy cập bộ nhớ tạm của trình duyệt.');
    }, []);

    const copy = useCallback((text: string) => {
        try {
            if (typeof navigator.clipboard?.writeText !== 'function') {
                reportCopyFailure();
                return;
            }

            void navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setCopyError(null);
                clearResetTimeout();
                resetTimeoutRef.current = setTimeout(() => {
                    setCopied(false);
                    resetTimeoutRef.current = null;
                }, resetDelayMs);
            }).catch(() => reportCopyFailure());
        } catch {
            reportCopyFailure();
        }
    }, [clearResetTimeout, reportCopyFailure, resetDelayMs]);

    return { copied, copy, copyError };
}
