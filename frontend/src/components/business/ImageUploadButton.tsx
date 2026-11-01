import { useRef } from 'react';
import { Button } from '../ui/Button';

/** A button that opens the file picker for one image (JPEG, PNG or WebP). */
export function ImageUploadButton({ label, onFile, loading, variant = 'secondary' }: { label: string; onFile: (file: File) => void; loading?: boolean; variant?: 'primary' | 'secondary' }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        aria-label={label}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = ''; // allow choosing the same file again
        }}
      />
      <Button type="button" variant={variant} loading={loading} onClick={() => input.current?.click()}>
        {label}
      </Button>
    </>
  );
}
