# AutoFlow Implementation Plan

## Mục tiêu

Hoàn thiện các chức năng còn thiếu theo từng phase độc lập, ưu tiên độ an toàn của dữ liệu và giữ nguyên toàn bộ quyền, tool, OAuth scope và cách cấu hình hiện tại.

## Nguyên tắc triển khai

- Mỗi phase phải hoàn thành test và acceptance criteria trước khi chuyển phase.
- Không gộp toàn bộ thay đổi vào một batch lớn.
- Không thay đổi `.env`, Vite config, OAuth scope hoặc danh sách quyền ngoài phạm vi subtask.
- Không chạy destructive Google API thật trong automated tests.
- Lưu screenshot, contract test và build output tại `D:\Preview`.
- Tạo checkpoint trước các phase có destructive operations hoặc thay đổi data model.

## Thứ tự triển khai

| Phase | Nội dung | Độ lớn | Phụ thuộc |
| --- | --- | --- | --- |
| 0 | Baseline tests và Error Boundary | S | Không |
| 1 | Chat history persistence | S | Phase 0 |
| 2 | Action result, API loading, destructive confirmation | L | Phase 1 |
| 3 | Formula auto-fill | M | Phase 2 |
| 4 | Agent branding và prompt optimization | M | Phase 2 |
| 5 | Undo và rollback | L–XL | Phase 2, 3 |
| 6 | Responsive và mobile | L | Phase 0 |

---

## Phase 0 — Safety baseline

### 0.1 Characterization tests

- [ ] Snapshot DeepSeek model, `tool_choice` và toàn bộ tool names.
- [ ] Snapshot system prompt hash.
- [ ] Snapshot `GoogleSyncService` public methods.
- [ ] Snapshot `useAutomation` return contract.
- [ ] Snapshot config hashes cho `.env`, `.env.example`, Vite config và package files.
- [ ] Tạo browser smoke test cho load sheet, update row và chat action.
- [ ] Chụp baseline UI ở light và dark mode.

Acceptance criteria:

- Runtime contract test chạy ổn định và deterministic.
- Không sử dụng credential hoặc Google Sheet thật trong test.
- Artifacts được lưu trong thư mục Preview theo ngày.

### 0.2 React Error Boundary

- [ ] Tạo `AppErrorBoundary`.
- [ ] Bao quanh `<App />` trong `main.tsx`.
- [ ] Thiết kế fallback UI có nút reload.
- [ ] Chỉ hiển thị error detail trong development.
- [ ] Thêm test component chủ động throw error.

Acceptance criteria:

- Component crash không làm toàn bộ app trắng.
- Reload từ fallback hoạt động.
- Error chỉ được log một lần.

Files dự kiến:

- `src/components/error/AppErrorBoundary.tsx`
- `src/main.tsx`

---

## Phase 1 — Chat history persistence

### 1.1 Tạo hook `useChatHistory`

- [ ] Tạo storage key versioned `autoflow_chat_history_v1`.
- [ ] Hydrate history từ `localStorage` khi mount.
- [ ] Validate cấu trúc từng message trước khi hydrate.
- [ ] Fallback về welcome message nếu JSON hỏng.
- [ ] Giới hạn tối đa 100 messages.
- [ ] Không persist trạng thái loading hoặc transient state.
- [ ] Persist `actionSummary` và interactive `options`.

### 1.2 Tích hợp vào chatbot

- [ ] Thay `useState<ChatMessage[]>` bằng `useChatHistory`.
- [ ] Giữ nguyên message order và auto-scroll.
- [ ] Thêm nút xóa lịch sử.
- [ ] Xác nhận clear history tạo lại welcome message.

Acceptance criteria:

- F5 không mất hội thoại.
- Action summary và options còn nguyên sau reload.
- Storage lỗi không làm app crash.
- Clear history hoạt động ở light và dark mode.

Files dự kiến:

- `src/hooks/useChatHistory.ts`
- `src/components/chat/AiCopilotChat.tsx`

---

## Phase 2 — Action execution foundation

### 2.1 Action execution result

- [ ] Tạo `ActionExecutionResult` và `ActionExecutionReport`.
- [ ] Đổi `executeAgentActions` thành async function.
- [ ] Chuẩn hóa status `success`, `failed`, `cancelled`.
- [ ] Ghi affected rows, target sheet và error message.
- [ ] Đổi Google write callbacks sang trả `Promise`.
- [ ] Không báo thành công trước khi API response thành công.

Result shape dự kiến:

```ts
interface ActionExecutionResult {
  actionId: string;
  type: AgentAction['type'];
  status: 'success' | 'failed' | 'cancelled';
  message: string;
  error?: string;
  affectedRows?: number[];
  sheetTitle?: string;
}
```

