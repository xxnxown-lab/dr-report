import type { Grade } from './constants';

export type ChangeSymbol = '▲' | '▽' | '-' | '';

export interface ReportRow {
  grade: Grade | null;
  name: string;
  isSpecial: boolean;
  prevQty: number;
  todayQty: number;
  changeSymbol: ChangeSymbol;
}

export interface SheetProduct {
  code: string;
  name: string;
  quantities: Record<string, number>;
}

export interface ParsedSheet {
  dateLabels: string[];
  products: SheetProduct[];
}

export interface RoasRow {
  grade: Grade | null;
  name: string;
  adSpend: number;
  revenue: number;
  roas: number;
  /** true면 숫자 없이 이름만 표시하는 행 (예: TEST탭 호호에미 브랜드 행) */
  nameOnly?: boolean;
}
