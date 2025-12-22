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

import { db, auth } from "./firebase";
import { ref, onValue } from "firebase/database";
import { onAuthStateChanged, signOut } from "firebase/auth";

import Historial from "./Historial";
import Login from "./Login";
import Register from "./Register";
import ResetPassword from "./ResetPassword";

import {
  AppBar,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Fab
} from "@mui/material";

/* ================= ICONO ================= */
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

function FixMapResize() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);
  return null;
}

const defaultPosition = [-32.48, -58.23];

/* ================= DISTANCIA ================= */
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

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 16);
  }, [center]);
  return null;
}

export default function App() {
  /* ================= AUTH ================= */
  const [user, setUser] = useState(undefined);
  const [screen, setScreen] = useState("login");

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  /* ================= ESTADOS ================= */
  const [tab, setTab] = useState("live");
  const [position, setPosition] = useState(null);
  const [path, setPath] = useState([]);
  const [velocidadActual, setVelocidadActual] = useState(0);

  const [histPath, setHistPath] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [totalDist, setTotalDist] = useState(0);
  const [velMax, setVelMax] = useState(0);
  const [velProm, setVelProm] = useState(0);
  const [tiempoMovimiento, setTiempoMovimiento] = useState(0);
  const [tiempoDetenido, setTiempoDetenido] = useState(0);
  const [frenadas, setFrenadas] = useState(0);
  const [aceleradas, setAceleradas] = useState(0);

  const [showStats, setShowStats] = useState(false);

  /* ================= RESET LIVE ================= */
  useEffect(() => {
    if (tab === "live") {
      setHistPath([]);
      setSelectedDate(null);
      setShowStats(false);
    }
  }, [tab]);

  /* ================= LIVE ================= */
  useEffect(() => {
    if (tab !== "live") return;
    let lastPos = null;

    const unsub = onValue(ref(db, "vehiculo1"), (snap) => {
      const d = snap.val();
      if (!d?.lat || !d?.lng) return;

      const newPos = [d.lat, d.lng];
      if (lastPos) {
        const v = (haversine(...lastPos, ...newPos) * 3.6);
        setVelocidadActual(v);
      }
      lastPos = newPos;
      setPosition(newPos);
      setPath((p) => [...p, newPos]);
    });

    return () => unsub();
  }, [tab]);

  /* ================= HISTORIAL ================= */
  const loadHistory = (fecha) => {
    setSelectedDate(fecha);
    setShowStats(true);
    setTab("history");

    onValue(ref(db, `historial/vehiculo1/${fecha}`), (snap) => {
      const data = snap.val();
      if (!data) return;

      const puntos = Object.values(data);
      const coords = puntos.map((p) => [p.lat, p.lng]);
      setHistPath(coords);

      let dist = 0;
      let vels = [];
      let mov = 0;
      let stop = 0;

      for (let i = 1; i < puntos.length; i++) {
        const p1 = puntos[i - 1];
        const p2 = puntos[i];
        const d = haversine(p1.lat, p1.lng, p2.lat, p2.lng);
        dist += d;

        const dt = (p2.timestamp - p1.timestamp) / 1000;
        if (dt > 0) {
          const v = (d / dt) * 3.6;
          vels.push(v);
          v > 2 ? (mov += dt) : (stop += dt);
        }
      }

      setTotalDist(dist / 1000);
      setVelMax(Math.max(...vels, 0));
      setVelProm(vels.length ? vels.reduce((a, b) => a + b) / vels.length : 0);
      setTiempoMovimiento(mov);
      setTiempoDetenido(stop);
    });
  };

  /* ================= LOADING ================= */
  if (user === undefined)
    return <Box sx={{ height: "100vh", bgcolor: "#0d1117" }} />;

  if (!user)
    return (
      <>
        {screen === "login" && <Login onNavigate={setScreen} />}
        {screen === "register" && <Register onNavigate={setScreen} />}
        {screen === "reset" && <ResetPassword onNavigate={setScreen} />}
      </>
    );

  /* ================= UI ================= */
  return (
    <Box sx={{ height: "100vh", bgcolor: "#0d1117", color: "#fff" }}>
      <AppBar sx={{ bgcolor: "#111827" }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} centered>
          <Tab label="En vivo" value="live" />
          <Tab label="Historial" value="history" />
        </Tabs>
      </AppBar>

      <Box sx={{ display: "flex", height: "calc(100vh - 64px)" }}>
        {/* STATS PANEL */}
        {showStats && (
          <Box
            sx={{
              width: { xs: "100%", md: 300 },
              position: { xs: "absolute", md: "relative" },
              bottom: 0,
              height: { xs: "40vh", md: "100%" },
              bgcolor: "#0f172a",
              overflowY: "auto",
              zIndex: 1000,
              p: 2
            }}
          >
            {[
              ["Distancia", `${totalDist.toFixed(2)} km`],
              ["Vel máx", `${velMax.toFixed(1)} km/h`],
              ["Vel prom", `${velProm.toFixed(1)} km/h`],
              ["Movimiento", `${(tiempoMovimiento / 60).toFixed(1)} min`],
              ["Detenido", `${(tiempoDetenido / 60).toFixed(1)} min`]
            ].map(([t, v]) => (
              <Card key={t} sx={{ bgcolor: "#1f2937", mb: 1 }}>
                <CardContent>
                  <Typography>{t}</Typography>
                  <Typography variant="h5">{v}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* MAPA */}
        <Box sx={{ flex: 1 }}>
          <MapContainer
            center={defaultPosition}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <FixMapResize />
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {position && (
              <Marker position={position} icon={markerIcon}>
                <Popup>
                  {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </Popup>
              </Marker>
            )}

            {path.length > 1 && <Polyline positions={path} />}
            {histPath.length > 1 && <Polyline positions={histPath} />}
          </MapContainer>
        </Box>
      </Box>

      {/* FAB MOBILE */}
      <Fab
        color="primary"
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          display: { md: "none" }
        }}
        onClick={() => setShowStats((s) => !s)}
      >
        📊
      </Fab>

      {/* LOGOUT */}
      <Button
        onClick={() => signOut(auth)}
        sx={{ position: "fixed", top: 10, right: 10 }}
        variant="contained"
      >
        Cerrar sesión
      </Button>
    </Box>
  );
}
