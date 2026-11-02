/** A row of tab buttons, e.g. "Upcoming | Past | Cancelled". An optional number is shown next to each label. */
export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: TabItem<T>[]; active: T; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${active === tab.value ? 'bg-white shadow-sm' : 'text-slate-600'}`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 text-xs text-brand-700">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
