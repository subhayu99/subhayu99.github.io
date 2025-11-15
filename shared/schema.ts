import { z } from "zod";

// Phase 1: Add .passthrough() to allow custom fields
// Phase 2: Make non-essential fields optional with defaults

export const socialNetworkSchema = z.object({
  network: z.string(),
  username: z.string(),
}).passthrough(); // Allow custom fields like profile_url, verified, etc.

export const technologySchema = z.object({
  label: z.string(),
  details: z.string(),
}).passthrough(); // Allow custom fields like proficiency_level, years_experience, etc.

export const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  location: z.string().optional(), // Made optional - supports remote/distributed roles
  start_date: z.string(),
  end_date: z.string().optional(),
  highlights: z.array(z.string()).default([]), // Made optional with default - simple roles don't need highlights
}).passthrough(); // Allow custom fields like github_team, tech_stack, team_size, etc.

export const educationSchema = z.object({
  institution: z.string(),
  location: z.string().optional(),
  area: z.string(),
  degree: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  highlights: z.array(z.string()).optional(),
}).passthrough(); // Allow custom fields like gpa, honors, thesis_title, etc.

export const projectSchema = z.object({
  name: z.string(),
  date: z.string(),
  highlights: z.array(z.string()).default([]), // Made optional with default
  show_on_resume: z.boolean().optional().default(true),
}).passthrough(); // Allow custom fields like github_repo, live_url, tech_stack, etc.

export const publicationSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  date: z.string(),
  journal: z.string(),
  doi: z.string().optional(),
}).passthrough(); // Allow custom fields like citation_count, impact_factor, etc.

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
