import Parser from 'rss-parser';
import { v4 as uuidv4 } from 'uuid';
import { readDb, writeDb } from './db';
import { analyzeNewsWithAI } from './ai';
import { calculateScore } from './score';
import { AppData, NewsItem, RssSource } from '@/types';

const parser = new Parser();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function syncAllSources() {
  const data = readDb();
  let newNewsCount = 0;
  let reprocessedCount = 0;

  // Reprocess existing items that failed AI analysis previously
  for (let i = 0; i < data.news.length; i++) {
    const item = data.news[i];
    if ((!item.eventType || item.score === 0) && process.env.GEMINI_API_KEY) {
      console.log(`Reprocessing old item: ${item.title}`);
      const articleText = `${item.title || ''}\n\n${item.description || ''}`;
      
      try {
        const aiResult = await analyzeNewsWithAI(articleText);
        if (aiResult) {
          item.eventType = aiResult.event_type;
          item.summaryTr = aiResult.summary_tr;
          item.company = aiResult.company;
          item.fromLocation = aiResult.from_location;
          item.toLocation = aiResult.to_location;
          item.sector = aiResult.sector;

          const { score, confidence } = calculateScore(item);
          item.score = score;
          item.confidence = confidence;
          reprocessedCount++;
          
          // Add delay to prevent rate limit (4 seconds)
          await delay(4000);
        }
      } catch (err) {
        console.error("Reprocessing failed for item:", err);
      }
    }
  }

  for (let source of data.sources) {
    try {
      const feed = await parser.parseURL(source.url);
      source.lastSync = new Date().toISOString();
      source.status = 'ok';

      for (let item of feed.items) {
        // Dedup by URL or title
        const exists = data.news.some(n => n.link === item.link || n.title === item.title);
        if (exists) continue;

        // Needs AI analysis
        const articleText = `${item.title || ''}\n\n${item.contentSnippet || item.content || ''}`;
        
        let aiResult = null;
        if (process.env.GEMINI_API_KEY) {
          aiResult = await analyzeNewsWithAI(articleText);
          // Add delay to prevent rate limit (4 seconds)
          await delay(4000);
        }

        const newsItem: NewsItem = {
          id: uuidv4(),
          sourceId: source.id,
          sourceName: source.name,
          title: item.title || 'No title',
          link: item.link || '',
          pubDate: item.pubDate || new Date().toISOString(),
          description: item.contentSnippet || item.content || '',
        };

        if (aiResult) {
          newsItem.eventType = aiResult.event_type;
          newsItem.summaryTr = aiResult.summary_tr;
          newsItem.company = aiResult.company;
          newsItem.fromLocation = aiResult.from_location;
          newsItem.toLocation = aiResult.to_location;
          newsItem.sector = aiResult.sector;

          // Calculate score
          const { score, confidence } = calculateScore(newsItem);
          newsItem.score = score;
          newsItem.confidence = confidence;
        } else {
          // If no AI result, default score to 0
          newsItem.score = 0;
          newsItem.confidence = 0;
        }

        data.news.push(newsItem);
        newNewsCount++;
      }
    } catch (error: any) {
      console.error(`Failed to sync source ${source.name}:`, error);
      source.status = 'error';
      source.errorMessage = error.message;
    }
  }

  // Sort news by score descending, then date
  data.news.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  writeDb(data);
  return { success: true, added: newNewsCount };
}
