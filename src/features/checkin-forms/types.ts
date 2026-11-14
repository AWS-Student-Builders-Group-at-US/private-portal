import type { FormField } from "./definition";

// What the public check-in form needs to render one version.
export type PublicCheckinForm = {
  id: string;
  version: number;
  title: string;
  intro: string | null;
  fields: FormField[];
};

export type CheckinFormVersion = PublicCheckinForm & {
  privacy_notice: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
};
