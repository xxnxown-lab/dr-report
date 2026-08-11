'use client';

import { useState, useCallback } from 'react';
import type { Brand } from '@/lib/constants';
import { BRAND_CONFIG, BRAND_ORDER, ROAS_BRAND_ORDER } from '@/lib/constants';
import type { ReportRow, RoasRow } from '@/lib/types';
import { downloadExcel, downloadOliveyoungExcel, downloadRoasExcel } from '@/lib/excel';
import DateRangePicker from './DateRangePicker';

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

function toMD(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function toMDRange(from: string, to: string): string {
  if (!to || to === from) return toMD(from);
  return `${toMD(from)}~${toMD(to)}`;
}

async function fetchTabText(url: string): Promise<string> {
  const res = await fetch(`/api/sheets?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.text;
}


export default function Home() {
  const [brand, setBrand] = useState<Brand>('dr');
  const [todayUrl, setTodayUrl] = useState('');
  const [prevUrl, setPrevUrl] = useState('');
  const [todayDate, setTodayDate] = useState('');
  const [prevDate, setPrevDate] = useState('');
  const [oyBrand, setOyBrand] = useState<Brand>('dr');
  const [oyUrl, setOyUrl] = useState('');
  const [oyPrevUrl, setOyPrevUrl] = useState('');
  const [oyToday, setOyToday] = useState({ from: '', to: '' });
  const [oyPrev, setOyPrev] = useState({ from: '', to: '' });
  const [oyRows, setOyRows] = useState<Array<{ name: string; todayQty: number; prevQty: number }>>([]);
  const [oyTodayTotal, setOyTodayTotal] = useState(0);
  const [oyPrevTotal, setOyPrevTotal] = useState(0);
  const [oyCopied, setOyCopied] = useState(false);

  const [roasBrand, setRoasBrand] = useState<Brand>('dr');
  const [roasUrl, setRoasUrl] = useState('');
  const [roasRows, setRoasRows] = useState<RoasRow[]>([]);
  const [roasTotalAdSpend, setRoasTotalAdSpend] = useState(0);
  const [roasTotalRevenue, setRoasTotalRevenue] = useState(0);
  const [roasTotalRoas, setRoasTotalRoas] = useState(0);
  const [roasCopied, setRoasCopied] = useState(false);

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
    if (b !== 'oliveyoung') setOyRows([]);
    if (b !== 'roas') setRoasRows([]);
    if (b === 'oliveyoung' || b === 'roas') setReportRows([]);
    setError('');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!todayUrl.trim() || !prevUrl.trim()) {
      setError('당일 URL과 비교일 URL을 모두 입력해주세요.'); return;
    }
    if (!todayDate || !prevDate) { setError('날짜를 모두 선택해주세요.'); return; }

    setLoading(true);
    setError('');
    try {
      const [tText, pText] = await Promise.all([fetchTabText(todayUrl), fetchTabText(prevUrl)]);

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
  }, [brand, todayUrl, prevUrl, todayDate, prevDate]);

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

  const handleOyGenerate = useCallback(async () => {
    if (!oyUrl.trim()) { setError('올리브영 판매수량 URL을 입력해주세요.'); return; }
    if (!oyPrevUrl.trim()) { setError('비교일 URL을 입력해주세요.'); return; }
    if (!oyToday.from || !oyPrev.from) { setError('날짜를 모두 선택해주세요.'); return; }

    setLoading(true);
    setError('');
    try {
      const [tText, pText] = await Promise.all([fetchTabText(oyUrl), fetchTabText(oyPrevUrl)]);
      const res = await fetch('/api/parse-oliveyoung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todayText: tText, prevText: pText,
          todayDate: oyToday.from, todayDateEnd: oyToday.to || undefined,
          prevDate: oyPrev.from, prevDateEnd: oyPrev.to || undefined,
          oyBrand,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOyRows(data.products);
      setOyTodayTotal(data.todayTotal);
      setOyPrevTotal(data.prevTotal);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [oyUrl, oyPrevUrl, oyToday, oyPrev, oyBrand]);

  const handleOyDownload = useCallback(async () => {
    if (!oyRows.length) return;
    const brandLabel = BRAND_CONFIG[oyBrand].label;
    await downloadOliveyoungExcel(oyRows, toMDRange(oyPrev.from, oyPrev.to), toMDRange(oyToday.from, oyToday.to), brandLabel, oyPrevTotal, oyTodayTotal);
  }, [oyRows, oyBrand, oyPrev, oyToday, oyPrevTotal, oyTodayTotal]);

  const handleOyCopy = useCallback(async () => {
    if (!oyRows.length) return;
    const header = `${toMDRange(oyPrev.from, oyPrev.to)} • ${toMDRange(oyToday.from, oyToday.to)} 올영판매량`;
    const total = `합계 ${oyPrevTotal} / ${oyTodayTotal}`;
    const lines = oyRows.map((p) => `${p.name} ${p.prevQty} / ${p.todayQty}`);
    await navigator.clipboard.writeText([header, total, ...lines].join('\n'));
    setOyCopied(true);
    setTimeout(() => setOyCopied(false), 2000);
  }, [oyRows, oyTodayTotal, oyPrevTotal, oyToday, oyPrev]);

  const handleRoasGenerate = useCallback(async () => {
    if (!roasUrl.trim()) { setError('제품별 ROAS URL을 입력해주세요.'); return; }

    setLoading(true);
    setError('');
    try {
      const text = await fetchTabText(roasUrl);
      const res = await fetch('/api/parse-roas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, brand: roasBrand }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoasRows(data.rows);
      setRoasTotalAdSpend(data.totalAdSpend);
      setRoasTotalRevenue(data.totalRevenue);
      setRoasTotalRoas(data.totalRoas);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [roasUrl, roasBrand]);

  const handleRoasCopy = useCallback(async () => {
    if (!roasRows.length) return;
    const header = ['등급', '제품', '광고비', 'ROAS', '매출'];
    const dataRows = roasRows.filter((row) => row.grade).map((row) => [
      row.grade ?? '', row.name,
      row.adSpend || '', row.adSpend > 0 ? `${row.roas.toFixed(0)}%` : '-', row.revenue || '',
    ]);
    await navigator.clipboard.writeText([header, ...dataRows].map((r) => r.join('\t')).join('\n'));
    setRoasCopied(true);
    setTimeout(() => setRoasCopied(false), 2000);
  }, [roasRows]);

  const handleRoasDownload = useCallback(() => {
    if (!roasRows.length) return;
    downloadRoasExcel(roasRows.filter((r) => r.grade), BRAND_CONFIG[roasBrand].label, roasTotalAdSpend, roasTotalRevenue, roasTotalRoas);
  }, [roasRows, roasBrand, roasTotalAdSpend, roasTotalRevenue, roasTotalRoas]);

  const handleDownload = useCallback(() => {
    if (!reportRows.length) return;
    downloadExcel(reportRows, reportDate, prevLabel, todayLabel, BRAND_CONFIG[brand].label, grandTotalPrev, grandTotalToday);
  }, [reportRows, reportDate, prevLabel, todayLabel, brand]);

  const gradeSpans: Record<string, number> = {};
  const gradeSeen = new Set<string>();
  reportRows.forEach((r) => { if (r.grade) gradeSpans[r.grade] = (gradeSpans[r.grade] || 0) + 1; });

  const roasGradeSpans: Record<string, number> = {};
  const roasGradeSeen = new Set<string>();
  roasRows.forEach((r) => { if (r.grade) roasGradeSpans[r.grade] = (roasGradeSpans[r.grade] || 0) + 1; });

  const brandLabel = BRAND_CONFIG[brand].label;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        {brandLabel} 결과보고 {reportDate || toMMDD(todayDate) || '--'}
      </h1>

      {/* 브랜드 탭 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {BRAND_ORDER.map((b) => {
          const cfg = BRAND_CONFIG[b];
          const isActive = brand === b;
          const isOliveYoung = b === 'oliveyoung';
          const isRoas = b === 'roas';
          return (
            <button key={b} onClick={() => handleBrandChange(b)}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                isActive
                  ? cfg.activeClass
                  : isOliveYoung
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : isRoas
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}>
              {cfg.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 max-w-3xl">
        <div className="space-y-3">
          {brand === 'oliveyoung' ? (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">브랜드 선택</label>
                <select className="w-full border rounded p-2 text-sm"
                  value={oyBrand} onChange={(e) => setOyBrand(e.target.value as Brand)}>
                  <option value="dr">닥터아돌</option>
                  <option value="hoho">호호에미</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">브랜드별 올리브영 판매수량 URL</label>
                <input className="w-full border rounded p-2 text-sm"
                  placeholder="https://docs.google.com/spreadsheets/d/...#gid=0"
                  value={oyUrl} onChange={(e) => setOyUrl(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  비교일 탭 URL <span className="text-gray-400">(비교할 달 탭 열고 주소창 URL 복사)</span>
                </label>
                <input className="w-full border rounded p-2 text-sm"
                  placeholder="https://docs.google.com/spreadsheets/d/...#gid=1234"
                  value={oyPrevUrl} onChange={(e) => setOyPrevUrl(e.target.value)} />
              </div>
            </>
          ) : brand === 'roas' ? (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">브랜드 선택</label>
                <select className="w-full border rounded p-2 text-sm"
                  value={roasBrand} onChange={(e) => setRoasBrand(e.target.value as Brand)}>
                  {ROAS_BRAND_ORDER.map((b) => (
                    <option key={b} value={b}>{BRAND_CONFIG[b].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">브랜드별 제품별 광고비 사용내역 URL</label>
                <input className="w-full border rounded p-2 text-sm"
                  placeholder="https://docs.google.com/spreadsheets/d/...#gid=0"
                  value={roasUrl} onChange={(e) => setRoasUrl(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  국내 제품별 오전 판매수량 URL <span className="text-gray-400">(해당 탭 열고 주소창 URL 복사)</span>
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
            </>
          )}
        </div>

        {brand === 'oliveyoung' ? (
          <div className="flex flex-wrap gap-4 mt-4 items-center">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 whitespace-nowrap">당일 날짜:</span>
              <DateRangePicker value={oyToday} onChange={setOyToday} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 whitespace-nowrap">비교 날짜:</span>
              <DateRangePicker value={oyPrev} onChange={setOyPrev} />
            </div>
            <button onClick={handleOyGenerate} disabled={loading}
              className="px-6 py-1.5 bg-blue-700 text-white rounded font-medium text-sm disabled:opacity-50">
              {loading ? '생성 중...' : '보고서 생성'}
            </button>
          </div>
        ) : brand === 'roas' ? (
          <div className="flex flex-wrap gap-4 mt-4 items-center">
            <button onClick={handleRoasGenerate} disabled={loading}
              className="px-6 py-1.5 bg-blue-700 text-white rounded font-medium text-sm disabled:opacity-50">
              {loading ? '생성 중...' : '보고서 생성'}
            </button>
          </div>
        ) : (
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
        )}

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* 올리브영 보고서 */}
      {brand === 'oliveyoung' && oyRows.length > 0 && (
        <div className="bg-white rounded-lg shadow max-w-3xl">
          <div className="flex gap-2 p-3 border-b">
            <button onClick={handleOyCopy}
              className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium">
              {oyCopied ? '복사됨!' : '클립보드 복사'}
            </button>
            <button onClick={handleOyDownload}
              className="px-4 py-1.5 bg-orange-600 text-white rounded text-sm font-medium">
              엑셀 다운로드 (.xlsx)
            </button>
          </div>
          <pre className="p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {`${toMDRange(oyPrev.from, oyPrev.to)} • ${toMDRange(oyToday.from, oyToday.to)} 올영판매량\n합계 ${oyPrevTotal} / ${oyTodayTotal}\n${oyRows.map((p) => `${p.name} ${p.prevQty} / ${p.todayQty}`).join('\n')}`}
          </pre>
        </div>
      )}

      {/* 제품별 ROAS 테이블 */}
      {brand === 'roas' && roasRows.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="flex gap-2 p-3 border-b">
            <button onClick={handleRoasCopy}
              className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium">
              {roasCopied ? '복사됨!' : '클립보드 복사'}
            </button>
            <button onClick={handleRoasDownload}
              className="px-4 py-1.5 bg-orange-600 text-white rounded text-sm font-medium">
              엑셀 다운로드 (.xlsx)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="bg-indigo-800 text-white">
                  <th className="border border-indigo-700 px-2 py-1 whitespace-nowrap">등급</th>
                  <th className="border border-indigo-700 px-2 py-1 whitespace-nowrap">제품</th>
                  <th className="border border-indigo-700 px-2 py-1 whitespace-nowrap text-center">광고비</th>
                  <th className="border border-indigo-700 px-2 py-1 whitespace-nowrap text-center">ROAS</th>
                  <th className="border border-indigo-700 px-2 py-1 whitespace-nowrap text-center">매출</th>
                </tr>
              </thead>
              <tbody>
                {roasRows.filter((row) => row.grade).map((row, rowIdx) => {
                  const isFirst = row.grade && !roasGradeSeen.has(row.grade);
                  if (row.grade) roasGradeSeen.add(row.grade);
                  return (
                    <tr key={rowIdx} className="hover:bg-yellow-50">
                      {isFirst && row.grade ? (
                        <td className="border border-gray-300 px-2 py-0.5 text-center font-bold bg-indigo-50"
                          rowSpan={roasGradeSpans[row.grade]}>{row.grade}</td>
                      ) : null}
                      <td className="border border-gray-300 px-2 py-0.5 whitespace-nowrap">{row.name}</td>
                      <td className="border border-gray-300 px-2 py-0.5 text-right">
                        {row.adSpend > 0 ? fmt(row.adSpend) : '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-0.5 text-right font-bold">
                        {row.adSpend > 0 ? `${row.roas.toFixed(0)}%` : '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-0.5 text-right">
                        {row.revenue > 0 ? fmt(row.revenue) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-3 py-2 border-t text-sm text-gray-700">
            <span className="font-semibold">{BRAND_CONFIG[roasBrand].label} 전체</span>
            <span className="mx-3 text-gray-400">|</span>
            <span>광고비: <strong>{fmt(roasTotalAdSpend)}원</strong></span>
            <span className="mx-3 text-gray-400">|</span>
            <span>ROAS: <strong>{roasTotalRoas.toFixed(0)}%</strong></span>
            <span className="mx-3 text-gray-400">|</span>
            <span>매출: <strong>{fmt(roasTotalRevenue)}원</strong></span>
          </div>
        </div>
      )}

      {/* 보고서 테이블 */}
      {brand !== 'oliveyoung' && brand !== 'roas' && reportRows.length > 0 && (
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
