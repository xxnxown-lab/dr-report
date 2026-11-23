import * as XLSX from 'xlsx';

// 시딩 탭: 광고 엑셀(Campaign name 기준)을 구글시트 B열 광고명 순서에 맞춰 붙여넣을 값으로 변환한다.
// 광고명 끝이 _B / _B_all 이면 인스타그램(브랜디드), _S(_...)면 틱톡(스파크애즈) — 플랫폼별 엑셀을 따로 받는다.
// 시트 열 사이에 손대면 안 되는 열(P~R 등)이 있어서, 연속된 열끼리 묶어 복사 블록 단위로 붙여넣는다.

// tiktokFq: 틱톡 7일간 엑셀 — 틱톡 광고의 M열(FQ)만 따로 채운다
export type SeedingPlatform = 'insta' | 'tiktok' | 'tiktokFq';

type Field = 'cost' | 'clicks' | 'ctr' | 'freq' | 'atc' | 'vc' | 'hook' | 'pc';
type Fmt = 'int' | 'pct' | 'pct0' | 'dec2';

export interface SeedingColumn {
  col: string;
  label: string;
  field: Field;
  fmt: Fmt;
}

export interface SeedingBlock {
  label: string;
  columns: SeedingColumn[];
}

interface PlatformConfig {
  label: string;
  pattern: RegExp;
  /** 엑셀 헤더 앞부분 (헤더가 잘려 있어도 앞부분으로 찾는다) */
  headers: Partial<Record<Field, string>>;
  blocks: SeedingBlock[];
}

export const SEEDING_PLATFORMS: SeedingPlatform[] = ['insta', 'tiktok', 'tiktokFq'];

export const SEEDING_CONFIG: Record<SeedingPlatform, PlatformConfig> = {
  insta: {
    label: '인스타그램 (브랜디드)',
    pattern: /_B(_all)?$/,
    headers: {
      cost: 'cost per outbound click',
      clicks: 'unique outbound clicks',
      ctr: 'outbound ctr',
      freq: 'frequency',
      atc: 'adds to cart',
      vc: 'content views',
      pc: 'purchases with shared',
    },
    blocks: [
      {
        label: 'J~O열',
        columns: [
          { col: 'J', label: 'outb 비용', field: 'cost', fmt: 'int' },
          { col: 'K', label: 'outb 클릭', field: 'clicks', fmt: 'int' },
          { col: 'L', label: 'outb CTR', field: 'ctr', fmt: 'pct' },
          { col: 'M', label: 'FQ', field: 'freq', fmt: 'dec2' },
          { col: 'N', label: 'ATC', field: 'atc', fmt: 'int' },
          { col: 'O', label: 'VC', field: 'vc', fmt: 'int' },
        ],
      },
      { label: 'T열(PC)', columns: [{ col: 'T', label: 'PC', field: 'pc', fmt: 'int' }] },
    ],
  },
  tiktok: {
    label: '틱톡 (스파크애즈)',
    pattern: /_S(_.*)?$/,
    // 틱톡은 M열(FQ)만 생략
    headers: {
      cost: 'cpc',
      clicks: 'clicks',
      ctr: 'ctr',
      atc: 'total add to cart',
      hook: '2-second view rate',
      pc: 'total pu',
    },
    blocks: [
      {
        label: 'J~L열',
        columns: [
          { col: 'J', label: '비용', field: 'cost', fmt: 'int' },
          { col: 'K', label: '클릭', field: 'clicks', fmt: 'int' },
          { col: 'L', label: 'CTR', field: 'ctr', fmt: 'pct' },
        ],
      },
      { label: 'N열(ATC)', columns: [{ col: 'N', label: 'ATC', field: 'atc', fmt: 'int' }] },
      {
        label: 'S~T열(후크·PC)',
        columns: [
          // 후크 비율은 정수로 반올림 + % (10.74% → 11%)
          { col: 'S', label: '후크 비율', field: 'hook', fmt: 'pct0' },
          { col: 'T', label: 'PC', field: 'pc', fmt: 'int' },
        ],
      },
    ],
  },
  tiktokFq: {
    label: '틱톡 (스파크애즈) 7일간 FQ',
    pattern: /_S(_.*)?$/,
    headers: { freq: 'frequency' },
    blocks: [{ label: 'M열(7일 FQ)', columns: [{ col: 'M', label: '7일 FQ', field: 'freq', fmt: 'dec2' }] }],
  },
};

export interface SeedingRow {
  name: string;
  /** 엑셀에 같은 광고명이 있는지 */
  matched: boolean;
  /** 복사 블록별 값 (SEEDING_CONFIG[platform].blocks 순서) */
  blocks: string[][];
}

export interface SeedingResult {
  rows: SeedingRow[];
  /** 시트에서 첫 광고 행 번호 (붙여넣기 시작 행) */
  startRow: number;
  /** 엑셀에 데이터가 있는데 시트 B열에 없는 광고명 */
  excelOnly: string[];
}

type ExcelAd = Partial<Record<Field, number | null>>;

// 엑셀에서 비율로 읽는 항목 (시트에 % 표기 여부는 열 설정의 fmt가 정한다)
const RATE_FIELDS = new Set<Field>(['ctr', 'hook']);

