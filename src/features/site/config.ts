// Public website settings. Fill in the social links when the accounts exist:
// a null link marked in `SOON` shows as "Próximamente"; any other null link is
// not shown.
export const SITE = {
  name: "AWS Student Builder Group",
  shortName: "AWS SBG · US",
  university: "Universidad de Sevilla",
  place: "Universidad de Sevilla · Campus Reina Mercedes",
  meetupUrl: "https://www.meetup.com/es-es/aws-sbg-at-university-of-seville-reina-mercedes-campus/",
  builderCenterUrl: "https://builder.aws.com",
  whatsappUrl: null as string | null,
  linkedinUrl: null as string | null,
  instagramUrl: null as string | null,
  contactEmail: null as string | null,
};

// Group channels that are planned but not created yet.
export const SOON = { linkedin: true, instagram: true } as const;

export type TeamMember = {
  name: string;
  role: string;
  // Square image under /public/team (e.g. "/team/ivan.webp"), only with the
  // person's consent: the repository and the site are public.
  photo?: string;
  linkedinUrl?: string;
};

// Core Team shown on the home page: first name, role and, when each person
// agrees, a photo and their public LinkedIn profile. No surnames, emails or
// phones (the repository is public).
export const TEAM: TeamMember[] = [
  {
    name: "Guille",
    role: "Organizador general",
    photo: "/team/guille.webp",
    linkedinUrl: "https://www.linkedin.com/in/guillermogj",
  },
  {
    name: "Iván",
    role: "Talleres y charlas",
    photo: "/team/ivan.webp",
    linkedinUrl: "https://www.linkedin.com/in/ivan-jesus-sevillano-plaza",
  },
  { name: "José", role: "Talleres y charlas" },
  {
    name: "Cristina",
    role: "Comunicación y redes",
    photo: "/team/cristina.webp",
    linkedinUrl: "https://www.linkedin.com/in/cristina-garcia-dominguez",
  },
  {
    name: "Ray",
    role: "Logística y eventos",
    photo: "/team/ray.webp",
    linkedinUrl: "https://www.linkedin.com/in/raimundo-garcia-perez-4bb286268",
  },
];
