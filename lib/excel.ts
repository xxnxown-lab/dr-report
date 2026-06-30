import * as XLSX from 'xlsx';
import type { ReportRow } from './types';

export function downloadExcel(
  rows: ReportRow[],
  reportDate: string,
  prevLabel: string,
  todayLabel: string,
  brandLabel: string,
  grandTotalPrev?: number | null,
  grandTotalToday?: number | null,
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

  const footerRows: (string | number)[][] = [];
  if (grandTotalPrev != null && grandTotalToday != null) {
    footerRows.push(['', '', '', '', '']);
    footerRows.push([
      `${brandLabel} 전체 판매량 | ${prevLabel}: ${grandTotalPrev.toLocaleString('ko-KR')}개 → ${todayLabel}: ${grandTotalToday.toLocaleString('ko-KR')}개`,
      '', '', '', '',
    ]);
  }

  const wsData = [headerRow1, headerRow2, ...dataRows, ...footerRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const totalRowIdx = 2 + dataRows.length + 1; // +1 for empty spacer row
  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  if (grandTotalPrev != null && grandTotalToday != null) {
    merges.push({ s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 4 } });
  }

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

export async function downloadOliveyoungExcel(
  products: { name: string; todayQty: number; prevQty: number }[],
  prevDateLabel: string,
  todayDateLabel: string,
  brandLabel: string,
  prevTotal: number,
  todayTotal: number,
) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('올영판매량');

  ws.columns = [
    { width: 30 },
    { width: 10 },
    { width: 10 },
  ];

  const thin = { style: 'thin' as const, color: { argb: 'FFB0B0B0' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  // 1행: 제목 (병합)
  ws.mergeCells('A1:C1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${prevDateLabel} • ${todayDateLabel} 올영판매량`;
  titleCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.border = border;
  ws.getRow(1).height = 22;

  // 2행: 합계
  const totalRow = ws.getRow(2);
  totalRow.height = 18;
  (['A', 'B', 'C'] as const).forEach((col, i) => {
    const cell = totalRow.getCell(col);
    cell.value = i === 0 ? '합계' : i === 1 ? prevTotal : todayTotal;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
    cell.border = border;
  });

  // 제품 행
  products.forEach((p, idx) => {
    const row = ws.getRow(idx + 3);
    const hasQty = p.prevQty !== 0 || p.todayQty !== 0;
    const bgColor = hasQty ? 'FFFFF3E0' : 'FFFFFFFF';

    (['A', 'B', 'C'] as const).forEach((col, i) => {
      const cell = row.getCell(col);
      cell.value = i === 0 ? p.name : i === 1 ? p.prevQty : p.todayQty;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
      cell.border = border;
    });
    row.height = 16;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `올영판매량_${brandLabel}_${todayDateLabel}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