function norm(s: unknown): string {
  return String(s ?? '').normalize('NFC').trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,%₩\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// 비율 칸: 엑셀에 % 서식(0.4688 → "46.88%")이면 표시값 기준, 아니면 숫자 그대로 % 값으로 본다 (메타 CTR 2.0025 = 2.00%)
function toPct(raw: unknown, shown: unknown): number | null {
  return norm(shown).endsWith('%') ? toNum(shown) : toNum(raw);
}

function hasData(ad: ExcelAd): boolean {
  return Object.values(ad).some((v) => v !== null && v !== undefined && v > 0);
}

export function parseSeedingExcel(buf: ArrayBuffer, platform: SeedingPlatform): Map<string, ExcelAd> {
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });
  const shownRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });

  const headerIdx = rows.findIndex((r) => r.some((c) => norm(c).toLowerCase() === 'campaign name'));
  if (headerIdx < 0) throw new Error('엑셀에서 "Campaign name" 헤더를 찾을 수 없습니다.');
  const header = rows[headerIdx].map((c) => norm(c).toLowerCase());
  const nameCol = header.indexOf('campaign name');

  const fieldCols = Object.entries(SEEDING_CONFIG[platform].headers).map(([field, prefix]) => {
    const i = header.findIndex((h) => h.startsWith(prefix));
    if (i < 0) throw new Error(`엑셀에서 "${prefix}" 열을 찾을 수 없습니다.`);
    return [field as Field, i] as const;
  });

  const ads = new Map<string, ExcelAd>();
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const name = norm(rows[r][nameCol]);
    if (!name) continue;
    const ad: ExcelAd = {};
    for (const [field, i] of fieldCols) {
      ad[field] = RATE_FIELDS.has(field) ? toPct(rows[r][i], shownRows[r]?.[i]) : toNum(rows[r][i]);
    }
    // 같은 이름이 여러 줄이면 데이터가 있는 줄을 우선한다
    const prev = ads.get(name);
    if (!prev || (!hasData(prev) && hasData(ad))) ads.set(name, ad);
  }
  return ads;
}

// 값이 없는 칸은 빈칸 대신 0으로 채운다
function fmtCell(v: number | null | undefined, fmt: Fmt): string {
  const n = v ?? 0;
  if (fmt === 'pct') return `${n.toFixed(2)}%`;
  if (fmt === 'pct0') return `${Math.round(n)}%`;
  if (fmt === 'dec2') return n.toFixed(2);
  return String(Math.round(n));
}

// 시딩 탭 사용 허용 닉네임 (시트 E열 '편집').
// 추가/삭제는 이 배열만 고치면 된다 — 따옴표로 감싸고 쉼표로 구분.
export const SEEDING_ALLOWED_NICKNAMES = [
  '로미',
  '그린',
  '나우',
  '메이',
  '벤처',
  '베인스',
  '미아',
];

export const SEEDING_DENIED_MESSAGE = 'Invalid value.';

// 광고 행(헤더 아래 B열이 비기 전까지)의 E열 닉네임이 전부 허용 목록에 있어야 통과
export function checkSeedingPermission(sheetText: string): boolean {
  const allowed = new Set(SEEDING_ALLOWED_NICKNAMES.map(norm));
  const lines = sheetText.split(/\r?\n/).map((l) => l.split('\t'));
  const headerIdx = lines.findIndex((cells) => norm(cells[2]) === '광고형식');
  if (headerIdx < 0) return true; // 헤더가 없으면 아래 buildSeedingResult에서 안내 오류를 낸다
  for (const cells of lines.slice(headerIdx + 1)) {
    if (!norm(cells[1])) break;
    if (!allowed.has(norm(cells[4]))) return false;
  }
  return true;
}

// 구글시트 TSV: C열이 '광고형식'인 행이 헤더, 그 아래로 B열이 비기 전까지가 광고 행
export function buildSeedingResult(sheetText: string, ads: Map<string, ExcelAd>, platform: SeedingPlatform): SeedingResult {
  const lines = sheetText.split(/\r?\n/).map((l) => l.split('\t'));
  const headerIdx = lines.findIndex((cells) => norm(cells[2]) === '광고형식');
  if (headerIdx < 0) throw new Error('시트에서 "광고형식" 헤더 행을 찾을 수 없습니다. 해당 날짜 탭 URL인지 확인해주세요.');

  const { pattern, blocks } = SEEDING_CONFIG[platform];
  const rows: SeedingRow[] = [];
  let startRow = 0;
  for (const [i, cells] of lines.slice(headerIdx + 1).entries()) {
    const name = norm(cells[1]);
    if (!name) break;
    if (!pattern.test(name)) continue;
    const sheetRow = headerIdx + 2 + i;
    if (!startRow) startRow = sheetRow;
    // 한 번에 붙여넣으려면 해당 플랫폼 광고 행이 시트에서 연속돼 있어야 한다
    if (sheetRow !== startRow + rows.length) {
      throw new Error(`${sheetRow}행 "${name}" 앞에 다른 플랫폼 광고가 끼어 있습니다. 시트에서 같은 플랫폼 광고끼리 붙여 정렬해주세요.`);
    }
    const ad = ads.get(name);
    rows.push({
      name,
      matched: !!ad,
      blocks: blocks.map((b) => b.columns.map((c) => fmtCell(ad?.[c.field], c.fmt))),
    });
  }
  if (!rows.length) throw new Error('시트 B열에서 해당 플랫폼 광고명을 찾을 수 없습니다.');

  const sheetNames = new Set(rows.map((r) => r.name));
  const excelOnly = [...ads]
    .filter(([name, ad]) => pattern.test(name) && !sheetNames.has(name) && hasData(ad))
    .map(([name]) => name);

  return { rows, startRow, excelOnly };
}
