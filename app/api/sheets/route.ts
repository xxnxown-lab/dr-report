import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 });
  }

  const idMatch = url.match(/\/spreadsheets\/d\/([^\/\?#]+)/);
  if (!idMatch) {
    return NextResponse.json({ error: '유효하지 않은 Google Sheets URL입니다.' }, { status: 400 });
  }

  const sheetId = idMatch[1];
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  const tsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv&gid=${gid}`;

  try {
    const res = await fetch(tsvUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        { error: '스프레드시트를 불러올 수 없습니다. 공개(공유) 설정을 확인해주세요.' },
        { status: 400 }
      );
    }
    const text = await res.text();
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: '네트워크 오류가 발생했습니다.' }, { status: 500 });
  }
}
