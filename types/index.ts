// Type definitions for AI Visibility Tool

export interface Analysis {
  id: string;
  customerName: string;
  visibilityData: VisibilityData;
  technicalData: TechnicalData;
  customPrompt?: string;
  competitiveInsights: string[]; // 20 insights
  categoriesSelected: BriefCategory[];
  briefCount: number;
  briefs: Brief[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VisibilityData {
  topics: string[];
  competitors: string[];
  prompts: PromptPerformance[];
  leaderboard: LeaderboardEntry[];
  visibilityScore: number; // Percentage
}

export interface TechnicalData {
  crawlerAccessible: boolean;
  hasSchema: boolean;
  ttfb: number; // milliseconds
  wikipediaPresence: boolean;
  wikidataPresence: boolean;
  googleBusinessProfile: boolean;
  redditActivity: 'low' | 'medium' | 'high';
  reviewCount: number;
  reviewSentiment: 'positive' | 'negative' | 'mixed';
}

export interface Brief {
  id: string;
  analysisId: string;
  title: string;
  category: BriefCategory;
  content: string; // Full markdown
  issue: string;
  objective: string;
  description: string;
  instructions: string;
  deliverables: string;
  supportNotes: string;
  effortScore: number; // 1-10
  impactScore: number; // 1-10
  priorityScore: number;
  isSelected: boolean;
  selectionOrder?: number;
  metadata: BriefMetadata;
  createdAt: Date;
}

export type BriefCategory =
  | 'Technology'
  | 'Platform Presence'
  | 'Content Structure'
  | 'Content Types'
  | 'Reviews and Testimonials'
  | 'PR Outreach and LLM Seeding'
  | 'Social Engagement and Community Strategy'
  | 'Multimodal and Visual Optimization'
  | 'Data Authority and Proprietary Statistics';

export const BRIEF_CATEGORIES: BriefCategory[] = [
  'Technology',
  'Platform Presence',
  'Content Structure',
  'Content Types',
  'Reviews and Testimonials',
  'PR Outreach and LLM Seeding',
  'Social Engagement and Community Strategy',
  'Multimodal and Visual Optimization',
  'Data Authority and Proprietary Statistics'
];

export interface BriefMetadata {
  estimatedHoursMin: number;
  estimatedHoursMax: number;
  requiredSkills: string[];
  dependencies?: string[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  variables: string[];
  description?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  useCount: number;
}

export interface PromptPerformance {
  prompt: string;
  customerMentions: number;
  competitorMentions: Record<string, number>;
}

export interface LeaderboardEntry {
  company: string;
  score: number;
  rank: number;
}