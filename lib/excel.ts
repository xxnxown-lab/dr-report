import * as XLSX from 'xlsx';
import type { ReportRow } from './types';

export function downloadExcel(
  rows: ReportRow[],
  reportDate: string,
  prevLabel: string,
  todayLabel: string,
  brandLabel: string
) {
  const wb = XLSX.utils.book_new();

  const headerRow1 = [`${brandLabel} 결과보고 ${reportDate}`, '', '', '', ''];
  const headerRow2 = ['등급', '제품', prevLabel, todayLabel, '기호'];

  const dataRows = rows.map((row) => {
    const isBrandRow = row.isSpecial && row.name !== '합계';
    return [
      row.grade ?? '',
      row.name,
      isBrandRow ? '' : row.prevQty,
      isBrandRow ? '' : row.todayQty,
      isBrandRow ? '' : row.changeSymbol,
    ];
  });

  const wsData = [headerRow1, headerRow2, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  const gradeGroups: Record<string, { start: number; end: number }> = {};
  rows.forEach((row, idx) => {
    const r = idx + 2;
    const g = row.grade;
    if (!g) return;
    if (!gradeGroups[g]) gradeGroups[g] = { start: r, end: r };
    else gradeGroups[g].end = r;
  });
  for (const g of Object.values(gradeGroups)) {
    if (g.start < g.end) merges.push({ s: { r: g.start, c: 0 }, e: { r: g.end, c: 0 } });
  }
  ws['!merges'] = merges;

  ws['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 6 }];

  const filePrefix = brandLabel === '닥터아돌' ? 'dr' : 'hh';
  XLSX.utils.book_append_sheet(wb, ws, `${brandLabel} 결과보고 ${reportDate}`);
  XLSX.writeFile(wb, `${filePrefix}_결과보고_${reportDate}.xlsx`);
}
