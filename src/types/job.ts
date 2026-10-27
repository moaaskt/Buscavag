import { z } from 'zod';

export enum PlatformSource {
  LINKEDIN = 'linkedin',
  INDEED = 'indeed',
  GUPY = 'gupy',
  GOOGLE_JOBS = 'google_jobs',
  TELEGRAM = 'telegram',
  PROGRAMATHOR = 'programathor',
  REMOTAR = 'remotar',
  CATHO = 'catho',
  GLASSDOOR = 'glassdoor',
  // Regional SC
  SAO_JOSE = 'sao_jose',
  VAGAS_SC = 'vagas_sc',
  VAGAS_FLORIPA = 'vagas_floripa',
  EMPREGA_PALHOCA = 'emprega_palhoca',
  // Nacionais
  INFOJOBS = 'infojobs',
  CHAWORK = 'chawork',
  TRABALHA_BRASIL = 'trabalha_brasil',
  BNE = 'bne',
  BEBEE = 'bebee',
  EMPREGOS = 'empregos',
  RECRUTA_SIMPLES = 'recruta_simples',
  // ATSs
  RECRUTEI_EMPREGOS = 'recrutei_empregos',
  QUICKIN = 'quickin',
  RECRUTEI_JOBS = 'recrutei_jobs',
  PANDAPE = 'pandape',
  // Freelance & Projetos
  FREELAS99 = '99freelas',
  WORKANA = 'workana',
  // Novas Fontes Tech (Milestone 8)
  GEEKHUNTER = 'geekhunter',
  NERDIN = 'nerdin',
  REVELO = 'revelo',
  NOVENTA_NOVE_JOBS = '99jobs',
  SOLIDES = 'solides',
  RUNTALENT = 'runtalent',
  EMPREGARE = 'empregare',
  TRAMPOS = 'trampos',
  // Comunidades & Redes Sociais
  FACEBOOK_GROUPS = 'facebook_groups',
  LINKEDIN_POSTS = 'linkedin_posts',
}




export const RawJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  platform: z.nativeEnum(PlatformSource),
  url: z.string().url(),
  description: z.string(),
  publishedAt: z.date(),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export type RawJob = z.infer<typeof RawJobSchema>;

export const ProcessedJobSchema = RawJobSchema.extend({
  id: z.string(),
  isJuniorFullStack: z.boolean(),
  scoreIa: z.number().min(0).max(100).optional(),
  overallScore: z.number().min(0).max(100).optional(),
  stackScore: z.number().min(0).max(100).optional(),
  seniorityScore: z.number().min(0).max(100).optional(),
  locationScore: z.number().min(0).max(100).optional(),
  isStrongMatch: z.boolean().optional(),
  category: z.string().optional(),
  gaps: z.array(z.string()).optional(),
  resumeTips: z.string().optional(),
  aiReasoning: z.string().optional(),
  extractedRole: z.string().optional(),
  contractType: z.string().optional(),
  applicationChannel: z.string().optional(),
  directContact: z.string().optional(),
  salary: z.string().optional(),
  requiredSeniority: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  workModel: z.string().optional(),
  isTechSoftware: z.boolean().optional(),
  fingerprint: z.string().optional(),
  applicationStatus: z.enum(['pending', 'applied', 'interview', 'offer', 'rejected']).default('pending').optional(),
  status: z.enum(['active', 'expired', 'hidden']).default('active').optional(),
  notified: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
});

export type ProcessedJob = z.infer<typeof ProcessedJobSchema>;
