import type { LucideIcon } from "lucide-react";
import { Mic, Music, Music2, Palette, Scissors, Sparkles, Theater } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Scissors,
  Palette,
  Theater,
  Mic,
  Music,
  Music2,
  Sparkles,
};

export function getCompetitionIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || Sparkles;
}
