import type { ParsedSheet, SheetProduct } from './types';
import type { Brand } from './constants';
import { BRAND_PRODUCT_LISTS, ROAS_COLUMN_OVERRIDES } from './constants';

export function parseSheetText(text: string, codePrefix = 'Dr-'): ParsedSheet {
  const lines = text.split('\n');
  const rows = lines.map((line) => line.split('\t'));
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));

  if (nonEmpty.length < 3) return { dateLabels: [], products: [] };

  let dateRowIdx = -1;
  for (let i = 0; i < nonEmpty.length; i++) {
    if (nonEmpty[i].some((c) => /\d+\([가-힣]+\)/.test(c.trim()))) {
      dateRowIdx = i;
      break;
    }
  }
  if (dateRowIdx === -1) return { dateLabels: [], products: [] };

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

  const products: SheetProduct[] = [];

  for (let i = channelRowIdx + 1; i < nonEmpty.length; i++) {
    const row = nonEmpty[i];
    const code = (row[codeCol] || '').trim();
    const name = (row[nameCol] || '').trim();

    if (!code.startsWith(codePrefix) || !name) continue;

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

export interface OliveyoungParsed {
  productNames: string[];
  getQtyForDate: (dateStr: string) => number[];
  getQtyForDateRange: (fromDate: string, toDate?: string) => number[];
}

export function parseOliveyoungSheet(text: string): OliveyoungParsed {
  const rows = text.split('\n').map((line) => line.split('\t'));

  let headerRowIdx = -1;
  let channelColIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const idx = rows[i].findIndex((c) => c.trim() === '채널');
    if (idx !== -1) { headerRowIdx = i; channelColIdx = idx; break; }
  }
  if (headerRowIdx === -1) return { productNames: [], getQtyForDate: () => [], getQtyForDateRange: () => [] };

  const headerRow = rows[headerRowIdx];
  const productNames: string[] = [];
  for (let i = channelColIdx + 1; i < headerRow.length; i++) {
    const name = headerRow[i].trim();
    if (name) productNames.push(name);
  }

  const productCount = productNames.length;
  const productColStart = channelColIdx + 1;
  const dateColIdx = channelColIdx - 1;

  const getQtyForDate = (dateStr: string): number[] => {
    if (!dateStr || productCount === 0) return new Array(productCount).fill(0);
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const targetPattern = new RegExp(`0?${month}월\\s*0?${day}일`);
    const totals = new Array(productCount).fill(0);
    let inTarget = false;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const dateCell = (row[dateColIdx] || '').trim();
      const channelCell = (row[channelColIdx] || '').trim();

      if (dateCell) {
        if (targetPattern.test(dateCell)) { inTarget = true; }
        else if (inTarget) { break; }
      }

      if (inTarget && ['온라인', '오프라인', '글로벌'].includes(channelCell)) {
        for (let j = 0; j < productCount; j++) {
          const raw = (row[productColStart + j] || '').replace(/,/g, '').trim();
          const val = parseInt(raw, 10);
          if (!isNaN(val)) totals[j] += val;
        }
      }
    }
    return totals;
  };

  const getQtyForDateRange = (fromDate: string, toDate?: string): number[] => {
    if (!toDate || toDate === fromDate) return getQtyForDate(fromDate);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const totals = new Array(productCount).fill(0);
    const curr = new Date(from);
    while (curr <= to) {
      const dateStr = curr.toISOString().split('T')[0];
      getQtyForDate(dateStr).forEach((qty, i) => { totals[i] += qty; });
      curr.setDate(curr.getDate() + 1);
    }
    return totals;
  };

  return { productNames, getQtyForDate, getQtyForDateRange };
}

export function keywordMap(productName: string): string | null {
  const n = productName.toLowerCase().replace(/\s+/g, '');
  if (n.includes('히카바이오틱스')) return '위디어트';
  if (n.includes('히알바이오틱스')) return '히알바이오틱스';
  if (n.includes('fed') || (n.includes('베이비') && n.includes('유산균'))) return 'Fed유산균';
  if (n.includes('바츠') || n.includes('bl유산균')) return '바츠유산균';
  if (n.includes('위솔보')) return '위솔보';
  if (n.includes('위디어트')) return '위디어트';
  if (n.includes('칼마디') || n.includes('칼슘마그네슘')) return '칼마디';
  if (n.includes('밀크씨슬')) return '밀크씨슬';
  if (n.includes('카테킨') || n.includes('아세로라')) return '카테킨아세로라';
  if (n.includes('이지먼스')) return '이지먼스';
  if (n.includes('크랜베리')) return '크랜베리';
  if (n.includes('비오틴')) return '비오틴';
  if (n.includes('프로폴리스')) return '프로폴리스';
  if (n.includes('멀티비타민') && n.includes('우먼')) return '멀티비타민 우먼';
  if (n.includes('멀티비타민')) return '멀티비타민';
  if (n.includes('루테인')) return '루테인';
  if (n.includes('베타카로틴')) return '베타카로틴 오메가3';
  if (n.includes('오메가3')) return '오메가3';
  if (n.includes('철분') || n.includes('비헴철')) return '철분';
  if (n.includes('치약') || n.includes('투스페이스트')) return '치약';
  if (n.includes('샴푸')) return '샴푸';
  if (n.includes('유산균') || n.includes('프로바이오틱스')) return '유산균';
  return null;
}

