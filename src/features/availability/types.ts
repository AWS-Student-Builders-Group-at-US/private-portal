import type { OccupationByMember, SlotOccupation } from "./occupation";
import type { OverrideRange, TemplateRange } from "./slots";

export type Override = OverrideRange & { id: string };

export type TeamWeek = {
  dates: string[];
  members: { email: string; name: string }[];
  occupation: OccupationByMember;
  // Part of the week is outside the stored Google window.
  outsideGoogleWindow: boolean;
};

// The signed-in member's own occupation per slot for one week.
export type MyWeek = {
  dates: string[];
  days: Record<string, SlotOccupation[]>;
  outsideGoogleWindow: boolean;
};

export type MyAvailability = {
  template: TemplateRange[];
  overrides: Override[];
};

export type OverrideFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
  ok?: boolean;
};
