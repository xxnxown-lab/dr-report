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
  { grade: 'C' as const, name: '크랜베리' },
  { grade: 'C' as const, name: '치약' },
  { grade: 'C' as const, name: '샴푸' },
];

export const HOHOEMI_PRODUCT_LIST = [
  { grade: 'A' as const, name: '무향세제' },
  { grade: 'A' as const, name: '섬유유연제' },
  { grade: 'A' as const, name: '바스샴푸' },
  { grade: 'A' as const, name: '주방세제' },
  { grade: 'A' as const, name: '크림' },
  { grade: 'A' as const, name: '로션' },
  { grade: 'A' as const, name: '라임세제' },
  { grade: 'A' as const, name: '라임유연제' },
  { grade: 'B' as const, name: '선크림' },
  { grade: 'B' as const, name: '손세정제' },
  { grade: 'B' as const, name: '오일' },
  { grade: 'B' as const, name: '수딩겔' },
];

export const HOHOEMI_CODE_MAP: Record<string, string> = {
  'Ho-001': '무향세제',
  'Ho-002': '섬유유연제',
  'Ho-003': '라임세제',
  'Ho-004': '라임유연제',
  'Ho-005': '주방세제',
  'Ho-009': '로션',
  'Ho-010': '크림',
  'Ho-011': '수딩겔',
  'Ho-012': '바스샴푸',
  'Ho-013': '선크림',
  'Ho-014': '오일',
  'Ho-015': '손세정제',
};

export interface OliveyoungProductDef {
  keywords: string[];
  displayName: string;
}

export const DR_OLIVEYOUNG_PRODUCTS: OliveyoungProductDef[] = [
  { keywords: ['위솔보'],             displayName: '위점막 보호엔 위솔보' },
  { keywords: ['히알'],               displayName: '히알바이오틱스' },
  { keywords: ['베타카로틴'],         displayName: '베타카로틴 레몬맛 오메가3' },
  { keywords: ['망고'],               displayName: '멀티비타민 망고맛 곰젤리' },
  { keywords: ['아이오딘'],           displayName: '아이오딘 멀티비타민 우먼' },
  { keywords: ['테아닌'],             displayName: 'L-테아닌 이지먼스' },
  { keywords: ['칼마비'],             displayName: '칼슘마그네슘비타민D+' },
  { keywords: ['이뮨', '엽산'],       displayName: '엽산' },
  { keywords: ['프로폴리스'],         displayName: '프로폴리스아연C' },
  { keywords: ['판토스'],             displayName: '판토스멀티비타민' },
  { keywords: ['블랙'],               displayName: '블랙 프로바이오틱스' },
  { keywords: ['카테킨', '아세로라'], displayName: '카테킨아세로라CD' },
  { keywords: ['밀크'],               displayName: '밀크씨슬' },
  { keywords: ['식물성', '알티지'],   displayName: '식물성알티지오메가3' },
  { keywords: ['루테인'],             displayName: '루테인' },
  { keywords: ['비헴철', '혬철'],     displayName: '철분' },
  { keywords: ['프롬하이'],           displayName: '프롬하이' },
  { keywords: ['비오틴'],             displayName: '비오틴' },
  { keywords: ['FeD', 'fed'],         displayName: '베이비 FeD유산균' },
  { keywords: ['21포'],               displayName: '위디어트' },
];

export const OLIVEYOUNG_BRAND_PRODUCTS: Partial<Record<string, OliveyoungProductDef[]>> = {
  dr: DR_OLIVEYOUNG_PRODUCTS,
};

export type Grade = 'A' | 'B' | 'C';
export type Brand = 'dr' | 'hoho' | 'chungmijung' | 'bioga' | 'bancor' | 'odroy' | 'oliveyoung' | 'roas';

export interface BrandConfig {
  label: string;
  activeClass: string;
  codePrefix: string;
}

export const BRAND_CONFIG: Record<Brand, BrandConfig> = {
  chungmijung: { label: '청미정',  activeClass: 'bg-green-700 text-white shadow',  codePrefix: 'Ch-' },
  bioga:        { label: '바이오가', activeClass: 'bg-teal-600 text-white shadow',   codePrefix: 'Bi-' },
  dr:           { label: '닥터아돌', activeClass: 'bg-blue-700 text-white shadow',   codePrefix: 'Dr-' },
  hoho:         { label: '호호에미', activeClass: 'bg-red-600 text-white shadow',    codePrefix: 'Ho-' },
  bancor:       { label: '반코르',   activeClass: 'bg-amber-600 text-white shadow',  codePrefix: 'Va-' },
  odroy:        { label: '오드로이', activeClass: 'bg-purple-600 text-white shadow', codePrefix: 'Od-' },
  oliveyoung:   { label: '올리브영', activeClass: 'bg-green-700 text-white shadow',  codePrefix: 'Ol-' },
  roas:         { label: 'TEST', activeClass: 'bg-indigo-700 text-white shadow', codePrefix: '' },
};

