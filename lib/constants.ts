export const PRODUCT_LIST = [
  { grade: 'A' as const, name: '카테킨아세로라' },
  { grade: 'A' as const, name: 'Fed유산균' },
  { grade: 'A' as const, name: '위솔보' },
  { grade: 'A' as const, name: '비오틴' },
  { grade: 'A' as const, name: '프로폴리스' },
  { grade: 'B' as const, name: '바츠유산균' },
  { grade: 'B' as const, name: '유산균' },
  { grade: 'B' as const, name: '히알바이오틱스' },
  { grade: 'B' as const, name: '위디어트' },
  { grade: 'B' as const, name: '칼마디' },
  { grade: 'B' as const, name: '밀크씨슬' },
  { grade: 'C' as const, name: '멀티비타민' },
  { grade: 'C' as const, name: '멀티비타민 우먼' },
  { grade: 'C' as const, name: '이지먼스' },
  { grade: 'C' as const, name: '루테인' },
  { grade: 'C' as const, name: '오메가3' },
  { grade: 'C' as const, name: '베타카로틴 오메가3' },
  { grade: 'C' as const, name: '철분' },
  { grade: 'C' as const, name: '삭센닭' },
  { grade: 'C' as const, name: '크랜베리' },
  { grade: 'C' as const, name: '치약' },
  { grade: 'C' as const, name: '샴푸' },
];

export const CHANNELS = [
  '스파크애즈tiktok',
  '브랜디드Ins',
  '카페질문글',
  '카페댓글',
  '체험단',
  '챌린저스',
  '잡지형tiktok',
  '틱톡메뉴tiktok',
  '유머Ins',
  '유머Yt',
] as const;

export type Channel = (typeof CHANNELS)[number];
export type Grade = 'A' | 'B' | 'C';
