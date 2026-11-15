import type { FormField } from "./definition";

// What the public check-in form needs to render one version.
export type PublicCheckinForm = {
  id: string;
  // Named form ("template") this version belongs to.
  form_id: string;
  version: number;
  title: string;
  intro: string | null;
  fields: FormField[];
};

export type CheckinFormVersion = PublicCheckinForm & {
  privacy_notice: string;
  // Legacy flag (pre per-event forms); the latest version of a form is the one in use.
  is_active: boolean;
  created_by: string;
  created_at: string;
};