export const BRAND_ORDER: Brand[] = ['chungmijung', 'bioga', 'dr', 'hoho', 'bancor', 'odroy', 'oliveyoung', 'roas'];

export const ROAS_BRAND_ORDER: Brand[] = ['dr', 'hoho'];

// "5브랜드중단"/"5브랜드시작" 스위치: 호호에미(브랜드 탭 + TEST/ROAS 탭) 보고서 생성 on/off.
// 호호에미는 오직 이 스위치로만 제어된다 — "4브랜드시작"을 요청해도 호호에미는 풀리지 않는다.
export const FIVE_BRAND_SUSPENDED = true;

export const HOHO_SUSPENDED_BRANDS: Brand[] = ['hoho'];
export const HOHO_SUSPENDED_ROAS_BRANDS: Brand[] = ['hoho'];

// "4브랜드중단"/"4브랜드시작" 스위치: 청미정/바이오가/반코르/오드로이 브랜드 탭 보고서 생성 on/off.
// 닥터아돌과 올리브영 탭은 이 스위치와 무관하게 항상 정상 동작한다.
export const FOUR_BRAND_SUSPENDED = false;

export const FOUR_SUSPENDED_BRANDS: Brand[] = ['chungmijung', 'bioga', 'bancor', 'odroy'];

// 브랜드별 시트에 '합계'/'매출' 헤더가 여러 번 나와 헤더 텍스트만으로는 열을 특정할 수 없는 경우, 열 문자로 직접 지정한다.
export const ROAS_COLUMN_OVERRIDES: Partial<Record<Brand, { adSpendCol: string; revenueCol: string }>> = {
  dr: { adSpendCol: 'T', revenueCol: 'W' },
  hoho: { adSpendCol: 'T', revenueCol: 'W' },
};

export const BANCOR_PRODUCT_LIST = [
  { grade: 'A' as const, name: '리리힐' },
  { grade: 'A' as const, name: '루루팝' },
  { grade: 'A' as const, name: '바쿠치올세럼' },
  { grade: 'A' as const, name: '맥주효모샴푸' },
  { grade: 'A' as const, name: '덱스판테놀크림' },
  { grade: 'B' as const, name: '바하폼클렌저' },
  { grade: 'B' as const, name: '세라마이드토너' },
  { grade: 'B' as const, name: '세라마이드크림' },
  { grade: 'C' as const, name: '스쿠알란앰플' },
  { grade: 'C' as const, name: '여성청결제' },
  { grade: 'C' as const, name: '맥주트리트먼트' },
  { grade: 'C' as const, name: '잡티세럼' },
  { grade: 'C' as const, name: '덱스판테놀샴푸' },
  { grade: 'C' as const, name: '바하겔' },
  { grade: 'C' as const, name: '블레미쉬스카겔' },
];

export const BANCOR_CODE_MAP: Record<string, string> = {
  'Va-0068':   '리리힐',
  'Va-0068-1': '리리힐',
  'Va-0068-2': '리리힐',
  'Va-0076':   '루루팝',
  'Va-0057':   '바쿠치올세럼',
  'Va-0075':   '맥주효모샴푸',
  'Va-0061':   '덱스판테놀크림',
  'Va-0050':   '바하폼클렌저',
  'Va-0055':   '세라마이드토너',
  'Va-0016':   '세라마이드크림',
  'Va-0060':   '스쿠알란앰플',
  'Va-0013':   '여성청결제',
  'Va-0056':   '맥주트리트먼트',
  'Va-0069':   '잡티세럼',
  'Va-0063':   '덱스판테놀샴푸',
  'Va-0064':   '블레미쉬스카겔',
  'Va-0005':   '바하겔',
};

export const ODROY_PRODUCT_LIST = [
  { grade: 'A' as const, name: '모공수축크림' },
  { grade: 'A' as const, name: '등잡티크림' },
  { grade: 'A' as const, name: '모공미스트' },
  { grade: 'B' as const, name: '필 샷' },
  { grade: 'B' as const, name: '리프팅세럼' },
  { grade: 'B' as const, name: '폼클렌징' },
  { grade: 'B' as const, name: '톤업선크림' },
  { grade: 'B' as const, name: '중주파기기' },
  { grade: 'B' as const, name: '시카앰플' },
  { grade: 'C' as const, name: '선인장세럼' },
  { grade: 'C' as const, name: '미백선스틱' },
  { grade: 'C' as const, name: '니드솝' },
  { grade: 'C' as const, name: '토너패드' },
  { grade: 'C' as const, name: '모공수축토너' },
];

