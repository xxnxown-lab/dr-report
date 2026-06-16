import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { HOHOEMI_CODE_MAP, BANCOR_CODE_MAP, ODROY_CODE_MAP, CHUNGMIJUNG_CODE_MAP, BIOGA_CODE_MAP, BRAND_CONFIG, BRAND_PRODUCT_LISTS } from '@/lib/constants';
import { parseSheetText, matchDayToLabel, keywordMap, hohoKeywordMap } from '@/lib/parseSheet';
import type { ReportRow, ChangeSymbol } from '@/lib/types';
import type { Brand } from '@/lib/constants';

function symbol(today: number, prev: number, blankOnEqual = false): ChangeSymbol {
  if (today > prev) return '▲';
  if (today < prev) return '▽';
  return blankOnEqual ? '' : '-';
}

function getKwMap(brand: Brand): (name: string) => string | null {
  if (brand === 'dr') return keywordMap;
  if (brand === 'hoho') return hohoKeywordMap;
  return () => null;
}

function getCodeMap(brand: Brand): Record<string, string> {
  if (brand === 'hoho') return HOHOEMI_CODE_MAP;
  if (brand === 'bancor') return BANCOR_CODE_MAP;
  if (brand === 'odroy') return ODROY_CODE_MAP;
  if (brand === 'chungmijung') return CHUNGMIJUNG_CODE_MAP;
  if (brand === 'bioga') return BIOGA_CODE_MAP;
  return {};
}

export async function POST(req: NextRequest) {
  try {
    const { todayText, prevText, todayDate, prevDate, brand } = await req.json();

    if (!todayText?.trim()) return NextResponse.json({ error: '당일 데이터를 입력해주세요.' }, { status: 400 });
    if (!prevText?.trim()) return NextResponse.json({ error: '비교일 데이터를 입력해주세요.' }, { status: 400 });

    const brandCfg = BRAND_CONFIG[brand as Brand];
    if (!brandCfg) return NextResponse.json({ error: '알 수 없는 브랜드입니다.' }, { status: 400 });

    const codePrefix = brandCfg.codePrefix;
    const brandRowName = brandCfg.label;
    const productList = BRAND_PRODUCT_LISTS[brand as Brand] ?? [];
    const kwMap = getKwMap(brand as Brand);
    const codeMap = getCodeMap(brand as Brand);

    const parsedToday = parseSheetText(todayText, codePrefix);
    const parsedPrev = parseSheetText(prevText, codePrefix);

    if (parsedToday.products.length === 0)
      return NextResponse.json({ error: `당일 시트에서 ${brandRowName}(${codePrefix}*) 제품을 찾을 수 없습니다.` }, { status: 400 });

    const todayLabel = matchDayToLabel(parsedToday.dateLabels, todayDate);
    const prevLabel = matchDayToLabel(parsedPrev.dateLabels, prevDate);

    let codeToReport = new Map<string, string | null>();

    if (process.env.ANTHROPIC_API_KEY && productList.length > 0) {
      try {
        const client = new Anthropic();
        const productListStr = productList.map((p) => p.name).join(', ');
        const productsStr = parsedToday.products.map((p) => `${p.code}: ${p.name}`).join('\n');
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: '당신은 제품명을 분류하는 도우미입니다. JSON 배열만 반환하세요.',
          messages: [{
            role: 'user',
            content: `${brandRowName} 제품을 아래 보고서 항목 중 하나에 매핑하세요. 해당 없으면 null.\n\n보고서 항목: ${productListStr}\n\n제품 목록:\n${productsStr}\n\nJSON 배열로만 응답: [{"code":"${codePrefix}xxx","reportName":"항목명 또는 null"}]`,
          }],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const mappings: Array<{ code: string; reportName: string | null }> = JSON.parse(jsonMatch[0]);
          codeToReport = new Map(mappings.map((m) => [m.code, m.reportName]));
        }
      } catch { /* fallback to keyword map */ }
    }

    for (const p of parsedToday.products) {
      if (!codeToReport.has(p.code)) {
        codeToReport.set(p.code, codeMap[p.code] ?? kwMap(p.name));
      }
    }

    const todayQtyMap = new Map<string, number>();
    let brandTotal = 0;
    for (const p of parsedToday.products) {
      const reportName = codeToReport.get(p.code);
      const qty = todayLabel ? (p.quantities[todayLabel] ?? 0) : 0;
      if (reportName) todayQtyMap.set(reportName, (todayQtyMap.get(reportName) ?? 0) + qty);
      else brandTotal += qty;
    }

    const prevQtyMap = new Map<string, number>();
    let brandTotalPrev = 0;
    for (const p of parsedPrev.products) {
      const reportName = codeMap[p.code] ?? kwMap(p.name);
      const qty = prevLabel ? (p.quantities[prevLabel] ?? 0) : 0;
      if (reportName) prevQtyMap.set(reportName, (prevQtyMap.get(reportName) ?? 0) + qty);
      else brandTotalPrev += qty;
    }

    const blankOnEqual = brand === 'bancor' || brand === 'odroy';

    const rows: ReportRow[] = productList.map((item) => {
      const t = todayQtyMap.get(item.name) ?? 0;
      const p = prevQtyMap.get(item.name) ?? 0;
      return { grade: item.grade, name: item.name, isSpecial: false, todayQty: t, prevQty: p, changeSymbol: symbol(t, p, blankOnEqual) };
    });

    rows.push({ grade: null, name: brandRowName, isSpecial: true, todayQty: brandTotal, prevQty: brandTotalPrev, changeSymbol: symbol(brandTotal, brandTotalPrev, blankOnEqual) });

    const totalToday = rows.filter((r) => !r.isSpecial).reduce((s, r) => s + r.todayQty, 0);
    const totalPrev = rows.filter((r) => !r.isSpecial).reduce((s, r) => s + r.prevQty, 0);
    rows.push({ grade: null, name: '합계', isSpecial: true, todayQty: totalToday, prevQty: totalPrev, changeSymbol: symbol(totalToday, totalPrev, blankOnEqual) });

    const grandTotalToday = totalToday + brandTotal;
    const grandTotalPrev = totalPrev + brandTotalPrev;

    return NextResponse.json({ rows, grandTotalToday, grandTotalPrev });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
