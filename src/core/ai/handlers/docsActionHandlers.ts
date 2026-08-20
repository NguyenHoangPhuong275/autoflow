import type { AgentAction } from '@/core/ai/agentTypes';
import type { ActionExecutionResult } from '@/core/ai/actionExecutionTypes';
import { GoogleDocsService } from '@/core/google/services/googleDocsService';
import { GoogleDriveService } from '@/core/google/services/googleDriveService';

export async function executeDocsAction(
  action: AgentAction,
  makeResult: (action: AgentAction, status: 'success' | 'failed' | 'cancelled', message: string, extra?: Partial<ActionExecutionResult>) => ActionExecutionResult
): Promise<{ result: ActionExecutionResult; summary: string } | null> {
  if (action.type === 'read_google_doc') {
    let targetDocId = action.documentId?.trim();

    // If no documentId or if documentId is a doc name (e.g. "Tuần 6"), auto-search Drive
    if (!targetDocId || !/^[a-zA-Z0-9_-]{20,}$/.test(targetDocId.replace(/^.*\/d\/([a-zA-Z0-9_-]+).*$/, '$1'))) {
      const docsOnDrive = await GoogleDriveService.searchDocs(targetDocId || undefined);
      if (docsOnDrive.length === 0) {
        const msg = `Không tìm thấy tài liệu Google Docs nào trên Google Drive${targetDocId ? ` khớp với "${targetDocId}"` : ''}.`;
        return {
          result: makeResult(action, 'failed', msg),
          summary: 'Không tìm thấy Google Docs',
        };
      }
      targetDocId = docsOnDrive[0].id;
    }

    const doc = await GoogleDocsService.fetchDocument(targetDocId);
    const textPreview = doc.bodyText.trim()
      ? doc.bodyText.slice(0, 800) + (doc.bodyText.length > 800 ? '...' : '')
      : '(Tài liệu rỗng không có văn bản)';

    const msg = `📝 Tài liệu: "${doc.title}" (ID: ${doc.documentId})\n\n${textPreview}`;
    const summary = `Đã đọc tài liệu "${doc.title}"`;

    return {
      result: makeResult(action, 'success', msg, { doc }),
      summary,
    };
  }

  if (action.type === 'create_google_doc') {
    if (!action.title) throw new Error('Thiếu tiêu đề tài liệu Google Docs cần tạo.');
    const newDoc = await GoogleDocsService.createDocument(action.title, action.content);
    const msg = `📝 Đã tạo tài liệu Google Docs mới "${newDoc.title}" trên Google Drive.`;
    return {
      result: makeResult(action, 'success', msg, { newDoc }),
      summary: msg,
    };
  }

  if (action.type === 'append_google_doc') {
    if (!action.documentId || !action.text) throw new Error('Thiếu documentId hoặc text cần ghi thêm.');
    await GoogleDocsService.appendText(action.documentId, action.text);
    const msg = `➕ Đã ghi thêm nội dung vào tài liệu Google Docs.`;
    return {
      result: makeResult(action, 'success', msg),
      summary: msg,
    };
  }

  return null;
}
