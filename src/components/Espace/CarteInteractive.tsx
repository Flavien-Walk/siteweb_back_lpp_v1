import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Projet } from '../../services/projets';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet + bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

interface Props {
  projets: Projet[];
  onProjetClick?: (id: string) => void;
}

const CarteInteractive = ({ projets, onProjetClick }: Props) => {
  // Centre de la France
  const center: [number, number] = [46.6, 2.5];

  return (
    <div className="carte-interactive">
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-lg)' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {projets.map((projet) => (
          <Marker
            key={projet._id}
            position={[projet.localisation.lat, projet.localisation.lng]}
            eventHandlers={{
              click: () => onProjetClick?.(projet._id),
            }}
          >
            <Popup>
              <div className="carte-popup">
                <strong>{projet.nom}</strong>
                <p>{projet.pitch}</p>
                <span>{projet.localisation.ville} — {projet.progression}%</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default CarteInteractive;
