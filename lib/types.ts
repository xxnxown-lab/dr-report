import type { Channel, Grade } from './constants';

export type ChangeSymbol = '▲' | '▽' | '-';

export interface ChannelData {
  qty: string;
  amount: string;
}

export type ChannelMap = Record<Channel, ChannelData>;

export interface ReportRow {
  grade: Grade | null;
  name: string;
  isSpecial: boolean;
  channels: ChannelMap;
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
