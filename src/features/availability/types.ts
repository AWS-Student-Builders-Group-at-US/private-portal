import type { FreeByMember, OverrideRange, TemplateRange } from "./slots";

export type Override = OverrideRange & { id: string };

export type TeamWeek = {
  dates: string[];
  members: { email: string; name: string }[];
  free: FreeByMember;
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
