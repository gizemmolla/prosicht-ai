import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = readDb();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const { name, url } = await request.json();
    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    // Validate URL (F3 requirement)
    const parser = new Parser();
    try {
      await parser.parseURL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Geçersiz veya okunamayan RSS bağlantısı.' }, { status: 400 });
    }

    const data = readDb();
    
    // Check if exists
    if (data.sources.some(s => s.url === url)) {
      return NextResponse.json({ error: 'Bu RSS kaynağı zaten ekli.' }, { status: 400 });
    }

    const newSource = {
      id: uuidv4(),
      name,
      url,
      status: 'pending' as const,
    };

    data.sources.push(newSource);
    writeDb(data);

    return NextResponse.json({ success: true, source: newSource });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
