"use client";

import { useState, useEffect } from 'react';
import { Settings, X, Moon, Sun, Monitor, Type } from 'lucide-react';

export default function SettingsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [fontSize, setFontSize] = useState<number>(16);

  useEffect(() => {
    // Load preferences
    const savedTheme = localStorage.getItem('app-theme') as 'system' | 'light' | 'dark' | null;
    if (savedTheme) setTheme(savedTheme);
    
    const savedFontSize = localStorage.getItem('app-font-size');
    if (savedFontSize) setFontSize(parseInt(savedFontSize, 10));
  }, []);

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) root.classList.add('dark');
      else root.classList.add('light');
    } else {
      root.classList.add(theme);
    }
    
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply font size
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    localStorage.setItem('app-font-size', fontSize.toString());
  }, [fontSize]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--card)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          zIndex: 9998
        }}
        aria-label="Ayarlar"
      >
        <Settings size={24} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          right: '24px',
          width: '300px',
          backgroundColor: 'var(--card)',
          color: 'var(--card-foreground)',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)',
          zIndex: 9999,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Görünüm Ayarları</h3>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
              <X size={20} />
            </button>
          </div>

          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '8px', color: 'var(--muted-foreground)' }}>Tema</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setTheme('light')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${theme === 'light' ? 'var(--primary)' : 'var(--border)'}`,
                  background: theme === 'light' ? 'var(--primary)' : 'transparent',
                  color: theme === 'light' ? 'white' : 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer'
                }}
              >
                <Sun size={18} />
                <span style={{ fontSize: '0.75rem' }}>Aydınlık</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${theme === 'dark' ? 'var(--primary)' : 'var(--border)'}`,
                  background: theme === 'dark' ? 'var(--primary)' : 'transparent',
                  color: theme === 'dark' ? 'white' : 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer'
                }}
              >
                <Moon size={18} />
                <span style={{ fontSize: '0.75rem' }}>Karanlık</span>
              </button>
              <button
                onClick={() => setTheme('system')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${theme === 'system' ? 'var(--primary)' : 'var(--border)'}`,
                  background: theme === 'system' ? 'var(--primary)' : 'transparent',
                  color: theme === 'system' ? 'white' : 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer'
                }}
              >
                <Monitor size={18} />
                <span style={{ fontSize: '0.75rem' }}>Sistem</span>
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '8px', color: 'var(--muted-foreground)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Yazı Boyutu</span>
              <span style={{ fontWeight: 'bold' }}>{fontSize}px</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Type size={16} />
              <input
                type="range"
                min="12"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                style={{ flex: 1 }}
              />
              <Type size={24} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
