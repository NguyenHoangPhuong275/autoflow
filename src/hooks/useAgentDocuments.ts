import { useEffect, useState } from 'react';
import type { PermittedDocument } from '@/core/services/aiAgentService';
export function useAgentDocuments(activeSheetTitle: string, rowCount: number) {
    const [showDocModal, setShowDocModal] = useState(false);
    const [newDocName, setNewDocName] = useState('');
    const [newDocContent, setNewDocContent] = useState('');
    const [permittedDocs, setPermittedDocs] = useState<PermittedDocument[]>([
        {
            id: 'doc-active-sheet',
            name: `Sheet: ${activeSheetTitle}`,
            type: 'google_sheet',
            isGranted: true,
            contentSummary: `Dữ liệu bảng hiện tại gồm ${rowCount} dòng sản phẩm/khách hàng.`,
        },
    ]);
    useEffect(() => {
        setPermittedDocs((prev) => prev.map((document) => document.id === 'doc-active-sheet'
            ? {
                ...document,
                name: `Sheet: ${activeSheetTitle}`,
                contentSummary: `Bảng "${activeSheetTitle}" có ${rowCount} hàng dữ liệu.`,
            }
            : document));
    }, [rowCount, activeSheetTitle]);
    const toggleDocPermission = (docId: string) => {
        setPermittedDocs((prev) => prev.map((document) => document.id === docId
            ? { ...document, isGranted: !document.isGranted }
            : document));
    };
    const handleAddCustomDoc = () => {
        if (!newDocName.trim())
            return;
        const newDocument: PermittedDocument = {
            id: `doc-${Date.now()}`,
            name: newDocName.trim(),
            type: 'text_note',
            isGranted: true,
            contentSummary: newDocContent.trim() || 'Tài liệu hướng dẫn bổ sung.',
        };
        setPermittedDocs((prev) => [...prev, newDocument]);
        setNewDocName('');
        setNewDocContent('');
        setShowDocModal(false);
    };
    return {
        showDocModal,
        setShowDocModal,
        newDocName,
        setNewDocName,
        newDocContent,
        setNewDocContent,
        permittedDocs,
        toggleDocPermission,
        handleAddCustomDoc,
    };
}
