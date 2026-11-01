/**
 * Draws a category's icon. The database stores an icon NAME (e.g. "scissors");
 * this component turns it into a line icon from the lucide icon set.
 */
import {
  BookOpen,
  Camera,
  Car,
  Dumbbell,
  Hammer,
  Laptop,
  PartyPopper,
  Scale,
  Scissors,
  Sparkles,
  Stethoscope,
  Store,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  stethoscope: Stethoscope,
  wrench: Wrench,
  sparkles: Sparkles,
  hammer: Hammer,
  car: Car,
  'party-popper': PartyPopper,
  camera: Camera,
  'book-open': BookOpen,
  laptop: Laptop,
  dumbbell: Dumbbell,
  scale: Scale,
};

export function CategoryIcon({ name, className = 'h-5 w-5' }: { name: string | null; className?: string }) {
  // Unknown or missing names get a neutral "shop" icon.
  const Icon = (name && ICONS[name]) || Store;
  return <Icon className={className} aria-hidden strokeWidth={1.8} />;
}
