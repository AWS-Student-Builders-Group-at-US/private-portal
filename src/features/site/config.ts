// Public website settings. Fill in the social links when the accounts exist;
// links left as null are not shown.
export const SITE = {
  name: "AWS Student Builder Group",
  shortName: "AWS SBG · US",
  university: "Universidad de Sevilla",
  place: "Universidad de Sevilla · Campus Reina Mercedes",
  meetupUrl: "https://www.meetup.com/aws-sbg-at-university-of-seville-reina-mercedes-campus/",
  builderCenterUrl: "https://builder.aws.com",
  whatsappUrl: null as string | null,
  linkedinUrl: null as string | null,
  instagramUrl: null as string | null,
  contactEmail: null as string | null,
};

export type TeamMember = { name: string; role: string };

// Core Team shown on the home page: first name and role only (the repository
// is public, so no surnames, emails, phones or photos).
export const TEAM: TeamMember[] = [
  { name: "Guille", role: "Organizador general" },
  { name: "Iván", role: "Talleres y charlas" },
  { name: "José", role: "Talleres y charlas" },
  { name: "Cristina", role: "Comunicación y redes" },
  { name: "Ray", role: "Logística y eventos" },
];
