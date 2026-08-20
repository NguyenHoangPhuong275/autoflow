export function columnIndexToLetter(columnIndex: number): string {
  let index = columnIndex;
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

export function letterToColumnIndex(letters: string): number {
  let index = 0;
  for (const letter of letters.toUpperCase()) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index - 1;
}

export function adjustFormulaRow(formula: string, rowOffset: number): string {
  if (rowOffset === 0) {
    return formula;
  }

  return formula.replace(
    /(\$?[A-Za-z]{1,3})(\$?)(\d+)/g,
    (match, columnPart: string, rowAnchor: string, rowDigits: string) => {
      if (rowAnchor === '$') {
        return match;
      }
      return `${columnPart}${Number.parseInt(rowDigits, 10) + rowOffset}`;
    },
  );
}

export interface TargetCellInfo {
  colIndex: number;
  colLetter: string;
  startRow: number;
  colName?: string;
  isCellCoordinate: boolean;
}

export function resolveTargetCell(columnKey: string, headers: string[]): TargetCellInfo {
  const normalizedKey = columnKey.trim();
  const cellMatch = normalizedKey.match(/^([A-Za-z]{1,3})(\d+)$/);
  if (cellMatch) {
    const colLetter = cellMatch[1].toUpperCase();
    const colIndex = letterToColumnIndex(colLetter);
    return {
      colIndex,
      colLetter,
      startRow: Number.parseInt(cellMatch[2], 10),
      colName: headers[colIndex],
      isCellCoordinate: true,
    };
  }

  const columnMatch = normalizedKey.match(/^([A-Za-z]{1,3})$/);
  const matchesHeader = headers.some((header) => header.toLowerCase() === normalizedKey.toLowerCase());
  if (columnMatch && !matchesHeader) {
    const colLetter = columnMatch[1].toUpperCase();
    return {
      colIndex: letterToColumnIndex(colLetter),
      colLetter,
      startRow: 2,
      isCellCoordinate: false,
    };
  }

  const colIndex = headers.findIndex((header) => header.toLowerCase() === normalizedKey.toLowerCase());
  if (colIndex >= 0) {
    return {
      colIndex,
      colLetter: columnIndexToLetter(colIndex),
      startRow: 2,
      colName: headers[colIndex],
      isCellCoordinate: false,
    };
  }

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

export function generateFormulaRange(
  formula: string,
  startRow: number,
  endRow: number,
  columnLetter: string,
  fillDown = false,
): FormulaAutoFillResult {
  const effectiveEndRow = fillDown ? Math.max(startRow, endRow) : startRow;
  const formulas = Array.from(
    { length: effectiveEndRow - startRow + 1 },
    (_, index) => adjustFormulaRow(formula, index),
  );
  const rangeA1 = effectiveEndRow === startRow
    ? `${columnLetter}${startRow}`
    : `${columnLetter}${startRow}:${columnLetter}${effectiveEndRow}`;

  return {
    rangeA1,
    values: formulas.map((value) => [value]),
    startRow,
    endRow: effectiveEndRow,
    rowCount: formulas.length,
    formulas,
  };
}
