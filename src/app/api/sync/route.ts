import { NextResponse } from 'next/server';
import { syncAllSources } from '@/lib/sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncAllSources();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
