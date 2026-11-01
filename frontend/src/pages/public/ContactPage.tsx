import { useState, type FormEvent } from 'react';
import { ApiError, errorMessage } from '../../api/client';
import { publicApi } from '../../api/public.api';
import { Container } from '../../components/layout/PublicLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TextAreaField, TextField } from '../../components/ui/FormField';
import { PageHeader } from '../../components/ui/PageHeader';

const EMPTY = { name: '', email: '', subject: '', message: '' };

export function ContactPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  const update = (field: keyof typeof EMPTY) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setErrors({});
    setResult(null);
    try {
      // The backend only QUEUES the email (202 Accepted); the email worker sends it a few seconds later.
      const { message } = await publicApi.contact(form);
      setResult({ tone: 'success', text: message });
      setForm(EMPTY);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors());
      setResult({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSending(false);
    }
  };

  return (
    <Container>
      <PageHeader title="Contact us" description="Questions, feedback or a problem? Send us a message and we will reply by email." />
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={submit} className="space-y-4" noValidate>
            {result && <Alert tone={result.tone}>{result.text}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Your name" value={form.name} onChange={update('name')} error={errors.name} autoComplete="name" />
              <TextField label="Your email" type="email" value={form.email} onChange={update('email')} error={errors.email} autoComplete="email" />
            </div>
            <TextField label="Subject" value={form.subject} onChange={update('subject')} error={errors.subject} />
            <TextAreaField label="Message" rows={6} value={form.message} onChange={update('message')} error={errors.message} />
            <Button type="submit" loading={sending}>Send message</Button>
          </form>
        </Card>
        <Card className="h-fit">
          <h2 className="font-semibold">How we help</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• We usually reply within 2 working days.</li>
            <li>• Businesses: ask us about plans and getting approved.</li>
            <li>• Customers: problems with a booking or quote? Tell us which business.</li>
          </ul>
        </Card>
      </div>
    </Container>
  );
}
