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
  location: z.string().optional(),
  area: z.string(),
  degree: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  highlights: z.array(z.string()).optional(),
});

export const projectSchema = z.object({
  name: z.string(),
  date: z.string(),
  highlights: z.array(z.string()),
  show_on_resume: z.boolean().optional().default(true),
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
    resume_url: z.string().optional(),
    location: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    social_networks: z.array(socialNetworkSchema).optional(),
    sections: z.object({
      intro: z.array(z.string()).optional(),
      technologies: z.array(technologySchema).optional(),
      experience: z.array(experienceSchema).optional(),
      education: z.array(educationSchema).optional(),
      professional_projects: z.array(projectSchema).optional(),
      personal_projects: z.array(projectSchema).optional(),
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
