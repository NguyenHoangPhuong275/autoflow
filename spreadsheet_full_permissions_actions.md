# Spreadsheet Agent — Full Permission & Action Catalog

> Mục tiêu: tài liệu tham chiếu đầy đủ cho một spreadsheet agent/MCP có quyền đọc, ghi, chỉnh sửa cấu trúc, định dạng, lọc, sắp xếp, biểu đồ, table, validation, import/export, pipeline control, logs và rollback.
>
> Phân loại:
> - **[GOOGLE]**: có capability tương ứng trong Google Sheets API chính thức.
> - **[EXCEL]**: có capability tương ứng trong Excel JavaScript API / Office Add-ins.
> - **[EXCEL-MCP]**: tool có thật trong repo `henrysouchien/excel-mcp`.
> - **[CUSTOM]**: action nên tự định nghĩa nếu hệ thống của bạn có pipeline/log/file layer.
>
> Lưu ý: các tên `snake_case` trong tài liệu này là tên action đề xuất để dùng cho MCP/tool schema. Tên request thật của Google Sheets API thường ở dạng camelCase, ví dụ `updateCells`, `sortRange`, `setDataValidation`.

---

## 1. Full-access authorization

### 1.1 Google Sheets OAuth scopes

| Scope | Quyền | Mức |
|---|---|---|
| `https://www.googleapis.com/auth/spreadsheets` | Xem, sửa, tạo và xoá toàn bộ Google Sheets của user | Sensitive |
| `https://www.googleapis.com/auth/spreadsheets.readonly` | Chỉ đọc Google Sheets | Sensitive |
| `https://www.googleapis.com/auth/drive.file` | Xem/sửa/tạo/xoá các Drive file mà app sử dụng | Recommended / Non-sensitive |
| `https://www.googleapis.com/auth/drive` | Toàn quyền với toàn bộ Google Drive | Restricted |
| `https://www.googleapis.com/auth/drive.readonly` | Xem và download toàn bộ Drive file | Restricted |

**Nếu mục tiêu là full quyền thao tác spreadsheet:**  
`https://www.googleapis.com/auth/spreadsheets`

**Nếu app chỉ cần quyền trên file mà user chọn/mở qua app:** ưu tiên `drive.file` theo nguyên tắc least privilege.

---

### 1.2 Microsoft Excel / Office Add-ins permission levels

| Canonical | Add-in manifest | Unified manifest |
|---|---|---|
| Restricted | `Restricted` | `Document.Restricted.User` |
| Read document | `ReadDocument` | `Document.Read.User` |
| Read all document | `ReadAllDocument` | `Document.ReadAll.User` |
| Write document | `WriteDocument` | `Document.Write.User` |
| Read/write document | `ReadWriteDocument` | `Document.ReadWrite.User` |

Để dùng **Excel application-specific APIs**, Microsoft yêu cầu quyền read/write document:

```xml
<Permissions>ReadWriteDocument</Permissions>
```

Unified manifest:

```json
{
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        {
          "name": "Document.ReadWrite.User",
          "type": "Delegated"
        }
      ]
    }
  }
}
```

---

# 2. Workbook / Spreadsheet

## Read

```text
get_spreadsheet
get_spreadsheet_metadata
get_workbook
list_workbooks
get_active_workbook
```

## Update

```text
update_spreadsheet_properties
switch_active_workbook
```

## Create / lifecycle

```text
create_spreadsheet
open_spreadsheet
close_spreadsheet
```

## Suggested custom

```text
save_workbook
save_as
reload_workbook
```

---

# 3. Sheet

```text
list_sheets
get_sheet
get_sheet_info
get_active_sheet

create_sheet
delete_sheet
duplicate_sheet
rename_sheet
switch_sheet

move_sheet
hide_sheet
show_sheet

clear_sheet

update_sheet_properties
resize_sheet

freeze_rows
freeze_columns

set_tab_color

protect_sheet
unprotect_sheet
```

### Google mapping

```text
create_sheet               -> addSheet
delete_sheet               -> deleteSheet
duplicate_sheet            -> duplicateSheet
update_sheet_properties    -> updateSheetProperties
```

---

# 4. Row

```text
get_row
get_rows
batch_get_rows

add_row
batch_add_rows

insert_row
insert_rows

update_row
batch_update_rows

delete_row
batch_delete_rows

move_row
move_rows

hide_row
show_row

set_row_height
auto_resize_rows

group_rows
ungroup_rows
```

Google API thực hiện row/column qua dimension requests:

