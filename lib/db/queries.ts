import { query, transaction } from './client';
import { Analysis, Brief, PromptTemplate } from '@/types';

// Analysis queries
export async function createAnalysis(analysis: Omit<Analysis, 'id' | 'createdAt' | 'updatedAt' | 'briefs'>) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO analyses (customer_name, visibility_data, technical_data, custom_prompt, competitive_insights, categories_selected, brief_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      analysis.customerName,
      JSON.stringify(analysis.visibilityData),
      JSON.stringify(analysis.technicalData),
      analysis.customPrompt,
      JSON.stringify(analysis.competitiveInsights),
      analysis.categoriesSelected,
      analysis.briefCount
    ]
  );
  return rows[0].id;
}

export async function getAnalyses(limit = 50, offset = 0) {
  const { rows } = await query<Analysis>(
    `SELECT * FROM analyses 
     ORDER BY created_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getAnalysisById(id: string) {
  const { rows: analyses } = await query<Analysis>(
    `SELECT * FROM analyses WHERE id = $1`,
    [id]
  );
  
  if (analyses.length === 0) return null;
  
  const { rows: briefs } = await query<Brief>(
    `SELECT * FROM briefs WHERE analysis_id = $1 ORDER BY selection_order`,
    [id]
  );
  
  return {
    ...analyses[0],
    briefs
  };
}

export async function deleteAnalysis(id: string) {
  await query(`DELETE FROM analyses WHERE id = $1`, [id]);
}

// Brief queries
export async function createBrief(brief: Omit<Brief, 'id' | 'createdAt'>) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO briefs (
      analysis_id, title, category, content, issue, objective, 
      description, instructions, deliverables, support_notes,
      effort_score, impact_score, priority_score, is_selected,
      selection_order, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`,
    [
      brief.analysisId,
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
  return rows[0].id;
}

export async function updateBriefSelection(briefId: string, isSelected: boolean, order?: number) {
  await query(
    `UPDATE briefs SET is_selected = $2, selection_order = $3 WHERE id = $1`,
    [briefId, isSelected, order]
  );
}

export async function getBriefsByAnalysis(analysisId: string) {
  const { rows } = await query<Brief>(
    `SELECT * FROM briefs WHERE analysis_id = $1 ORDER BY priority_score DESC`,
    [analysisId]
  );
  return rows;
}

// Prompt template queries
export async function getPromptTemplates() {
  const { rows } = await query<PromptTemplate>(
    `SELECT * FROM prompt_templates ORDER BY use_count DESC, created_at DESC`
  );
  return rows;
}

export async function savePromptTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'lastUsedAt' | 'useCount'>) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO prompt_templates (name, prompt, variables, description)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [template.name, template.prompt, template.variables, template.description]
  );
  return rows[0].id;
}

export async function updatePromptTemplateUsage(id: string) {
  await query(
    `UPDATE prompt_templates 
     SET use_count = use_count + 1, last_used_at = NOW() 
     WHERE id = $1`,
    [id]
  );
}

// Transaction example for saving analysis with briefs
export async function saveAnalysisWithBriefs(
  analysis: Omit<Analysis, 'id' | 'createdAt' | 'updatedAt'>,
  briefs: Omit<Brief, 'id' | 'analysisId' | 'createdAt'>[]
) {
  return transaction(async (client) => {
    // Save analysis
    const { rows: [{ id: analysisId }] } = await client.query(
      `INSERT INTO analyses (customer_name, visibility_data, technical_data, custom_prompt, competitive_insights, categories_selected, brief_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        analysis.customerName,
        JSON.stringify(analysis.visibilityData),
        JSON.stringify(analysis.technicalData),
        analysis.customPrompt,
        JSON.stringify(analysis.competitiveInsights),
        analysis.categoriesSelected,
        analysis.briefCount
      ]
    );

    // Save briefs
    for (const brief of briefs) {
      await client.query(
        `INSERT INTO briefs (
          analysis_id, title, category, content, issue, objective,
          description, instructions, deliverables, support_notes,
          effort_score, impact_score, priority_score, is_selected,
          selection_order, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
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
    }

    return analysisId;
  });
}