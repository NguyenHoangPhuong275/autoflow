import { useState, useEffect, useRef, useCallback } from 'react';
import { DataRow, LogEntry, ExecutionStats, PipelineStage, DataSourceId } from '@/types';
import { AutomationEngine } from '@/core/engine/automationEngine';
import { ExcelParser } from '@/core/parsers/excelParser';
import { GoogleSheetReader } from '@/core/parsers/googleSheetReader';
import { GoogleSyncService, SheetTabInfo } from '@/core/services/googleSyncService';
import { getUserErrorMessage } from '@/core/utils/errors';
import type { SheetDataIndex } from '@/core/ai/agentTypes';

const ACTIVE_SPREADSHEET_URL_KEY = 'autoflow_active_spreadsheet_url';

function readActiveSpreadsheetUrl(): string {
    if (typeof window === 'undefined') return '';
    try {
        return sessionStorage.getItem(ACTIVE_SPREADSHEET_URL_KEY) || '';
    } catch {
        return '';
    }
}

function storeActiveSpreadsheetUrl(url: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        if (url) sessionStorage.setItem(ACTIVE_SPREADSHEET_URL_KEY, url);
        else sessionStorage.removeItem(ACTIVE_SPREADSHEET_URL_KEY);
        return true;
    } catch {
        return false;
    }
}

