/**
 * A pop-up window over the page (a "modal"). Used by the booking and quote request forms.
 * Closes with Escape, the X button, or a click on the dark background.
 * On phones it slides up from the bottom; on bigger screens it is centred.
 */
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  /** Small grey line above the title, e.g. "Book at Bella Hair Studio" */
  eyebrow?: string;
  title: string;
  /** Short line under the title */
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ eyebrow, title, subtitle, onClose, children }: DialogProps) {
  const closeButton = useRef<HTMLButtonElement>(null);

  // Close with Escape, keep the page behind from scrolling, start keyboard focus inside the dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="text-sm text-slate-500">{eyebrow}</p>}
            <h2 id="dialog-title" className="text-xl font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
