'use client';

import { useState, useCallback } from 'react';
import type { Brand } from '@/lib/constants';
import type { ReportRow } from '@/lib/types';
import { downloadExcel } from '@/lib/excel';

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

function toDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;
}

function toMMDD(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchTabText(url: string): Promise<string> {
  const res = await fetch(`/api/sheets?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.text;
}

const BRAND_LABELS: Record<Brand, string> = { dr: '닥터아돌', hoho: '호호에미' };

export default function Home() {
  const [brand, setBrand] = useState<Brand>('dr');
  const [inputMode, setInputMode] = useState<'url' | 'paste'>('url');

  const [todayUrl, setTodayUrl] = useState('');
  const [prevUrl, setPrevUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [todayDate, setTodayDate] = useState('');
  const [prevDate, setPrevDate] = useState('');

  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportDate, setReportDate] = useState('');
  const [prevLabel, setPrevLabel] = useState('');
  const [todayLabel, setTodayLabel] = useState('');
  const [grandTotalToday, setGrandTotalToday] = useState<number | null>(null);
  const [grandTotalPrev, setGrandTotalPrev] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleBrandChange = useCallback((b: Brand) => {
    setBrand(b);
    setReportRows([]);
    setError('');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (inputMode === 'url' && (!todayUrl.trim() || !prevUrl.trim())) {
      setError('당일 탭 URL과 비교일 탭 URL을 모두 입력해주세요.'); return;
    }
    if (inputMode === 'paste' && !pasteText.trim()) {
      setError('데이터를 붙여넣어주세요.'); return;
    }
    if (!todayDate || !prevDate) { setError('날짜를 모두 선택해주세요.'); return; }

    setLoading(true);
    setError('');
    try {
      let tText = pasteText;
      let pText = pasteText;

      if (inputMode === 'url') {
        [tText, pText] = await Promise.all([fetchTabText(todayUrl), fetchTabText(prevUrl)]);
      }

      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todayText: tText, prevText: pText, todayDate, prevDate, brand }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReportRows(data.rows);
      setReportDate(toMMDD(todayDate));
      setPrevLabel(toDateLabel(prevDate));
      setTodayLabel(toDateLabel(todayDate));
      setGrandTotalToday(data.grandTotalToday ?? null);
      setGrandTotalPrev(data.grandTotalPrev ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [brand, inputMode, todayUrl, prevUrl, pasteText, todayDate, prevDate]);

  const handleCopy = useCallback(async () => {
    if (!reportRows.length) return;
    const header = ['등급', '제품', prevLabel, todayLabel, '기호'];
    const dataRows = reportRows.map((row) => [
      row.grade ?? '', row.name,
      row.prevQty || '', row.todayQty || '', row.changeSymbol,
    ]);
    await navigator.clipboard.writeText([header, ...dataRows].map((r) => r.join('\t')).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [reportRows, prevLabel, todayLabel]);

  const handleDownload = useCallback(() => {
    if (!reportRows.length) return;
    downloadExcel(reportRows, reportDate, prevLabel, todayLabel, BRAND_LABELS[brand]);
  }, [reportRows, reportDate, prevLabel, todayLabel, brand]);

  const gradeSpans: Record<string, number> = {};
  const gradeSeen = new Set<string>();
  reportRows.forEach((r) => { if (r.grade) gradeSpans[r.grade] = (gradeSpans[r.grade] || 0) + 1; });

  const brandLabel = BRAND_LABELS[brand];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        {brandLabel} 결과보고 {reportDate || toMMDD(todayDate) || '--'}
      </h1>

      {/* 브랜드 탭 */}
      <div className="flex gap-2 mb-4">
        {(['dr', 'hoho'] as Brand[]).map((b) => (
          <button key={b} onClick={() => handleBrandChange(b)}
            className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
              brand === b
                ? b === 'dr' ? 'bg-blue-700 text-white shadow' : 'bg-red-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}>
            {BRAND_LABELS[b]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 max-w-3xl">
        {/* 입력 모드 탭 */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setInputMode('url')}
            className={`px-4 py-1.5 rounded text-sm font-medium ${inputMode === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            구글 시트 URL
          </button>
          <button onClick={() => setInputMode('paste')}
            className={`px-4 py-1.5 rounded text-sm font-medium ${inputMode === 'paste' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            텍스트 붙여넣기
          </button>
        </div>

        {inputMode === 'url' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                당일 탭 URL <span className="text-gray-400">(해당 탭 열고 주소창 URL 복사)</span>
              </label>
              <input className="w-full border rounded p-2 text-sm"
                placeholder="https://docs.google.com/spreadsheets/d/...#gid=0"
                value={todayUrl} onChange={(e) => setTodayUrl(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                비교일 탭 URL <span className="text-gray-400">(비교할 달 탭 열고 주소창 URL 복사)</span>
              </label>
              <input className="w-full border rounded p-2 text-sm"
                placeholder="https://docs.google.com/spreadsheets/d/...#gid=1234"
                value={prevUrl} onChange={(e) => setPrevUrl(e.target.value)} />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              스프레드시트 데이터 붙여넣기
              <span className="text-gray-400 ml-1">(당일·비교일이 같은 시트에 있으면 한 번에 처리)</span>
            </label>
            <textarea className="w-full h-32 border rounded p-2 text-xs font-mono resize-y"
              placeholder="구글 시트에서 전체 선택(Ctrl+A) → 복사(Ctrl+C) 후 붙여넣기"
              value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
          </div>
        )}

        <div className="flex flex-wrap gap-4 mt-4 items-center">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 whitespace-nowrap">당일 날짜:</span>
            <input type="date" className="border rounded px-2 py-1 text-sm"
              value={todayDate} onChange={(e) => setTodayDate(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 whitespace-nowrap">비교 날짜:</span>
            <input type="date" className="border rounded px-2 py-1 text-sm"
              value={prevDate} onChange={(e) => setPrevDate(e.target.value)} />
          </label>
          <button onClick={handleGenerate} disabled={loading}
            className="px-6 py-1.5 bg-blue-700 text-white rounded font-medium text-sm disabled:opacity-50">
            {loading ? '생성 중...' : '보고서 생성'}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* 보고서 테이블 */}
      {reportRows.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="flex gap-2 p-3 border-b">
            <button onClick={handleCopy}
              className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium">
              {copied ? '복사됨!' : '클립보드 복사'}
            </button>
            <button onClick={handleDownload}
              className="px-4 py-1.5 bg-orange-600 text-white rounded text-sm font-medium">
              엑셀 다운로드 (.xlsx)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="bg-blue-800 text-white">
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap">등급</th>
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap">제품</th>
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap text-center">{prevLabel}</th>
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap text-center">{todayLabel}</th>
                  <th className="border border-blue-700 px-2 py-1">기호</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row, rowIdx) => {
                  const isFirst = row.grade && !gradeSeen.has(row.grade);
                  if (row.grade) gradeSeen.add(row.grade);
                  const isBrandRow = row.isSpecial && row.name !== '합계';
                  const bg = row.name === '합계' ? 'bg-gray-200 font-bold' : row.isSpecial ? 'bg-gray-100 font-semibold' : '';
                  return (
                    <tr key={rowIdx} className={`hover:bg-yellow-50 ${bg}`}>
                      {isFirst && row.grade ? (
                        <td className="border border-gray-300 px-2 py-0.5 text-center font-bold bg-blue-50"
                          rowSpan={gradeSpans[row.grade]}>{row.grade}</td>
                      ) : !row.grade ? (
                        <td className="border border-gray-300 px-2 py-0.5" />
                      ) : null}
                      <td className="border border-gray-300 px-2 py-0.5 whitespace-nowrap">{row.name}</td>
                      <td className="border border-gray-300 px-2 py-0.5 text-right">
                        {isBrandRow ? '' : (row.prevQty > 0 ? fmt(row.prevQty) : '-')}
                      </td>
                      <td className="border border-gray-300 px-2 py-0.5 text-right">
                        {isBrandRow ? '' : (row.todayQty > 0 ? fmt(row.todayQty) : '-')}
                      </td>
                      <td className={`border border-gray-300 px-2 py-0.5 text-center font-bold ${
                        row.changeSymbol === '▲' ? 'text-red-500' : row.changeSymbol === '▽' ? 'text-blue-500' : 'text-gray-400'
                      }`}>{isBrandRow ? '' : row.changeSymbol}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {grandTotalToday !== null && grandTotalPrev !== null && (
            <div className="px-3 py-2 border-t text-sm text-gray-700">
              <span className="font-semibold">{brandLabel} 전체 판매량</span>
              <span className="mx-3 text-gray-400">|</span>
              <span>{prevLabel}: <strong>{fmt(grandTotalPrev)}개</strong></span>
              <span className="mx-3 text-gray-400">→</span>
              <span>{todayLabel}: <strong>{fmt(grandTotalToday)}개</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