export function hohoKeywordMap(productName: string): string | null {
  const n = productName.toLowerCase();
  if (n.includes('무향') && n.includes('세제')) return '무향세제';
  if (n.includes('라임') && n.includes('유연')) return '라임유연제';
  if (n.includes('라임') && n.includes('세제')) return '라임세제';
  if (n.includes('섬유') || n.includes('유연제')) return '섬유유연제';
  if (n.includes('바스샴푸') || (n.includes('바스') && n.includes('샴푸'))) return '바스샴푸';
  if (n.includes('주방')) return '주방세제';
  if (n.includes('선크림') || n.includes('썬크림') || n.includes('선스크린')) return '선크림';
  if (n.includes('손세정') || (n.includes('손') && n.includes('세정'))) return '손세정제';
  if (n.includes('수딩')) return '수딩겔';
  if (n.includes('오일')) return '오일';
  if (n.includes('크림')) return '크림';
  if (n.includes('로션')) return '로션';
  return null;
}

export interface RoasParsedProduct {
  name: string;
  adSpend: number;
  revenue: number;
}

function parseRoasNum(raw: string): number {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return 0;
  const isNegative = trimmed.startsWith('(') && trimmed.endsWith(')');
  const clean = trimmed.replace(/[(),%]/g, '').replace(/,/g, '');
  const val = parseFloat(clean);
  if (isNaN(val)) return 0;
  return isNegative ? -val : val;
}

function colLetterToIndex(letter: string): number {
  let idx = 0;
  for (const ch of letter.toUpperCase()) {
    idx = idx * 26 + (ch.charCodeAt(0) - 64);
  }
  return idx - 1;
}

// 채널 접두사(올/, 쿠/ 등)가 붙은 행과 붙지 않은 합산 행을 모두 같은 제품으로 취급해 광고비/매출을 합산한다.
export function parseRoasSheet(text: string, brandLabel: string, brand?: Brand): RoasParsedProduct[] {
  const rows = text.split('\n').map((line) => line.split('\t'));

  let headerRowIdx = -1;
  let nameColIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const idx = rows[i].findIndex((c) => c.trim() === '채널' || c.trim() === '제품');
    if (idx !== -1) { headerRowIdx = i; nameColIdx = idx; break; }
  }
  if (headerRowIdx === -1) return [];

  const headerRow = rows[headerRowIdx];
  const override = brand ? ROAS_COLUMN_OVERRIDES[brand] : undefined;

  const adSpendColIdx = override
    ? colLetterToIndex(override.adSpendCol)
    : headerRow.findIndex((c) => c.trim() === '합계');

  let revenueColIdx = -1;
  if (override) {
    revenueColIdx = colLetterToIndex(override.revenueCol);
  } else {
    headerRow.forEach((c, i) => { if (c.trim() === '매출') revenueColIdx = i; });
  }

  if (adSpendColIdx === -1 || revenueColIdx === -1) return [];

  const sums = new Map<string, { adSpend: number; revenue: number }>();

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const rawName = (row[nameColIdx] || '').trim();
    if (!rawName || rawName === brandLabel || rawName === '합계' || rawName === '비율') continue;

    const baseName = rawName.includes('/') ? rawName.split('/').slice(-1)[0].trim() : rawName;
    if (!baseName) continue;

    const entry = sums.get(baseName) ?? { adSpend: 0, revenue: 0 };
    entry.adSpend += parseRoasNum(row[adSpendColIdx]);
    entry.revenue += parseRoasNum(row[revenueColIdx]);
    sums.set(baseName, entry);
  }

  return Array.from(sums, ([name, v]) => ({ name, ...v }));
}

export function matchRoasToCanonical(name: string, brand: Brand): string | null {
  if (brand === 'dr') return keywordMap(name);
  if (brand === 'hoho') return hohoKeywordMap(name);

  const list = BRAND_PRODUCT_LISTS[brand] || [];
  const found = list.find((p) => name.includes(p.name) || p.name.includes(name));
  return found ? found.name : null;
}
