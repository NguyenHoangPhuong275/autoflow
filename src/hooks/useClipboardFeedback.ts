import { useState } from 'react';
export function useClipboardFeedback(resetDelayMs = 1500) {
    const [copied, setCopied] = useState(false);
    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelayMs);
    };
    return { copied, copy };
}
