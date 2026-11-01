import type { Category } from '../../types/api';
import { CategoryIcon } from '../ui/CategoryIcon';

export const MAX_CATEGORIES = 3;

/** Checkbox grid to choose 1 to 3 categories. */
export function CategoryPicker({
  categories,
  selected,
  onChange,
  error,
  singleColumn = false,
}: {
  categories: Category[];
  selected: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  /** Use one column in narrow places (e.g. a sidebar card). */
  singleColumn?: boolean;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : selected.length < MAX_CATEGORIES ? [...selected, id] : selected);

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-700">
        Categories <span className="text-slate-500">(choose 1 to {MAX_CATEGORIES})</span>
      </legend>
      <div className={`grid gap-2 ${singleColumn ? '' : 'sm:grid-cols-2'}`}>
        {categories.map((category) => {
          const checked = selected.includes(category.id);
          const disabled = !checked && selected.length >= MAX_CATEGORIES;
          return (
            <label
              key={category.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 text-sm ring-1 ${checked ? 'bg-brand-50 ring-brand-500' : 'ring-slate-200'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(category.id)} className="h-4 w-4 accent-brand-600" />
              <CategoryIcon name={category.icon} className="h-4 w-4 shrink-0 text-brand-600" /> {category.name}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}
