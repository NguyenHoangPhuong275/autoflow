import { useState, useEffect, useRef, useCallback } from 'react';
import { DataRow, LogEntry, ExecutionStats, PipelineStage, DataSourceId } from '@/types';
import { AutomationEngine } from '@/core/engine/automationEngine';
import { ExcelParser } from '@/core/parsers/excelParser';
import { GoogleSheetReader } from '@/core/parsers/googleSheetReader';
import { GoogleSyncService, SheetTabInfo } from '@/core/services/googleSyncService';
import { getErrorMessage } from '@/core/utils/errors';
import type { SheetDataIndex } from '@/core/ai/agentTypes';

const ACTIVE_SPREADSHEET_URL_KEY = 'autoflow_active_spreadsheet_url';

function readActiveSpreadsheetUrl(): string {
    if (typeof window === 'undefined') return '';
    try {
        return sessionStorage.getItem(ACTIVE_SPREADSHEET_URL_KEY) || '';
    } catch (error: unknown) {
        console.warn(`Không thể khôi phục workbook đang hoạt động: ${getErrorMessage(error)}`);
        return '';
    }
}

function storeActiveSpreadsheetUrl(url: string): void {
    if (typeof window === 'undefined') return;
    try {
        if (url) sessionStorage.setItem(ACTIVE_SPREADSHEET_URL_KEY, url);
        else sessionStorage.removeItem(ACTIVE_SPREADSHEET_URL_KEY);
    } catch (error: unknown) {
        console.warn(`Không thể lưu workbook đang hoạt động: ${getErrorMessage(error)}`);
    }
}

