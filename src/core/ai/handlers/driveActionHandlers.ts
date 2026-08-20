import type { AgentAction } from '@/core/ai/agentTypes';
import type { ActionExecutionResult } from '@/core/ai/actionExecutionTypes';
import { GoogleDriveService } from '@/core/google/services/googleDriveService';

export async function executeDriveAction(
  action: AgentAction,
  makeResult: (action: AgentAction, status: 'success' | 'failed' | 'cancelled', message: string, extra?: Partial<ActionExecutionResult>) => ActionExecutionResult
): Promise<{ result: ActionExecutionResult; summary: string } | null> {
  if (action.type === 'search_drive') {
    const max = action.maxResults || 10;
    const qStr = (action.query || '').toLowerCase().trim();
    const isDocFilter = action.fileType === 'docs' || qStr === 'docs' || qStr === 'doc' || qStr.includes('tài liệu') || qStr.includes('document');
    const isSheetFilter = action.fileType === 'sheets' || qStr === 'sheets' || qStr === 'sheet' || qStr.includes('bảng tính') || qStr.includes('spreadsheet');

    let mimeQuery = 'trashed = false';
    if (isDocFilter) {
      mimeQuery += " and mimeType = 'application/vnd.google-apps.document'";
    } else if (isSheetFilter) {
      mimeQuery += " and mimeType = 'application/vnd.google-apps.spreadsheet'";
    } else if (action.query && !['all', 'tất cả', 'file', 'tệp'].includes(qStr)) {
      mimeQuery += ` and name contains '${action.query.replace(/'/g, "\\'")}'`;
    }

    const files = await GoogleDriveService.listFiles({
      query: mimeQuery,
      pageSize: 20,
    });

    const displayList = files.slice(0, max);
    const typeLabel = isDocFilter ? 'tài liệu Google Docs' : isSheetFilter ? 'bảng tính Google Sheets' : 'tệp';

    const fileList = displayList
      .map((f, idx) => {
        const type = f.mimeType.includes('spreadsheet') ? '📊 Sheet' : f.mimeType.includes('document') ? '📝 Doc' : '📁 Tệp';
        return `${idx + 1}. ${type}: ${f.name}`;
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
