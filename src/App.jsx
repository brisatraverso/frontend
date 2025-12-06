import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { db } from "./firebase";
import { ref, onValue } from "firebase/database";
import Historial from "./Historial";

import {
  AppBar,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Box
} from "@mui/material";

// ==== ICONO ====
const markerIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const defaultPosition = [-32.48, -58.23];

// ==== HAVERSINE ====
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p = Math.PI / 180;

  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) *
      Math.cos(lat2 * p) *
      (1 - Math.cos((lon2 - lon1) * p))) /
      2;

  return R * 2 * Math.asin(Math.sqrt(a));
}

// ==== ChangeView ====
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 16);
  }, [center]);
  return null;
}

export default function App() {
  const [tab, setTab] = useState("live");
  const [position, setPosition] = useState(null);
  const [path, setPath] = useState([]);

  const [histPath, setHistPath] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [totalDist, setTotalDist] = useState(0);
  const [velMax, setVelMax] = useState(0);
  const [velProm, setVelProm] = useState(0);

  // ===== EN VIVO =====
  useEffect(() => {
    if (tab !== "live") return;

    const starCountRef = ref(db, "vehiculo1");

    onValue(starCountRef, (snapshot) => {
      const data = snapshot.val();

      if (data?.lat && data?.lng) {
        const newPos = [data.lat, data.lng];
        setPosition(newPos);
        setPath((prev) => [...prev, newPos]);
      }
    });
  }, [tab]);

  // ===== HISTORIAL =====
  const loadHistory = (fecha) => {
    setSelectedDate(fecha);
    setTab("history");

    const refFecha = ref(db, `historial/vehiculo1/${fecha}`);

    onValue(refFecha, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const puntos = Object.values(data);
      const coords = puntos.map((p) => [p.lat, p.lng]);
      setHistPath(coords);

      let distancia = 0;
      let velocidades = [];

      for (let i = 1; i < puntos.length; i++) {
        const p1 = puntos[i - 1];
        const p2 = puntos[i];

        const d = haversine(p1.lat, p1.lng, p2.lat, p2.lng);
        distancia += d;

        if (p1.timestamp && p2.timestamp) {
          const dt = (p2.timestamp - p1.timestamp) / 1000;
          if (dt > 0) velocidades.push((d / dt) * 3.6);
        }
      }

      setTotalDist(distancia / 1000);
      setVelMax(velocidades.length ? Math.max(...velocidades) : 0);
      setVelProm(
        velocidades.length
          ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length
          : 0
      );
    });
  };

  return (
    <Box sx={{ height: "100vh", width: "100vw", bgcolor: "#0d1117", color: "#eee", display: "flex", flexDirection: "column" }}>

      {/* BARRA SUPERIOR */}
      <AppBar position="static" sx={{ background: "#111827" }}>
        <Tabs
          value={tab}
          onChange={(e, value) => setTab(value)}
          textColor="inherit"
          indicatorColor="primary"
          centered
        >
          <Tab label="En vivo" value="live" />
          <Tab label="Historial" value="historial" />
        </Tabs>
      </AppBar>

      {/* CONTENIDO PRINCIPAL */}
      <Box sx={{ flexGrow: 1, display: "flex" }}>

        {/* ==== SIDEBAR SOLO CUANDO tab === "history" ==== */}
        {tab === "history" && (
          <Box
            sx={{
              width: "280px",
              bgcolor: "#0f172a",
              borderRight: "1px solid #1f2937",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >
            {[{
              label: "Distancia total",
              value: `${totalDist.toFixed(2)} km`
            },{
              label: "Velocidad máxima",
              value: `${velMax.toFixed(1)} km/h`
            },{
              label: "Velocidad promedio",
              value: `${velProm.toFixed(1)} km/h`
            }].map((item, i) => (
              <Card
                key={i}
                sx={{
                  background: "#1f2937",
                  color: "#fff",
                  flex: "0 0 120px", // TODAS MISMO TAMAÑO
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <CardContent>
                  <Typography variant="h6">{item.label}</Typography>
                  <Typography variant="h4">{item.value}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* ==== PANEL DE SELECCIÓN DE FECHA ==== */}
        {tab === "historial" && (
          <Box sx={{ width: "320px", bgcolor: "#0f172a", p: 2 }}>
            <Historial onSelectDate={loadHistory} />
          </Box>
        )}

        {/* ==== MAPA ==== */}
        <Box sx={{ flexGrow: 1 }}>
          <MapContainer center={defaultPosition} zoom={15} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {tab === "live" && position && (
              <>
                <ChangeView center={position} />
                <Marker position={position} icon={markerIcon}>
                  <Popup>En vivo</Popup>
                </Marker>
                {path.length > 1 && <Polyline positions={path} color="#4f8cff" />}
              </>
            )}

            {tab === "history" && histPath.length > 1 && (
              <>
                <Polyline positions={histPath} color="#0025f8ff" />
                <Marker position={histPath[0]} icon={markerIcon}>
                  <Popup>Inicio ({selectedDate})</Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </Box>

      </Box>
    </Box>
  );
}
