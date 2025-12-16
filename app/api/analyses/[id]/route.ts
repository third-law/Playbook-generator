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
          customer_name,
          status,
          created_at,
          completed_at,
          visibility_score,
          competitors,
          topics,
          technical_data,
          custom_prompt,
          categories_selected,
          brief_count
        FROM analyses
        WHERE id = ${analysisId}
      `;

      if (result.rows.length === 0) {
        await client.end();
        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
      }

      const analysis = {
        ...result.rows[0],
        created_at: result.rows[0].created_at?.toISOString(),
        completed_at: result.rows[0].completed_at?.toISOString(),
        competitors: JSON.parse(result.rows[0].competitors || '[]'),
        topics: JSON.parse(result.rows[0].topics || '[]'),
        technical_data: JSON.parse(result.rows[0].technical_data || '{}'),
        categories_selected: JSON.parse(result.rows[0].categories_selected || '[]')
      };

      await client.end();

      return NextResponse.json({ analysis });

    } catch (dbError) {
      await client.end();
      throw dbError;
    }

  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' }, 
      { status: 500 }
    );
  }
}