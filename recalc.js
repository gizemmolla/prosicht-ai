const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const { v4: uuidv4 } = require('uuid');

const envFile = fs.readFileSync('.env.local', 'utf8');
const geminiKey = envFile.split('\n').find(line => line.startsWith('GEMINI_API_KEY=')).split('=')[1].trim();
process.env.GEMINI_API_KEY = geminiKey;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const systemPrompt = `Sen bir endüstriyel haber analistsin.
Aşağıdaki haber metninden olay tipini, şirket adını, lokasyonları ve sektörü çıkar.
SADECE JSON döndür, başka hiçbir şey yazma. Bilmediğin alanları null bırak. Özeti Türkçe yaz (2-4 cümle).

LÜTFEN HABERLERİ AŞAĞIDAKİ ANAHTAR KELİMELERE GÖRE SINIFLANDIR:
- relocation: Bir fabrikanın, üretimin veya merkezin başka bir ülkeye/şehre taşınması, operasyonları kaydırma (moving operations, shifting production, relocating to, transferring production).
- closure: Fabrikanın kapanması, iflas, üretim durdurma, işten çıkarma (shutting down, closing facility, bankruptcy, laying off, production halt).
- expansion: Mevcut bir tesisin kapasitesinin artırılması, ek yatırım, yeni hat ekleme (scaling up, expanding operations, capacity increase, additional investment).
- new_plant: Sıfırdan yeni bir fabrika, tesis veya yatırım merkezi kurulması (greenfield, opening a new facility, building a plant, groundbreaking).
- tender: Bir kamu veya özel sektör ihalesi, proje teklifi çağrısı (bidding, procurement, tender offer, contract award).
- other: Yukarıdakilerin hiçbirine girmeyen genel şirket haberleri veya yönetim değişiklikleri.

JSON formatı:
{
  "event_type": "relocation | closure | expansion | new_plant | tender | other",
  "summary_tr": "Türkçe özet",
  "company": "Şirket adı veya null",
  "from_location": "Çıkış lokasyonu veya null",
  "to_location": "Hedef lokasyon veya null",
  "sector": "Sektör veya null"
}`;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function calculateScore(item) {
  let E = 0.10;
  switch (item.eventType) {
    case 'relocation': E = 1.00; break;
    case 'new_plant': E = 0.90; break;
    case 'expansion': E = 0.75; break;
    case 'tender': E = 0.55; break;
    case 'closure': E = 0.45; break;
    case 'other': E = 0.10; break;
  }

  let A = 0;
  if (item.company && item.company.trim() !== '') A += 0.40;
  if (item.fromLocation && item.fromLocation.trim() !== '') A += 0.25;
  if (item.toLocation && item.toLocation.trim() !== '') A += 0.25;
  if (item.sector && item.sector.trim() !== '') A += 0.10;

  let G = 0.30;
  const locStr = `${item.fromLocation || ''} ${item.toLocation || ''}`.toLowerCase();
  const euKeywords = ['europe', 'germany', 'france', 'italy', 'spain', 'poland', 'uk', 'united kingdom', 'turkey', 'türkiye', 'balkans', 'hungary', 'romania', 'bulgaria', 'czech', 'slovakia', 'greece', 'austria', 'sweden', 'netherlands', 'belgium', 'portugal', 'ireland', 'denmark', 'finland', 'croatia', 'slovenia', 'lithuania', 'latvia', 'estonia', 'cyprus', 'malta', 'luxembourg'];
  const neighborKeywords = ['russia', 'egypt', 'morocco', 'algeria', 'tunisia', 'belarus', 'ukraine', 'libya'];
  
  if (locStr.length > 0) {
    if (euKeywords.some(k => locStr.includes(k))) G = 1.00;
    else if (neighborKeywords.some(k => locStr.includes(k))) G = 0.50;
    else G = 0.10;
  }

  let T = 0.30;
  const textStr = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  if (textStr.match(/\b(announced|will move|in q[1-4]|this year|next few months|soon|0-6 months|within 6 months)\b/i)) T = 1.00;
  else if (textStr.match(/\b(next year|6-18 months|in 202[4-6]|expected)\b/i)) T = 0.70;
  else if (textStr.match(/\b(18-36 months|by 202[6-9]|in the future|planned for)\b/i)) T = 0.40;

  let C = 0.55;
  const linkStr = (item.link || '').toLowerCase();
  const topTier = ['reuters.com', 'bloomberg.com', 'ft.com', 'handelsblatt.com', 'wsj.com'];
  if (topTier.some(t => linkStr.includes(t)) || linkStr.includes('ir.') || linkStr.includes('investor') || linkStr.includes('press-release')) {
    C = 1.00;
    if (topTier.some(t => linkStr.includes(t))) C = 0.85;
  } else if (linkStr.includes('industry') || linkStr.includes('manufacturing') || linkStr.includes('logistics') || linkStr.includes('supplychain') || linkStr.includes('automotive')) {
    C = 0.70;
  } else if (linkStr.includes('blog') || linkStr.includes('forum')) {
    C = 0.25;
  }

  let rawScore = 100 * (0.30 * E + 0.25 * A + 0.20 * G + 0.15 * T + 0.10 * C);

  let filledFields = 0;
  if (item.company && item.company.trim() !== '') filledFields++;
  if (item.fromLocation && item.fromLocation.trim() !== '') filledFields++;
  if (item.toLocation && item.toLocation.trim() !== '') filledFields++;
  if (item.sector && item.sector.trim() !== '') filledFields++;
  if (item.eventType && item.eventType.trim() !== '') filledFields++;

  let confidence = filledFields / 5;
  if (confidence < 0.40) rawScore = rawScore * 0.5;

  return { score: Math.round(rawScore), confidence: Number(confidence.toFixed(2)) };
}

async function run() {
  const dataPath = 'data.txt';
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let processed = 0;

  for (let i = 0; i < data.news.length; i++) {
    const item = data.news[i];
    if (!item.eventType || item.score === 0) {
      console.log(`Processing: ${item.title}`);
      const articleText = `${item.title || ''}\n\n${item.description || ''}`;
      
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nMETİN:\n${articleText}` }] }],
          config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (text) {
          const aiResult = JSON.parse(text);
          item.eventType = aiResult.event_type;
          item.summaryTr = aiResult.summary_tr;
          item.company = aiResult.company;
          item.fromLocation = aiResult.from_location;
          item.toLocation = aiResult.to_location;
          item.sector = aiResult.sector;

          const { score, confidence } = calculateScore(item);
          item.score = score;
          item.confidence = confidence;
          
          processed++;
          fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
          console.log(`Success -> Score: ${score}`);
        }
      } catch (err) {
        console.error(`Failed ${item.title}:`, err.message);
      }
      
      await delay(4000); // 15 requests per minute
    }
  }
  console.log(`Done processing ${processed} items.`);
}

run();
