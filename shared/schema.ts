import { z } from "zod";

export const socialNetworkSchema = z.object({
  network: z.string(),
  username: z.string(),
});

export const technologySchema = z.object({
  label: z.string(),
  details: z.string(),
});

export const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  location: z.string(),
  start_date: z.string(),
  end_date: z.string().optional(),
  highlights: z.array(z.string()),
});

export const educationSchema = z.object({
  institution: z.string(),
  location: z.string(),
  area: z.string(),
  degree: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  highlights: z.array(z.string()),
});

export const projectSchema = z.object({
  name: z.string(),
  date: z.string(),
  highlights: z.array(z.string()),
});

export const publicationSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  date: z.string(),
  journal: z.string(),
  doi: z.string().optional(),
});

export const portfolioSchema = z.object({
  cv: z.object({
    name: z.string(),
    location: z.string(),
    email: z.string(),
    phone: z.string(),
    social_networks: z.array(socialNetworkSchema),
    sections: z.object({
      intro: z.array(z.string()),
      technologies: z.array(technologySchema),
      experience: z.array(experienceSchema),
      education: z.array(educationSchema),
      selected_projects: z.array(projectSchema),
      // other_notable_projects: z.array(z.string()).optional(),
      personal_projects: z.array(projectSchema),
      publication: z.array(publicationSchema).optional(),
    }),
  }),
});

export type SocialNetwork = z.infer<typeof socialNetworkSchema>;
export type Technology = z.infer<typeof technologySchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Publication = z.infer<typeof publicationSchema>;
export type PortfolioData = z.infer<typeof portfolioSchema>;
