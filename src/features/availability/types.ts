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
  members: { email: string; name: string }[];
  occupation: OccupationByMember;
  // Slots in which each member marked "solo online".
  online: OnlineByMember;
  // Every member's notes that overlap the week.
  notes: AvailabilityNote[];
  // Part of the week is outside the stored Google window.
  outsideGoogleWindow: boolean;
};

// The signed-in member's own occupation per slot for one week.
export type MyWeek = {
  dates: string[];
  days: Record<string, SlotOccupation[]>;
  // The member's own notes that overlap the week.
  notes: AvailabilityNote[];
  outsideGoogleWindow: boolean;
};

export type NoteFormState = {
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  ok?: boolean;
};