```text
insertDimension
deleteDimension
moveDimension
appendDimension
updateDimensionProperties
autoResizeDimensions
addDimensionGroup
deleteDimensionGroup
updateDimensionGroup
```

---

# 5. Column

```text
get_column
get_columns
batch_get_columns

add_column
batch_add_columns

insert_column
insert_columns

update_column
batch_update_columns

delete_column
batch_delete_columns

move_column
move_columns

hide_column
show_column

set_column_width
auto_resize_columns

group_columns
ungroup_columns
```

---

# 6. Cell

```text
get_cell
get_cells
batch_get_cells

update_cell
batch_update_cells

clear_cell
batch_clear_cells

copy_cell
move_cell
```

---

# 7. Range

Đây nên là abstraction quan trọng nhất của spreadsheet agent.

```text
get_range
batch_get_ranges

update_range
batch_update_ranges

clear_range
batch_clear_ranges

copy_range
move_range

insert_range
delete_range

fill_range
auto_fill

merge_cells
unmerge_cells

get_used_range
get_selection
```

### Google Values API mapping

```text
get_range                   -> spreadsheets.values.get
batch_get_ranges            -> spreadsheets.values.batchGet
get_ranges_by_filter        -> spreadsheets.values.batchGetByDataFilter

update_range                -> spreadsheets.values.update
batch_update_ranges         -> spreadsheets.values.batchUpdate
update_ranges_by_filter     -> spreadsheets.values.batchUpdateByDataFilter

append_values               -> spreadsheets.values.append

clear_range                 -> spreadsheets.values.clear
batch_clear_ranges          -> spreadsheets.values.batchClear
clear_ranges_by_filter      -> spreadsheets.values.batchClearByDataFilter
```

---

# 8. Value / Data

```text
get_values
batch_get_values

set_value
set_values
batch_set_values

append_values

clear_values
batch_clear_values

paste_data
text_to_columns

trim_whitespace
remove_duplicates
randomize_range
```

Google equivalents:

```text
pasteData
textToColumns
trimWhitespace
deleteDuplicates
randomizeRange
```

---

# 9. Headers

Danh sách gốc của bạn có `update_headers`; nên hoàn thiện thành:

```text
get_headers
update_headers
rename_header
batch_rename_headers

add_header
delete_header

detect_headers
normalize_headers
```

`detect_headers` và `normalize_headers` là **[CUSTOM]**.

---

# 10. Formula

```text
get_formula
get_formulas
batch_get_formulas

set_formula
set_formulas
batch_set_formulas

fill_formula
copy_formula

clear_formula

recalculate
```

Google Sheets formulas có thể được ghi như cell values bằng `USER_ENTERED` hoặc thông qua `CellData.userEnteredValue.formulaValue`.

---

# 11. Formatting

```text
get_format

format_cell
format_cells
format_range

set_font
set_font_family
set_font_size

set_bold
set_italic
set_underline
set_strikethrough

set_text_color
set_background_color

set_horizontal_alignment
set_vertical_alignment

set_number_format
set_date_format
set_currency_format
set_percentage_format

set_border
clear_border

set_row_height
set_column_width

auto_fit_rows
auto_fit_columns

wrap_text
unwrap_text

set_text_rotation

copy_format
clear_format
```

Google API primitives:

```text
repeatCell
updateCells
updateBorders
updateDimensionProperties
autoResizeDimensions
```

---

# 12. Conditional formatting

```text
list_conditional_format_rules

add_conditional_format_rule
update_conditional_format_rule
delete_conditional_format_rule

move_conditional_format_rule
clear_conditional_format_rules
```

Google mapping:

```text
addConditionalFormatRule
updateConditionalFormatRule
deleteConditionalFormatRule
```

---

# 13. Search / Find / Replace

```text
find
find_cells
find_rows
find_columns

search_sheet
search_workbook

find_replace

find_formula
find_value

find_duplicates
```

Google official primitive:

```text
findReplace
```

`excel-mcp` có:

```text
find_cells
```

---

# 14. Sort

```text
sort_range
sort_rows
sort_table

sort_ascending
sort_descending

multi_column_sort

clear_sort
```

Google official primitive:

```text
sortRange
```

---

# 15. Filter

```text
apply_filter
set_basic_filter
clear_filter

get_filter

add_filter_view
update_filter_view
delete_filter_view
duplicate_filter_view

list_filter_views
```

Google mapping:

```text
setBasicFilter
clearBasicFilter

addFilterView
updateFilterView
deleteFilterView
duplicateFilterView
```

