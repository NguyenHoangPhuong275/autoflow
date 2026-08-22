import type { AgentAction } from '@/core/ai/agentTypes';
import type { ActionExecutionResult } from '@/core/ai/actionExecutionTypes';
import { GoogleDriveService } from '@/core/google/services/googleDriveService';

const GENERIC_DRIVE_QUERIES = new Set([
  'all',
  'tất cả',
  'file',
  'tệp',
  'docs',
  'doc',
  'sheets',
  'sheet',
  'tài liệu',
  'bảng tính',
]);

export async function executeDriveAction(
  action: AgentAction,
  makeResult: (action: AgentAction, status: 'success' | 'failed' | 'cancelled', message: string, extra?: Partial<ActionExecutionResult>) => ActionExecutionResult
): Promise<{ result: ActionExecutionResult; summary: string } | null> {
  if (action.type === 'search_drive') {
    const max = action.maxResults || 10;
    const qStr = (action.query || '').toLowerCase().trim();
    const fileType = resolveDriveFileType(action.fileType, qStr);
    const files = await GoogleDriveService.searchFiles({
      type: fileType,
      nameQuery: getDriveNameQuery(action.query, qStr),
      pageSize: 20,
    });

    const displayList = files.slice(0, max).map((file) => ({
      ...file,
      webViewLink: file.webViewLink || buildDriveFileLink(file),
    }));
    const typeLabel = fileType === 'docs' ? 'tài liệu Google Docs' : fileType === 'sheets' ? 'bảng tính Google Sheets' : 'tệp';

    const fileList = displayList
      .map((f, idx) => {
        const type = f.mimeType.includes('spreadsheet') ? '📊 Sheet' : f.mimeType.includes('document') ? '📝 Doc' : '📁 Tệp';
        return `${idx + 1}. ${type}: ${f.name}\n   Link: ${f.webViewLink}`;
      })
      .join('\n');

    const msg = displayList.length > 0
      ? `📂 Có ${displayList.length} ${typeLabel} trên Google Drive:\n${fileList}`
      : `Không tìm thấy ${typeLabel} nào trên Drive.`;

    return {
      result: makeResult(action, 'success', msg, { files: displayList }),
      summary: `Có ${displayList.length} ${typeLabel}`,
    };
  }

  if (action.type === 'create_drive_folder') {
    if (!action.folderName) throw new Error('Thiếu tên thư mục cần tạo.');
    const folder = await GoogleDriveService.createFolder(action.folderName, action.parentFolderId);
    const msg = `📁 Đã tạo thư mục mới "${folder.name}" trên Google Drive.`;
    return {
      result: makeResult(action, 'success', msg, { folder }),
      summary: msg,
    };
  }

  if (action.type === 'rename_drive_file') {
    if (!action.fileId || !action.newName) throw new Error('Thiếu fileId hoặc newName cần đổi tên.');
    const renamed = await GoogleDriveService.renameFile(action.fileId, action.newName);
    const msg = `✏️ Đã đổi tên thành "${renamed.name}" trên Google Drive.`;
    return {
      result: makeResult(action, 'success', msg, { renamed }),
      summary: msg,
    };
  }

  if (action.type === 'delete_drive_file') {
    if (!action.fileId) throw new Error('Thiếu fileId cần xóa.');
    await GoogleDriveService.deleteFile(action.fileId);
    const msg = `🗑️ Đã xóa tệp khỏi Google Drive.`;
    return {
      result: makeResult(action, 'success', msg),
      summary: msg,
    };
  }

  return null;
}

function resolveDriveFileType(fileType: AgentAction['fileType'], query: string): 'all' | 'sheets' | 'docs' {
  if (fileType === 'docs' || query === 'docs' || query === 'doc' || query.includes('tài liệu') || query.includes('document')) {
    return 'docs';
  }
  if (fileType === 'sheets' || query === 'sheets' || query === 'sheet' || query.includes('bảng tính') || query.includes('spreadsheet')) {
    return 'sheets';
  }
  return 'all';
}

function getDriveNameQuery(query: string | undefined, normalizedQuery: string): string | undefined {
  return query && !GENERIC_DRIVE_QUERIES.has(normalizedQuery) ? query : undefined;
}

function buildDriveFileLink(file: { id: string; mimeType: string }): string {
  if (file.mimeType.includes('spreadsheet')) {
    return `https://docs.google.com/spreadsheets/d/${file.id}/edit`;
  }
  if (file.mimeType.includes('document')) {
    return `https://docs.google.com/document/d/${file.id}/edit`;
  }
  return `https://drive.google.com/open?id=${file.id}`;
}
