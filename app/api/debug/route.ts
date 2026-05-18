import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { rawText } = await req.json();
  if (!rawText) return NextResponse.json({ error: 'no text' });

  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const rows = lines.map((l: string) => l.split('\t'));
  const nonEmpty = rows.filter((r: string[]) => r.some((c: string) => c.trim() !== ''));

  const preview = nonEmpty.slice(0, 10).map((r: string[], i: number) => ({
    rowIndex: i,
    cells: r.slice(0, 6).map((c: string) => JSON.stringify(c)),
    colCount: r.length,
  }));

  let dateRowIdx = -1;
  for (let i = 0; i < nonEmpty.length; i++) {
    if (nonEmpty[i].some((c: string) => /\d+\([가-힣]+\)/.test(c.trim()))) {
      dateRowIdx = i;
      break;
    }
  }

  let channelRowIdx = -1;
  if (dateRowIdx !== -1) {
    for (let i = dateRowIdx + 1; i < nonEmpty.length; i++) {
      if (nonEmpty[i].some((c: string) => ['오켓', '카페', '네버'].includes(c.trim()))) {
        channelRowIdx = i;
        break;
      }
    }
  }

  const drRows = nonEmpty.filter((r: string[]) => (r[0] || '').trim().startsWith('Dr-')).length;

  return NextResponse.json({
    totalLines: lines.length,
    nonEmptyRows: nonEmpty.length,
    dateRowIdx,
    channelRowIdx,
    drProductCount: drRows,
    firstRows: preview,
    separator: rawText.includes('\t') ? 'TAB' : 'SPACE_OR_OTHER',
  });
}
