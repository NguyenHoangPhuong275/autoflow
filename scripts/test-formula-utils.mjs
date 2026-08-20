import {
  adjustFormulaRow,
  columnIndexToLetter,
  letterToColumnIndex,
  resolveTargetCell,
  generateFormulaRange,
} from '../src/core/ai/formulaUtils.ts';

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

console.log('\n── Formula Utils Unit Tests ──');

// 1. Column letters <-> index conversion
assert('0 -> A', columnIndexToLetter(0) === 'A');
assert('25 -> Z', columnIndexToLetter(25) === 'Z');
assert('26 -> AA', columnIndexToLetter(26) === 'AA');
assert('27 -> AB', columnIndexToLetter(27) === 'AB');
assert('A -> 0', letterToColumnIndex('A') === 0);
assert('Z -> 25', letterToColumnIndex('Z') === 25);
assert('AA -> 26', letterToColumnIndex('AA') === 26);
assert('AB -> 27', letterToColumnIndex('AB') === 27);

// 2. Relative formula row shifting
assert(
  'adjustFormulaRow: =C2*D2 offset 0 => =C2*D2',
  adjustFormulaRow('=C2*D2', 0) === '=C2*D2'
);
assert(
  'adjustFormulaRow: =C2*D2 offset 1 => =C3*D3',
  adjustFormulaRow('=C2*D2', 1) === '=C3*D3'
);
assert(
  'adjustFormulaRow: =C2*D2 offset 5 => =C7*D7',
  adjustFormulaRow('=C2*D2', 5) === '=C7*D7'
);
assert(
  'adjustFormulaRow: =SUM(A2:B2) offset 2 => =SUM(A4:B4)',
  adjustFormulaRow('=SUM(A2:B2)', 2) === '=SUM(A4:B4)'
);
assert(
  'adjustFormulaRow: =$C$2*D2 offset 1 => =$C$2*D3 (absolute preserved)',
  adjustFormulaRow('=$C$2*D2', 1) === '=$C$2*D3'
);
assert(
  'adjustFormulaRow: =C$2*D2 offset 2 => =C$2*D4 (row dollar preserved)',
  adjustFormulaRow('=C$2*D2', 2) === '=C$2*D4'
);
assert(
  'adjustFormulaRow: =$C2*D2 offset 3 => =$C5*D5 (col dollar preserved, row shifted)',
  adjustFormulaRow('=$C2*D2', 3) === '=$C5*D5'
);
assert(
  'adjustFormulaRow: =AA2+AB2 offset 1 => =AA3+AB3',
  adjustFormulaRow('=AA2+AB2', 1) === '=AA3+AB3'
);

// 3. Target cell resolution
const headers = ['id', 'name', 'price', 'quantity', 'total'];
const res1 = resolveTargetCell('total', headers);
assert('resolve "total" column', res1.colIndex === 4 && res1.colLetter === 'E' && res1.startRow === 2);

const res2 = resolveTargetCell('E2', headers);
assert('resolve "E2" cell', res2.colIndex === 4 && res2.colLetter === 'E' && res2.startRow === 2 && res2.isCellCoordinate);

const res3 = resolveTargetCell('B10', headers);
assert('resolve "B10" cell', res3.colIndex === 1 && res3.colLetter === 'B' && res3.startRow === 10);

// 4. Formula range generation
const single = generateFormulaRange('=C2*D2', 2, 10, 'E', false);
assert('Single cell: range is E2', single.rangeA1 === 'E2');
assert('Single cell: 1 value', single.values.length === 1 && single.values[0][0] === '=C2*D2');

const fill = generateFormulaRange('=C2*D2', 2, 5, 'E', true);
assert('Fill down: range is E2:E5', fill.rangeA1 === 'E2:E5');
assert('Fill down: 4 rows', fill.rowCount === 4);
assert('Fill down: row 2 => =C2*D2', fill.values[0][0] === '=C2*D2');
assert('Fill down: row 3 => =C3*D3', fill.values[1][0] === '=C3*D3');
assert('Fill down: row 4 => =C4*D4', fill.values[2][0] === '=C4*D4');
assert('Fill down: row 5 => =C5*D5', fill.values[3][0] === '=C5*D5');

console.log(`\nFormula Unit Test Summary: ${passed} passed, ${failed} failed.\n`);
process.exit(failed > 0 ? 1 : 0);
