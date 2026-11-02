import { useState, type FormEvent } from 'react';
import { adminApi } from '../../api/admin.api';
import { ApiError, errorMessage } from '../../api/client';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CATEGORY_ICON_NAMES, CategoryIcon } from '../../components/ui/CategoryIcon';
import { Dialog } from '../../components/ui/Dialog';
import { TextAreaField, TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import type { AdminCategory, CategoryInput } from '../../types/api';

/** Add or edit one category. `category` is null when adding. */
function CategoryForm({ category, nextPosition, onClose, onSaved }: { category: AdminCategory | null; nextPosition: number; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CategoryInput>({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    icon: category?.icon ?? '',
    sortOrder: category?.sortOrder ?? nextPosition,
    isActive: category?.isActive ?? true,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      if (category) await adminApi.updateCategory(category.id, form);
      else await adminApi.createCategory(form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={category ? `Edit "${category.name}"` : 'Add a category'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField label="Name" required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fieldErrors.name} />
        <TextField
          label="Address name (optional)"
          maxLength={60}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          error={fieldErrors.slug}
          hint={category ? 'Used in links like /explore?category=... Changing it breaks old links.' : 'Leave empty to make one from the name, e.g. "pet-care".'}
        />
        <TextAreaField label="Description (optional)" rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={fieldErrors.description} />
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Icon</legend>
          <div className="mt-2 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
            {CATEGORY_ICON_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={form.icon === name}
                onClick={() => setForm({ ...form, icon: name })}
                className={`flex aspect-square items-center justify-center rounded-lg ring-1 ${form.icon === name ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-600 ring-slate-200 hover:ring-brand-500'}`}
              >
                <CategoryIcon name={name} className="h-5 w-5" />
              </button>
            ))}
          </div>
          {fieldErrors.icon && <p className="mt-1 text-sm text-red-600">{fieldErrors.icon}</p>}
        </fieldset>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <TextField
            label="Position in lists"
            type="number"
            min={0}
            value={String(form.sortOrder)}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
            error={fieldErrors.sortOrder}
            hint="Smaller numbers come first."
          />
          <label className="flex items-center gap-2 pb-8 text-sm text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Offered to businesses and customers
          </label>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{category ? 'Save changes' : 'Add category'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ManageCategoriesPage() {
  const list = useApi('admin-categories', () => adminApi.categories());
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const remove = async (category: AdminCategory) => {
    if (!window.confirm(`Delete the category "${category.name}"? This cannot be undone.`)) return;
    setDeleting(category.id);
    try {
      await adminApi.deleteCategory(category.id);
      setNotice({ tone: 'success', text: `"${category.name}" was deleted.` });
      list.reload();
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err) });
    } finally {
      setDeleting(null);
    }
  };

  const nextPosition = list.data ? Math.max(0, ...list.data.map((c) => c.sortOrder)) + 1 : 1;

  return (
    <>
      <PageHeader
        title="Categories"
        description="The categories businesses choose and customers filter by. Switch a category off to stop offering it; delete it only if no business uses it."
        action={<Button onClick={() => setEditing('new')}>Add category</Button>}
      />
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <Card>
        {list.loading && !list.data && <Spinner />}
        {list.error && <Alert tone="error">{list.error}</Alert>}
        {list.data && (
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-3 py-3">Address name</th>
                  <th className="px-3 py-3">Businesses</th>
                  <th className="px-3 py-3">Position</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data.map((category) => (
                  <tr key={category.id} className={`align-top ${category.isActive ? '' : 'bg-slate-50 text-slate-500'}`}>
                    <td className="px-6 py-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><CategoryIcon name={category.icon} /></span>
                        <span>
                          <span className="block font-medium text-slate-900">{category.name}</span>
                          {category.description && <span className="block text-xs text-slate-500">{category.description}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{category.slug}</td>
                    <td className="px-3 py-3">{category.businessCount}</td>
                    <td className="px-3 py-3">{category.sortOrder}</td>
                    <td className="px-3 py-3">{category.isActive ? <Badge color="green">Offered</Badge> : <Badge>Switched off</Badge>}</td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setEditing(category)} className="font-semibold text-brand-700 hover:underline">Edit</button>
                        {category.businessCount === 0 && (
                          <button type="button" disabled={deleting === category.id} onClick={() => remove(category)} className="font-semibold text-red-700 hover:underline disabled:opacity-50">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && (
        <CategoryForm
          category={editing === 'new' ? null : editing}
          nextPosition={nextPosition}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice({ tone: 'success', text: editing === 'new' ? 'The category was added.' : 'Your changes were saved.' });
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}
