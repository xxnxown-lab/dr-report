import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CHANNELS, PRODUCT_LIST } from '@/lib/constants';
import { parseSheetText, matchDayToLabel, keywordMap } from '@/lib/parseSheet';
import type { ReportRow, ChannelMap, ChangeSymbol } from '@/lib/types';

function emptyChannels(): ChannelMap {
  return Object.fromEntries(CHANNELS.map((ch) => [ch, { qty: '', amount: '' }])) as ChannelMap;
}

function symbol(today: number, prev: number): ChangeSymbol {
  if (today > prev) return '▲';
  if (today < prev) return '▽';
  return '-';
}

export async function POST(req: NextRequest) {
  try {
    const { todayText, prevText, todayDate, prevDate } = await req.json();

    if (!todayText?.trim()) return NextResponse.json({ error: '당일 데이터를 입력해주세요.' }, { status: 400 });
    if (!prevText?.trim()) return NextResponse.json({ error: '비교일 데이터를 입력해주세요.' }, { status: 400 });

    const parsedToday = parseSheetText(todayText);
    const parsedPrev = parseSheetText(prevText);

    if (parsedToday.products.length === 0)
      return NextResponse.json({ error: '당일 시트에서 닥터아돌(Dr-*) 제품을 찾을 수 없습니다.' }, { status: 400 });

    const todayLabel = matchDayToLabel(parsedToday.dateLabels, todayDate);
    const prevLabel = matchDayToLabel(parsedPrev.dateLabels, prevDate);

    // 제품 → 보고서 항목 매핑
    let codeToReport = new Map<string, string | null>();

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const client = new Anthropic();
        const productListStr = PRODUCT_LIST.map((p) => p.name).join(', ');
        const productsStr = parsedToday.products.map((p) => `${p.code}: ${p.name}`).join('\n');
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: '당신은 제품명을 분류하는 도우미입니다. JSON 배열만 반환하세요.',
          messages: [{
            role: 'user',
            content: `닥터아돌 제품을 아래 보고서 항목 중 하나에 매핑하세요. 해당 없으면 null.\n\n보고서 항목: ${productListStr}\n\n제품 목록:\n${productsStr}\n\nJSON 배열로만 응답: [{"code":"Dr-xxx","reportName":"항목명 또는 null"}]`,
          }],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const mappings: Array<{ code: string; reportName: string | null }> = JSON.parse(jsonMatch[0]);
          codeToReport = new Map(mappings.map((m) => [m.code, m.reportName]));
        }
      } catch { /* fallback */ }
    }

    for (const p of parsedToday.products) {
      if (!codeToReport.has(p.code)) codeToReport.set(p.code, keywordMap(p.name));
    }

    // 당일 수량 집계
    const todayQtyMap = new Map<string, number>();
    let drAldolToday = 0;
    for (const p of parsedToday.products) {
      const reportName = codeToReport.get(p.code);
      const qty = todayLabel ? (p.quantities[todayLabel] ?? 0) : 0;
      if (reportName) todayQtyMap.set(reportName, (todayQtyMap.get(reportName) ?? 0) + qty);
      else drAldolToday += qty;
    }

    // 비교일 수량 집계 (비교 시트 제품도 같은 키워드 매핑 사용)
    const prevQtyMap = new Map<string, number>();
    let drAldolPrev = 0;
    for (const p of parsedPrev.products) {
      const reportName = keywordMap(p.name);
      const qty = prevLabel ? (p.quantities[prevLabel] ?? 0) : 0;
      if (reportName) prevQtyMap.set(reportName, (prevQtyMap.get(reportName) ?? 0) + qty);
      else drAldolPrev += qty;
    }

    const rows: ReportRow[] = PRODUCT_LIST.map((item) => {
      const t = todayQtyMap.get(item.name) ?? 0;
      const p = prevQtyMap.get(item.name) ?? 0;
      return { grade: item.grade, name: item.name, isSpecial: false, channels: emptyChannels(), todayQty: t, prevQty: p, changeSymbol: symbol(t, p) };
    });

    rows.push({ grade: null, name: '닥터아돌', isSpecial: true, channels: emptyChannels(), todayQty: drAldolToday, prevQty: drAldolPrev, changeSymbol: symbol(drAldolToday, drAldolPrev) });

    // 합계는 등급 품목(22개)만 합산 — 닥터아돌 제외
    const totalToday = rows.filter((r) => !r.isSpecial).reduce((s, r) => s + r.todayQty, 0);
    const totalPrev = rows.filter((r) => !r.isSpecial).reduce((s, r) => s + r.prevQty, 0);
    rows.push({ grade: null, name: '합계', isSpecial: true, channels: emptyChannels(), todayQty: totalToday, prevQty: totalPrev, changeSymbol: symbol(totalToday, totalPrev) });

    return NextResponse.json({ rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
