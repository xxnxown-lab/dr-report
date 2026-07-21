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
        const todayIdx = todayParsed.productNames.findIndex((n) =>
          def.keywords.some((kw) => n.toLowerCase().includes(kw.toLowerCase()))
        );
        const prevIdx = prevParsed.productNames.findIndex((n) =>
          def.keywords.some((kw) => n.toLowerCase().includes(kw.toLowerCase()))
        );
        return {
          name: def.displayName,
          todayQty: Math.max(0, todayIdx !== -1 ? (todayQtys[todayIdx] ?? 0) : 0),
          prevQty:  Math.max(0, prevIdx  !== -1 ? (prevQtys[prevIdx]   ?? 0) : 0),
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