### 2.2 Gửi action result lại DeepSeek

- [ ] Thêm action result vào chat history.
- [ ] Đưa action result vào context của request tiếp theo.
- [ ] Phân biệt UI summary và model-facing result.
- [ ] Không gửi stack trace hoặc secret vào model context.
- [ ] Thêm integration test cho success và failed action.

Acceptance criteria:

- Agent biết action trước thành công hay thất bại.
- API lỗi không được hiển thị là đã thực thi.
- Mixed batch trả kết quả riêng cho từng action.

### 2.3 Google API loading state

- [ ] Tạo `useOperationTracker` dùng operation counter.
- [ ] Theo dõi nhiều request song song.
- [ ] Đặt label cho format, chart, range, row và sheet operations.
- [ ] Expose `pendingOperations` và `isMutating` từ `useAutomation`.
- [ ] Hiển thị spinner và operation label trong chat.
- [ ] Disable thao tác trùng trong thời gian request chạy.
- [ ] Luôn cleanup operation trong `finally`.

Acceptance criteria:

- Loading tồn tại đúng vòng đời request.
- Hai request song song không tắt loading sớm.
- Error vẫn giải phóng loading state.

### 2.4 Destructive confirmation

- [ ] Tạo danh sách destructive action types.
- [ ] Tạo pending action queue.
- [ ] Tạo `DestructiveActionDialog`.
- [ ] Hiển thị sheet mục tiêu và số hàng bị ảnh hưởng.
- [ ] Chặn API call trước khi confirm.
- [ ] Cancel tạo result status `cancelled`.
- [ ] Giữ đúng action order trong mixed batch.

Actions bắt buộc confirm:

- `delete_sheet`
- `clear_sheet`
- `batch_delete_rows`

Acceptance criteria:

- Chưa confirm thì local state và Google state không đổi.
- Cancel không chạy callback phá hủy.
- Confirm chỉ thực thi đúng action đang chờ.

Files dự kiến:

- `src/core/ai/actionExecutionTypes.ts`
- `src/core/ai/executeAgentActions.ts`
- `src/hooks/useOperationTracker.ts`
- `src/hooks/useDestructiveActionQueue.ts`
- `src/components/chat/DestructiveActionDialog.tsx`
- `src/hooks/useAutomation.ts`
- `src/components/chat/AiCopilotChat.tsx`

---

## Phase 3 — Formula auto-fill

### 3.1 Mở rộng tool schema

- [ ] Thêm `fillDown?: boolean` cho `set_formula`.
- [ ] Thêm `endRow?: number` tùy chọn.
- [ ] Giữ mặc định single-cell để backward compatible.
- [ ] Cập nhật agent types và prompt ngắn gọn.

### 3.2 Google Sheets auto-fill

- [ ] Resolve tên cột sang column index và A1 notation.
- [ ] Ghi source formula vào row 2.
- [ ] Dùng Google Sheets `autoFill` batch request.
- [ ] Tính last row từ số hàng dữ liệu hiện có.
- [ ] Không fill xuống các hàng trống ngoài dataset.
- [ ] Trả action result với range đã áp dụng.

Ví dụ:

```text
E2 = C2*D2
E3 = C3*D3
E4 = C4*D4
```

Acceptance criteria:

- `fillDown` không được truyền thì vẫn chỉ ghi một ô.
- `fillDown: true` điều chỉnh relative reference đúng từng hàng.
- Formula không ghi vượt quá last data row.
- API failure trả failed action result.

Files dự kiến:

- `src/core/ai/agentTypes.ts`
- `src/core/ai/agentTools.ts`
- `src/core/ai/executeAgentActions.ts`
- `src/core/google/services/googleStructureService.ts`
- `src/hooks/useAutomation.ts`

---

## Phase 4 — Branding và prompt optimization

### 4.1 Centralize agent branding

- [ ] Tạo một nguồn branding duy nhất.
- [ ] Thay label tab thành `AI Copilot (AutoFlow Agent)`.
- [ ] Thay chat header thành `AUTOFLOW AGENT`.
- [ ] Thay badge thành `FULL ACCESS ACTIVE`.
- [ ] Thay loading và welcome copy liên quan.
- [ ] Không thay DeepSeek model hoặc API config.

Brand config dự kiến:

```ts
export const AGENT_BRAND = {
  name: 'AutoFlow Agent',
  shortName: 'AutoFlow',
  statusLabel: 'FULL ACCESS ACTIVE',
};
```

### 4.2 Rút gọn system prompt

- [ ] Đo baseline prompt bytes và estimated tokens.
- [ ] Xóa JSON examples trùng với tool schemas.
- [ ] Giữ permission policy và sheet context.
- [ ] Giữ destructive action policy.
- [ ] Giữ options format dưới dạng một ví dụ ngắn.
- [ ] Target prompt dưới 4KB.
- [ ] Snapshot toàn bộ tool schemas trước và sau.

