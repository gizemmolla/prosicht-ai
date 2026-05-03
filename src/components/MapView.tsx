"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NewsItem } from '@/types';
import { getCoordinates } from '@/lib/geo';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Fix Leaflet marker icons in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const relocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapViewProps {
  news: NewsItem[];
}

export default function MapView({ news }: MapViewProps) {
  // Focus on Europe/Global center
  const center: [number, number] = [48.0, 15.0];

  return (
    <div style={{ height: 'calc(100vh - 150px)', width: '100%', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%', backgroundColor: '#1a1d24' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {news.map(item => {
          const fromCoords = getCoordinates(item.fromLocation);
          const toCoords = getCoordinates(item.toLocation);
          
          // Fallback to plotting something if from/to are not available but text matches
          let singleCoords = getCoordinates(item.title + " " + item.description);
          
          if (!fromCoords && !toCoords && !singleCoords) return null;

          const isRelocation = item.eventType === 'relocation';

          return (
            <div key={item.id}>
              {fromCoords && (
                <Marker position={fromCoords} icon={isRelocation ? customIcon : relocationIcon}>
                  <Popup>
                    <div style={{ maxWidth: 200 }}>
                      <strong style={{ color: '#000' }}>{item.company || 'Bilinmeyen Şirket'}</strong>
                      <br/>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        Çıkış: {item.fromLocation}
                      </span>
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#333' }}>
                        {item.title}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {toCoords && (
                <Marker position={toCoords} icon={relocationIcon}>
                  <Popup>
                    <div style={{ maxWidth: 200 }}>
                      <strong style={{ color: '#000' }}>{item.company || 'Bilinmeyen Şirket'}</strong>
                      <br/>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        Hedef: {item.toLocation}
                      </span>
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#333' }}>
                        {item.title}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {(!fromCoords && !toCoords && singleCoords) && (
                <Marker position={singleCoords} icon={customIcon}>
                  <Popup>
                    <div style={{ maxWidth: 200 }}>
                      <strong style={{ color: '#000' }}>{item.title}</strong>
                      <br/>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {format(new Date(item.pubDate), 'dd MMM yyyy', { locale: tr })}
                      </span>
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#333' }}>
                        {item.summaryTr}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {fromCoords && toCoords && (
                <Polyline 
                  positions={[fromCoords, toCoords]} 
                  color="#f59e0b" 
                  weight={3} 
                  dashArray="5, 10" 
                  opacity={0.7}
                />
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
