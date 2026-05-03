"use client";

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { RssSource, NewsItem, AppData } from '@/types';
import { RefreshCw, Plus, Trash2, Search, Filter, ExternalLink, X, MapPin, Building2, Tag, Calendar, AlertCircle, Hexagon, TrendingUp, Target, Factory, Star, Download, ChartColumn, List, Map, Briefcase, LayoutDashboard, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Home() {
  const [data, setData] = useState<AppData>({ sources: [], news: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [addError, setAddError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMinScore, setFilterMinScore] = useState('0');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // CRM Pipeline: Record<newsId, stage>
  type PipelineStage = 'target' | 'contacted' | 'closed';
  const [pipeline, setPipeline] = useState<Record<string, PipelineStage>>({});

  // View Mode
  const [viewMode, setViewMode] = useState<'list' | 'analytics' | 'map' | 'kanban'>('list');

  // Greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'Merhaba';
    return 'İyi Akşamlar';
  };

  // Modal
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    fetchData();
    const savedBookmarks = localStorage.getItem('pro-sicht-bookmarks');
    if (savedBookmarks) {
      try { setBookmarks(JSON.parse(savedBookmarks)); } catch (e) { console.error('Failed to parse bookmarks', e); }
    }
    const savedPipeline = localStorage.getItem('pro-sicht-crm');
    if (savedPipeline) {
      try { setPipeline(JSON.parse(savedPipeline)); } catch (e) { console.error('Failed to parse pipeline', e); }
    }
  }, []);

  // Periodic Auto-Sync (Every 10 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!syncing && data.sources.length > 0) {
        console.log('Starting periodic auto-sync...');
        handleSync();
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(interval);
  }, [syncing, data.sources.length]);

  const toggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      localStorage.setItem('pro-sicht-bookmarks', JSON.stringify(next));
      return next;
    });
  };

  const togglePipeline = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPipeline(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 'target';
      }
      localStorage.setItem('pro-sicht-crm', JSON.stringify(next));
      return next;
    });
  };

  const movePipelineStage = (e: React.MouseEvent, id: string, direction: 'forward' | 'back') => {
    e.stopPropagation();
    const stages: PipelineStage[] = ['target', 'contacted', 'closed'];
    setPipeline(prev => {
      const current = prev[id] || 'target';
      const idx = stages.indexOf(current);
      const next = { ...prev };
      if (direction === 'forward' && idx < stages.length - 1) {
        next[id] = stages[idx + 1];
      } else if (direction === 'back' && idx > 0) {
        next[id] = stages[idx - 1];
      }
      localStorage.setItem('pro-sicht-crm', JSON.stringify(next));
      return next;
    });
  };

  const exportToCsv = () => {
    if (filteredNews.length === 0) return;

    const headers = ['Baslik', 'Tarih', 'Sirket', 'Sektor', 'Olay Tipi', 'Cikis Yeri', 'Hedef Yer', 'Skor', 'Ozet', 'Link'];
    const csvContent = [
      headers.join(';'),
      ...filteredNews.map(n => [
        `"${(n.title || '').replace(/"/g, '""')}"`,
        `"${format(new Date(n.pubDate), 'dd.MM.yyyy')}"`,
        `"${n.company || ''}"`,
        `"${n.sector || ''}"`,
        `"${n.eventType || ''}"`,
        `"${n.fromLocation || ''}"`,
        `"${n.toLocation || ''}"`,
        n.score || 0,
        `"${(n.summaryTr || '').replace(/"/g, '""')}"`,
        `"${n.link || ''}"`
      ].join(';'))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prosicht-export-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    link.click();
  };

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
      setLastUpdated(new Date());
    }
  };

  const getScoreColor = (score?: number) => {
    if (score === undefined || score === 0) return 'var(--score-gray)';
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
    if (score >= 80) return 'Hemen iletişime geç / dosya talep et';
    if (score >= 65) return 'Takip listesine al, haftalık raporda göster';
    if (score >= 50) return eventType === 'tender' ? 'İhale takibi' : 'Partner araması';
    return 'Arşivle, sadece arama için tut';
  };

  const getEventTypeColor = (type?: string) => {
    switch (type) {
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
    // Date Range Filter
    if (filterDateRange !== 'all') {
      const days = parseInt(filterDateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(item.pubDate) < cutoff) return false;
    }
    // Bookmark Filter
    if (showBookmarksOnly && !bookmarks.includes(item.id)) {
      return false;
    }
    return true;
  });

  // Chart Data Processing
  const eventTypeData = Object.entries(
    filteredNews.reduce((acc, item) => {
      const type = item.eventType || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.toUpperCase(), value }));

  const scoreData = [
    { name: 'Yüksek (80+)', value: filteredNews.filter(n => (n.score || 0) >= 80).length, color: 'var(--score-green)' },
    { name: 'İzlenecek (65-79)', value: filteredNews.filter(n => (n.score || 0) >= 65 && (n.score || 0) < 80).length, color: 'var(--score-blue)' },
    { name: 'Şartlı İlgi (50-64)', value: filteredNews.filter(n => (n.score || 0) >= 50 && (n.score || 0) < 65).length, color: 'var(--score-yellow)' },
    { name: 'Düşük (<50)', value: filteredNews.filter(n => (n.score || 0) < 50).length, color: 'var(--score-gray)' }
  ].filter(d => d.value > 0);

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

        {/* Sidebar Footer */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          fontSize: '0.75rem',
          color: 'var(--muted-foreground)',
          lineHeight: 1.6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Hexagon size={12} color="var(--primary)" />
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>PRO SICHT</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: 'var(--secondary)', color: 'var(--secondary-foreground)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>v1.0</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.7rem' }}>Endüstriyel fırsatları yapay zeka ile analiz et, satış hunisinde takip et.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>

          {/* ── ROW 1: Greeting ───────────────────────────── */}
          <div className={styles.headerTop}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{getGreeting()} 👋</span>
              <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem' }}>
                {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: tr })}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span className={styles.pipelinePill}>
                {Object.keys(pipeline).length > 0
                  ? `📋 ${Object.keys(pipeline).length} aktif fırsat`
                  : '📋 Pano boş'}
              </span>
              {lastUpdated && (
                <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                  Son güncelleme: {format(lastUpdated, 'HH:mm')}
                </span>
              )}
            </div>
          </div>

          {/* ── ROW 2: Filters + Actions ──────────────────── */}
          <div className={styles.headerBottom}>

            {/* Left: search + dropdowns */}
            <div className={styles.filterGroup}>
              <div className={`${styles.input} ${styles.searchBox}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem' }}>
                <Search size={15} color="var(--muted-foreground)" />
                <input
                  placeholder="Haberlerde, şirketlerde ara..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', height: '34px', color: 'inherit', fontSize: '0.875rem' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select className={`${styles.input} ${styles.filterSelect}`} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">Tüm Olay Tipleri</option>
                <option value="relocation">Taşınma</option>
                <option value="new_plant">Yeni Tesis</option>
                <option value="expansion">Genişleme</option>
                <option value="closure">Kapanış</option>
                <option value="tender">İhale</option>
                <option value="other">Diğerleri</option>
              </select>
              <select className={`${styles.input} ${styles.filterSelect}`} value={filterMinScore} onChange={e => setFilterMinScore(e.target.value)}>
                <option value="0">Tüm Skorlar</option>
                <option value="80">Yüksek (80+)</option>
                <option value="65">İzlenecek (65+)</option>
                <option value="50">Şartlı (50+)</option>
              </select>
              <select className={`${styles.input} ${styles.filterSelect}`} value={filterDateRange} onChange={e => setFilterDateRange(e.target.value)}>
                <option value="all">Tüm Tarihler</option>
                <option value="1">Son 24 Saat</option>
                <option value="7">Son 7 Gün</option>
                <option value="30">Son 30 Gün</option>
                <option value="90">Son 90 Gün</option>
              </select>
            </div>

            {/* Right: view toggles + utility actions */}
            <div className={styles.actionGroup}>
              {/* View mode toggle */}
              <div className={styles.viewToggle}>
                {([
                  { mode: 'list',      Icon: List,            title: 'Liste' },
                  { mode: 'analytics', Icon: ChartColumn,     title: 'Analitik' },
                  { mode: 'map',       Icon: Map,             title: 'Harita' },
                  { mode: 'kanban',    Icon: LayoutDashboard, title: 'Pano' },
                ] as const).map(({ mode, Icon, title }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    title={title}
                    style={{
                      background: viewMode === mode ? 'var(--primary)' : 'transparent',
                      color: viewMode === mode ? 'white' : 'var(--muted-foreground)',
                      border: 'none',
                      padding: '0.4rem 0.6rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    <Icon size={16} />
                  </button>
                ))}
              </div>

              {/* Utility buttons */}
              <button
                onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                className={`${styles.button} ${showBookmarksOnly ? '' : styles.buttonSecondary}`}
                title="Sadece Favorileri Göster"
                style={showBookmarksOnly ? { background: 'var(--score-yellow)', color: 'white' } : {}}
              >
                <Star size={15} fill={showBookmarksOnly ? 'currentColor' : 'none'} />
              </button>
              <button onClick={exportToCsv} className={`${styles.button} ${styles.buttonSecondary}`} title="CSV Olarak İndir" disabled={filteredNews.length === 0}>
                <Download size={15} />
              </button>
              <button onClick={handleSync} disabled={syncing || data.sources.length === 0} className={styles.button}>
                <RefreshCw size={15} className={syncing ? styles.spinner : ''} />
                <span>{syncing ? 'Yenileniyor...' : 'Yenile'}</span>
              </button>
            </div>

          </div>
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
          ) : viewMode === 'analytics' ? (
            <div className={styles.analyticsContainer}>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Olay Tipleri Dağılımı</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventTypeData}>
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Fırsat Skoru Dağılımı</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={scoreData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>
                      {scoreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : viewMode === 'map' ? (
            <div style={{ marginTop: '1rem', width: '100%' }}>
              <MapView news={filteredNews} />
            </div>
          ) : viewMode === 'kanban' ? (
            (() => {
              const stages: Array<{ key: 'target' | 'contacted' | 'closed'; label: string; color: string; icon: React.ReactNode }> = [
                { key: 'target', label: '🎯 Hedefler', color: '#3b82f6', icon: <Target size={18} /> },
                { key: 'contacted', label: '📬 İletişime Geçildi', color: '#f59e0b', icon: <ArrowRight size={18} /> },
                { key: 'closed', label: '✅ Kapandı', color: '#22c55e', icon: <CheckCircle2 size={18} /> },
              ];
              const pipelineNews = data.news.filter(n => pipeline[n.id]);
              if (pipelineNews.length === 0) {
                return (
                  <div className={styles.emptyState}>
                    <Briefcase size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Satış Panosu Boş</h3>
                    <p style={{ color: 'var(--muted-foreground)', maxWidth: 360, textAlign: 'center' }}>
                      Liste görünümünden herhangi bir haberin üzerindeki <strong>çanta (🗂️)</strong> ikonuna tıklayarak fırsatları buraya ekleyebilirsin.
                    </p>
                  </div>
                );
              }
              return (
                <div className={styles.kanbanBoard}>
                  {stages.map(stage => {
                    const cards = pipelineNews.filter(n => pipeline[n.id] === stage.key);
                    return (
                      <div key={stage.key} className={styles.kanbanColumn}>
                        <div className={styles.kanbanColumnHeader} style={{ borderTopColor: stage.color }}>
                          <span style={{ color: stage.color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {stage.label}
                          </span>
                          <span className={styles.kanbanBadge} style={{ backgroundColor: stage.color }}>{cards.length}</span>
                        </div>
                        <div className={styles.kanbanCards}>
                          {cards.length === 0 ? (
                            <div className={styles.kanbanEmpty}>Kart yok</div>
                          ) : (
                            cards.map(item => (
                              <div key={item.id} className={styles.kanbanCard} onClick={() => setSelectedNews(item)}>
                                <div className={styles.kanbanCardTitle}>{item.title}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                                  {item.eventType && (
                                    <span className={styles.tag} style={{ backgroundColor: getEventTypeColor(item.eventType), color: 'white' }}>
                                      {item.eventType.toUpperCase()}
                                    </span>
                                  )}
                                  {item.company && (
                                    <span className={styles.tag} style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)' }}>
                                      {item.company}
                                    </span>
                                  )}
                                </div>
                                <div className={styles.kanbanCardScore} style={{ backgroundColor: getScoreColor(item.score) }}>
                                  Skor: {item.score || 0}
                                </div>
                                <div className={styles.kanbanCardActions}>
                                  <button
                                    onClick={(e) => movePipelineStage(e, item.id, 'back')}
                                    disabled={stage.key === 'target'}
                                    className={styles.kanbanBtn}
                                    title="Geri Al"
                                  >
                                    <ArrowLeft size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => togglePipeline(e, item.id)}
                                    className={styles.kanbanBtn}
                                    title="Panodan Çıkar"
                                    style={{ color: 'var(--danger)' }}
                                  >
                                    <X size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => movePipelineStage(e, item.id, 'forward')}
                                    disabled={stage.key === 'closed'}
                                    className={styles.kanbanBtn}
                                    title="İlerlet"
                                    style={{ color: stage.color }}
                                  >
                                    <ArrowRight size={14} />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className={styles.newsList}>
              {filteredNews.map(item => (
                <div key={item.id} className={styles.card} onClick={() => setSelectedNews(item)}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={(e) => toggleBookmark(e, item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                        title="Favorilere Ekle"
                      >
                        <Star size={18} color={bookmarks.includes(item.id) ? "var(--score-yellow)" : "var(--muted-foreground)"} fill={bookmarks.includes(item.id) ? "var(--score-yellow)" : "none"} />
                      </button>
                      <button
                        onClick={(e) => togglePipeline(e, item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                        title={pipeline[item.id] ? 'Panodan Çıkar' : 'Satış Panosu’na Ekle (Fırsata Çevir)'}
                      >
                        <Briefcase size={18} color={pipeline[item.id] ? "var(--primary)" : "var(--muted-foreground)"} fill={pipeline[item.id] ? "rgba(99,102,241,0.15)" : "none"} />
                      </button>
                      <div
                        className={styles.scoreBadge}
                        style={{ backgroundColor: getScoreColor(item.score) }}
                        title={item.score === 0 ? "Analiz Bekleniyor" : ""}
                      >
                        {item.score && item.score > 0 ? item.score : 'Analiz Bekleniyor'}
                      </div>
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
                        <Building2 size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
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
                <div className={styles.detailLabel}><Building2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Şirket</div>
                <div className={styles.detailValue}>{selectedNews.company || '-'}</div>
              </div>
              <div>
                <div className={styles.detailLabel}><Tag size={12} style={{ display: 'inline', marginRight: 4 }} /> Sektör</div>
                <div className={styles.detailValue}>{selectedNews.sector || '-'}</div>
              </div>
              <div>
                <div className={styles.detailLabel}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> Çıkış Lokasyonu</div>
                <div className={styles.detailValue}>{selectedNews.fromLocation || '-'}</div>
              </div>
              <div>
                <div className={styles.detailLabel}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> Hedef Lokasyon</div>
                <div className={styles.detailValue}>{selectedNews.toLocation || '-'}</div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailLabel}>Orijinal Haber İçeriği / Açıklaması</div>
              <div className={styles.detailValue} style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', whiteSpace: 'pre-wrap' }}>
                {selectedNews.description}
              </div>
            </div>

            {selectedNews.company && (
              <div className={styles.detailSection} style={{ marginTop: '2rem' }}>
                <div className={styles.detailLabel} style={{ fontSize: '1rem', color: 'var(--primary)' }}>
                  <Building2 size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                  {selectedNews.company} Geçmişi
                </div>
                <div className={styles.timeline}>
                  {data.news
                    .filter(n => n.company === selectedNews.company)
                    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
                    .map(item => (
                      <div key={item.id} className={styles.timelineItem}>
                        <div className={styles.timelineDot} style={{ borderColor: getEventTypeColor(item.eventType) }}></div>
                        <div className={styles.timelineDate}>{format(new Date(item.pubDate), 'dd MMM yyyy', { locale: tr })}</div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineTitle}>{item.title}</div>
                          <span className={styles.tag} style={{ backgroundColor: getEventTypeColor(item.eventType), color: 'white', display: 'inline-block', marginBottom: '0.5rem' }}>
                            {item.eventType?.toUpperCase()}
                          </span>
                          <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{item.summaryTr}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

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
