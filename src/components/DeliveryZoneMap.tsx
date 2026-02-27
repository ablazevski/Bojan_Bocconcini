import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker } from 'react-leaflet';
import { Trash2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in leaflet + react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ZONE_COLORS = [
  '#f97316', // orange
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // purple
  '#eab308', // yellow
  '#ec4899', // pink
  '#14b8a6'  // teal
];

interface DeliveryZoneMapProps {
  zones: [number, number][][];
  setZones?: (zones: [number, number][][]) => void;
  readOnly?: boolean;
}

export default function DeliveryZoneMap({ zones, setZones, readOnly = false }: DeliveryZoneMapProps) {
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>([]);

  function MapEvents() {
    useMapEvents({
      click(e) {
        if (readOnly || !setZones) return;
        setCurrentPolygon([...currentPolygon, [e.latlng.lat, e.latlng.lng]]);
      }
    });
    return null;
  }

  const handleComplete = () => {
    if (currentPolygon.length > 2 && setZones) {
      setZones([...zones, currentPolygon]);
      setCurrentPolygon([]);
    } else {
      alert('Потребни се барем 3 точки за да се затвори зоната.');
    }
  };

  const removeZone = (indexToRemove: number) => {
    if (setZones) {
      setZones(zones.filter((_, idx) => idx !== indexToRemove));
    }
  };

  // Center on Skopje by default, or the first point of the first zone
  const center: [number, number] = zones.length > 0 && zones[0].length > 0 
    ? zones[0][0] 
    : [41.9981, 21.4254];

  return (
    <div className="relative w-full h-96 rounded-2xl overflow-hidden border border-slate-300 shadow-inner z-0">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />
        <MapEvents />
        
        {/* Render saved zones */}
        {zones.map((zone, i) => {
          const color = ZONE_COLORS[i % ZONE_COLORS.length];
          return (
            <Polygon 
              key={i} 
              positions={zone} 
              pathOptions={{ color, fillColor: color, fillOpacity: 0.2 }} 
            />
          );
        })}
        
        {/* Render currently drawing zone */}
        {currentPolygon.length > 0 && (
          <Polygon positions={currentPolygon} pathOptions={{ color: '#333', dashArray: '5, 5', fillOpacity: 0.1 }} />
        )}
        
        {/* Render markers for current polygon */}
        {currentPolygon.map((pt, i) => (
          <Marker key={i} position={pt} />
        ))}
      </MapContainer>

      {/* List of zones overlay */}
      {!readOnly && setZones && zones.length > 0 && (
        <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-100 max-h-60 overflow-y-auto min-w-[160px]">
          <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Зачувани зони:</h4>
          <div className="space-y-2">
            {zones.map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 text-sm bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length] }}></div>
                  <span className="font-medium text-slate-700">Зона {i + 1}</span>
                </div>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeZone(i); }}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                  title="Избриши зона"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!readOnly && setZones && (
        <div className="absolute bottom-4 left-4 z-[1000] flex flex-wrap gap-2">
          {currentPolygon.length > 0 && (
            <>
              <button 
                type="button" 
                onClick={handleComplete} 
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-emerald-700 font-medium text-sm transition-colors"
              >
                Заврши зона
              </button>
              <button 
                type="button" 
                onClick={() => setCurrentPolygon([])} 
                className="bg-white text-slate-700 px-4 py-2 rounded-lg shadow-md hover:bg-slate-50 font-medium text-sm transition-colors"
              >
                Откажи цртање
              </button>
            </>
          )}
          {currentPolygon.length === 0 && zones.length === 0 && (
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md text-sm font-medium text-slate-700 pointer-events-none">
              Кликнете на мапата за да започнете со цртање на зона за достава
            </div>
          )}
          {currentPolygon.length === 0 && zones.length > 0 && (
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md text-sm font-medium text-slate-700 pointer-events-none">
              Кликнете повторно за да додадете нова зона
            </div>
          )}
        </div>
      )}
    </div>
  );
}
