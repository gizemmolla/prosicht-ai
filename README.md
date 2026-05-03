# Prosicht AI

Bu proje, RSS haber kaynaklarından endüstriyel haberleri senkronize eden, Google Gemini AI kullanarak analiz eden ve skorlayan bir web uygulamasıdır.

## Kullanılan Teknolojiler

- **Frontend/UI**: Next.js 16, React 19, TypeScript
- **AI Analizi**: Google Gemini AI (gemini-2.5-flash modeli)
- **RSS Parsing**: rss-parser
- **Veritabanı**: JSON tabanlı dosya sistemi (data.txt)
- **UI Bileşenleri**: Lucide React (ikonlar)
- **Tarih İşleme**: date-fns
- **UUID Üretimi**: uuid
- **Linting**: ESLint

## Kısa Mimari Açıklaması

Uygulama Next.js App Router mimarisini kullanır:

- **Frontend**: `src/app/` altında React bileşenleri (page.tsx, layout.tsx)
- **API Routes**: `src/app/api/` altında RESTful API uç noktaları
  - `/api/data`: Veri okuma/yazma
  - `/api/sources/[id]`: Kaynak yönetimi
  - `/api/sync`: RSS senkronizasyonu
- **İş Mantığı**: `src/lib/` altında modüller
  - `ai.ts`: Google Gemini ile haber analizi
  - `db.ts`: JSON dosya tabanlı veritabanı işlemleri
  - `score.ts`: Haber skorlama algoritması
  - `sync.ts`: RSS kaynaklarından veri çekme ve işleme
- **Veri**: `data.txt` dosyasında JSON formatında saklanır

## Gereken API Anahtarları

Uygulamanın çalışması için aşağıdaki environment variable'ları ayarlamanız gerekir:

- `GEMINI_API_KEY`: Google Gemini AI API anahtarı (Google AI Studio'dan alınabilir)

## Kurulum Adımları

1. **Depoyu klonlayın:**
   ```bash
   git clone <repository-url>
   cd prosicht-ai
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Environment değişkenlerini ayarlayın:**
   
   `.env.local` dosyasını oluşturun ve içine şunları ekleyin:
   ```
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Geliştirme sunucusunu başlatın:**
   ```bash
   npm run dev
   ```

5. **Tarayıcıda açın:**
   
   [http://localhost:3000](http://localhost:3000)

## Kullanım

- Ana sayfada RSS kaynaklarını ekleyebilir ve yönetebilirsiniz
- Senkronizasyon ile haberleri çekip AI analizi yapabilirsiniz
- Analiz sonuçları skorlanır ve filtrelenebilir

## Build ve Dağıtım

```bash
npm run build
npm start
```

Vercel veya benzeri platformlarda dağıtabilirsiniz.
