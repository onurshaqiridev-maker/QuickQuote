/** Name, phone and password settings. Used by customers and business owners. */
import { useState, type FormEvent } from 'react';
import { accountApi } from '../../api/auth.api';
import { ApiError, errorMessage } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card, CardTitle } from '../ui/Card';
import { TextField } from '../ui/FormField';

function ProfileForm() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setStatus(null);
    try {
      const { user: updated } = await accountApi.updateProfile({ fullName, phone });
      setUser(updated);
      setStatus({ tone: 'success', text: 'Your details were saved.' });
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors());
      setStatus({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardTitle>Your details</CardTitle>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        <TextField label="Email" value={user?.email ?? ''} disabled hint="Your email address cannot be changed yet." />
        <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} autoComplete="name" required />
        <TextField label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} autoComplete="tel" type="tel" />
        <Button type="submit" loading={saving}>
          Save details
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setStatus(null);
    try {
      await accountApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setStatus({ tone: 'success', text: 'Your password was changed. You were logged out on your other devices.' });
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors());
      setStatus({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardTitle>Change password</CardTitle>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {status && <Alert tone={status.tone}>{status.text}</Alert>}
        <TextField label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} error={errors.currentPassword} autoComplete="current-password" />
        <TextField label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={errors.newPassword} hint="At least 8 characters, with a letter and a number." autoComplete="new-password" />
        <Button type="submit" loading={saving}>
          Change password
        </Button>
      </form>
    </Card>
  );
}

export function AccountSettings() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ProfileForm />
      <PasswordForm />
    </div>
  );
}
