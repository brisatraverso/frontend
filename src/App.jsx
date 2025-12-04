import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";
import MapFixer from "./MapFixer.jsx";

// Icono Leaflet
const markerIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const defaultPosition = [-32.48, -58.23];

function App() {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const starCountRef = ref(db, "vehiculo1");

    onValue(starCountRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lat && data.lng) {
        setPosition([data.lat, data.lng]);
      }
    });
  }, []);

  return (
    <div className="App">
      <MapContainer
        center={defaultPosition}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        {/* ← Esto arregla el mapa gris */}
        <MapFixer position={position} />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {position && (
          <Marker position={position} icon={markerIcon}>
            <Popup>
              Última ubicación<br />
              Lat: {position[0]} <br />
              Lng: {position[1]}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default App;
