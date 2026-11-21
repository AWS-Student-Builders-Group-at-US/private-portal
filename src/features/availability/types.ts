import type { TimeRange } from "@/features/calendar-entries/agenda";
import type { CalendarEntry } from "@/features/calendar-entries/types";
import type { NoteRect } from "./notes";
import type { OccupationByMember, OnlineByMember, SlotOccupation } from "./occupation";

// A shared availability note (see notes.ts for the rectangle model).
export type AvailabilityNote = NoteRect & {
  id: string;
  member_email: string;
  title: string;
  body: string;
};

export type TeamWeek = {
  dates: string[];
  members: { email: string; name: string; color: string | null }[];
  occupation: OccupationByMember;
  // Slots in which each member marked "solo online".
  online: OnlineByMember;
  // Every member's notes that overlap the week.
  notes: AvailabilityNote[];
  // Every member's calendar entries of the week (title and notes already
  // hidden by the database for someone else's busy-only entry).
  entries: CalendarEntry[];
  // Each member's Google busy time per Madrid date, merged (times only).
  google: Record<string, TimeRange[]>;
  // Part of the week is outside the stored Google window.
  outsideGoogleWindow: boolean;
};

// The signed-in member's own occupation per slot for one week.
export type MyWeek = {
  dates: string[];
  days: Record<string, SlotOccupation[]>;
  // The member's own notes that overlap the week.
  notes: AvailabilityNote[];
  // The member's own calendar entries of the week.
  entries: CalendarEntry[];
  outsideGoogleWindow: boolean;
};

export type NoteFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  ok?: boolean;
};
