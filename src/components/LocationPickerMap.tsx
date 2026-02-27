import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in leaflet + react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerMapProps {
  location: [number, number] | null;
  setLocation: (loc: [number, number]) => void;
  city?: string;
  allowedZones?: [number, number][][];
}

export default function LocationPickerMap({ location, setLocation, city, allowedZones }: LocationPickerMapProps) {
  const [center, setCenter] = useState<[number, number]>([41.9981, 21.4254]); // Default Skopje

  // Geocode city to center map (basic implementation, ideally use a geocoding service)
  useEffect(() => {
    if (city) {
      // Basic mock coordinates for common cities
      const cityCoords: Record<string, [number, number]> = {
        'Скопје': [41.9981, 21.4254],
        'Битола': [41.0314, 21.3336],
        'Охрид': [41.1130, 20.8016],
        'Тетово': [42.0106, 20.9714],
        'Куманово': [42.1322, 21.7144],
        'Струмица': [41.4378, 22.6427],
        'Велес': [41.7153, 21.7753],
        'Штип': [41.7358, 22.1914],
        'Прилеп': [41.3463, 21.5542],
        'Гостивар': [41.7959, 20.9082],
      };
      
      const normalizedCity = Object.keys(cityCoords).find(k => k.toLowerCase() === city.toLowerCase());
      if (normalizedCity) {
        setCenter(cityCoords[normalizedCity]);
      }
    }
  }, [city]);

  function MapEvents() {
    useMapEvents({
      click(e) {
        setLocation([e.latlng.lat, e.latlng.lng]);
      }
    });
    return null;
  }

  return (
    <div className="relative w-full h-96 rounded-2xl overflow-hidden border border-slate-300 shadow-inner z-0">
      <MapContainer center={location || center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />
        <MapEvents />
        
        {allowedZones && allowedZones.map((zone, i) => (
          <Polygon key={i} positions={zone} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.1 }} />
        ))}

        {location && (
          <Marker position={location} />
        )}
      </MapContainer>

      <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none flex justify-center">
        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-slate-100 text-sm font-medium text-slate-700 text-center">
          {location 
            ? 'Локацијата е избрана. Кликнете "Потврди" за да продолжите.' 
            : 'Кликнете на мапата за да ја одберете вашата локација за достава.'}
        </div>
      </div>
    </div>
  );
}
