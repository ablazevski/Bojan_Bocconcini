import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customRestaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customCustomerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const customPartnerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface DeliveryRouteMapProps {
  restaurantCoords: [number, number];
  customerCoords: [number, number];
  partnerCoords?: [number, number];
  restaurantName: string;
  customerAddress: string;
}

export default function DeliveryRouteMap({ restaurantCoords, customerCoords, partnerCoords, restaurantName, customerAddress }: DeliveryRouteMapProps) {
  const center: [number, number] = partnerCoords || [
    (restaurantCoords[0] + customerCoords[0]) / 2,
    (restaurantCoords[1] + customerCoords[1]) / 2
  ];

  return (
    <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-300 shadow-inner z-0">
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" 
        />
        <Marker position={restaurantCoords} icon={customRestaurantIcon}>
          <Popup>
            <strong>{restaurantName}</strong><br/>
            Ресторан
          </Popup>
        </Marker>
        <Marker position={customerCoords} icon={customCustomerIcon}>
          <Popup>
            <strong>{customerAddress}</strong><br/>
            Нарачател
          </Popup>
        </Marker>
        {partnerCoords && (
          <Marker position={partnerCoords} icon={customPartnerIcon}>
            <Popup>
              <strong>Доставувач</strong><br/>
              Моментална локација
            </Popup>
          </Marker>
        )}
        <Polyline positions={[restaurantCoords, customerCoords]} color="#10b981" weight={4} dashArray="10, 10" />
      </MapContainer>
    </div>
  );
}
