import { EventType, NewsItem } from '@/types';

export function calculateScore(item: Partial<NewsItem>): { score: number; confidence: number } {
  // Event Type (E)
  let E = 0.10;
  switch (item.eventType) {
    case 'relocation': E = 1.00; break;
    case 'new_plant': E = 0.90; break;
    case 'expansion': E = 0.75; break;
    case 'tender': E = 0.55; break;
    case 'closure': E = 0.45; break;
    case 'other': E = 0.10; break;
  }

  // Actor Clarity (A)
  let A = 0;
  if (item.company && item.company.trim() !== '') A += 0.40;
  if (item.fromLocation && item.fromLocation.trim() !== '') A += 0.25;
  if (item.toLocation && item.toLocation.trim() !== '') A += 0.25;
  if (item.sector && item.sector.trim() !== '') A += 0.10;

  // Geography (G) - deterministic check based on location strings
  let G = 0.30; // Unknown default
  const locStr = `${item.fromLocation || ''} ${item.toLocation || ''}`.toLowerCase();
  
  // Avrupa içi (AB + Birleşik Krallık + Türkiye + Balkanlar)
  const euKeywords = [
    'europe', 'germany', 'france', 'italy', 'spain', 'poland', 'uk', 'united kingdom', 
    'turkey', 'türkiye', 'balkans', 'hungary', 'romania', 'bulgaria', 'czech', 
    'slovakia', 'greece', 'austria', 'sweden', 'netherlands', 'belgium', 'portugal', 
    'ireland', 'denmark', 'finland', 'croatia', 'slovenia', 'lithuania', 'latvia', 
    'estonia', 'cyprus', 'malta', 'luxembourg'
  ];
  
  // Avrupa komşuluğu (Rusya, Kuzey Afrika vb.)
  const neighborKeywords = ['russia', 'egypt', 'morocco', 'algeria', 'tunisia', 'belarus', 'ukraine', 'libya'];
  
  if (locStr.length > 0) {
    if (euKeywords.some(k => locStr.includes(k))) {
      G = 1.00;
    } else if (neighborKeywords.some(k => locStr.includes(k))) {
      G = 0.50;
    } else {
      G = 0.10; // Other
    }
  }

  // Timeline (T) - check description/title for keywords
  let T = 0.30; // Belirtilmemiş default
  const textStr = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  
  if (textStr.match(/\b(announced|will move|in q[1-4]|this year|next few months|soon|0-6 months|within 6 months)\b/i)) {
    T = 1.00;
  } else if (textStr.match(/\b(next year|6-18 months|in 202[4-6]|expected)\b/i)) {
    T = 0.70;
  } else if (textStr.match(/\b(18-36 months|by 202[6-9]|in the future|planned for)\b/i)) {
    T = 0.40;
  }

  // Source Trust (C)
  let C = 0.55; // General news site default
  const linkStr = (item.link || '').toLowerCase();
  const topTier = ['reuters.com', 'bloomberg.com', 'ft.com', 'handelsblatt.com', 'wsj.com'];
  
  if (topTier.some(t => linkStr.includes(t)) || linkStr.includes('ir.') || linkStr.includes('investor') || linkStr.includes('press-release')) {
    C = 1.00; // Saygın haber ajansı or Şirketin resmi sitesi
    // Notice: Wait, requirement says 'Şirketin resmi sitesi = 1.00', 'Saygın haber ajansı = 0.85'
    if (topTier.some(t => linkStr.includes(t))) {
      C = 0.85;
    }
  } else if (linkStr.includes('industry') || linkStr.includes('manufacturing') || linkStr.includes('logistics') || linkStr.includes('supplychain') || linkStr.includes('automotive')) {
    C = 0.70; // Sektörel yayın
  } else if (linkStr.includes('blog') || linkStr.includes('forum')) {
    C = 0.25; // Blog / forum
  }

  // Calculate raw score
  let rawScore = 100 * (0.30 * E + 0.25 * A + 0.20 * G + 0.15 * T + 0.10 * C);

  // Confidence calculation
  let filledFields = 0;
  if (item.company && item.company.trim() !== '') filledFields++;
  if (item.fromLocation && item.fromLocation.trim() !== '') filledFields++;
  if (item.toLocation && item.toLocation.trim() !== '') filledFields++;
  if (item.sector && item.sector.trim() !== '') filledFields++;
  if (item.eventType && item.eventType.trim() !== '') filledFields++;

  let confidence = filledFields / 5;

  // Penalty if confidence < 0.40
  if (confidence < 0.40) {
    rawScore = rawScore * 0.5;
  }

  return {
    score: Math.round(rawScore),
    confidence: Number(confidence.toFixed(2))
  };
}
