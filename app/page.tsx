'use client';

import { useState, useCallback } from 'react';
import { CHANNELS } from '@/lib/constants';
import type { Channel } from '@/lib/constants';
import type { ReportRow } from '@/lib/types';
import { downloadExcel } from '@/lib/excel';

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

function calcTotal(row: ReportRow): number {
  return CHANNELS.reduce((sum, ch) => {
    const v = parseInt((row.channels[ch].amount || '').replace(/,/g, ''), 10);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
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

export default function Home() {
  const [inputMode, setInputMode] = useState<'url' | 'paste'>('url');

  // URL 모드: 각 탭의 URL을 직접 입력
  const [todayUrl, setTodayUrl] = useState('');
  const [prevUrl, setPrevUrl] = useState('');

  // 붙여넣기 모드: 텍스트 하나
  const [pasteText, setPasteText] = useState('');

  const [todayDate, setTodayDate] = useState('');
  const [prevDate, setPrevDate] = useState('');

  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportDate, setReportDate] = useState('');
  const [prevLabel, setPrevLabel] = useState('');
  const [todayLabel, setTodayLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
        body: JSON.stringify({ todayText: tText, prevText: pText, todayDate, prevDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReportRows(data.rows);
      setReportDate(toMMDD(todayDate));
      setPrevLabel(toDateLabel(prevDate));
      setTodayLabel(toDateLabel(todayDate));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [inputMode, todayUrl, prevUrl, pasteText, todayDate, prevDate]);

  const updateChannel = useCallback((rowIdx: number, ch: Channel, field: 'qty' | 'amount', value: string) => {
    setReportRows((prev) => {
      const next = prev.map((r, i) =>
        i !== rowIdx ? r : { ...r, channels: { ...r.channels, [ch]: { ...r.channels[ch], [field]: value } } }
      );
      const sumIdx = next.findIndex((r) => r.name === '합계');
      if (sumIdx === -1) return next;
      const newCh = { ...next[sumIdx].channels };
      for (const channel of CHANNELS) {
        let qty = 0, amount = 0;
        next.forEach((r, i) => {
          if (i === sumIdx) return;
          qty += parseInt((r.channels[channel].qty || '').replace(/,/g, ''), 10) || 0;
          amount += parseInt((r.channels[channel].amount || '').replace(/,/g, ''), 10) || 0;
        });
        newCh[channel] = { qty: qty > 0 ? String(qty) : '', amount: amount > 0 ? String(amount) : '' };
      }
      const updated = [...next];
      updated[sumIdx] = { ...next[sumIdx], channels: newCh };
      return updated;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!reportRows.length) return;
    const h1 = ['등급', '제품', '합계', ...CHANNELS.flatMap((ch) => [ch, '']), prevLabel, todayLabel, '기호'];
    const h2 = ['', '', '', ...CHANNELS.flatMap(() => ['수량', '금액']), '', '', ''];
    const dataRows = reportRows.map((row) => [
      row.grade ?? '', row.name, calcTotal(row) || '',
      ...CHANNELS.flatMap((ch) => [row.channels[ch].qty, row.channels[ch].amount]),
      row.prevQty || '', row.todayQty || '', row.changeSymbol,
    ]);
    await navigator.clipboard.writeText([h1, h2, ...dataRows].map((r) => r.join('\t')).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [reportRows, prevLabel, todayLabel]);

  const handleDownload = useCallback(() => {
    if (!reportRows.length) return;
    downloadExcel(reportRows, reportDate, prevLabel, todayLabel);
  }, [reportRows, reportDate, prevLabel, todayLabel]);

  const gradeSpans: Record<string, number> = {};
  const gradeSeen = new Set<string>();
  reportRows.forEach((r) => { if (r.grade) gradeSpans[r.grade] = (gradeSpans[r.grade] || 0) + 1; });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        dr 결과보고 {reportDate || toMMDD(todayDate) || '--'}
      </h1>

      <div className="bg-white rounded-lg shadow p-4 mb-4 max-w-3xl">
        {/* 모드 탭 */}
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

        {/* 날짜 + 생성 버튼 */}
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
              {copied ? '복사됨!' : 'ERP 붙여넣기용 복사'}
            </button>
            <button onClick={handleDownload}
              className="px-4 py-1.5 bg-orange-600 text-white rounded text-sm font-medium">
              엑셀 다운로드 (.xlsx)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-blue-800 text-white">
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap" rowSpan={2}>등급</th>
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap" rowSpan={2}>제품</th>
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap" rowSpan={2}>합계</th>
                  {CHANNELS.map((ch) => (
                    <th key={ch} className="border border-blue-700 px-2 py-1 whitespace-nowrap text-center" colSpan={2}>{ch}</th>
                  ))}
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap text-center" rowSpan={2}>{prevLabel}</th>
                  <th className="border border-blue-700 px-2 py-1 whitespace-nowrap text-center" rowSpan={2}>{todayLabel}</th>
                  <th className="border border-blue-700 px-2 py-1" rowSpan={2}>기호</th>
                </tr>
                <tr className="bg-blue-700 text-white">
                  {CHANNELS.map((ch) => (
                    <>
                      <th key={`${ch}-q`} className="border border-blue-600 px-1 py-1 text-center">수</th>
                      <th key={`${ch}-a`} className="border border-blue-600 px-1 py-1 text-center">금</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row, rowIdx) => {
                  const isFirst = row.grade && !gradeSeen.has(row.grade);
                  if (row.grade) gradeSeen.add(row.grade);
                  const rowTotal = calcTotal(row);
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
                        {rowTotal > 0 ? rowTotal.toLocaleString('ko-KR') : '-'}
                      </td>
                      {CHANNELS.map((ch) => (
                        <>
                          <td key={`${rowIdx}-${ch}-q`} className="border border-gray-300 p-0">
                            <input className="w-12 text-right px-1 py-0.5 text-xs bg-transparent focus:bg-blue-50 focus:outline-none"
                              value={row.channels[ch].qty}
                              onChange={(e) => updateChannel(rowIdx, ch as Channel, 'qty', e.target.value)} />
                          </td>
                          <td key={`${rowIdx}-${ch}-a`} className="border border-gray-300 p-0">
                            <input className="w-20 text-right px-1 py-0.5 text-xs bg-transparent focus:bg-blue-50 focus:outline-none"
                              value={row.channels[ch].amount}
                              onChange={(e) => updateChannel(rowIdx, ch as Channel, 'amount', e.target.value)} />
                          </td>
                        </>
                      ))}
                      <td className="border border-gray-300 px-2 py-0.5 text-right">
                        {row.name === '닥터아돌' ? '' : fmt(row.prevQty)}
                      </td>
                      <td className="border border-gray-300 px-2 py-0.5 text-right">
                        {row.name === '닥터아돌' ? '' : fmt(row.todayQty)}
                      </td>
                      <td className={`border border-gray-300 px-2 py-0.5 text-center font-bold ${
                        row.changeSymbol === '▲' ? 'text-red-500' : row.changeSymbol === '▽' ? 'text-blue-500' : 'text-gray-400'
                      }`}>{row.name === '닥터아돌' ? '' : row.changeSymbol}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