Acceptance criteria:

- Prompt giảm ít nhất 60%.
- Tool names và schemas không đổi ngoài `set_formula` fields đã duyệt.
- Create/update/delete/format/chart vẫn chọn đúng tool.

Files dự kiến:

- `src/core/ai/agentBrand.ts`
- `src/core/ai/buildAgentPrompt.ts`
- `src/App.tsx`
- `src/components/chat/AiCopilotChat.tsx`

---

## Phase 5 — Undo và rollback

### 5.1 Undo transaction model

- [ ] Tạo `UndoTransaction` và inverse actions.
- [ ] Stack tối đa 20 transactions.
- [ ] Snapshot trước khi chạy action batch.
- [ ] Hiển thị Undo CTA sau action thành công.
- [ ] Không đưa failed/cancelled action vào undo stack.

### 5.2 Local và value operations

- [ ] Undo `update_row`.
- [ ] Undo `batch_update_rows`.
- [ ] Undo `add_row` và `batch_add_rows`.
- [ ] Undo format/range update có snapshot values.

### 5.3 Structural Google operations

- [ ] Snapshot header và values trước khi xóa cột.
- [ ] Snapshot toàn bộ rows trước `clear_sheet`.
- [ ] Duplicate backup sheet trước `delete_sheet`.
- [ ] Báo `partially_rolled_back` khi rollback không hoàn chỉnh.

Acceptance criteria:

- Local và Google state đồng nhất sau undo.
- Undo failure không bị nuốt lỗi.
- Destructive operation chỉ chạy sau khi snapshot thành công.

Files dự kiến:

- `src/core/undo/undoTypes.ts`
- `src/core/undo/createInverseActions.ts`
- `src/hooks/useUndoStack.ts`
- `src/hooks/useAutomation.ts`
- `src/components/chat/AiCopilotChat.tsx`

---

## Phase 6 — Responsive và mobile

### 6.1 Main layout

- [ ] Mobile/tablet dùng một cột.
- [ ] Desktop lớn dùng grid 12 cột hiện tại.
- [ ] Cho phép page scroll trên màn hình thấp.
- [ ] Giữ internal scroll cho DataGrid.
- [ ] Đảm bảo Chat input luôn truy cập được.

Layout dự kiến:

```text
grid-cols-1 xl:grid-cols-12
```

### 6.2 Header và toolbars

- [ ] Tạo compact header cho mobile.
- [ ] Không ẩn Start/Login/Theme controls.
- [ ] Cho sheet tabs horizontal scroll.
- [ ] Thu gọn filter controls khi chiều ngang nhỏ.
- [ ] Kiểm tra modal không vượt viewport.

### 6.3 Viewport test matrix

- [ ] 390×844.
- [ ] 768×1024.
- [ ] 1280×800.
- [ ] 1440×900.
- [ ] Light mode.
- [ ] Dark mode.

Acceptance criteria:

- Không có page-level horizontal overflow.
- DataGrid, Chat và Pipeline vẫn usable.
- Không mất action controls.
- Text không overlap hoặc bị cắt ngoài ý muốn.

Files dự kiến:

- `src/App.tsx`
- `src/components/layout/Header.tsx`
- `src/components/pipeline/ControlBar.tsx`
- `src/components/pipeline/DataGrid.tsx`
- `src/components/chat/AiCopilotChat.tsx`

---

## Test gates bắt buộc cho mọi phase

- [ ] `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`.
- [ ] Production build pass.
- [ ] Protected config hash comparison pass.
- [ ] DeepSeek model/tool contract comparison pass.
- [ ] Google public methods contract pass.
- [ ] `useAutomation` return contract pass.
- [ ] Browser console không có error.
- [ ] Light/dark screenshot review.
- [ ] Reduced-motion review nếu có animation thay đổi.
- [ ] QA artifacts lưu tại `D:\Preview\<date>_<task>`.

## Definition of Done toàn bộ roadmap

- [ ] 10 hạng mục đã đạt acceptance criteria.
- [ ] Không mất quyền hoặc tool hiện tại.
- [ ] Không thay đổi cách config ngoài migration được ghi rõ.
- [ ] Chat history và action results survive reload.
- [ ] Destructive actions luôn cần xác nhận.
- [ ] Formula fill-down hoạt động đúng relative references.
- [ ] Undo hỗ trợ tối thiểu data/value operations.
- [ ] App không trắng màn hình khi component crash.
- [ ] Mobile và desktop đều không vỡ layout.
- [ ] Prompt giảm ít nhất 60% mà tool selection không regression.
