import { NextRequest, NextResponse } from 'next/server';
import { getAnalyses } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const analyses = await getAnalyses();
    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    );
  }
}