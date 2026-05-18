import * as XLSX from 'xlsx';
import { CHANNELS, PRODUCT_LIST } from './constants';
import type { ReportRow } from './types';

export function downloadExcel(rows: ReportRow[], reportDate: string, compDateLabel: string, todayDateLabel: string) {
  const wb = XLSX.utils.book_new();

  const headerRow1 = [
    `dr 결과보고 ${reportDate}`,
    ...Array(2 + CHANNELS.length * 2 + 3 - 1).fill(''),
  ];

  const headerRow2 = [
    '등급', '제품', '합계',
    ...CHANNELS.flatMap((ch) => [ch, '']),
    compDateLabel, todayDateLabel, '기호',
  ];

  const headerRow3 = [
    '', '', '',
    ...CHANNELS.flatMap(() => ['수량', '금액']),
    '', '', '',
  ];

  const dataRows = rows.map((row) => [
    row.grade ?? '',
    row.name,
    calcTotal(row),
    ...CHANNELS.flatMap((ch) => [row.channels[ch].qty, row.channels[ch].amount]),
    row.prevQty || '',
    row.todayQty || '',
    row.changeSymbol,
  ]);

  const wsData = [headerRow1, headerRow2, headerRow3, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merge grade cells for consecutive same-grade rows
  const merges: XLSX.Range[] = [];
  const gradeGroups: Record<string, { start: number; end: number }> = {};
  rows.forEach((row, idx) => {
    const r = idx + 3; // 0-indexed, data starts at row 3 (after 3 header rows)
    const g = row.grade;
    if (!g) return;
    if (!gradeGroups[g]) gradeGroups[g] = { start: r, end: r };
    else gradeGroups[g].end = r;
  });
  for (const g of Object.values(gradeGroups)) {
    if (g.start < g.end) {
      merges.push({ s: { r: g.start, c: 0 }, e: { r: g.end, c: 0 } });
    }
  }
  ws['!merges'] = merges;

  // Column widths
  ws['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 12 },
    ...CHANNELS.flatMap(() => [{ wch: 7 }, { wch: 12 }]),
    { wch: 10 }, { wch: 10 }, { wch: 6 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `dr 결과보고 ${reportDate}`);
  XLSX.writeFile(wb, `dr_결과보고_${reportDate}.xlsx`);
}

function calcTotal(row: ReportRow): number {
  return CHANNELS.reduce((sum, ch) => {
    const v = parseInt((row.channels[ch].amount || '').replace(/,/g, ''), 10);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
}
