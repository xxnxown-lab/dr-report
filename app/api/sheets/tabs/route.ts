import { NextRequest, NextResponse } from 'next/server';

export interface SheetTab {
  name: string;
  gid: string;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });

  const idMatch = url.match(/\/spreadsheets\/d\/([^\/\?#]+)/);
  if (!idMatch) return NextResponse.json({ error: '유효하지 않은 Google Sheets URL입니다.' }, { status: 400 });

  const sheetId = idMatch[1];
  const feedUrl = `https://spreadsheets.google.com/feeds/worksheets/${sheetId}/public/basic?alt=json`;

  try {
    const res = await fetch(feedUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        { error: '탭 목록을 불러올 수 없습니다. 공유 설정이 "링크가 있는 모든 사용자 - 뷰어"인지 확인해주세요.' },
        { status: 400 }
      );
    }

    const data = await res.json();
    const entries: unknown[] = data?.feed?.entry ?? [];

    const tabs: SheetTab[] = entries.map((entry) => {
      const e = entry as Record<string, unknown>;
      const name = (e['title'] as Record<string, unknown>)?.$t as string ?? '';

      // link 배열에서 gviz URL의 gid 파라미터 추출
      const links: unknown[] = (e['link'] as unknown[]) ?? [];
      let gid = '0';
      for (const link of links) {
        const l = link as Record<string, string>;
        const gidMatch = (l.href ?? '').match(/[?&]gid=(\d+)/);
        if (gidMatch) { gid = gidMatch[1]; break; }
      }

      return { name, gid };
    });

    return NextResponse.json({ tabs });
  } catch {
    return NextResponse.json({ error: '네트워크 오류가 발생했습니다.' }, { status: 500 });
  }
}
