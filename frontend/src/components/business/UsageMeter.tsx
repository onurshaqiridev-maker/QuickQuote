/** "8 of 10 services used" with a small bar. limit null = unlimited. */
export function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = limit ? Math.min(100, (used / limit) * 100) : 0;
  const full = limit !== null && used >= limit;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className={full ? 'font-semibold text-amber-700' : 'text-slate-800'}>
          {used} {limit === null ? '(unlimited)' : `of ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${full ? 'bg-amber-500' : 'bg-brand-600'}`} style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
