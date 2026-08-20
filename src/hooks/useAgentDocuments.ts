import { useMemo, useState } from 'react';
import type { PermittedDocument } from '@/core/services/aiAgentService';

export function useAgentDocuments(externalDocuments: PermittedDocument[] = []) {
    const [showDocModal, setShowDocModal] = useState(false);
    const [newDocName, setNewDocName] = useState('');
    const [newDocContent, setNewDocContent] = useState('');
    const [customDocuments, setCustomDocuments] = useState<PermittedDocument[]>([]);
    const [disabledDocumentIds, setDisabledDocumentIds] = useState<Set<string>>(new Set());

    const permittedDocs = useMemo(() => {
        const documents = [...externalDocuments, ...customDocuments];
        return documents
            .filter((document, index) => documents.findIndex((candidate) => candidate.id === document.id) === index)
            .map((document) => ({ ...document, isGranted: !disabledDocumentIds.has(document.id) }));
    }, [customDocuments, disabledDocumentIds, externalDocuments]);

    const toggleDocPermission = (docId: string) => {
        setDisabledDocumentIds((previous) => {
            const next = new Set(previous);
            if (next.has(docId)) next.delete(docId);
            else next.add(docId);
            return next;
        });
    };

    const handleAddCustomDoc = () => {
        const name = newDocName.trim();
        if (!name) return;
        setCustomDocuments((previous) => [...previous, {
            id: `doc-${Date.now()}`,
            name,
            type: 'text_note',
            isGranted: true,
            contentSummary: newDocContent.trim() || name,
        }]);
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
