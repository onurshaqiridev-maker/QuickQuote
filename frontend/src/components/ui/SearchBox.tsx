import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';

/** A search field that searches when the user presses Enter. */
export function SearchBox({ label, placeholder, initial, onSearch }: { label: string; placeholder: string; initial: string; onSearch: (text: string) => void }) {
  const [text, setText] = useState(initial);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(text.trim());
  };
  return (
    <form onSubmit={submit} className="relative" role="search">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border-0 py-2 pr-3 pl-9 text-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-600 focus:outline-none lg:w-72"
      />
    </form>
  );
}
