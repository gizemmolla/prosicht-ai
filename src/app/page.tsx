"use client";

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { RssSource, NewsItem, AppData } from '@/types';
import { RefreshCw, Plus, Trash2, Search, Filter, ExternalLink, X, MapPin, Building2, Tag, Calendar, AlertCircle, Hexagon, TrendingUp, Target, Factory } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Home() {
  const [data, setData] = useState<AppData>({ sources: [], news: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [addError, setAddError] = useState('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMinScore, setFilterMinScore] = useState('0');

  // Modal
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newSourceName || !newSourceUrl) return;

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSourceName, url: newSourceUrl }),
      });
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error);
      
      setData(prev => ({ ...prev, sources: [...prev.sources, json.source] }));
      setNewSourceName('');
      setNewSourceUrl('');
    } catch (err: any) {
      setAddError(err.message || 'Bir hata oluştu.');
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      setData(prev => ({ 
        sources: prev.sources.filter(s => s.id !== id),
        news: prev.news.filter(n => n.sourceId !== id)
      }));
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Yenileme sırasında bir hata oluştu. Lütfen konsolu kontrol edin.');
    } finally {
      setSyncing(false);
    }
  };

  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'var(--score-gray)';
    if (score >= 80) return 'var(--score-green)';
    if (score >= 65) return 'var(--score-blue)';
    if (score >= 50) return 'var(--score-yellow)';
    return 'var(--score-gray)';
  };

  const getScoreLabel = (score?: number) => {
    if (score === undefined) return 'Düşük Alaka';
    if (score >= 80) return 'Yüksek Fırsat';
    if (score >= 65) return 'İzlenecek';
    if (score >= 50) return 'Şartlı İlgi';
    return 'Düşük Alaka';
  };

  const getActionRecommendation = (score?: number, eventType?: string) => {
    if (score === undefined) return 'Arşivle, sadece arama için tut';
    if (score >= 80) return 'Hemen iletişime geç (reach_out) / dosya talep et';
    if (score >= 65) return 'Takip listesine al, haftalık raporda göster';
    if (score >= 50) return eventType === 'tender' ? 'İhale takibi' : 'Partner araması';
    return 'Arşivle, sadece arama için tut';
  };

  const getEventTypeColor = (type?: string) => {
    switch(type) {
      case 'relocation': return '#3b82f6';
      case 'closure': return '#ef4444';
      case 'expansion': return '#22c55e';
      case 'new_plant': return '#8b5cf6';
      case 'tender': return '#eab308';
      default: return '#64748b';
    }
  };

  const filteredNews = data.news.filter(item => {
    // Search
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !(item.summaryTr || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(item.company || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Type Filter
    if (filterType !== 'all' && item.eventType !== filterType) {
      return false;
    }
    // Score Filter
    if (filterMinScore !== '0' && (item.score || 0) < parseInt(filterMinScore)) {
      return false;
    }
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIconWrapper}>
            <Hexagon size={28} strokeWidth={2.5} />
          </div>
          <div className={styles.logoTextWrapper}>
            <span className={styles.logoBrand}>PRO SICHT</span>
            <span className={styles.logoBadge}>AI</span>
          </div>
        </div>

        <form onSubmit={handleAddSource} className={styles.addSourceForm}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Yeni RSS Ekle</h3>
          <input 
            className={styles.input} 
            placeholder="Kaynak Adı (örn: Reuters Europe)"
            value={newSourceName}
            onChange={e => setNewSourceName(e.target.value)}
          />
          <input 
            className={styles.input} 
            placeholder="RSS URL"
            type="url"
            value={newSourceUrl}
            onChange={e => setNewSourceUrl(e.target.value)}
          />
          {addError && <p style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{addError}</p>}
          <button type="submit" className={styles.button}>
            <Plus size={16} /> Ekle
          </button>
        </form>

        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>RSS Kaynakları</h3>
        <div>
          {data.sources.length === 0 ? (
            <p className={styles.detailValue} style={{ color: 'var(--muted-foreground)' }}>Henüz RSS kaynağı eklemediniz.</p>
          ) : (
            data.sources.map(source => (
              <div key={source.id} className={styles.sourceItem}>
                <div className={styles.sourceInfo}>
                  <span className={styles.sourceName}>
                    {source.name}
                    {source.status === 'error' && <AlertCircle size={12} color="var(--danger)" style={{ marginLeft: 4, display: 'inline' }} />}
                  </span>
                  <span className={styles.sourceUrl} title={source.url}>{source.url}</span>
                </div>
                <button 
                  onClick={() => handleDeleteSource(source.id)}
                  className={`${styles.button} ${styles.buttonDanger}`}
                  title="Sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.filters}>
            <div className={`${styles.input} ${styles.searchBox}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem' }}>
              <Search size={16} color="var(--muted-foreground)" />
              <input 
                placeholder="Haberlerde, şirketlerde ara..." 
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', height: '36px', color: 'inherit' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select className={`${styles.input} ${styles.filterSelect}`} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">Tüm Olay Tipleri</option>
              <option value="relocation">Taşınma (Relocation)</option>
              <option value="new_plant">Yeni Tesis (New Plant)</option>
              <option value="expansion">Genişleme (Expansion)</option>
              <option value="closure">Kapanış (Closure)</option>
              <option value="tender">İhale (Tender)</option>
              <option value="other">Diğerleri (Other)</option>
            </select>

            <select className={`${styles.input} ${styles.filterSelect}`} value={filterMinScore} onChange={e => setFilterMinScore(e.target.value)}>
              <option value="0">Tüm Skorlar</option>
              <option value="80">Yüksek Fırsat (80+)</option>
              <option value="65">İzlenecek (65+)</option>
              <option value="50">Şartlı İlgi (50+)</option>
            </select>
          </div>

          <button onClick={handleSync} disabled={syncing || data.sources.length === 0} className={styles.button}>
            <RefreshCw size={16} className={syncing ? styles.spinner : ''} />
            {syncing ? 'Yenileniyor...' : 'Yenile'}
          </button>
        </header>

        <div className={styles.content}>
          {!loading && data.news.length > 0 && (
            <div className={styles.statsContainer}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}><TrendingUp size={24} /></div>
                <div>
                  <div className={styles.statValue}>{data.news.length}</div>
                  <div className={styles.statLabel}>Toplam Analiz</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ color: 'var(--score-green)', background: 'rgba(34, 197, 94, 0.1)' }}>
                  <Target size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>
                    {data.news.filter(n => (n.score || 0) >= 80).length}
                  </div>
                  <div className={styles.statLabel}>Yüksek Fırsat (80+)</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ color: 'var(--score-blue)', background: 'rgba(59, 130, 246, 0.1)' }}>
                  <Factory size={24} />
                </div>
                <div>
                  <div className={styles.statValue}>
                    {data.news.filter(n => ['relocation', 'closure', 'new_plant', 'expansion'].includes(n.eventType || '')).length}
                  </div>
                  <div className={styles.statLabel}>Tesis Hareketleri</div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className={styles.emptyState}>
              <RefreshCw size={32} className={styles.spinner} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
              <p>Haberler Yükleniyor...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Gösterilecek haber bulunamadı.</p>
            </div>
          ) : (
            <div className={styles.newsList}>
              {filteredNews.map(item => (
                <div key={item.id} className={styles.card} onClick={() => setSelectedNews(item)}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <div 
                      className={styles.scoreBadge} 
                      style={{ backgroundColor: getScoreColor(item.score) }}
                    >
                      {item.score || 0}
                    </div>
                  </div>
                  
                  <div className={styles.cardMeta}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} /> 
                      {format(new Date(item.pubDate), 'dd MMM yyyy, HH:mm', { locale: tr })}
                    </span>
                    <span style={{ color: 'var(--primary)' }}>{item.sourceName}</span>
                    {item.eventType && (
                      <span className={styles.tag} style={{ backgroundColor: getEventTypeColor(item.eventType), color: 'white' }}>
                        {item.eventType.toUpperCase()}
                      </span>
                    )}
                    {item.company && (
                      <span className={styles.tag} style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-foreground)' }}>
                        <Building2 size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}/>
                        {item.company}
                      </span>
                    )}
                  </div>
                  
                  {item.summaryTr && (
                    <p className={styles.summary}>{item.summaryTr}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal for Details */}
      {selectedNews && (
        <div className={styles.modal} onClick={() => setSelectedNews(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.cardTitle} style={{ paddingRight: '2rem' }}>{selectedNews.title}</h2>
              <button onClick={() => setSelectedNews(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="var(--muted-foreground)" />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
               <div className={styles.scoreBadge} style={{ backgroundColor: getScoreColor(selectedNews.score) }}>
                  Skor: {selectedNews.score || 0} ({getScoreLabel(selectedNews.score)})
               </div>
               {selectedNews.confidence !== undefined && (
                 <div className={styles.tag}>Güven: {selectedNews.confidence * 100}%</div>
               )}
               {selectedNews.eventType && (
                  <div className={styles.tag} style={{ backgroundColor: getEventTypeColor(selectedNews.eventType), color: 'white' }}>
                    Olay Tipi: {selectedNews.eventType.toUpperCase()}
                  </div>
               )}
            </div>

            <div className={styles.detailSection} style={{ marginBottom: '1.5rem', backgroundColor: 'var(--card-alt)', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${getScoreColor(selectedNews.score)}` }}>
              <div className={styles.detailLabel}>ÖNERİLEN AKSİYON</div>
              <div className={styles.detailValue} style={{ fontWeight: 600 }}>
                {getActionRecommendation(selectedNews.score, selectedNews.eventType)}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>TÜRKÇE ÖZET (AI)</div>
              <div className={styles.detailValue} style={{ lineHeight: 1.6 }}>
                {selectedNews.summaryTr || 'Özet çıkarılamadı.'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div className={styles.detailLabel}><Building2 size={12} style={{ display: 'inline', marginRight: 4 }}/> Şirket</div>
                <div className={styles.detailValue}>{selectedNews.company || '-'}</div>
              </div>
              <div>
                <div className={styles.detailLabel}><Tag size={12} style={{ display: 'inline', marginRight: 4 }}/> Sektör</div>
                <div className={styles.detailValue}>{selectedNews.sector || '-'}</div>
              </div>
              <div>
                <div className={styles.detailLabel}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }}/> Çıkış Lokasyonu</div>
                <div className={styles.detailValue}>{selectedNews.fromLocation || '-'}</div>
              </div>
              <div>
                <div className={styles.detailLabel}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }}/> Hedef Lokasyon</div>
                <div className={styles.detailValue}>{selectedNews.toLocation || '-'}</div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Orijinal Haber İçeriği / Açıklaması</div>
              <div className={styles.detailValue} style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'pre-wrap' }}>
                {selectedNews.description}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                Kaynak: {selectedNews.sourceName} • {format(new Date(selectedNews.pubDate), 'dd MMM yyyy', { locale: tr })}
              </div>
              <a href={selectedNews.link} target="_blank" rel="noopener noreferrer" className={styles.button}>
                Kaynağa Git <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
