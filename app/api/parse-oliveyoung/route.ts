import { NextRequest, NextResponse } from 'next/server';
import { OLIVEYOUNG_BRAND_PRODUCTS } from '@/lib/constants';
import { parseOliveyoungSheet } from '@/lib/parseSheet';

export async function POST(req: NextRequest) {
  try {
    const { todayText, prevText, todayDate, todayDateEnd, prevDate, prevDateEnd, oyBrand } = await req.json();

    if (!todayText?.trim()) return NextResponse.json({ error: '당일 데이터를 입력해주세요.' }, { status: 400 });
    if (!prevText?.trim()) return NextResponse.json({ error: '비교일 데이터를 입력해주세요.' }, { status: 400 });

    const todayParsed = parseOliveyoungSheet(todayText);
    const prevParsed = parseOliveyoungSheet(prevText);

    if (todayParsed.productNames.length === 0)
      return NextResponse.json({ error: '시트에서 제품 정보를 찾을 수 없습니다. 시트 형식을 확인해주세요.' }, { status: 400 });

    const todayQtys = todayParsed.getQtyForDateRange(todayDate, todayDateEnd || undefined);
    const prevQtys = prevParsed.getQtyForDateRange(prevDate, prevDateEnd || undefined);

    const productDefs = OLIVEYOUNG_BRAND_PRODUCTS[oyBrand];

    let products: { name: string; todayQty: number; prevQty: number }[];

    if (productDefs) {
      // 키워드 매핑: 정의된 순서대로 표시명으로 출력
      products = productDefs.map((def) => {
        const matches = (name: string) =>
          def.keywords.some((kw) => name.toLowerCase().includes(kw.toLowerCase()));

        const sumFor = (names: string[], qtys: number[]) => {
          const idxs = names.reduce<number[]>((acc, n, i) => (matches(n) ? [...acc, i] : acc), []);
          // sumMatches: 매칭되는 모든 컬럼 합산 (이벤트성 제품이 리스트에 추가/제거되는 경우 대응)
          // 기본: 첫 매칭 컬럼만 사용
          const used = def.sumMatches ? idxs : idxs.slice(0, 1);
          return used.reduce((s, i) => s + Math.max(0, qtys[i] ?? 0), 0);
        };

        return {
          name: def.displayName,
          todayQty: sumFor(todayParsed.productNames, todayQtys),
          prevQty:  sumFor(prevParsed.productNames, prevQtys),
        };
      });
    } else {
      // 매핑 없는 브랜드는 시트 컬럼명 그대로
      products = todayParsed.productNames.map((name, i) => ({
        name,
        todayQty: Math.max(0, todayQtys[i] ?? 0),
        prevQty:  Math.max(0, prevQtys[i]  ?? 0),
      }));
    }

    const todayTotal = products.reduce((s, p) => s + p.todayQty, 0);
    const prevTotal  = products.reduce((s, p) => s + p.prevQty,  0);

    return NextResponse.json({ products, todayTotal, prevTotal });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