export const ODROY_CODE_MAP: Record<string, string> = {
  'Od-006': '모공수축크림',
  'Od-011': '등잡티크림',
  'Od-020': '모공미스트',
  'Od-022': '필 샷',
  'Od-005': '리프팅세럼',
  'Od-004': '폼클렌징',
  'Od-012': '톤업선크림',
  'Od-014': '중주파기기',
  'Od-016': '시카앰플',
  'Od-015': '선인장세럼',
  'Od-013': '미백선스틱',
  'Od-021': '니드솝',
  'Od-018': '토너패드',
  'Od-019': '모공수축토너',
};

export const CHUNGMIJUNG_PRODUCT_LIST = [
  { grade: 'A' as const, name: '다시마샴푸' },
  { grade: 'A' as const, name: '두피에센스' },
  { grade: 'A' as const, name: '흑곡샴푸' },
  { grade: 'A' as const, name: '다시마트리트먼트' },
  { grade: 'A' as const, name: '기미크림' },
  { grade: 'B' as const, name: '클렌징오일' },
  { grade: 'B' as const, name: '클렌징밀크' },
  { grade: 'B' as const, name: '쿨샴푸' },
  { grade: 'B' as const, name: '클렌징폼' },
  { grade: 'B' as const, name: '선인장앰플' },
  { grade: 'C' as const, name: '톤업선크림' },
  { grade: 'C' as const, name: '흑곡트리트먼트' },
  { grade: 'C' as const, name: '다시마 토너패드' },
  { grade: 'C' as const, name: '잡티앰플' },
  { grade: 'C' as const, name: '알로에 토너' },
];

export const CHUNGMIJUNG_CODE_MAP: Record<string, string> = {
  'Ch-013': '다시마샴푸',
  'Ch-003': '두피에센스',
  'Ch-001': '흑곡샴푸',
  'Ch-005': '다시마트리트먼트',
  'Ch-036': '기미크림',
  'Ch-007': '클렌징오일',
  'Ch-025': '클렌징밀크',
  'Ch-023': '쿨샴푸',
  'Ch-021': '클렌징폼',
  'Ch-033': '선인장앰플',
  'Ch-046': '톤업선크림',
  'Ch-002': '흑곡트리트먼트',
  'Ch-043': '다시마 토너패드',
  'Ch-048': '잡티앰플',
  'Ch-051': '알로에 토너',
};

export const BIOGA_PRODUCT_LIST = [
  { grade: 'A' as const, name: '바디워시' },
  { grade: 'A' as const, name: '등드름 바디워시' },
  { grade: 'A' as const, name: '탈모샴푸' },
  { grade: 'A' as const, name: '밀크로션' },
  { grade: 'B' as const, name: '트리트먼트' },
  { grade: 'B' as const, name: '노워시' },
  { grade: 'B' as const, name: '헤어에센스' },
  { grade: 'B' as const, name: '글라이신 샴푸' },
  { grade: 'B' as const, name: '바디미스트' },
  { grade: 'B' as const, name: '수딩젤크림' },
  { grade: 'B' as const, name: '크림' },
  { grade: 'C' as const, name: '지성바디워시' },
  { grade: 'C' as const, name: '아기로션' },
  { grade: 'C' as const, name: '클렌징폼' },
  { grade: 'C' as const, name: '바디오일' },
  { grade: 'C' as const, name: '포포크림' },
];

export const BIOGA_CODE_MAP: Record<string, string> = {
  'Bi-003': '바디워시',
  'Bi-011': '등드름 바디워시',
  'Bi-014': '탈모샴푸',
  'Bi-002': '밀크로션',
  'Bi-007': '트리트먼트',
  'Bi-016': '노워시',
  'Bi-015': '헤어에센스',
  'Bi-012': '글라이신 샴푸',
  'Bi-021': '바디미스트',
  'Bi-004': '수딩젤크림',
  'Bi-001': '크림',
  'Bi-008': '지성바디워시',
  'Bi-010': '아기로션',
  'Bi-009': '클렌징폼',
  'Bi-005': '바디오일',
  'Bi-013': '포포크림',
};

export const BRAND_PRODUCT_LISTS: Record<Brand, { grade: Grade; name: string }[]> = {
  dr:           PRODUCT_LIST,
  hoho:         HOHOEMI_PRODUCT_LIST,
  bancor:       BANCOR_PRODUCT_LIST,
  odroy:        ODROY_PRODUCT_LIST,
  chungmijung:  CHUNGMIJUNG_PRODUCT_LIST,
  bioga:        BIOGA_PRODUCT_LIST,
  oliveyoung:   [],
  roas:         [],
};
