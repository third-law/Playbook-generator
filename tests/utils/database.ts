/**
 * Database testing utilities and fixtures
 */

import { Pool, PoolClient } from 'pg';
import { Analysis, Brief, PromptTemplate } from '@/types';

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'ai_visibility_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

let testPool: Pool;

/**
 * Initialize test database pool
 */
export function initTestDb(): Pool {
  if (!testPool) {
    testPool = new Pool(testDbConfig);
  }
  return testPool;
}

/**
 * Close test database connections
 */
export async function closeTestDb(): Promise<void> {
  if (testPool) {
    await testPool.end();
  }
}

/**
 * Setup test database schema and tables
 */
export async function setupTestDb(): Promise<void> {
  const pool = initTestDb();
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name VARCHAR(255) NOT NULL,
      visibility_data JSONB DEFAULT '{}',
      technical_data JSONB DEFAULT '{}',
      competitive_insights JSONB DEFAULT '{}',
      custom_prompt TEXT,
      categories_selected TEXT[],
      brief_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS briefs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      content TEXT NOT NULL,
      issue TEXT,
      objective TEXT,
      description TEXT,
      instructions TEXT,
      deliverables TEXT,
      support_notes TEXT,
      effort_score INTEGER CHECK (effort_score >= 1 AND effort_score <= 5),
      impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 5),
      priority_score DECIMAL(3,2) DEFAULT 0,
      is_selected BOOLEAN DEFAULT FALSE,
      selection_order INTEGER,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      prompt TEXT NOT NULL,
      variables TEXT[],
      description TEXT,
      use_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      last_used_at TIMESTAMP
    )
  `);
}

/**
 * Clean up test database by truncating all tables
 */
export async function cleanTestDb(): Promise<void> {
  const pool = initTestDb();
  
  await pool.query('TRUNCATE TABLE briefs CASCADE');
  await pool.query('TRUNCATE TABLE analyses CASCADE');
  await pool.query('TRUNCATE TABLE prompt_templates CASCADE');
}

/**
 * Drop test database tables
 */
export async function teardownTestDb(): Promise<void> {
  const pool = initTestDb();
  
  await pool.query('DROP TABLE IF EXISTS briefs CASCADE');
  await pool.query('DROP TABLE IF EXISTS analyses CASCADE');
  await pool.query('DROP TABLE IF EXISTS prompt_templates CASCADE');
}

/**
 * Execute a query against the test database
 */
export async function testQuery<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const pool = initTestDb();
  const result = await pool.query(text, params);
  return { rows: result.rows as T[] };
}

/**
 * Execute multiple queries in a transaction
 */
export async function testTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = initTestDb();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Test data fixtures

export const mockAnalysisData: Omit<Analysis, 'id' | 'createdAt' | 'updatedAt' | 'briefs'> = {
  customerName: 'Test Customer Corp',
  visibilityData: {
    topics: ['AI', 'Machine Learning', 'Automation'],
    competitors: ['Competitor A', 'Competitor B', 'Competitor C'],
    visibilityScore: 75,
    prompts: [],
    leaderboard: []
  },
  technicalData: {
    crawlerAccessible: true,
    hasSchema: true,
    ttfb: 250,
    wikipediaPresence: false,
    wikidataPresence: false,
    googleBusinessProfile: true,
    redditActivity: 'medium',
    reviewCount: 150,
    reviewSentiment: 'positive'
  },
  competitiveInsights: [
    'Competitor A has stronger social media presence',
    'Our technical SEO is superior to competitors',
    'Need to improve content freshness compared to Competitor B',
    'Competitor B has 82% visibility score with excellent SEO',
    'Competitor B weakness: Limited social engagement',
    'Current market share: 15.5%',
    'Opportunity: Voice search optimization',
    'Opportunity: Video content strategy'
  ],
  customPrompt: 'Focus on digital marketing strategy and competitive positioning.',
  categoriesSelected: ['Technology', 'Platform Presence', 'Content Types'],
  briefCount: 5
};

export const mockBriefsData: Omit<Brief, 'id' | 'analysisId' | 'createdAt'>[] = [
  {
    title: 'SEO Technical Audit and Optimization',
    category: 'Technology',
    content: `