export function useAutomation() {
    const engineRef = useRef<AutomationEngine>(new AutomationEngine());
    const engine = engineRef.current;
    const initialUrlRef = useRef(readActiveSpreadsheetUrl());
    const [url, setUrl] = useState<string>(initialUrlRef.current);
    const urlRef = useRef(initialUrlRef.current);
    const spreadsheetIdRef = useRef<string | null>(GoogleSheetReader.extractSpreadsheetId(initialUrlRef.current));
    const [activeSourceId, setActiveSourceId] = useState<DataSourceId>('google_sheets');
    const [stage, setStage] = useState<PipelineStage>('ready');
    const [rows, setRows] = useState<DataRow[]>([]);
    const [allSheetRows, setAllSheetRows] = useState<SheetDataIndex>({});
    const allSheetRowsRef = useRef<SheetDataIndex>({});
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState<ExecutionStats>(engine.getStats());
    const [speed, setSpeed] = useState<number>(600);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [sheetTabs, setSheetTabs] = useState<SheetTabInfo[]>([]);
    const [allSheetHeaders, setAllSheetHeaders] = useState<Record<string, string[]>>({});
    const [activeSheetTitle, setActiveSheetTitle] = useState<string>('Sheet1');
    const activeSheetTitleRef = useRef('Sheet1');
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
                    catch (e) {
                        console.warn('GoogleSync API failed, falling back to public reader:', e);
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
            const message = getErrorMessage(error, 'Không thể đọc Google Sheet.');
            console.error(message);
            appendLog(`err-${Date.now()}`, 'error', `Lỗi đọc Google Sheet: ${message}`);
            setStage('ready');
        }
        finally {
            setIsLoading(false);
        }
    }, [engine]);
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
            const message = getErrorMessage(error, 'Không thể đọc tệp.');
            console.error(message);
            appendLog(`err-${Date.now()}`, 'error', `Lỗi đọc tệp: ${message}`);
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
                appendLog(`warn-auth-${Date.now()}`, 'warn', `⚠️ Chưa Đăng nhập Google: Đã cập nhật tiêu đề cột trên giao diện. Vui lòng bấm "Đăng nhập Google" ở góc trên để lưu lên Google Sheet thật!`);
                return;
            }
            GoogleSyncService.updateHeaders(spreadsheetId, targetTitle, newHeaders)
                .then(() => {
                appendLog(`sync-headers-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã cập nhật ${newHeaders.length} tiêu đề cột trên trang "${targetTitle}" Google Sheet thật.`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((err) => {
                appendLog(`sync-headers-err-${Date.now()}`, 'error', `Lỗi cập nhật tiêu đề cột trên Google Sheet: ${err.message}`);
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
    const createSheet = useCallback(async (sheetTitle: string, initialHeaders: string[] = ['id', 'name']) => {
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
                appendLog(`warn-auth-${Date.now()}`, 'warn', `⚠️ Chưa Đăng nhập Google: Đã tạo trang "${sheetTitle}" trên giao diện. Hãy bấm "Đăng nhập Google" để tạo trên Google Sheet thật!`);
                return;
            }
            try {
                const sheetId = await GoogleSyncService.addSheetTab(spreadsheetId, sheetTitle, initialHeaders);
                appendLog(`sync-sheet-add-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã tạo thành công trang tính mới "${sheetTitle}" trên Google Sheet thật (ID: ${sheetId}).`);
            } catch (error: unknown) {
                const message = getErrorMessage(error, 'Không thể tạo trang tính mới.');
                appendLog(`sync-sheet-err-${Date.now()}`, 'error', `Lỗi tạo trang mới trên Google Sheet: ${message}`);
                throw error;
            }
        }
    }, [url, engine, appendLog]);
    const deleteSheet = useCallback((sheetTitle: string) => {
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        setSheetTabs((prev) => prev.filter((t) => t.title.toLowerCase() !== sheetTitle.toLowerCase()));
        if (spreadsheetId) {
            if (!GoogleSyncService.getAccessToken()) {
                appendLog(`warn-auth-${Date.now()}`, 'warn', `⚠️ Chưa Đăng nhập Google: Đã xóa tab "${sheetTitle}" trên giao diện. Vui lòng bấm "Đăng nhập Google" để xóa trên Google Sheet thật!`);
                return;
            }
            GoogleSyncService.deleteSheetTab(spreadsheetId, sheetTitle)
                .then(() => {
                appendLog(`sync-sheet-del-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã xóa hoàn toàn trang tính "${sheetTitle}" trên Google Sheet thật.`);
                void fetchFromUrl(url);
            })
                .catch((err) => {
                appendLog(`sync-sheet-err-${Date.now()}`, 'error', `Lỗi xóa trang trên Google Sheet: ${err.message}`);
            });
        }
    }, [url, fetchFromUrl]);
    const duplicateSheet = useCallback((sourceTitle: string, newTitle?: string) => {
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        const targetName = newTitle || `${sourceTitle}_Copy`;
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.duplicateSheetTab(spreadsheetId, sourceTitle, targetName)
                .then(() => {
                appendLog(`sync-dup-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã nhân bản trang "${sourceTitle}" thành "${targetName}".`);
                void fetchFromUrl(url, targetName);
            })
                .catch((err) => {
                appendLog(`sync-dup-err-${Date.now()}`, 'error', `Lỗi nhân bản trang: ${err.message}`);
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
                appendLog(`sync-ren-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã đổi tên trang "${oldTitle}" thành "${newTitle}".`);
                void fetchFromUrl(url, newTitle);
            })
                .catch((err) => {
                appendLog(`sync-ren-err-${Date.now()}`, 'error', `Lỗi đổi tên trang: ${err.message}`);
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
                appendLog(`sync-addcol-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã thêm cột "${columnName}" vào trang "${targetTitle}".`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((err) => {
                appendLog(`sync-col-err-${Date.now()}`, 'error', `Lỗi thêm cột: ${err.message}`);
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
                appendLog(`sync-delcol-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã xóa cột "${colKey}" khỏi trang "${targetTitle}".`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((err) => {
                appendLog(`sync-col-err-${Date.now()}`, 'error', `Lỗi xóa cột: ${err.message}`);
            });
        }
    }, [url, activeSheetTitle, allSheetHeaders, fetchFromUrl]);
    const freezeRowsCols = useCallback(async (sheetTitle: string, frozenRows: number = 1, frozenCols: number = 0) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            try {
                await GoogleSyncService.freezeRowsCols(spreadsheetId, targetTitle, frozenRows, frozenCols);
                appendLog(`sync-frz-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã cố định ${frozenRows} hàng đầu và ${frozenCols} cột trên trang "${targetTitle}".`);
            } catch (error: unknown) {
                const message = getErrorMessage(error, 'Không thể cố định hàng/cột.');
                appendLog(`sync-frz-err-${Date.now()}`, 'error', `Lỗi cố định hàng/cột: ${message}`);
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
                appendLog(`sync-sort-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã sắp xếp trang "${targetTitle}" theo cột "${colKey}" (${ascending ? 'A-Z' : 'Z-A'}).`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((err) => {
                appendLog(`sync-sort-err-${Date.now()}`, 'error', `Lỗi sắp xếp: ${err.message}`);
            });
        }
    }, [url, activeSheetTitle, allSheetHeaders, fetchFromUrl]);
    const updateRange = useCallback((sheetTitle: string, rangeA1: string, values: unknown[][]) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.updateRangeValues(spreadsheetId, targetTitle, rangeA1, values)
                .then(() => {
                appendLog(`sync-range-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã cập nhật dải ô "${rangeA1}" trên trang "${targetTitle}".`);
                void fetchFromUrl(url, targetTitle);
            })
                .catch((err) => {
                appendLog(`sync-range-err-${Date.now()}`, 'error', `Lỗi cập nhật dải ô: ${err.message}`);
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
    } = {}) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            try {
                const applied = await GoogleSyncService.formatCells(spreadsheetId, targetTitle, rangeA1, options);
                if (applied) {
                    appendLog(`sync-fmt-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã định dạng màu sắc/font dải ô "${rangeA1}" trên trang "${targetTitle}".`);
                } else {
                    appendLog(`sync-fmt-noop-${Date.now()}`, 'warn', `Không có thuộc tính định dạng nào được chỉ định cho dải ô "${rangeA1}" trên trang "${targetTitle}". Hãy chỉ định backgroundColor, fontColor, bold, fontSize, v.v.`);
                }
            } catch (error: unknown) {
                const message = getErrorMessage(error, 'Không thể định dạng ô.');
                appendLog(`sync-fmt-err-${Date.now()}`, 'error', `Lỗi định dạng ô: ${message}`);
                throw error;
            }
        }
    }, [url, activeSheetTitle]);
    const addChart = useCallback((sheetTitle: string, chartType: 'COLUMN' | 'BAR' | 'LINE' | 'PIE' = 'COLUMN', title: string = 'Báo Cáo Thống Kê', domainColIndex: number = 0, seriesColIndex: number = 1, rowCount: number = 10, rowIndexOffset: number = 0) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.addChart(spreadsheetId, targetTitle, chartType, title, domainColIndex, seriesColIndex, rowCount, rowIndexOffset)
                .then(() => {
                appendLog(`sync-chart-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã tạo biểu đồ "${title}" (${chartType}) trên trang "${targetTitle}".`);
            })
                .catch((err) => {
                appendLog(`sync-chart-err-${Date.now()}`, 'error', `Lỗi tạo biểu đồ: ${err.message}`);
            });
        }
    }, [url, activeSheetTitle]);
    const clearCharts = useCallback((sheetTitle?: string) => {
        const targetTitle = sheetTitle || activeSheetTitle;
        const spreadsheetId = GoogleSheetReader.extractSpreadsheetId(url);
        if (spreadsheetId && GoogleSyncService.getAccessToken()) {
            GoogleSyncService.clearCharts(spreadsheetId, targetTitle)
                .then(() => {
                appendLog(`sync-clearcharts-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã xóa toàn bộ biểu đồ trên trang "${targetTitle}".`);
            })
                .catch((err) => {
                appendLog(`sync-clearcharts-err-${Date.now()}`, 'error', `Lỗi xóa biểu đồ: ${err.message}`);
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
                appendLog(`warn-auth-${Date.now()}`, 'warn', `⚠️ Chưa Đăng nhập Google: Đã cập nhật trên giao diện. Bấm "Đăng nhập Google" ở góc trên để đồng bộ trực tiếp lên Google Sheet thật!`);
                return;
            }
            const allHeaders = Object.keys(updatedData);
            GoogleSyncService.updateCell(spreadsheetId, activeSheetTitle, targetRow.rowNumber, colKey, allHeaders, newValue)
                .then(() => {
                appendLog(`sync-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã cập nhật ô "${colKey}" = "${newValue}" trên trang "${activeSheetTitle}".`);
            })
                .catch((err) => {
                appendLog(`sync-err-${Date.now()}`, 'error', `Lỗi đồng bộ lên Google Sheet: ${err.message}`);
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
                appendLog(`warn-auth-${Date.now()}`, 'warn', `⚠️ Chưa Đăng nhập Google: Đã sửa ${updates.length} ô trên giao diện. Hãy bấm "Đăng nhập Google" ở thanh trên cùng để lưu lên Google Sheet thật!`);
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
                appendLog(`sync-batch-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã cập nhật ${syncRequests.length} ô lên Google Sheet thật.`);
            })
                .catch((err) => {
                appendLog(`sync-batch-error-${Date.now()}`, 'error', `Lỗi cập nhật hàng loạt: ${err.message}`);
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
                appendLog(`warn-auth-${Date.now()}`, 'warn', `⚠️ Chưa Đăng nhập Google: Đã xóa ${targets.length} dòng trên giao diện. Vui lòng bấm nút "Đăng nhập Google" ở góc trên bên phải để xóa trực tiếp trên Google Sheet thật!`);
                return;
            }
            GoogleSyncService.deleteRowsByTitle(spreadsheetId, activeSheetTitle, targets.map((row) => row.rowNumber))
                .then(() => {
                appendLog(`sync-delete-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã xóa ${targets.length} hàng trên Google Sheet thật (${activeSheetTitle}).`);
            })
                .catch((err) => {
                appendLog(`sync-delete-error-${Date.now()}`, 'error', `Lỗi xóa hàng trên Google Sheet: ${err.message}`);
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
                appendLog(`warn-auth-${Date.now()}`, 'warn', `⚠️ Chưa Đăng nhập Google: Đã xóa dữ liệu trên giao diện. Vui lòng bấm nút "Đăng nhập Google" ở góc trên để xóa sạch dữ liệu trên Google Sheet thật!`);
                return;
            }
            GoogleSyncService.clearSheet(spreadsheetId, targetTitle)
                .then(() => {
                appendLog(`sync-clear-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã xóa toàn bộ dữ liệu trên trang "${targetTitle}" Google Sheet.`);
            })
                .catch((err) => {
                appendLog(`sync-clear-err-${Date.now()}`, 'error', `Lỗi xóa dữ liệu trên Google Sheet: ${err.message}`);
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
                appendLog(`warn-auth-${Date.now()}`, 'warn', `⚠️ Chưa Đăng nhập Google: Đã thêm hàng trên giao diện. Vui lòng bấm nút "Đăng nhập Google" ở góc trên để ghi trực tiếp vào Google Sheet thật!`);
                return;
            }
            try {
                const allHeaders = Object.keys(newRow.data);
                await GoogleSyncService.appendRow(spreadsheetId, targetTitle, allHeaders, newRow.data);
                appendLog(`sync-add-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã thêm hàng "${newRow.data['NAME'] || newRow.data['ID']}" vào trang "${targetTitle}" Google Sheet thật.`);
            } catch (error: unknown) {
                const message = getErrorMessage(error, 'Không thể thêm hàng lên Google Sheet.');
                appendLog(`sync-add-error-${Date.now()}`, 'error', `Lỗi thêm hàng lên Google Sheet: ${message}`);
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
                appendLog(`sync-autoresize-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã tự động căn chỉnh (Auto-fit) độ rộng các cột trên trang "${targetTitle}".`);
            } catch (error: unknown) {
                const message = getErrorMessage(error, 'Không thể tự động căn chỉnh cột.');
                appendLog(`sync-autoresize-err-${Date.now()}`, 'error', `Lỗi tự động căn chỉnh cột: ${message}`);
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
                appendLog(`sync-colwidth-${Date.now()}`, 'success', `[Đồng Bộ 2 Chiều] Đã mở rộng độ rộng các cột thành ${pixelSize}px trên trang "${targetTitle}".`);
            })
                .catch((err) => {
                appendLog(`sync-colwidth-err-${Date.now()}`, 'error', `Lỗi đặt độ rộng cột: ${err.message}`);
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
