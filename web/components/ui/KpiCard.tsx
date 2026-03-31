interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'blue' | 'amber' | 'green' | 'red' | 'purple';
}

const ACCENT = {
  blue:   'border-t-blue-500',
  amber:  'border-t-amber-500',
  green:  'border-t-green-500',
  red:    'border-t-red-500',
  purple: 'border-t-purple-500',
};

export default function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  const accentClass = accent ? `border-t-2 ${ACCENT[accent]}` : '';
  return (
    <div
      className={`bg-white border-[0.5px] border-neutral-200 rounded-lg px-4 py-4 ${accentClass}`}
    >
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}