# SEO Technical Audit and Optimization

## Current State Analysis
Our technical analysis reveals several critical issues affecting search engine visibility...

## Recommended Actions
1. Implement structured data markup
2. Optimize page load speeds
3. Fix crawlability issues
    `,
    issue: 'Low organic search visibility due to technical SEO issues',
    objective: 'Improve search engine rankings and organic traffic by 40%',
    description: 'Comprehensive technical SEO audit and implementation of fixes',
    instructions: 'Conduct full site audit, prioritize fixes by impact, implement changes',
    deliverables: 'Technical audit report, implementation roadmap, tracking dashboard',
    supportNotes: 'Requires coordination with development team',
    effortScore: 4,
    impactScore: 5,
    priorityScore: 4.5,
    isSelected: true,
    selectionOrder: 1,
    metadata: {
      estimatedHoursMin: 30,
      estimatedHoursMax: 40,
      requiredSkills: ['Technical SEO', 'Web Development'],
      dependencies: ['Development team availability']
    }
  },
  {
    title: 'Social Media Strategy Overhaul',
    category: 'Social Engagement and Community Strategy',
    content: `
# Social Media Strategy Overhaul

## Current Performance
Social media engagement is below industry benchmarks...

## Strategy Recommendations
- Platform-specific content strategies
- Influencer partnership program
- Community building initiatives
    `,
    issue: 'Poor social media engagement and limited brand awareness',
    objective: 'Increase social media engagement by 60% and followers by 30%',
    description: 'Complete social media strategy redesign and implementation',
    instructions: 'Analyze current performance, develop strategy, create content calendar',
    deliverables: 'Strategy document, content calendar, KPI dashboard',
    supportNotes: 'Budget needed for paid social campaigns',
    effortScore: 3,
    impactScore: 4,
    priorityScore: 3.5,
    isSelected: true,
    selectionOrder: 2,
    metadata: {
      estimatedHoursMin: 20,
      estimatedHoursMax: 25,
      requiredSkills: ['Social Media Marketing', 'Content Creation'],
      dependencies: ['Brand guidelines approval']
    }
  },
  {
    title: 'Website Performance Optimization',
    category: 'Content Structure',
    content: `
# Website Performance Optimization

## Performance Metrics
Current Lighthouse scores show room for improvement...

## Optimization Plan
- Image optimization and lazy loading
- Code splitting and minification
- CDN implementation
    `,
    issue: 'Slow page load times affecting user experience and SEO',
    objective: 'Improve Core Web Vitals scores to pass all thresholds',
    description: 'Comprehensive website performance optimization project',
    instructions: 'Audit performance, implement optimizations, monitor improvements',
    deliverables: 'Performance audit, optimization implementation, monitoring setup',
    supportNotes: 'May require server configuration changes',
    effortScore: 5,
    impactScore: 4,
    priorityScore: 4.2,
    isSelected: false,
    selectionOrder: undefined,
    metadata: {
      estimatedHoursMin: 50,
      estimatedHoursMax: 60,
      requiredSkills: ['Web Development', 'Performance Optimization'],
      dependencies: ['Server access', 'CDN configuration']
    }
  }
];

export const mockPromptTemplateData: Omit<PromptTemplate, 'id' | 'createdAt' | 'lastUsedAt' | 'useCount'> = {
  name: 'Digital Marketing Analysis',
  prompt: `
Analyze the digital marketing performance for {{customerName}} based on the following data:

Visibility Data: {{visibilityData}}
Technical Data: {{technicalData}}
Competitive Insights: {{competitiveInsights}}

Focus areas: {{categoriesSelected}}

Additional context: {{customPrompt}}

