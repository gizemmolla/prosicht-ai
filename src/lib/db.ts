import fs from 'fs';
import path from 'path';
import { AppData, RssSource, NewsItem } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data.txt');

const defaultData: AppData = {
  sources: [],
  news: []
};

export function readDb(): AppData {
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeDb(defaultData);
      return defaultData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db:', err);
    return defaultData;
  }
}

export function writeDb(data: AppData): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db:', err);
  }
}
