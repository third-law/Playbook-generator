import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';
import { createClient } from '@vercel/postgres';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const isValid = await verifySession();
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: analysisId } = await params;

    const client = createClient();
    await client.connect();

    try {
      const result = await client.sql`
        SELECT 
          id,
          category,
          title,
          description,
          why_it_matters,
          implementation_steps,
          effort_score,
          impact_score,
          effort_impact_score,
          keywords,
          timeline,
          created_at
        FROM briefs
        WHERE analysis_id = ${analysisId}
        ORDER BY effort_impact_score DESC, created_at ASC
      `;

      const briefs = result.rows.map(brief => ({
        ...brief,
        implementation_steps: JSON.parse(brief.implementation_steps || '[]'),
        keywords: JSON.parse(brief.keywords || '[]'),
        created_at: brief.created_at?.toISOString()
      }));

      await client.end();

      return NextResponse.json({ briefs });

    } catch (dbError) {
      await client.end();
      throw dbError;
    }

  } catch (error) {
    console.error('Error fetching briefs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch briefs' }, 
      { status: 500 }
    );
  }
}