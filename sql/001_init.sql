-- Initial database schema for AI Visibility Tool

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Analyses table
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  visibility_data JSONB NOT NULL,
  technical_data JSONB NOT NULL,
  custom_prompt TEXT,
  competitive_insights JSONB, -- Array of 20 insights
  categories_selected TEXT[], -- Array of selected categories
  brief_count INTEGER DEFAULT 15,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Briefs table
CREATE TABLE briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100) NOT NULL, -- One of the 9 categories
  content TEXT NOT NULL, -- Full brief in markdown
  issue TEXT,
  objective TEXT,
  description TEXT,
  instructions TEXT,
  deliverables TEXT,
  support_notes TEXT,
  effort_score INTEGER CHECK (effort_score >= 1 AND effort_score <= 10),
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  priority_score DECIMAL(5,2),
  is_selected BOOLEAN DEFAULT FALSE,
  selection_order INTEGER, -- For ordering selected briefs
  metadata JSONB, -- Additional data like estimated hours
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prompt templates table
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  variables TEXT[], -- Array of variable names used
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  use_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_analyses_customer ON analyses(customer_name);
CREATE INDEX idx_analyses_created ON analyses(created_at DESC);
CREATE INDEX idx_briefs_analysis ON briefs(analysis_id);
CREATE INDEX idx_briefs_category ON briefs(category);
CREATE INDEX idx_briefs_selected ON briefs(is_selected) WHERE is_selected = TRUE;
CREATE INDEX idx_briefs_priority ON briefs(priority_score DESC);

-- Insert default prompt template
INSERT INTO prompt_templates (name, prompt, variables, description, use_count)
VALUES (
  'Default Competitive Analysis',
  'Give me 20 clear reasons why [CUSTOMER_NAME] is not winning in the AI visibility space compared to the competitors. Do a thorough analysis of the competitors and explain what they are doing right, that [CUSTOMER_NAME] is not doing. Do deep research to understand the situation.',
  ARRAY['CUSTOMER_NAME', 'COMPETITORS', 'VISIBILITY_SCORE', 'TOP_COMPETITOR', 'ANALYSIS_DATA'],
  'Default template for competitive analysis',
  0
);