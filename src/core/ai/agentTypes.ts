export interface ChatMessageOption {
    label: string;
    description?: string;
    badge?: string;
    previewBg?: string;
    previewColor?: string;
    action?: AgentAction;
    prompt?: string;
}
export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai' | 'system';
    text: string;
    timestamp: string;
    actionSummary?: string;
    options?: ChatMessageOption[];
}
export interface PermittedDocument {
    id: string;
    name: string;
    type: 'google_sheet' | 'text_note';
    isGranted: boolean;
    contentSummary: string;
}
export interface AgentAction {
    type: 'create_sheet' | 'delete_sheet' | 'duplicate_sheet' | 'rename_sheet' | 'switch_sheet' | 'clear_sheet' | 'update_headers' | 'add_column' | 'delete_column' | 'freeze_rows_cols' | 'sort_range' | 'update_range' | 'set_formula' | 'format_cells' | 'auto_resize_columns' | 'set_column_width' | 'add_chart' | 'clear_charts' | 'update_row' | 'batch_update_rows' | 'add_row' | 'batch_add_rows' | 'delete_row' | 'batch_delete_rows' | 'start_pipeline' | 'pause_pipeline' | 'resume_pipeline' | 'reset_pipeline' | 'change_speed' | 'clear_logs' | 'export_csv' | 'load_url';
    rowId?: string;
    rowNumber?: number;
    idCol?: string;
    idCols?: string[];
    rowNumbers?: number[];
    colKey?: string;
    columnName?: string;
    newValue?: unknown;
    updatedData?: Record<string, unknown>;
    rowData?: Record<string, unknown>;
    rowsData?: Array<Record<string, unknown>>;
    headers?: string[];
    range?: string;
    values?: any[][];
    formula?: string;
    fillDown?: boolean;
    endRow?: number;
    ascending?: boolean;
    frozenRows?: number;
    frozenCols?: number;
    backgroundColor?: string;
    fontColor?: string;
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontFamily?: string;
    alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
    chartType?: 'COLUMN' | 'BAR' | 'LINE' | 'PIE';
    title?: string;
    domainColIndex?: number;
    seriesColIndex?: number;
    rowCount?: number;
    rowIndexOffset?: number;
    updates?: Array<{
        idCol?: string;
        rowNumber?: number;
        colKey: string;
        newValue: unknown;
    }>;
    sheetTitle?: string;
    pixelSize?: number;
    startCol?: number;
    endCol?: number;
    oldSheetTitle?: string;
    newSheetTitle?: string;
    sourceSheetTitle?: string;
    speedMs?: number;
    url?: string;
}
