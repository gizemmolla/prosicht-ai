import { GoogleGenAI } from '@google/genai';

let ai: any = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch(e) {
  console.log("No GEMINI API KEY");
}

const systemPrompt = `Sen bir endüstriyel haber analistsin.
Aşağıdaki haber metninden olay tipini, şirket adını, lokasyonları ve sektörü çıkar.
SADECE JSON döndür, başka hiçbir şey yazma. Bilmediğin alanları null bırak. Özeti Türkçe yaz (2-4 cümle).

JSON formatı:
{
  "event_type": "relocation | closure | expansion | new_plant | tender | other",
  "summary_tr": "Türkçe özet",
  "company": "Şirket adı veya null",
  "from_location": "Çıkış lokasyonu veya null",
  "to_location": "Hedef lokasyon veya null",
  "sector": "Sektör veya null"
}`;

export async function analyzeNewsWithAI(articleText: string) {
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nMETİN:\n${articleText}` }] }
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON from AI:', e, text);
      return null;
    }
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
}
