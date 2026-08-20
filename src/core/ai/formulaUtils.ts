/**
 * AutoFlow — Formula Utilities
 * Handles spreadsheet formula adjustment, column letter conversion,
 * and formula auto-fill matrix generation with relative reference resolution.
 */

/**
 * Convert a 0-indexed column index to spreadsheet column letters (0 -> A, 25 -> Z, 26 -> AA)
 */
export function columnIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Convert spreadsheet column letters to 0-indexed column index (A -> 0, Z -> 25, AA -> 26)
 */
export function letterToColumnIndex(letters: string): number {
  let index = 0;
  const upper = letters.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Adjust relative cell references in a formula by a given row offset.
 * Preserves absolute references prefixed by `$` (e.g., `$C$2` or `C$2`).
 * Relative references like `C2`, `$C2` will have their row number incremented by `rowOffset`.
 *
 * @param formula e.g. "=C2*D2" or "=SUM(A2:B2) + $E$1"
 * @param rowOffset number of rows to shift (0 = unchanged, 1 = shift by 1 row down, etc.)
 */
export function adjustFormulaRow(formula: string, rowOffset: number): string {
  if (rowOffset === 0) return formula;

  // Regex matches cell references:
  // Group 1: optional $ and 1-3 column letters (e.g. "$C", "C", "AA")
  // Group 2: optional $ on the row part
  // Group 3: row number digits
  return formula.replace(
    /(\$?[A-Za-z]{1,3})(\$?)(\d+)/g,
    (match, colPart, rowDollar, rowDigits) => {
      // If row has absolute '$' anchor (e.g. C$2 or $C$2), do not shift row
      if (rowDollar === '$') {
        return match;
      }
      const baseRow = parseInt(rowDigits, 10);
      const newRow = baseRow + rowOffset;
      return `${colPart}${newRow}`;
    }
  );
}

export interface TargetCellInfo {
  colIndex: number;
  colLetter: string;
  startRow: number;
  colName?: string;
  isCellCoordinate: boolean;
}

/**
 * Resolves a `colKey` which could be an A1 cell reference (e.g., "E2", "B10")
 * or a column name (e.g., "total", "PRICE", "Amount") into structured cell coordinates.
 */
export function resolveTargetCell(colKey: string, headers: string[]): TargetCellInfo {
  const trimmed = colKey.trim();

  // Check if colKey is an A1 cell reference like "E2", "AB15", "C"
  const cellMatch = trimmed.match(/^([A-Za-z]{1,3})(\d+)$/);
  if (cellMatch) {
    const colLetter = cellMatch[1].toUpperCase();
    const startRow = parseInt(cellMatch[2], 10);
    const colIndex = letterToColumnIndex(colLetter);
    const matchedHeader = headers[colIndex];
    return {
      colIndex,
      colLetter,
      startRow,
      colName: matchedHeader,
      isCellCoordinate: true,
    };
  }

  // Check if colKey is just column letters like "E" or "AB"
  const colOnlyMatch = trimmed.match(/^([A-Za-z]{1,3})$/);
  if (colOnlyMatch && !headers.some((h) => h.toLowerCase() === trimmed.toLowerCase())) {
    const colLetter = colOnlyMatch[1].toUpperCase();
    const colIndex = letterToColumnIndex(colLetter);
    return {
      colIndex,
      colLetter,
      startRow: 2, // default first data row in spreadsheet
      isCellCoordinate: false,
    };
  }

  // Otherwise treat as column name in headers
  const colIndex = headers.findIndex((h) => h.toLowerCase() === trimmed.toLowerCase());
  if (colIndex >= 0) {
    const colLetter = columnIndexToLetter(colIndex);
    return {
      colIndex,
      colLetter,
      startRow: 2, // Header is row 1, first data row is row 2
      colName: headers[colIndex],
      isCellCoordinate: false,
    };
  }

  // Fallback: column A, row 2
  return {
    colIndex: 0,
    colLetter: 'A',
    startRow: 2,
    isCellCoordinate: false,
  };
}

export interface FormulaAutoFillResult {
  rangeA1: string;
  values: string[][];
  startRow: number;
  endRow: number;
  rowCount: number;
  formulas: string[];
}

/**
 * Generate the 2D value matrix for formula auto-fill across rows.
 *
 * @param formula Base formula (e.g. "=C2*D2")
 * @param startRow Starting row number (1-indexed, typically 2)
 * @param endRow Ending row number (1-indexed, e.g. 10)
 * @param colLetter Column letter (e.g. "E")
 * @param fillDown Whether to fill down to endRow or just apply to startRow
 */
export function generateFormulaRange(
  formula: string,
  startRow: number,
  endRow: number,
  colLetter: string,
  fillDown: boolean = false
): FormulaAutoFillResult {
  const effectiveEndRow = fillDown ? Math.max(startRow, endRow) : startRow;
  const values: string[][] = [];
  const formulas: string[] = [];

  for (let r = startRow; r <= effectiveEndRow; r++) {
    const rowOffset = r - startRow;
    const adjusted = adjustFormulaRow(formula, rowOffset);
    values.push([adjusted]);
    formulas.push(adjusted);
  }

  const rangeA1 =
    effectiveEndRow === startRow
      ? `${colLetter}${startRow}`
      : `${colLetter}${startRow}:${colLetter}${effectiveEndRow}`;

  return {
    rangeA1,
    values,
    startRow,
    endRow: effectiveEndRow,
    rowCount: values.length,
    formulas,
  };
}
