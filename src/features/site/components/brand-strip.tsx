import { ChipMark } from "@/components/chip-mark";
import { SITE } from "../config";

// Compact group identity for standalone public pages (check-in, privacy).
export function BrandStrip() {
  return (
    <div className="flex items-center gap-3">
      <ChipMark className="size-9" />
      <p className="flex flex-col font-mono text-xs leading-tight">
        <span className="font-semibold">{SITE.name}</span>
        <span className="text-muted-foreground">at {SITE.university}</span>
      </p>
    </div>
  );
}