---

# 16. Data validation

```text
get_data_validation

set_data_validation
clear_data_validation

create_dropdown
update_dropdown
delete_dropdown

set_number_validation
set_date_validation
set_text_validation

set_custom_formula_validation
```

Google primitive:

```text
setDataValidation
```

---

# 17. Protected ranges / permissions inside sheet

```text
list_protected_ranges
get_protected_range

add_protected_range
update_protected_range
delete_protected_range

protect_range
unprotect_range
```

Google mapping:

```text
addProtectedRange
updateProtectedRange
deleteProtectedRange
```

---

# 18. Named ranges

```text
list_named_ranges
get_named_range

create_named_range
update_named_range
delete_named_range
```

Google mapping:

```text
addNamedRange
updateNamedRange
deleteNamedRange
```

---

# 19. Table

```text
list_tables
get_table

create_table
update_table
delete_table

resize_table

add_table_row
update_table_row
delete_table_row

add_table_column
update_table_column
delete_table_column

sort_table
filter_table
clear_table_filter
```

Google mapping hiện có:

```text
addTable
updateTable
deleteTable
```

Excel JavaScript API cũng có table object model riêng.

---

# 20. Chart

```text
list_charts
get_chart

create_chart
update_chart
delete_chart

move_chart
resize_chart

set_chart_title
set_chart_type
set_chart_data_range

update_chart_position
update_chart_border
```

Google mapping:

```text
addChart
updateChartSpec
deleteEmbeddedObject
updateEmbeddedObjectPosition
updateEmbeddedObjectBorder
```

---

# 21. Slicer

```text
list_slicers
get_slicer

add_slicer
update_slicer
delete_slicer

move_slicer
resize_slicer
```

Google mapping:

```text
addSlicer
updateSlicerSpec
deleteEmbeddedObject
updateEmbeddedObjectPosition
```

---

# 22. Banding / alternating colors

```text
add_banding
update_banding
delete_banding
list_bandings
```

Google mapping:

```text
addBanding
updateBanding
deleteBanding
```

---

# 23. Developer metadata

```text
list_developer_metadata
get_developer_metadata
search_developer_metadata

create_developer_metadata
update_developer_metadata
delete_developer_metadata
```

Google mapping:

```text
createDeveloperMetadata
updateDeveloperMetadata
deleteDeveloperMetadata
```

---

# 24. Data source / Connected Sheets

```text
list_data_sources
get_data_source

add_data_source
update_data_source
delete_data_source

refresh_data_source
cancel_data_source_refresh
```

Google mapping:

```text
addDataSource
updateDataSource
deleteDataSource
refreshDataSource
cancelDataSourceRefresh
```

---

# 25. Comments

> Một số comment request của Google Sheets API đang ở Developer Preview.

```text
list_comments
get_comment

insert_comment
update_comment
delete_comment

add_comment_reply
update_comment_reply
delete_comment_reply
```

Google request names:

```text
insertComment
addCommentReply
updateCommentPost
deleteComment
deleteCommentReply
```

---

# 26. Copy / Cut / Paste

```text
copy_range
cut_range
paste_range

copy_paste
cut_paste
paste_data

copy_values_only
copy_format_only
copy_formula_only
```

Google mapping:

```text
copyPaste
cutPaste
pasteData
```

---

# 27. Import

```text
import_csv
import_tsv
import_json
import_xlsx

load_file
load_url

reload_url
```

`load_url` là **[CUSTOM]**, không phải tên method chuẩn của Google Sheets API.

---

# 28. Export

Danh sách gốc có `export_csv`; nên mở rộng:

```text
export_csv
export_tsv
export_json
export_xlsx
export_pdf

export_range_csv
export_sheet_csv
export_workbook
```

---

# 29. Selection / UI context

```text
get_selection
set_selection

get_active_cell
set_active_cell

get_active_sheet
switch_sheet

get_active_workbook
switch_active_workbook
```

---

# 30. Pipeline control

Đây là **[CUSTOM]** và không thuộc Google Sheets/Excel API chuẩn.

Danh sách gốc:

```text
start_pipeline
pause_pipeline
resume_pipeline
reset_pipeline
change_speed
```

Full đề xuất:

```text
start_pipeline
stop_pipeline
pause_pipeline
resume_pipeline
reset_pipeline
restart_pipeline

cancel_pipeline

get_pipeline_status
get_pipeline_state
get_pipeline_progress

get_current_step
get_next_step
list_pipeline_steps

step_pipeline
skip_step
retry_step

run_once
run_from_step
run_to_step
run_until

enable_step
disable_step

set_pipeline_config
get_pipeline_config

change_speed
get_speed
```