export function useAutomation() {
    const engineRef = useRef<AutomationEngine>(new AutomationEngine());
    const engine = engineRef.current;
    const initialUrlRef = useRef(readActiveSpreadsheetUrl());
    const [url, setUrl] = useState<string>(initialUrlRef.current);
    const urlRef = useRef(initialUrlRef.current);
    const spreadsheetIdRef = useRef<string | null>(GoogleSheetReader.extractSpreadsheetId(initialUrlRef.current));
    const [activeSourceId, setActiveSourceId] = useState<DataSourceId | null>(null);
    const [stage, setStage] = useState<PipelineStage>('idle');
    const [rows, setRows] = useState<DataRow[]>([]);
    const [allSheetRows, setAllSheetRows] = useState<SheetDataIndex>({});
    const allSheetRowsRef = useRef<SheetDataIndex>({});
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState<ExecutionStats>(engine.getStats());
    const [speed, setSpeed] = useState<number>(600);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sheetTabs, setSheetTabs] = useState<SheetTabInfo[]>([]);
    const [allSheetHeaders, setAllSheetHeaders] = useState<Record<string, string[]>>({});
    const [activeSheetTitle, setActiveSheetTitle] = useState<string>('');
    const activeSheetTitleRef = useRef('');
    const appendLog = useCallback((id: string, level: LogEntry['level'], message: string) => {
        setLogs((prev) => [
            ...prev,
            {
                id,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
                level,
                message,
            },
        ]);
    }, []);
    useEffect(() => {
        urlRef.current = url;
    }, [url]);
    useEffect(() => {
        engine.onStateChange = (newStats, newStage) => {
            setStats(newStats);
            setStage(newStage as PipelineStage);
        };
        engine.onRowUpdate = (updatedRow) => {
            setRows((prev) => prev.map((r) => (r.id === updatedRow.id ? updatedRow : r)));
        };
        engine.onLog = (logEntry) => {
            setLogs((prev) => [...prev, logEntry]);
        };
    }, [engine]);
    useEffect(() => {
        if (!activeSheetTitle) return;
        setAllSheetRows((previous) => {
            const next = { ...previous, [activeSheetTitle]: rows };
            allSheetRowsRef.current = next;
            return next;
        });
    }, [activeSheetTitle, rows]);
    const fetchFromUrl = useCallback(async (targetUrl: string, sheetTitle?: string) => {
        if (!targetUrl.trim())
            return;
        setIsLoading(true);
        setStage('fetching_data');
        try {
            if (targetUrl.includes('docs.google.com/spreadsheets')) {
                setActiveSourceId('google_sheets');
                const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(targetUrl);
                if (!spreadsheetId) {
                    throw new Error('Link Google Sheet không hợp lệ.');
                }
                if (spreadsheetIdRef.current !== spreadsheetId) {
                    spreadsheetIdRef.current = spreadsheetId;
                    setSheetTabs([]);
                    setAllSheetHeaders({});
                    setAllSheetRows({});
                    allSheetRowsRef.current = {};
                    engine.clearRows();
                    setRows([]);
                    setStats(engine.getStats());
                }
                urlRef.current = targetUrl;
                setUrl(targetUrl);
                storeActiveSpreadsheetUrl(targetUrl);
                let tabs: SheetTabInfo[] = [];
                if (GoogleSyncService.getAccessToken()) {
                    tabs = await GoogleSyncService.fetchSheetMetadata(spreadsheetId);
                }
                if (tabs.length === 0) {
                    tabs = await GoogleSheetReader.discoverSheetTabs(spreadsheetId);
                }
                setSheetTabs(tabs);
                const selectedTab = sheetTitle || (tabs.length > 0 ? tabs[0].title : undefined) || 'Sheet1';
                setActiveSheetTitle(selectedTab);
                activeSheetTitleRef.current = selectedTab;
                let realRows: DataRow[] = [];
                if (GoogleSyncService.getAccessToken()) {
                    try {
                        realRows = await GoogleSyncService.fetchSheet(spreadsheetId, selectedTab);
                    }
                    catch {
                        const res = await GoogleSheetReader.fetchRealGoogleSheet(targetUrl, selectedTab);
                        realRows = res.rows;
                        if (res.headers && res.headers.length > 0) {
                            setAllSheetHeaders((prev) => ({ ...prev, [selectedTab]: res.headers }));
                        }
                    }
                }
                else {
                    const res = await GoogleSheetReader.fetchRealGoogleSheet(targetUrl, selectedTab);
                    realRows = res.rows;
                    if (res.headers && res.headers.length > 0) {
                        setAllSheetHeaders((prev) => ({ ...prev, [selectedTab]: res.headers }));
                    }
                }
                const tabNames = tabs.map((t) => t.title);
                GoogleSheetReader.fetchAllSheetHeaders(spreadsheetId, tabNames).then((headersMap) => {
                    if (spreadsheetIdRef.current !== spreadsheetId) return;
                    if (Object.keys(headersMap).length > 0) {
                        setAllSheetHeaders((prev) => ({ ...prev, ...headersMap }));
                    }
                });
                const missingTabs = tabNames.filter((title) => title !== selectedTab && !allSheetRowsRef.current[title]);
                if (missingTabs.length > 0) {
                    void Promise.allSettled(missingTabs.map(async (title) => {
                        const tabRows = GoogleSyncService.getAccessToken()
                            ? await GoogleSyncService.fetchSheet(spreadsheetId, title)
                            : (await GoogleSheetReader.fetchRealGoogleSheet(targetUrl, title)).rows;
                        return [title, tabRows] as const;
                    })).then((results) => {
                        if (spreadsheetIdRef.current !== spreadsheetId) return;
                        const loadedEntries = results
                            .filter((result): result is PromiseFulfilledResult<readonly [string, DataRow[]]> => result.status === 'fulfilled')
                            .map((result) => result.value);
                        if (loadedEntries.length === 0) return;
                        setAllSheetRows((previous) => {
                            const next = { ...previous, ...Object.fromEntries(loadedEntries) };
                            allSheetRowsRef.current = next;
                            return next;
                        });
                    });
                }
                engine.setRows(realRows.map((r) => r.data));
                setRows(engine.getRows());
                setStats(engine.getStats());
                setStage('ready');
                appendLog(`gs-${Date.now()}`, 'success', `Kết nối thành công! Đã tải ${realRows.length} hàng từ trang "${selectedTab}".`);
            }
            else {
                appendLog(`warn-${Date.now()}`, 'warn', `Đã nạp liên kết: ${targetUrl}.`);
                setStage('ready');
            }
        }
        catch (error: unknown) {
            const message = getUserErrorMessage(error, 'Không thể đọc Google Sheet. Vui lòng thử lại.');
            appendLog(`err-${Date.now()}`, 'error', `Không thể đọc Google Sheet. ${message}`);
            setStage('ready');
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    const fetchFromSpreadsheetId = useCallback((spreadsheetId: string, sheetTitle?: string) => {
        const normalizedId = spreadsheetId.trim();
        if (!normalizedId) return;
        return fetchFromUrl(`https://docs.google.com/spreadsheets/d/${normalizedId}/edit`, sheetTitle);
    }, [fetchFromUrl]);
    const selectSheetTab = useCallback((sheetTitle: string) => {
        setActiveSheetTitle(sheetTitle);
        activeSheetTitleRef.current = sheetTitle;
        fetchFromUrl(urlRef.current, sheetTitle);
    }, [fetchFromUrl]);
    useEffect(() => {
        if (initialUrlRef.current) {
            fetchFromUrl(initialUrlRef.current);
        }
    }, [fetchFromUrl]);
    const loadFile = useCallback(async (file: File) => {
        setIsLoading(true);
        setActiveSourceId('local_file');
        try {
            const parsedRows = await ExcelParser.parseFile(file);
            const title = file.name.replace(/\.[^/.]+$/, '');
            spreadsheetIdRef.current = null;
            storeActiveSpreadsheetUrl('');
            setSheetTabs([{ title, sheetId: 0 }]);
            setAllSheetRows({ [title]: parsedRows });
            allSheetRowsRef.current = { [title]: parsedRows };
            setActiveSheetTitle(title);
            activeSheetTitleRef.current = title;
            const fileHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0].data) : [];
            setAllSheetHeaders({ [title]: fileHeaders });
            engine.setRows(parsedRows.map((r) => r.data));
            setRows(engine.getRows());
            setStats(engine.getStats());
            setStage('ready');
            setUrl(`Tệp: ${file.name}`);
            appendLog(`file-${Date.now()}`, 'success', `Đọc tệp thành công: ${file.name} (${parsedRows.length} hàng)`);
        }
        catch (error: unknown) {
            const message = getUserErrorMessage(error, 'Không thể đọc tệp. Vui lòng kiểm tra định dạng và thử lại.');
            appendLog(`err-${Date.now()}`, 'error', `Không thể đọc tệp. ${message}`);
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
    const updateHeaders = useCallback((sheetTitle: string, newHeaders: string[]) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(urlRef.current);
        setAllSheetHeaders((prev) => ({ ...prev, [targetTitle]: newHeaders }));
        if (spreadsheetId) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `Chưa đăng nhập Google. Tiêu đề cột đã cập nhật trên giao diện; hãy đăng nhập để đồng bộ lên Google Sheets.`);
                return;
            }
            GoogleSyncService.updateHeaders(spreadsheetId, targetTitle, newHeaders)
                .then(() => {
                appendLog(`sync-headers-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã cập nhật ${newHeaders.length} tiêu đề cột trên trang "${targetTitle}" Google Sheet.`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((error: unknown) => {
                appendLog(`sync-headers-err-${Date.now()}`, 'error', `Không thể cập nhật tiêu đề cột trên Google Sheet. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle, fetchFromUrl]);
    const createSpreadsheet = useCallback(async (title: string, sheetTitle: string = 'Sheet1', headers: string[] = []) => {
        const created = await GoogleSyncService.createSpreadsheet(title, sheetTitle, headers);
        urlRef.current = created.spreadsheetUrl;
        setUrl(created.spreadsheetUrl);
        await fetchFromUrl(created.spreadsheetUrl, sheetTitle);
        appendLog(`spreadsheet-${Date.now()}`, 'success', `Đã tạo file Google Sheets mới "${title}".`);
        return created;
    }, [fetchFromUrl, appendLog]);
    const createSheet = useCallback(async (sheetTitle: string, initialHeaders: string[] = []) => {
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(urlRef.current);
        const newTab: SheetTabInfo = { title: sheetTitle, sheetId: Date.now() };
        setSheetTabs((prev) => (prev.some((t) => t.title.toLowerCase() === sheetTitle.toLowerCase()) ? prev : [...prev, newTab]));
        setAllSheetHeaders((prev) => ({ ...prev, [sheetTitle]: initialHeaders }));
        setActiveSheetTitle(sheetTitle);
        activeSheetTitleRef.current = sheetTitle;
        engine.setRows([]);
        setRows([]);
        setAllSheetRows((previous) => {
            const next = { ...previous, [sheetTitle]: [] };
            allSheetRowsRef.current = next;
            return next;
        });
        if (spreadsheetId) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `Chưa đăng nhập Google. Trang "${sheetTitle}" đã tạo trên giao diện; hãy đăng nhập để đồng bộ lên Google Sheets.`);
                return;
            }
            try {
                await GoogleSyncService.addSheetTab(spreadsheetId, sheetTitle, initialHeaders);
                appendLog(`sync-sheet-add-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã tạo trang tính mới "${sheetTitle}" trên Google Sheet.`);
            } catch (error: unknown) {
                const message = getUserErrorMessage(error, 'Không thể tạo trang tính mới. Vui lòng thử lại.');
                appendLog(`sync-sheet-err-${Date.now()}`, 'error', `Không thể tạo trang mới trên Google Sheet. ${message}`);
                throw error;
            }
        }
    }, [url, engine, appendLog]);
    const deleteSheet = useCallback((sheetTitle: string) => {
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        setSheetTabs((prev) => prev.filter((t) => t.title.toLowerCase() !== sheetTitle.toLowerCase()));
        if (spreadsheetId) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `Chưa đăng nhập Google. Trang "${sheetTitle}" đã xóa trên giao diện; hãy đăng nhập để đồng bộ thay đổi lên Google Sheets.`);
                return;
            }
            GoogleSyncService.deleteSheetTab(spreadsheetId, sheetTitle)
                .then(() => {
                appendLog(`sync-sheet-del-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã xóa trang tính "${sheetTitle}" trên Google Sheet.`);
                void fetchFromUrl(url);
            })
                .catch((error: unknown) => {
                appendLog(`sync-sheet-err-${Date.now()}`, 'error', `Không thể xóa trang trên Google Sheet. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, fetchFromUrl]);
    const duplicateSheet = useCallback((sourceTitle: string, newTitle?: string) => {
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        const targetName = newTitle || `${sourceTitle}_Copy`;
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.duplicateSheetTab(spreadsheetId, sourceTitle, targetName)
                .then(() => {
                appendLog(`sync-dup-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã nhân bản trang "${sourceTitle}" thành "${targetName}".`);
                void fetchFromUrl(url, targetName);
            })
                .catch((error: unknown) => {
                appendLog(`sync-dup-err-${Date.now()}`, 'error', `Không thể nhân bản trang. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, fetchFromUrl]);
    const renameSheet = useCallback((oldTitle: string, newTitle: string) => {
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        setSheetTabs((prev) => prev.map((t) => (t.title.toLowerCase() === oldTitle.toLowerCase() ? { ...t, title: newTitle } : t)));
        if (activeSheetTitle.toLowerCase() === oldTitle.toLowerCase()) {
            setActiveSheetTitle(newTitle);
        }
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.renameSheetTab(spreadsheetId, oldTitle, newTitle)
                .then(() => {
                appendLog(`sync-ren-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã đổi tên trang "${oldTitle}" thành "${newTitle}".`);
                void fetchFromUrl(url, newTitle);
            })
                .catch((error: unknown) => {
                appendLog(`sync-ren-err-${Date.now()}`, 'error', `Không thể đổi tên trang. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle, fetchFromUrl]);
    const addColumn = useCallback((sheetTitle: string, columnName: string) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const currentHeaders = allSheetHeaders[targetTitle] || [];
        if (currentHeaders.includes(columnName))
            return;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        const newHeaders = [...currentHeaders, columnName];
        setAllSheetHeaders((prev) => ({ ...prev, [targetTitle]: newHeaders }));
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.addColumn(spreadsheetId, targetTitle, columnName, currentHeaders)
                .then(() => {
                appendLog(`sync-addcol-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã thêm cột "${columnName}" vào trang "${targetTitle}".`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((error: unknown) => {
                appendLog(`sync-col-err-${Date.now()}`, 'error', `Không thể thêm cột. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle, allSheetHeaders, fetchFromUrl]);
    const deleteColumn = useCallback((sheetTitle: string, colKey: string) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const currentHeaders = allSheetHeaders[targetTitle] || [];
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        const newHeaders = currentHeaders.filter((h) => h.toLowerCase() !== colKey.toLowerCase());
        setAllSheetHeaders((prev) => ({ ...prev, [targetTitle]: newHeaders }));
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.deleteColumn(spreadsheetId, targetTitle, colKey, currentHeaders)
                .then(() => {
                appendLog(`sync-delcol-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã xóa cột "${colKey}" khỏi trang "${targetTitle}".`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((error: unknown) => {
                appendLog(`sync-col-err-${Date.now()}`, 'error', `Không thể xóa cột. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle, allSheetHeaders, fetchFromUrl]);
    const freezeRowsCols = useCallback(async (sheetTitle: string, frozenRows: number = 1, frozenCols: number = 0) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(urlRef.current);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            try {
                await GoogleSyncService.freezeRowsCols(spreadsheetId, targetTitle, frozenRows, frozenCols);
                appendLog(`sync-frz-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã cố định ${frozenRows} hàng đầu và ${frozenCols} cột trên trang "${targetTitle}".`);
            } catch (error: unknown) {
                const message = getUserErrorMessage(error, 'Không thể cố định hàng/cột. Vui lòng thử lại.');
                appendLog(`sync-frz-err-${Date.now()}`, 'error', `Không thể cố định hàng/cột. ${message}`);
                throw error;
            }
        }
    }, [url, activeSheetTitle]);
    const sortRange = useCallback((sheetTitle: string, colKey: string, ascending: boolean = true) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const currentHeaders = allSheetHeaders[targetTitle] || [];
        const colIndex = currentHeaders.findIndex((h) => h.toLowerCase() === colKey.toLowerCase());
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (colIndex !== -1 && spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.sortRange(spreadsheetId, targetTitle, colIndex, ascending)
                .then(() => {
                appendLog(`sync-sort-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã sắp xếp trang "${targetTitle}" theo cột "${colKey}" (${ascending ? 'A-Z' : 'Z-A'}).`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((error: unknown) => {
                appendLog(`sync-sort-err-${Date.now()}`, 'error', `Không thể sắp xếp dữ liệu. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle, allSheetHeaders, fetchFromUrl]);
    const updateRange = useCallback((sheetTitle: string, rangeA1: string, values: unknown[][]) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.updateRangeValues(spreadsheetId, targetTitle, rangeA1, values)
                .then(() => {
                appendLog(`sync-range-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã cập nhật vùng ô "${rangeA1}" trên trang "${targetTitle}".`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((error: unknown) => {
                appendLog(`sync-range-err-${Date.now()}`, 'error', `Không thể cập nhật vùng ô. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle, fetchFromUrl]);
    const formatCells = useCallback(async (sheetTitle: string, rangeA1: string = '1:1', options: {
        backgroundColor?: string;
        fontColor?: string;
        bold?: boolean;
        italic?: boolean;
        fontSize?: number;
        fontFamily?: string;
        alignment?: 'LEFT' | 'CENTER' | 'RIGHT';
    } = {}): Promise<boolean | void> => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(urlRef.current);
        if (!spreadsheetId || !GoogleSyncService.getAccessToken()) return false;
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            try {
                const applied = await GoogleSyncService.formatCells(spreadsheetId, targetTitle, rangeA1, options);
                if (applied) {
                    appendLog(`sync-fmt-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã định dạng vùng ô "${rangeA1}" trên trang "${targetTitle}".`);
                } else {
                    appendLog(`sync-fmt-noop-${Date.now()}`, 'warn', `Chưa có thông tin định dạng cho vùng ô "${rangeA1}" trên trang "${targetTitle}".`);
                }
                return applied;
        } catch (error: unknown) {
                const message = getUserErrorMessage(error, 'Không thể định dạng ô. Vui lòng thử lại.');
                appendLog(`sync-fmt-err-${Date.now()}`, 'error', `Không thể định dạng ô. ${message}`);
                throw error;
            }
        }
        return false;
    }, [url, activeSheetTitle]);
    const addChart = useCallback((sheetTitle: string, chartType: 'COLUMN' | 'BAR' | 'LINE' | 'PIE' = 'COLUMN', title: string = 'Báo Cáo Thống Kê', domainColIndex: number = 0, seriesColIndex: number = 1, rowCount: number = 10, rowIndexOffset: number = 0) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.addChart(spreadsheetId, targetTitle, chartType, title, domainColIndex, seriesColIndex, rowCount, rowIndexOffset)
                .then(() => {
                appendLog(`sync-chart-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã tạo biểu đồ "${title}" trên trang "${targetTitle}".`);
            })
                .catch((error: unknown) => {
                appendLog(`sync-chart-err-${Date.now()}`, 'error', `Không thể tạo biểu đồ. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle]);
    const clearCharts = useCallback((sheetTitle?: string) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.clearCharts(spreadsheetId, targetTitle)
                .then(() => {
                appendLog(`sync-clearcharts-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã xóa toàn bộ biểu đồ trên trang "${targetTitle}".`);
            })
                .catch((error: unknown) => {
                appendLog(`sync-clearcharts-err-${Date.now()}`, 'error', `Không thể xóa biểu đồ. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle]);
    const updateRow = useCallback((rowId: string, updatedData: Record<string, unknown>, colKey?: string, newValue?: unknown) => {
        const updated = engine.updateRow(rowId, updatedData);
        setRows([...updated]);
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        const targetRow = updated.find((r) => r.id === rowId);
        if (spreadsheetId && colKey && targetRow) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `Chưa đăng nhập Google. Thay đổi đã lưu trên giao diện; hãy đăng nhập để đồng bộ lên Google Sheets.`);
                return;
            }
            const allHeaders = Object.keys(updatedData);
            GoogleSyncService.updateCell(spreadsheetId, activeSheetTitle, targetRow.rowNumber, colKey, allHeaders, newValue)
                .then(() => {
                appendLog(`sync-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã cập nhật ô "${colKey}" trên trang "${activeSheetTitle}".`);
            })
                .catch((error: unknown) => {
                appendLog(`sync-err-${Date.now()}`, 'error', `Không thể đồng bộ lên Google Sheet. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [engine, url, activeSheetTitle]);
    const batchUpdateRows = useCallback((updates: Array<{
        rowId: string;
        updatedData: Record<string, unknown>;
        colKey?: string;
        newValue?: unknown;
    }>) => {
        const updated = engine.batchUpdateRows(updates);
        setRows([...updated]);
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `Chưa đăng nhập Google. Đã cập nhật ${updates.length} ô trên giao diện; hãy đăng nhập để lưu thay đổi lên Google Sheets.`);
                return;
            }
            const syncRequests = updates.flatMap((u) => {
                const targetRow = updated.find((r) => r.id === u.rowId);
                if (targetRow && u.colKey) {
                    const allHeaders = Object.keys(u.updatedData);
                    return [GoogleSyncService.updateCell(spreadsheetId, activeSheetTitle, targetRow.rowNumber, u.colKey, allHeaders, u.newValue)];
                }
                return [];
            });
            void Promise.all(syncRequests)
                .then(() => {
                appendLog(`sync-batch-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã cập nhật ${syncRequests.length} ô trên Google Sheet.`);
            })
                .catch((error: unknown) => {
                appendLog(`sync-batch-error-${Date.now()}`, 'error', `Không thể cập nhật hàng loạt. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
                void fetchFromUrl(url, activeSheetTitle);
            });
        }
    }, [engine, url, activeSheetTitle, fetchFromUrl]);
    const batchDeleteRows = useCallback((rowIds: string[]) => {
        const targets = engine.getRows().filter((row) => rowIds.includes(row.id));
        const updated = engine.deleteRows(rowIds);
        setRows([...updated]);
        setStats(engine.getStats());
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && targets.length > 0) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `Chưa đăng nhập Google. Đã xóa ${targets.length} hàng trên giao diện; hãy đăng nhập để đồng bộ thay đổi lên Google Sheets.`);
                return;
            }
            GoogleSyncService.deleteRowsByTitle(spreadsheetId, activeSheetTitle, targets.map((row) => row.rowNumber))
                .then(() => {
                appendLog(`sync-delete-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã xóa ${targets.length} hàng trên Google Sheet (${activeSheetTitle}).`);
            })
                .catch((error: unknown) => {
                appendLog(`sync-delete-error-${Date.now()}`, 'error', `Không thể xóa hàng trên Google Sheet. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
                void fetchFromUrl(url, activeSheetTitle);
            });
        }
    }, [engine, url, activeSheetTitle, fetchFromUrl]);
    const deleteRow = useCallback((rowId: string) => {
        batchDeleteRows([rowId]);
    }, [batchDeleteRows]);
    const clearSheet = useCallback((sheetTitle?: string) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (targetTitle.toLowerCase() === activeSheetTitleRef.current.toLowerCase()) {
            engine.clearRows();
            setRows([]);
            setStats(engine.getStats());
        }
        if (spreadsheetId) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `Chưa đăng nhập Google. Dữ liệu đã xóa trên giao diện; hãy đăng nhập để đồng bộ thay đổi lên Google Sheets.`);
                return;
            }
            GoogleSyncService.clearSheet(spreadsheetId, targetTitle)
                .then(() => {
                appendLog(`sync-clear-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã xóa toàn bộ dữ liệu trên trang "${targetTitle}" Google Sheet.`);
            })
                .catch((error: unknown) => {
                appendLog(`sync-clear-err-${Date.now()}`, 'error', `Không thể xóa dữ liệu trên Google Sheet. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
                if (targetTitle.toLowerCase() === activeSheetTitleRef.current.toLowerCase()) {
                    void fetchFromUrl(url, activeSheetTitle);
                }
            });
        }
    }, [engine, url, activeSheetTitle, fetchFromUrl]);
    const addRow = useCallback(async (customData?: Record<string, unknown>, sheetTitle?: string) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const targetHeaders = allSheetHeaders[targetTitle] || Object.keys(customData || {});
        const rowData: Record<string, unknown> = Object.fromEntries(targetHeaders.map((header) => [
            header,
            Object.entries(customData || {}).find(([key]) => key.toLowerCase() === header.toLowerCase())?.[1] ?? '',
        ]));
        for (const [key, value] of Object.entries(customData || {})) {
            if (!Object.keys(rowData).some((header) => header.toLowerCase() === key.toLowerCase())) rowData[key] = value;
        }
        if (Object.keys(rowData).length === 0) {
            throw new Error('Không thể thêm hàng vì chưa có cấu trúc dữ liệu. Hãy tải dữ liệu hoặc tạo cột trước.');
        }
        let newRow: DataRow;
        if (targetTitle.toLowerCase() === activeSheetTitleRef.current.toLowerCase()) {
            const updated = engine.addRow(rowData);
            setRows([...updated]);
            setStats(engine.getStats());
            newRow = updated[updated.length - 1];
        } else {
            const existingRows = allSheetRowsRef.current[targetTitle] || [];
            newRow = {
                id: `row-new-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                rowNumber: existingRows.length + 1,
                data: rowData,
                status: 'pending',
            };
            const nextRows = [...existingRows, newRow];
            setAllSheetRows((previous) => {
                const next = { ...previous, [targetTitle]: nextRows };
                allSheetRowsRef.current = next;
                return next;
            });
        }
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(urlRef.current);
        if (spreadsheetId && newRow) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `Chưa đăng nhập Google. Hàng đã thêm trên giao diện; hãy đăng nhập để lưu thay đổi lên Google Sheets.`);
                return;
            }
            try {
                const allHeaders = Object.keys(newRow.data);
                await GoogleSyncService.appendRow(spreadsheetId, targetTitle, allHeaders, newRow.data);
                appendLog(`sync-add-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã thêm hàng "${newRow.data['NAME'] || newRow.data['ID']}" vào trang "${targetTitle}" Google Sheet.`);
            } catch (error: unknown) {
                const message = getUserErrorMessage(error, 'Không thể thêm hàng lên Google Sheet. Vui lòng thử lại.');
                appendLog(`sync-add-error-${Date.now()}`, 'error', `Không thể thêm hàng lên Google Sheet. ${message}`);
                throw error;
            }
        }
    }, [engine, url, activeSheetTitle, allSheetHeaders, appendLog]);
    const autoResizeColumns = useCallback(async (sheetTitle?: string, startCol: number = 0, endCol?: number) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            try {
                await GoogleSyncService.autoResizeColumns(spreadsheetId, targetTitle, startCol, endCol);
                appendLog(`sync-autoresize-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã tự động căn chỉnh độ rộng các cột trên trang "${targetTitle}".`);
            } catch (error: unknown) {
                const message = getUserErrorMessage(error, 'Không thể tự động căn chỉnh cột. Vui lòng thử lại.');
                appendLog(`sync-autoresize-err-${Date.now()}`, 'error', `Không thể tự động căn chỉnh cột. ${message}`);
                throw error;
            }
        }
    }, [url, activeSheetTitle]);
    const setColumnWidth = useCallback((sheetTitle?: string, pixelSize: number = 160, startCol: number = 0, endCol?: number) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.setColumnWidth(spreadsheetId, targetTitle, pixelSize, startCol, endCol)
                .then(() => {
                appendLog(`sync-colwidth-${Date.now()}`, 'success', `Đồng bộ hai chiều: Đã điều chỉnh độ rộng các cột trên trang "${targetTitle}".`);
            })
                .catch((error: unknown) => {
                appendLog(`sync-colwidth-err-${Date.now()}`, 'error', `Không thể điều chỉnh độ rộng cột. ${getUserErrorMessage(error, 'Vui lòng thử lại.')}`);
            });
        }
    }, [url, activeSheetTitle]);
    const start = useCallback(() => engine.start(), [engine]);
    const pause = useCallback(() => engine.pause(), [engine]);
    const resume = useCallback(() => engine.resume(), [engine]);
    const reset = useCallback(() => engine.reset(), [engine]);
    const clearLogs = useCallback(() => setLogs([]), []);
    const changeSpeed = useCallback((ms: number) => {
        setSpeed(ms);
        engine.setSpeed(ms);
    }, [engine]);
    return {
        url,
        setUrl,
        activeSourceId,
        setActiveSourceId,
        stage,
        rows,
        logs,
        stats,
        speed,
        isLoading,
        sheetTabs,
        allSheetHeaders,
        allSheetRows,
        activeSheetTitle,
        selectSheetTab,
        loadFile,
        fetchFromUrl,
        fetchFromSpreadsheetId,
        updateHeaders,
        addColumn,
        deleteColumn,
        freezeRowsCols,
        sortRange,
        updateRange,
        formatCells,
        autoResizeColumns,
        setColumnWidth,
        addChart,
        clearCharts,
        createSheet,
        createSpreadsheet,
        deleteSheet,
        duplicateSheet,
        renameSheet,
        updateRow,
        batchUpdateRows,
        batchDeleteRows,
        deleteRow,
        clearSheet,
        addRow,
        start,
        pause,
        resume,
        reset,
        clearLogs,
        changeSpeed,
    };
}
