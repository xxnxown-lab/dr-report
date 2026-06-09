import type { Grade } from './constants';

export type ChangeSymbol = '▲' | '▽' | '-';

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
