import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { createClient } from '@vercel/postgres';

// Direct API call function to avoid SDK issues
async function callAnthropicAPI(prompt: string, maxTokens: number = 4000) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

interface AnalysisFormData {
  customerName: string;
  visibilityData: {
    topics: string[];
    competitors: string[];
    visibilityScore: number;
    prompts: any[];
    leaderboard: any[];
  };
  technicalData: {
    crawlerAccessible: boolean;
    hasSchema: boolean;
    ttfb: number;
    wikipediaPresence: boolean;
    wikidataPresence: boolean;
    googleBusinessProfile: boolean;
    redditActivity: 'low' | 'medium' | 'high';
    reviewCount: number;
    reviewSentiment: 'positive' | 'negative' | 'mixed';
  };
  technicalAnalysis: string;
  customPrompt: string;
  categoriesSelected: string[];
  useMostImpactful: boolean;
  briefCount: number;
}

const BRIEF_CATEGORIES = [
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

export async function POST(request: Request) {
  console.log('🚀 Starting analysis creation process...');
  
  try {
    // Verify authentication
    console.log('🔐 Verifying session...');
    const isValid = await verifySession();
    if (!isValid) {
      console.error('❌ Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ Session verified');

    console.log('📝 Parsing request data...');
    const formData: AnalysisFormData = await request.json();
    console.log('✅ Request data parsed successfully');
    
    // Validate required fields - allow no categories if using most impactful
    if (!formData.customerName) {
      return NextResponse.json({ 
        error: 'Customer name is required' 
      }, { status: 400 });
    }

    // If using most impactful, use all categories; otherwise use selected
    const categoriesToUse = formData.useMostImpactful 
      ? BRIEF_CATEGORIES 
      : formData.categoriesSelected.length > 0 
        ? formData.categoriesSelected 
        : BRIEF_CATEGORIES; // Default to all if none selected

    // Create database client
    console.log('💾 Connecting to database...');
    const client = createClient();
    await client.connect();
    console.log('✅ Database connected');

    try {
      // Create the analysis record
      console.log('📊 Creating analysis record...');
      const analysisResult = await client.sql`
        INSERT INTO analyses (
          customer_name, 
          visibility_score, 
          competitors, 
          topics,
          technical_data,
          technical_analysis,
          custom_prompt,
          categories_selected,
          brief_count,
          status
        ) VALUES (
          ${formData.customerName},
          ${formData.visibilityData.visibilityScore},
          ${JSON.stringify(formData.visibilityData.competitors)},
          ${JSON.stringify(formData.visibilityData.topics)},
          ${JSON.stringify(formData.technicalData)},
          ${formData.technicalAnalysis || ''},
          ${formData.customPrompt || getDefaultPrompt()},
          ${JSON.stringify(categoriesToUse)},
          ${formData.briefCount},
          'processing'
        ) RETURNING id
      `;

      const analysisId = analysisResult.rows[0].id;
      console.log(`✅ Analysis record created with ID: ${analysisId}`);

      // Generate briefs using Claude API with the appropriate categories
      console.log('🤖 Starting brief generation with Claude API...');
      const briefs = await generateBriefs({...formData, categoriesSelected: categoriesToUse}, analysisId);
      console.log(`✅ Generated ${briefs.length} briefs successfully`);

      // Update analysis status
      await client.sql`
        UPDATE analyses 
        SET status = 'completed', completed_at = NOW()
        WHERE id = ${analysisId}
      `;

      await client.end();

      return NextResponse.json({ 
        success: true, 
        analysisId,
        briefCount: briefs.length,
        message: `Successfully created analysis with ${briefs.length} briefs`
      });

    } catch (dbError) {
      await client.end();
      throw dbError;
    }

  } catch (error) {
    console.error('Error creating analysis:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    
    // Return more specific error message for debugging
    const errorMessage = error instanceof Error 
      ? `Failed to create analysis: ${error.message}`
      : 'Failed to create analysis: Unknown error';
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}

async function generateBriefs(formData: AnalysisFormData, analysisId: string): Promise<any[]> {
  const briefs: any[] = [];
  
  // Create the competitive analysis prompt
  console.log('📝 Creating competitive analysis prompt...');
  const prompt = createCompetitiveAnalysisPrompt(formData);
  
  try {
    // Validate API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    console.log('🔑 API key found, making Anthropic API call...');
    console.log('Model:', 'claude-3-5-sonnet-20240620');
    console.log('Max tokens:', 4000);
    
    // Get competitive analysis from Claude using direct API call
    const competitiveAnalysis = await callAnthropicAPI(prompt, 4000);
    
    console.log('✅ Received response from Anthropic API');

    const analysisText = competitiveAnalysis.content[0]?.type === 'text' 
      ? competitiveAnalysis.content[0].text 
      : 'Analysis failed';

    // Generate briefs for each selected category
    for (const category of formData.categoriesSelected) {
      const categoryBriefs = await generateCategoryBriefs(
        formData, 
        category, 
        analysisText,
        analysisId
      );
      briefs.push(...categoryBriefs);
    }

    // Sort briefs by effort/impact score and take top N
    const sortedBriefs = briefs
      .sort((a, b) => (b.effort_impact_score || 0) - (a.effort_impact_score || 0))
      .slice(0, formData.briefCount);

    // Insert briefs into database
    const client = createClient();
    await client.connect();

    try {
      for (const brief of sortedBriefs) {
        await client.sql`
          INSERT INTO briefs (
            analysis_id,
            category,
            title,
            description,
            why_it_matters,
            implementation_steps,
            effort_score,
            impact_score,
            effort_impact_score,
            keywords,
            timeline
          ) VALUES (
            ${analysisId},
            ${brief.category},
            ${brief.title},
            ${brief.description},
            ${brief.why_it_matters},
            ${JSON.stringify(brief.implementation_steps)},
            ${brief.effort_score},
            ${brief.impact_score},
            ${brief.effort_impact_score},
            ${JSON.stringify(brief.keywords)},
            ${brief.timeline}
          )
        `;
      }
      await client.end();
    } catch (dbError) {
      await client.end();
      throw dbError;
    }

    return sortedBriefs;

  } catch (error) {
    console.error('❌ Error generating briefs:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error type');
    
    // Check if it's an Anthropic API error
    if (error && typeof error === 'object' && 'status' in error) {
      console.error('API Status:', (error as any).status);
      console.error('API Error:', (error as any).error);
    }
    
    // Check if it's a WebSocket related error
    if (error instanceof Error && error.message.includes('WebSocket')) {
      console.error('🔌 WebSocket error detected - this might be a server environment issue');
    }
    
    throw error;
  }
}

function createCompetitiveAnalysisPrompt(formData: AnalysisFormData): string {
  let prompt = formData.customPrompt || getDefaultPrompt();
  
  // Replace variables in the prompt
  prompt = prompt
    .replace(/\[CUSTOMER_NAME\]/g, formData.customerName)
    .replace(/\[COMPETITORS\]/g, formData.visibilityData.competitors.join(', '))
    .replace(/\[VISIBILITY_SCORE\]/g, formData.visibilityData.visibilityScore.toString())
    .replace(/\[TOPICS\]/g, formData.visibilityData.topics.join(', '));

  // Add technical context
  let technicalContext = `
Technical Analysis Context:
- Crawler Accessible: ${formData.technicalData.crawlerAccessible ? 'Yes' : 'No'}
- Has Schema Markup: ${formData.technicalData.hasSchema ? 'Yes' : 'No'}
- Time to First Byte: ${formData.technicalData.ttfb}ms
- Wikipedia Presence: ${formData.technicalData.wikipediaPresence ? 'Yes' : 'No'}
- Google Business Profile: ${formData.technicalData.googleBusinessProfile ? 'Yes' : 'No'}
- Reddit Activity: ${formData.technicalData.redditActivity}
- Review Count: ${formData.technicalData.reviewCount}
- Review Sentiment: ${formData.technicalData.reviewSentiment}
  `;

  // Add free text technical analysis if provided
  if (formData.technicalAnalysis && formData.technicalAnalysis.trim()) {
    technicalContext += `

Additional Technical Analysis:
${formData.technicalAnalysis}
    `;
  }

  return prompt + '\n\n' + technicalContext;
}

async function generateCategoryBriefs(
  formData: AnalysisFormData, 
  category: string, 
  competitiveAnalysis: string,
  analysisId: string
): Promise<any[]> {
  
  const briefPrompt = `
Based on this competitive analysis for ${formData.customerName}:

${competitiveAnalysis}

Generate 2-3 specific, actionable briefs for the category: "${category}".

For each brief, provide:
1. Title (max 80 characters)
2. Description (2-3 sentences explaining what to do)
3. Why it matters (1-2 sentences on business impact)
4. Implementation steps (3-5 specific steps as array)
5. Effort score (1-10, where 10 is highest effort)
6. Impact score (1-10, where 10 is highest impact)
7. Keywords (3-5 relevant keywords as array)
8. Timeline (estimated time like "2-4 weeks")

Return as JSON array with exactly this structure:
[
  {
    "title": "Brief title",
    "description": "What to do",
    "why_it_matters": "Business impact",
    "implementation_steps": ["Step 1", "Step 2", "Step 3"],
    "effort_score": 5,
    "impact_score": 8,
    "keywords": ["keyword1", "keyword2"],
    "timeline": "2-3 weeks"
  }
]

Focus on AI visibility improvements specific to ${category}.
`;

  try {
    const briefResponse = await callAnthropicAPI(briefPrompt, 2000);

    const briefText = briefResponse.content[0]?.type === 'text' 
      ? briefResponse.content[0].text 
      : '[]';

    // Extract JSON from response
    const jsonMatch = briefText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`No valid JSON found in brief response for category: ${category}`);
      return [];
    }

    const briefs = JSON.parse(jsonMatch[0]);
    
    // Add category and calculated scores
    return briefs.map((brief: any) => ({
      ...brief,
      category,
      effort_impact_score: calculateEffortImpactScore(brief.effort_score, brief.impact_score)
    }));

  } catch (error) {
    console.error(`Error generating briefs for category ${category}:`, error);
    return [];
  }
}

function calculateEffortImpactScore(effort: number, impact: number): number {
  // Higher impact and lower effort = higher score
  // Formula: (impact * 2 - effort) / 10 * 100
  return Math.round(((impact * 2) - effort) / 10 * 100);
}

function getDefaultPrompt(): string {
  return `Give me 20 clear reasons why [CUSTOMER_NAME] is not winning in the AI visibility space compared to the competitors. Do a thorough analysis of the competitors and explain what they are doing right, that [CUSTOMER_NAME] is not doing. Do deep research to understand the situation.

Competitors to analyze: [COMPETITORS]
Current visibility score: [VISIBILITY_SCORE]%
Focus topics: [TOPICS]

Provide specific, actionable insights that can be turned into implementation briefs.`;
}