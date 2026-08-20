import { createInverseActions } from '../src/core/undo/createInverseActions.ts';

let passed = 0;
let failed = 0;

function assert(name, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name} — ${extra}`);
  }
}

console.log('\n── Undo & Inverse Actions Engine Unit Tests ──');

// Sample snapshot
const mockSnapshot = {
  sheetTitle: 'Products',
  headers: ['id', 'name', 'price', 'stock'],
  rows: [
    { id: 'p1', rowNumber: 2, data: { id: 'p1', name: 'Product 1', price: 100, stock: 5 }, status: 'ready' },
    { id: 'p2', rowNumber: 3, data: { id: 'p2', name: 'Product 2', price: 200, stock: 10 }, status: 'ready' },
    { id: 'p3', rowNumber: 4, data: { id: 'p3', name: 'Product 3', price: 300, stock: 15 }, status: 'ready' },
  ],
  timestamp: Date.now(),
};

// 1. Invert update_row
const updateRowAction = [{ type: 'update_row', rowNumber: 2, colKey: 'price', newValue: 999 }];
const invUpdateRow = createInverseActions(updateRowAction, mockSnapshot);
assert('Inverse of update_row created', invUpdateRow.length === 1);
assert('Inverse restores old price (100)', invUpdateRow[0]?.newValue === 100);
assert('Inverse targets rowNumber 2', invUpdateRow[0]?.rowNumber === 2);

// 2. Invert batch_update_rows
const batchUpdateAction = [{
  type: 'batch_update_rows',
  updates: [
    { rowNumber: 2, colKey: 'price', newValue: 500 },
    { rowNumber: 3, colKey: 'stock', newValue: 99 },
  ],
}];
const invBatchUpdate = createInverseActions(batchUpdateAction, mockSnapshot);
assert('Inverse of batch_update_rows created', invBatchUpdate.length === 1);
assert('Inverse has 2 updates', invBatchUpdate[0]?.updates?.length === 2);
assert('Update 1 restores price to 100', invBatchUpdate[0]?.updates[0]?.newValue === 100);
assert('Update 2 restores stock to 10', invBatchUpdate[0]?.updates[1]?.newValue === 10);

// 3. Invert add_row
const addRowAction = [{ type: 'add_row', rowData: { id: 'p4', name: 'Product 4', price: 400 } }];
const invAddRow = createInverseActions(addRowAction, mockSnapshot);
assert('Inverse of add_row is delete_row', invAddRow[0]?.type === 'delete_row');
assert('Inverse delete_row targets id p4', invAddRow[0]?.idCol === 'p4');

// 4. Invert delete_row
const deleteRowAction = [{ type: 'delete_row', rowNumber: 2 }];
const invDeleteRow = createInverseActions(deleteRowAction, mockSnapshot);
assert('Inverse of delete_row is add_row', invDeleteRow[0]?.type === 'add_row');
assert('Inverse add_row restores p1 data', invDeleteRow[0]?.rowData?.name === 'Product 1');

// 5. Invert batch_delete_rows
const batchDelAction = [{ type: 'batch_delete_rows', rowNumbers: [2, 3] }];
const invBatchDel = createInverseActions(batchDelAction, mockSnapshot);
assert('Inverse of batch_delete_rows is batch_add_rows', invBatchDel[0]?.type === 'batch_add_rows');
assert('Inverse restores 2 rows', invBatchDel[0]?.rowsData?.length === 2);

// 6. Invert clear_sheet
const clearAction = [{ type: 'clear_sheet', sheetTitle: 'Products' }];
const invClear = createInverseActions(clearAction, mockSnapshot);
assert('Inverse of clear_sheet is batch_add_rows with all snapshot rows', invClear[0]?.rowsData?.length === 3);

// 7. Invert update_headers
const updateHeadersAction = [{ type: 'update_headers', sheetTitle: 'Products', headers: ['ID', 'NAME', 'GIA', 'KHO'] }];
const invHeaders = createInverseActions(updateHeadersAction, mockSnapshot);
assert('Inverse of update_headers restores original headers', invHeaders[0]?.headers?.join(',') === 'id,name,price,stock');

// 8. Invert add_column & delete_column
const addColAction = [{ type: 'add_column', sheetTitle: 'Products', columnName: 'discount' }];
const invAddCol = createInverseActions(addColAction, mockSnapshot);
assert('Inverse of add_column is delete_column', invAddCol[0]?.type === 'delete_column' && invAddCol[0]?.colKey === 'discount');

// 9. Invert create_sheet & delete_sheet & rename_sheet
const createSheetAction = [{ type: 'create_sheet', sheetTitle: 'Vouchers' }];
const invCreateSheet = createInverseActions(createSheetAction, mockSnapshot);
assert('Inverse of create_sheet is delete_sheet', invCreateSheet[0]?.type === 'delete_sheet' && invCreateSheet[0]?.sheetTitle === 'Vouchers');

const renameSheetAction = [{ type: 'rename_sheet', oldSheetTitle: 'Products', newSheetTitle: 'Sanpham' }];
const invRename = createInverseActions(renameSheetAction, mockSnapshot);
assert('Inverse of rename_sheet flips titles', invRename[0]?.oldSheetTitle === 'Sanpham' && invRename[0]?.newSheetTitle === 'Products');

// 10. Multi-action reverse sequence order
const multiActions = [
  { type: 'add_column', sheetTitle: 'Products', columnName: 'total' },
  { type: 'update_row', rowNumber: 2, colKey: 'price', newValue: 888 },
];
const invMulti = createInverseActions(multiActions, mockSnapshot);
assert('Multi-action inverse has 2 actions', invMulti.length === 2);
assert('First inverse action is update_row (reverse order)', invMulti[0]?.type === 'update_row');
assert('Second inverse action is delete_column (reverse order)', invMulti[1]?.type === 'delete_column');

console.log(`\nUndo Engine Unit Test Summary: ${passed} passed, ${failed} failed.\n`);
process.exit(failed > 0 ? 1 : 0);