Please provide actionable briefs for improvement in the following format:
...
  `,
  variables: ['customerName', 'visibilityData', 'technicalData', 'competitiveInsights', 'categoriesSelected', 'customPrompt'],
  description: 'Template for generating comprehensive digital marketing analysis and improvement briefs'
};

/**
 * Seed test database with sample data
 */
export async function seedTestData(): Promise<{
  analysisId: string;
  briefIds: string[];
  templateId: string;
}> {
  const analysisResult = await testQuery<{ id: string }>(
    `INSERT INTO analyses (customer_name, visibility_data, technical_data, competitive_insights, custom_prompt, categories_selected, brief_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      mockAnalysisData.customerName,
      JSON.stringify(mockAnalysisData.visibilityData),
      JSON.stringify(mockAnalysisData.technicalData),
      JSON.stringify(mockAnalysisData.competitiveInsights),
      mockAnalysisData.customPrompt,
      mockAnalysisData.categoriesSelected,
      mockAnalysisData.briefCount
    ]
  );
  
  const analysisId = analysisResult.rows[0].id;
  const briefIds: string[] = [];
  
  for (const brief of mockBriefsData) {
    const briefResult = await testQuery<{ id: string }>(
      `INSERT INTO briefs (
        analysis_id, title, category, content, issue, objective,
        description, instructions, deliverables, support_notes,
        effort_score, impact_score, priority_score, is_selected,
        selection_order, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        analysisId,
        brief.title,
        brief.category,
        brief.content,
        brief.issue,
        brief.objective,
        brief.description,
        brief.instructions,
        brief.deliverables,
        brief.supportNotes,
        brief.effortScore,
        brief.impactScore,
        brief.priorityScore,
        brief.isSelected,
        brief.selectionOrder,
        JSON.stringify(brief.metadata)
      ]
    );
    briefIds.push(briefResult.rows[0].id);
  }
  
  const templateResult = await testQuery<{ id: string }>(
    `INSERT INTO prompt_templates (name, prompt, variables, description)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      mockPromptTemplateData.name,
      mockPromptTemplateData.prompt,
      mockPromptTemplateData.variables,
      mockPromptTemplateData.description
    ]
  );
  
  const templateId = templateResult.rows[0].id;
  
  return { analysisId, briefIds, templateId };
}

/**
 * Create a test analysis with custom data
 */
export async function createTestAnalysis(
  data: Partial<Omit<Analysis, 'id' | 'createdAt' | 'updatedAt' | 'briefs'>>
): Promise<string> {
  const analysisData = { ...mockAnalysisData, ...data };
  
  const result = await testQuery<{ id: string }>(
    `INSERT INTO analyses (customer_name, visibility_data, technical_data, competitive_insights, custom_prompt, categories_selected, brief_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      analysisData.customerName,
      JSON.stringify(analysisData.visibilityData),
      JSON.stringify(analysisData.technicalData),
      JSON.stringify(analysisData.competitiveInsights),
      analysisData.customPrompt,
      analysisData.categoriesSelected,
      analysisData.briefCount
    ]
  );
  
  return result.rows[0].id;
}

/**
 * Create a test brief with custom data
 */
export async function createTestBrief(
  analysisId: string,
  data: Partial<Omit<Brief, 'id' | 'analysisId' | 'createdAt'>>
): Promise<string> {
  const briefData = { ...mockBriefsData[0], ...data };
  
  const result = await testQuery<{ id: string }>(
    `INSERT INTO briefs (
      analysis_id, title, category, content, issue, objective,
      description, instructions, deliverables, support_notes,
      effort_score, impact_score, priority_score, is_selected,
      selection_order, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`,
    [
      analysisId,
      briefData.title,
      briefData.category,
      briefData.content,
      briefData.issue,
      briefData.objective,
      briefData.description,
      briefData.instructions,
      briefData.deliverables,
      briefData.supportNotes,
      briefData.effortScore,
      briefData.impactScore,
      briefData.priorityScore,
      briefData.isSelected,
      briefData.selectionOrder,
      JSON.stringify(briefData.metadata)
    ]
  );
  
  return result.rows[0].id;
}

/**
 * Database test helpers for setup and teardown
 */
export const dbTestHelpers = {
  beforeAll: async () => {
    await setupTestDb();
  },
  
  beforeEach: async () => {
    await cleanTestDb();
  },
  
  afterEach: async () => {
    await cleanTestDb();
  },
  
  afterAll: async () => {
    await teardownTestDb();
    await closeTestDb();
  }
};