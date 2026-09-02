import { Anchor, CloudRain, Layers, Mountain, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HAZARD_META, HAZARD_TYPES, type HazardType } from "@/lib/discatra-data";

const HAZARD_ICON: Record<HazardType, LucideIcon> = {
  all: Layers,
  landslide: Mountain,
  flood: Waves,
  cloudburst: CloudRain,
  coastal_erosion: Anchor,
};

interface Props {
  value: HazardType;
  onChange: (hazard: HazardType) => void;
  /** Observation count for the current selection, shown as a hint. */
  count: number;
}

/**
 * Floating hazard filter. Uses the same card treatment as the map legend so it
 * reads as part of the existing map chrome rather than a new control style.
 */
export default function HazardSelector({ value, onChange, count }: Props) {
  return (
    <div className="absolute right-4 top-4 z-10 rounded-md border border-border bg-card/85 px-3 py-2 shadow-lg backdrop-blur">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Hazard type
      </p>
      <Select value={value} onValueChange={(v) => onChange(v as HazardType)}>
        <SelectTrigger className="h-8 w-48 bg-background text-xs shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {HAZARD_TYPES.map((hazard) => {
            const Icon = HAZARD_ICON[hazard];
            return (
              <SelectItem key={hazard} value={hazard} className="text-xs">
                <span className="flex items-center gap-2">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {HAZARD_META[hazard].label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {count} observation{count === 1 ? "" : "s"} mapped
      </p>
    </div>
  );
}
