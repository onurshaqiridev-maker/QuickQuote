import { ArrowDown, ArrowUp, ImageOff, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { businessApi, type ProfileInput } from '../../api/business.api';
import { ApiError, assetUrl, errorMessage } from '../../api/client';
import { publicApi } from '../../api/public.api';
import { CategoryPicker } from '../../components/business/CategoryPicker';
import { ImageUploadButton } from '../../components/business/ImageUploadButton';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { TextAreaField, TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import type { BusinessProfile, FieldErrorDetail, Photo } from '../../types/api';

type Notice = { tone: 'success' | 'error'; text: string; details?: FieldErrorDetail[] } | null;

function toForm(profile: BusinessProfile): ProfileInput {
  return {
    displayName: profile.displayName,
    description: profile.description ?? '',
    contactEmail: profile.contactEmail ?? '',
    contactPhone: profile.contactPhone ?? '',
    websiteUrl: profile.websiteUrl ?? '',
    addressLine: profile.addressLine ?? '',
    city: profile.city ?? '',
    postalCode: profile.postalCode ?? '',
    country: profile.country ?? '',
  };
}

/** Section 1: name, description, contact details and address. */
function DetailsCard({ profile, onSaved }: { profile: BusinessProfile; onSaved: (p: BusinessProfile) => void }) {
  const [form, setForm] = useState(() => toForm(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const field = (key: keyof ProfileInput) => ({
    value: form[key],
    onChange: (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value }),
    error: errors[key],
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setNotice(null);
    try {
      const updated = await businessApi.updateProfile(form);
      setForm(toForm(updated)); // show what was saved (e.g. "de" becomes "DE")
      onSaved(updated);
      setNotice({ tone: 'success', text: 'Your profile was saved.' });
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors());
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardTitle>Business details</CardTitle>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        <TextField label="Business name" {...field('displayName')} />
        <TextAreaField label="Description" rows={5} {...field('description')} hint={`${form.description.length} / 2000 characters. Tell customers what you do and what makes you special.`} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Public email (optional)" type="email" {...field('contactEmail')} />
          <TextField label="Public phone (optional)" type="tel" {...field('contactPhone')} />
        </div>
        <TextField label="Website (optional)" type="url" placeholder="https://" {...field('websiteUrl')} />
        <TextField label="Street and number" {...field('addressLine')} autoComplete="street-address" />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="City" {...field('city')} autoComplete="address-level2" />
          <TextField label="Postal code" {...field('postalCode')} autoComplete="postal-code" />
          <TextField label="Country code" placeholder="DE" maxLength={2} {...field('country')} hint="2 letters, e.g. DE" />
        </div>
        <Button type="submit" loading={saving}>Save details</Button>
      </form>
    </Card>
  );
}

/** Section 2: logo. */
function LogoCard({ profile, onSaved }: { profile: BusinessProfile; onSaved: (p: BusinessProfile) => void }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const run = async (action: () => Promise<BusinessProfile>, success: string) => {
    setBusy(true);
    setNotice(null);
    try {
      onSaved(await action());
      setNotice({ tone: 'success', text: success });
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };
  const logo = assetUrl(profile.logoUrl);

  return (
    <Card>
      <CardTitle>Logo</CardTitle>
      {notice && <div className="mb-4"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      <div className="flex items-center gap-5">
        {logo ? (
          <img src={logo} alt="Your logo" className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-brand-50 text-2xl font-bold text-brand-600">
            {profile.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <ImageUploadButton label={logo ? 'Replace logo' : 'Upload logo'} loading={busy} onFile={(file) => run(() => businessApi.uploadLogo(file), 'Logo saved.')} />
            {logo && <Button variant="ghost" disabled={busy} onClick={() => run(() => businessApi.removeLogo(), 'Logo removed.')}>Remove</Button>}
          </div>
          <p className="text-xs text-slate-500">JPEG, PNG or WebP, at most 5 MB. A square image looks best.</p>
        </div>
      </div>
    </Card>
  );
}

/** Section 3: categories. */
function CategoriesCard({ profile, onSaved }: { profile: BusinessProfile; onSaved: (p: BusinessProfile) => void }) {
  const categories = useApi('categories', () => publicApi.categories());
  const [selected, setSelected] = useState(() => profile.categories.map((c) => c.id));
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      onSaved(await businessApi.setCategories(selected));
      setNotice({ tone: 'success', text: 'Categories saved.' });
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div id="categories" className="scroll-mt-24" />
      {notice && <div className="mb-4"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      {categories.data && <CategoryPicker categories={categories.data} selected={selected} onChange={setSelected} singleColumn />}
      <Button className="mt-4" onClick={save} loading={saving} disabled={selected.length === 0}>Save categories</Button>
    </Card>
  );
}

/** Section 4: photo gallery. */
function PhotosCard({ profile, photoLimit, onPhotosChanged }: { profile: BusinessProfile; photoLimit: number | null; onPhotosChanged: (photos: Photo[]) => void }) {
  const photos = profile.photos;
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const run = async (action: () => Promise<Photo[]>, success?: string) => {
    setBusy(true);
    setNotice(null);
    try {
      onPhotosChanged(await action());
      if (success) setNotice({ tone: 'success', text: success });
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const upload = (file: File) =>
    run(async () => {
      const photo = await businessApi.addPhoto(file, caption);
      setCaption('');
      return [...photos, photo];
    }, 'Photo added.');

  const move = (index: number, direction: -1 | 1) =>
    run(() => {
      const ids = photos.map((p) => p.id);
      [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
      return businessApi.reorderPhotos(ids);
    });

  const remove = (id: string) =>
    run(async () => {
      await businessApi.deletePhoto(id);
      return photos.filter((p) => p.id !== id);
    }, 'Photo deleted.');

  return (
    <Card>
      <CardTitle action={<span className="text-sm text-slate-500">{photos.length}{photoLimit !== null ? ` of ${photoLimit}` : ''} photos</span>}>Photos</CardTitle>
      {notice && <div className="mb-4"><Alert tone={notice.tone}>{notice.text}</Alert></div>}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-sm text-slate-500">
          <ImageOff className="mb-2 h-8 w-8 text-slate-300" aria-hidden />
          No photos yet. Show your work, your team or your place.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="overflow-hidden rounded-xl ring-1 ring-slate-200">
              <img src={assetUrl(photo.imageUrl) ?? ''} alt={photo.caption ?? `Photo ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center gap-1 p-2">
                <span className="flex-1 truncate text-xs text-slate-600">{photo.caption || 'No caption'}</span>
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={busy || index === photos.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                <button type="button" className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-30" disabled={busy} onClick={() => remove(photo.id)} aria-label="Delete photo"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField label="Caption for the next photo (optional)" value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <ImageUploadButton label="Add photo" variant="primary" loading={busy} onFile={upload} />
      </div>
    </Card>
  );
}

/** Section 5: publish / unpublish. */
function PublishCard({ profile, onSaved }: { profile: BusinessProfile; onSaved: (p: BusinessProfile) => void }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const toggle = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const updated = profile.isPublished ? await businessApi.unpublish() : await businessApi.publish();
      onSaved(updated);
      setNotice({ tone: 'success', text: updated.isPublished ? 'Your profile is published.' : 'Your profile is hidden.' });
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error), details: error instanceof ApiError ? error.details : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div id="publish" className="scroll-mt-24" />
      <CardTitle action={profile.isPublished ? <Badge color="green">Published</Badge> : <Badge>Not published</Badge>}>Publish your profile</CardTitle>
      {notice && (
        <div className="mb-4">
          <Alert tone={notice.tone} title={notice.text}>
            {notice.details && notice.details.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {notice.details.map((detail) => <li key={detail.field}>{detail.message}</li>)}
              </ul>
            )}
          </Alert>
        </div>
      )}
      <p className="text-sm text-slate-600">
        {profile.isPublished
          ? 'Customers can find your profile once our team has approved your business and your subscription is active.'
          : 'When everything on your checklist is ready, publish your profile so customers can find you.'}
      </p>
      <Button className="mt-4" variant={profile.isPublished ? 'secondary' : 'primary'} loading={busy} onClick={toggle}>
        {profile.isPublished ? 'Unpublish (hide my profile)' : 'Publish my profile'}
      </Button>
    </Card>
  );
}

function ProfileEditor({ initial, photoLimit }: { initial: BusinessProfile; photoLimit: number | null }) {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState(initial);
  const { hash } = useLocation();

  // Jump to #categories or #publish when coming from the checklist.
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView();
  }, [hash]);

  const onSaved = (updated: BusinessProfile) => {
    setProfile(updated);
    void refresh(); // keep the name / published state in the navigation up to date
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <DetailsCard profile={profile} onSaved={onSaved} />
        <PhotosCard profile={profile} photoLimit={photoLimit} onPhotosChanged={(photos) => setProfile({ ...profile, photos })} />
      </div>
      <div className="space-y-6">
        <LogoCard profile={profile} onSaved={onSaved} />
        <CategoriesCard profile={profile} onSaved={onSaved} />
        <PublishCard profile={profile} onSaved={onSaved} />
      </div>
    </div>
  );
}

export function EditProfilePage() {
  const profile = useApi('business-profile', () => businessApi.profile());
  const overview = useApi('business-overview', () => businessApi.overview());

  return (
    <>
      <PageHeader title="Business profile" description="What customers see on your public page." />
      {profile.error && <Alert tone="error">{profile.error}</Alert>}
      {profile.data && overview.data ? (
        <ProfileEditor initial={profile.data} photoLimit={overview.data.usage.photos.limit} />
      ) : (
        !profile.error && <FullPageSpinner />
      )}
    </>
  );
}
