import { NextRequest, NextResponse } from 'next/server';
import { BRAND_CONFIG, BRAND_PRODUCT_LISTS, ROAS_EXCLUDED_KEYWORDS } from '@/lib/constants';
import type { Brand } from '@/lib/constants';
import { parseRoasSheet, matchRoasToCanonical } from '@/lib/parseSheet';
import type { RoasRow } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { text, brand } = (await req.json()) as { text: string; brand: Brand };

    if (!text?.trim()) return NextResponse.json({ error: '데이터를 입력해주세요.' }, { status: 400 });

    const brandLabel = BRAND_CONFIG[brand]?.label ?? '';
    const parsed = parseRoasSheet(text, brandLabel, brand);

    if (parsed.length === 0) {
      return NextResponse.json({ error: '시트에서 제품 정보를 찾을 수 없습니다. 시트 형식을 확인해주세요.' }, { status: 400 });
    }

    const canonicalList = BRAND_PRODUCT_LISTS[brand] || [];
    const grouped = new Map<string, { adSpend: number; revenue: number }>();
    canonicalList.forEach((p) => grouped.set(p.name, { adSpend: 0, revenue: 0 }));

    const extras: { name: string; adSpend: number; revenue: number }[] = [];

    const excluded = ROAS_EXCLUDED_KEYWORDS[brand] ?? [];

    for (const item of parsed) {
      if (excluded.some((kw) => item.name.includes(kw))) continue;
      const canonical = matchRoasToCanonical(item.name, brand);
      const entry = canonical ? grouped.get(canonical) : undefined;
      if (canonical && entry) {
        entry.adSpend += item.adSpend;
        entry.revenue += item.revenue;
      } else {
        extras.push(item);
      }
    }

    const rows: RoasRow[] = canonicalList.map((p) => {
      const entry = grouped.get(p.name)!;
      return {
        grade: p.grade,
        name: p.name,
        adSpend: entry.adSpend,
        revenue: entry.revenue,
        roas: entry.adSpend > 0 ? (entry.revenue / entry.adSpend) * 100 : 0,
      };
    });

    // 호호에미는 브랜드 탭과 동일하게 B등급 맨 아래에 이름만 있는 브랜드 행을 둔다.
    if (brand === 'hoho') {
      rows.push({ grade: 'B', name: BRAND_CONFIG.hoho.label, adSpend: 0, revenue: 0, roas: 0, nameOnly: true });
    }

    for (const e of extras) {
      rows.push({
        grade: null,
        name: e.name,
        adSpend: e.adSpend,
        revenue: e.revenue,
        roas: e.adSpend > 0 ? (e.revenue / e.adSpend) * 100 : 0,
      });
    }

    const totalAdSpend = rows.reduce((s, r) => s + r.adSpend, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const totalRoas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend) * 100 : 0;

    return NextResponse.json({ rows, totalAdSpend, totalRevenue, totalRoas });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
