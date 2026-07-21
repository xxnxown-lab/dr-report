'use client';
import { useState, useRef, useEffect } from 'react';

function toMD(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`;
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface DateRange {
  from: string;
  to: string;
}

interface Props {
  value: DateRange;
  onChange: (v: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<'from' | 'to'>('from');
  const [hover, setHover] = useState('');
  const [viewYear, setViewYear] = useState(() => {
    const d = value.from ? new Date(value.from + 'T00:00:00') : new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = value.from ? new Date(value.from + 'T00:00:00') : new Date();
    return d.getMonth();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPicking('from');
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function openCalendar() {
    if (value.from) {
      const d = new Date(value.from + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    setPicking('from');
    setHover('');
    setOpen(true);
  }

  function handleDayClick(dateStr: string) {
    if (picking === 'from') {
      onChange({ from: dateStr, to: '' });
      setPicking('to');
    } else {
      if (dateStr < value.from) {
        onChange({ from: dateStr, to: '' });
        setPicking('to');
      } else if (dateStr === value.from) {
        setPicking('from');
        setOpen(false);
      } else {
        onChange({ from: value.from, to: dateStr });
        setPicking('from');
        setOpen(false);
      }
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  function cellStyle(dateStr: string) {
    const isFrom = dateStr === value.from;
    const isTo = !!value.to && dateStr === value.to;
    const previewTo = picking === 'to' ? (hover || '') : '';
    const isPreviewTo = !!previewTo && dateStr === previewTo && dateStr !== value.from;

    let rangeEnd = value.to;
    if (picking === 'to' && hover && hover >= value.from) rangeEnd = hover;
    const inRange = !!value.from && !!rangeEnd && dateStr > value.from && dateStr < rangeEnd;

    if (isFrom || isTo) return 'bg-blue-600 text-white font-bold rounded';
    if (isPreviewTo && picking === 'to') return 'bg-blue-300 text-white rounded';
    if (inRange) return 'bg-blue-100 text-blue-800';
    return 'hover:bg-gray-100 rounded';
  }

  function displayLabel() {
    if (!value.from) return '날짜 선택';
    if (!value.to || value.to === value.from) return toMD(value.from);
    return `${toMD(value.from)} ~ ${toMD(value.to)}`;
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={openCalendar}
        className="border rounded px-2 py-1 text-sm bg-white hover:bg-gray-50 min-w-[120px] text-left"
      >
        {displayLabel()}
      </button>

      {open && (
        <div className="absolute z-50 bg-white border rounded-lg shadow-xl p-3 mt-1 w-64 select-none">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="px-2 py-0.5 hover:bg-gray-100 rounded text-gray-600">‹</button>
            <span className="text-sm font-semibold">{viewYear}년 {viewMonth + 1}월</span>
            <button onClick={nextMonth} className="px-2 py-0.5 hover:bg-gray-100 rounded text-gray-600">›</button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
            {WEEK.map(w => <div key={w}>{w}</div>)}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7 text-center text-xs gap-y-0.5">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toISO(viewYear, viewMonth, day);
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => setHover(dateStr)}
                  onMouseLeave={() => setHover('')}
                  className={`py-1 text-xs transition-colors ${cellStyle(dateStr)}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* 안내 + 버튼 */}
          <div className="mt-2 pt-2 border-t flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {picking === 'from' ? '시작일 선택' : '종료일 선택 (단일날짜면 같은 날 클릭)'}
            </span>
            {picking === 'to' && (
              <button
                onClick={() => { setPicking('from'); setOpen(false); }}
                className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded"
              >
                확인
              </button>
            )}
          </div>

          {value.from && (
            <button
              onClick={() => { onChange({ from: '', to: '' }); setPicking('from'); setOpen(false); }}
              className="mt-1 w-full text-xs text-gray-400 hover:text-red-500"
            >
              초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}
