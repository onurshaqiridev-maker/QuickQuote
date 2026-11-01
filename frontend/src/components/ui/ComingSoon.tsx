/**
 * Placeholder for pages whose features are built in a later phase of the roadmap
 * (see docs/PROJECT_OVERVIEW.md). The page and its route already exist.
 */
export function ComingSoon({ phase, title, features }: { phase: number; title: string; features: string[] }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">Phase {phase}</span>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <p className="mt-3 text-sm text-slate-600">This page is ready in the navigation. Its features arrive in phase {phase}:</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
