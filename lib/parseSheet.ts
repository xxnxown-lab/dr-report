import type { ParsedSheet, SheetProduct } from './types';

export function parseSheetText(text: string): ParsedSheet {
  const lines = text.split('\n');
  const rows = lines.map((line) => line.split('\t'));
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));

  if (nonEmpty.length < 3) return { dateLabels: [], products: [] };

  // Find date header row: contains patterns like "15(금)" or "15(금) 오전"
  let dateRowIdx = -1;
  for (let i = 0; i < nonEmpty.length; i++) {
    if (nonEmpty[i].some((c) => /\d+\([가-힣]+\)/.test(c.trim()))) {
      dateRowIdx = i;
      break;
    }
  }
  if (dateRowIdx === -1) return { dateLabels: [], products: [] };

  // Find channel row: contains 오켓, 카페, 네버
  let channelRowIdx = -1;
  for (let i = dateRowIdx + 1; i < nonEmpty.length; i++) {
    if (nonEmpty[i].some((c) => ['오켓', '카페', '네버'].includes(c.trim()))) {
      channelRowIdx = i;
      break;
    }
  }
  if (channelRowIdx === -1) return { dateLabels: [], products: [] };

  const dateRow = nonEmpty[dateRowIdx];
  const channelRow = nonEmpty[channelRowIdx];
  const maxCols = Math.max(dateRow.length, channelRow.length);

  // Build map: dateLabel -> [colIndices]
  const dateColMap = new Map<string, number[]>();
  let currentLabel = '';

  for (let col = 0; col < maxCols; col++) {
    const dateCell = (dateRow[col] || '').trim();
    const chanCell = (channelRow[col] || '').trim();

    if (/\d+\([가-힣]+\)/.test(dateCell)) {
      const m = dateCell.match(/\d+\([가-힣]+\)/);
      if (m) {
        currentLabel = m[0];
        dateColMap.set(currentLabel, []);
      }
    }

    if (currentLabel && ['오켓', '카페', '네버'].includes(chanCell)) {
      dateColMap.get(currentLabel)?.push(col);
    }
  }

  const dateLabels = Array.from(dateColMap.keys());

  // Auto-detect code column (first column with "Xx-000" pattern in any data row)
  let codeCol = 0;
  for (let i = channelRowIdx + 1; i < nonEmpty.length; i++) {
    const row = nonEmpty[i];
    for (let c = 0; c < row.length; c++) {
      if (/^[A-Za-z]{1,4}-\d+/.test((row[c] || '').trim())) {
        codeCol = c;
        break;
      }
    }
    if (codeCol > 0) break;
  }
  const nameCol = codeCol + 1;

  // Parse Dr-* product rows
  const products: SheetProduct[] = [];

  for (let i = channelRowIdx + 1; i < nonEmpty.length; i++) {
    const row = nonEmpty[i];
    const code = (row[codeCol] || '').trim();
    const name = (row[nameCol] || '').trim();

    if (!code.startsWith('Dr-') || !name) continue;

    const quantities: Record<string, number> = {};
    for (const [label, cols] of dateColMap) {
      let total = 0;
      for (const col of cols) {
        const raw = (row[col] || '').replace(/,/g, '').trim();
        const val = parseInt(raw, 10);
        if (!isNaN(val)) total += val;
      }
      quantities[label] = total;
    }

    products.push({ code, name, quantities });
  }

  return { dateLabels, products };
}

export function matchDayToLabel(dateLabels: string[], dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const day = new Date(dateStr).getDate();
  return dateLabels.find((label) => {
    const m = label.match(/^(\d+)\(/);
    return m && parseInt(m[1], 10) === day;
  });
}

export function keywordMap(productName: string): string | null {
  const n = productName.toLowerCase();
  if (n.includes('히알바이오틱스')) return '히알바이오틱스';
  if (n.includes('fed') || (n.includes('베이비') && n.includes('유산균'))) return 'Fed유산균';
  if (n.includes('바츠') || n.includes('bl 유산균') || n.includes('bl유산균')) return '바츠유산균';
  if (n.includes('위솔보')) return '위솔보';
  if (n.includes('위디어트')) return '위디어트';
  if (n.includes('칼마디') || n.includes('칼슘마그네슘')) return '칼마디';
  if (n.includes('밀크씨슬')) return '밀크씨슬';
  if (n.includes('카테킨') || n.includes('아세로라')) return '카테킨아세로라';
  if (n.includes('이지먼스')) return '이지먼스';
  if (n.includes('삭센닭')) return '삭센닭';
  if (n.includes('크랜베리')) return '크랜베리';
  if (n.includes('비오틴')) return '비오틴';
  if (n.includes('프로폴리스')) return '프로폴리스';
  if (n.includes('멀티비타민') && n.includes('우먼')) return '멀티비타민 우먼';
  if (n.includes('멀티비타민')) return '멀티비타민';
  if (n.includes('루테인')) return '루테인';
  if (n.includes('베타카로틴')) return '베타카로틴 오메가3';
  if (n.includes('오메가3') || n.includes('오메가 3')) return '오메가3';
  if (n.includes('철분') || n.includes('비헴철')) return '철분';
  if (n.includes('치약') || n.includes('투스페이스트')) return '치약';
  if (n.includes('샴푸')) return '샴푸';
  if (n.includes('유산균') || n.includes('프로바이오틱스')) return '유산균';
  return null;
}
