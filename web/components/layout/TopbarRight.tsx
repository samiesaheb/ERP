'use client';

import { useState, useEffect } from 'react';

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getShift(hour: number): string {
  if (hour >= 6  && hour < 14) return 'Morning shift';
  if (hour >= 14 && hour < 22) return 'Afternoon shift';
  return 'Night shift';
}

interface TopbarRightProps {
  alertCount?: number;
  userInitials?: string;
}

export default function TopbarRight({ alertCount = 0, userInitials = 'SS' }: TopbarRightProps) {
  const [display, setDisplay] = useState<{ time: string; shift: string } | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const hh  = String(now.getHours()).padStart(2, '0');
      const mm  = String(now.getMinutes()).padStart(2, '0');
      setDisplay({
        time:  `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]} · ${hh}:${mm}`,
        shift: getShift(now.getHours()),
      });
    }
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2.5">
      {display && (
        <>
          <span className="text-[11px] text-neutral-400 tabular-nums hidden sm:block">
            {display.time}
          </span>
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">
            {display.shift}
          </span>
        </>
      )}

      {alertCount > 0 && (
        <span className="w-[18px] h-[18px] rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center cursor-pointer">
          {alertCount}
        </span>
      )}

      <div className="w-7 h-7 rounded-full bg-neutral-200 border-[0.5px] border-neutral-300 flex items-center justify-center text-[10px] font-semibold text-neutral-600 cursor-pointer select-none">
        {userInitials}
      </div>
    </div>
  );
}