---

# 31. Logs / observability

Danh sách gốc:

```text
clear_logs
```

Full đề xuất:

```text
get_logs
get_recent_logs

search_logs
filter_logs

get_errors
get_warnings

get_metrics

set_log_level
get_log_level

clear_logs
export_logs
```

---

# 32. Undo / Restore / History

Rất nên có cho AI agent.

```text
undo
redo

get_history
clear_history

create_checkpoint
restore_checkpoint

restore_written_cells
restore_deleted_row
restore_deleted_column
restore_deleted_sheet
restore_renamed_sheet
```

Repo `henrysouchien/excel-mcp` dùng mô hình **restore token** cho các thao tác ghi/xoá/rename.

---

# 33. Batch operations

Nên có batch counterpart cho các action thường dùng:

```text
batch_get_rows
batch_update_rows
batch_add_rows
batch_delete_rows

batch_get_columns
batch_update_columns
batch_add_columns
batch_delete_columns

batch_get_cells
batch_update_cells
batch_clear_cells

batch_get_ranges
batch_update_ranges
batch_clear_ranges

batch_create_sheets
batch_delete_sheets

batch_format_ranges
batch_set_formulas
batch_set_validations
```

---

# 34. Transaction / Safety

Custom layer nên có:

```text
begin_transaction
commit_transaction
rollback_transaction

dry_run
validate_operation
preview_changes

lock_workbook
unlock_workbook

create_backup
restore_backup
```

Đây là **[CUSTOM]** nhưng rất hữu ích nếu AI được cấp quyền ghi/xoá.

---

# 35. Tool set có thật trong `henrysouchien/excel-mcp`

Theo README hiện tại, repo có 25 built-in tools:

```text
list_workbooks
switch_active_workbook

read_cells
write_cells
restore_written_cells

read_range_csv
read_sheet_csv

get_selection
get_used_range

list_sheets
switch_sheet
create_sheet
rename_sheet
restore_renamed_sheet
delete_sheet

insert_row
delete_row
restore_deleted_row

insert_column
delete_column

restore_deleted_sheet
restore_deleted_column

create_table
format_cells
find_cells
```

---

# 36. Google Sheets `spreadsheets.values` methods chính thức

```text
append
batchClear
batchClearByDataFilter
batchGet
batchGetByDataFilter
batchUpdate
batchUpdateByDataFilter
clear
get
update
```

Snake-case layer đề xuất:

```text
append_values
batch_clear_ranges
batch_clear_by_data_filter
batch_get_ranges
batch_get_by_data_filter
batch_update_ranges
batch_update_by_data_filter
clear_range
get_range
update_range
```

---

# 37. Google Sheets `spreadsheets.batchUpdate` request catalog

Các request được Google Sheets API expose gồm:

```text
updateSpreadsheetProperties
updateSheetProperties
updateDimensionProperties

updateNamedRange
addNamedRange
deleteNamedRange

repeatCell

addSheet
deleteSheet
duplicateSheet

autoFill

cutPaste
copyPaste
pasteData

mergeCells
unmergeCells

updateBorders
updateCells
appendCells

addFilterView
updateFilterView
deleteFilterView
duplicateFilterView

clearBasicFilter
setBasicFilter

deleteDimension
insertDimension
moveDimension
appendDimension

insertRange
deleteRange

findReplace
textToColumns

addConditionalFormatRule
updateConditionalFormatRule
deleteConditionalFormatRule

sortRange

setDataValidation

addProtectedRange
updateProtectedRange
deleteProtectedRange

autoResizeDimensions

addChart
updateChartSpec
deleteEmbeddedObject
updateEmbeddedObjectPosition
updateEmbeddedObjectBorder

updateBanding
addBanding
deleteBanding

createDeveloperMetadata
updateDeveloperMetadata
deleteDeveloperMetadata

randomizeRange

addDimensionGroup
deleteDimensionGroup
updateDimensionGroup

trimWhitespace
deleteDuplicates

addSlicer
updateSlicerSpec

addDataSource
updateDataSource
deleteDataSource
refreshDataSource
cancelDataSourceRefresh

addTable
updateTable
deleteTable

insertComment
addCommentReply
updateCommentPost
deleteComment
deleteCommentReply
```

---

# 38. Full proposed MCP namespace

Nếu thiết kế lại tool API từ đầu, nên chia namespace:

```text
workbook.*
sheet.*
row.*
column.*
cell.*
range.*
value.*
header.*

formula.*
format.*
conditional_format.*

filter.*
sort.*
search.*

validation.*
protection.*
named_range.*

table.*
chart.*
slicer.*
banding.*

metadata.*
data_source.*
comment.*

import.*
export.*

pipeline.*
log.*
history.*
transaction.*
```

Ví dụ:

```text
sheet.create
sheet.delete
sheet.rename
sheet.duplicate

range.get
range.update
range.clear
range.copy
range.move

pipeline.start
pipeline.pause
pipeline.resume
pipeline.stop
pipeline.status

history.undo
history.restore
```

---

# 39. Recommended full-access preset

Nếu muốn định nghĩa một role kiểu `FULL_ACCESS`, có thể gom:

```yaml
FULL_ACCESS:
  workbook:
    - read
    - create
    - update
    - delete
    - switch

  sheet:
    - read
    - create
    - update
    - delete
    - duplicate
    - rename
    - move
    - hide
    - show

  data:
    - read
    - write
    - append
    - clear
    - search
    - replace

  row:
    - read
    - add
    - insert
    - update
    - delete
    - move

  column:
    - read
    - add
    - insert
    - update
    - delete
    - move

  range:
    - read
    - write
    - clear
    - copy
    - move
    - insert
    - delete
    - merge
    - unmerge

  formula:
    - read
    - write
    - fill
    - clear

  formatting:
    - read
    - write
    - clear

  filter_sort:
    - filter
    - sort
    - filter_view

  validation:
    - read
    - create
    - update
    - delete

  protection:
    - read
    - create
    - update
    - delete

  table:
    - read
    - create
    - update
    - delete

  chart:
    - read
    - create
    - update
    - delete
    - move
    - resize

  import_export:
    - import
    - export

  pipeline:
    - start
    - stop
    - pause
    - resume
    - reset
    - retry
    - skip
    - configure

  logs:
    - read
    - search
    - clear
    - export

  history:
    - read
    - undo
    - redo
    - restore

  transaction:
    - begin
    - commit
    - rollback
    - dry_run
```

---

# 40. Danh sách gốc của bạn

```text
update_row
batch_update_rows
add_row
batch_add_rows
delete_row
batch_delete_rows
update_headers
clear_sheet
create_sheet
delete_sheet
duplicate_sheet
rename_sheet
switch_sheet
start_pipeline
pause_pipeline
resume_pipeline
reset_pipeline
change_speed
clear_logs
export_csv
load_url
```

Các action trên nên được xem là **subset** của full action catalog trong tài liệu này.

---

# 41. Nguồn tham khảo

## Google Sheets API — Official

Google Sheets API Overview  
https://developers.google.com/workspace/sheets/api/guides/concepts

Google Sheets API — Request / batchUpdate request types  
https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request

Google Sheets API — Values resource  
https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values

Google Sheets API — OAuth scopes  
https://developers.google.com/workspace/sheets/api/scopes

---

## Microsoft Excel / Office.js — Official

Excel Add-ins overview  
https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-overview

Excel Range API  
https://learn.microsoft.com/en-us/javascript/api/excel/excel.range

Excel tables  
https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-tables

Excel workbooks  
https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-workbooks

Office Add-ins permissions  
https://learn.microsoft.com/en-us/office/dev/add-ins/develop/requesting-permissions-for-api-use-in-content-and-task-pane-add-ins

---

## Excel MCP reference implementation

henrysouchien/excel-mcp  
https://github.com/henrysouchien/excel-mcp

---

# 42. Ghi chú thiết kế

1. Không nên cấp `FULL_ACCESS` mặc định cho mọi agent.
2. Tách `read` và `write/delete` thành permission riêng.
3. Các thao tác destructive như `delete_sheet`, `clear_sheet`, `delete_range` nên có backup/restore token.
4. Nên hỗ trợ `dry_run` trước batch mutation.
5. Các batch action nên có giới hạn kích thước payload.
6. Nên có audit log cho mọi write action.
7. `start_pipeline`, `change_speed`, `load_url`, `clear_logs` là application-specific, không phải tên API chuẩn của Google Sheets/Excel.
8. Nên ưu tiên range-based operations thay vì loop từng cell để tối ưu hiệu năng.
9. Với Google OAuth, nên chọn scope nhỏ nhất đáp ứng use case thay vì xin toàn quyền Drive nếu không cần.
10. Với Office.js application-specific Excel APIs, manifest nên khai báo read/write document permission.
