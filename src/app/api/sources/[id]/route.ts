import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const data = readDb();
    
    // next 15 params promise handling if needed, but in next 14 it's fine. Wait, Next.js 15 requires awaiting params
    const { id } = await context.params;

    const initialLength = data.sources.length;
    data.sources = data.sources.filter(s => s.id !== id);

    if (data.sources.length === initialLength) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Remove news for this source
    data.news = data.news.filter(n => n.sourceId !== id);

    writeDb(data);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
