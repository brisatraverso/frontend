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

export default function App() {
  /* ================= AUTH ================= */
  const [user, setUser] = useState(undefined);
  const [screen, setScreen] = useState("login");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  /* ================= ESTADOS ================= */
  const [tab, setTab] = useState("live");
  const [position, setPosition] = useState(null);
  const [path, setPath] = useState([]);

  const [histPath, setHistPath] = useState([]);
  const [showStats, setShowStats] = useState(false);

  const [stats, setStats] = useState({
    dist: 0,
    velMax: 0,
    velProm: 0,
    mov: 0,
    stop: 0
  });

  /* ================= RESET AL VOLVER A LIVE ================= */
  useEffect(() => {
    if (tab === "live") {
      setHistPath([]);
      setStats({
        dist: 0,
        velMax: 0,
        velProm: 0,
        mov: 0,
        stop: 0
      });
    }
  }, [tab]);

  /* ================= LIVE ================= */
  useEffect(() => {
    if (tab !== "live") return;

    let last = null;
    let dist = 0;
    let vels = [];

    return onValue(ref(db, "vehiculo1"), (snap) => {
      const d = snap.val();
      if (!d?.lat || !d?.lng) return;

      const pos = [d.lat, d.lng];
      if (last) {
        const dKm = haversine(...last, ...pos) / 1000;
        dist += dKm;
        const v = dKm * 3600;
        vels.push(v);
      }

      last = pos;
      setPosition(pos);
      setPath((p) => [...p, pos]);

      setStats({
        dist,
        velMax: Math.max(...vels, 0),
        velProm: vels.length ? vels.reduce((a, b) => a + b) / vels.length : 0,
        mov: 0,
        stop: 0
      });
    });
  }, [tab]);

  /* ================= HISTORIAL ================= */
  const loadHistory = (fecha) => {
    setTab("history");
    setShowStats(true);

    onValue(ref(db, `historial/vehiculo1/${fecha}`), (snap) => {
      const data = snap.val();
      if (!data) return;

      const pts = Object.values(data);
      const coords = pts.map((p) => [p.lat, p.lng]);
      setHistPath(coords);

      let dist = 0;
      let vels = [];
      let mov = 0;
      let stop = 0;

      for (let i = 1; i < pts.length; i++) {
        const d = haversine(
          pts[i - 1].lat,
          pts[i - 1].lng,
          pts[i].lat,
          pts[i].lng
        );
        dist += d;

        const dt = (pts[i].timestamp - pts[i - 1].timestamp) / 1000;
        if (dt > 0) {
          const v = (d / dt) * 3.6;
          vels.push(v);
          v > 2 ? (mov += dt) : (stop += dt);
        }
      }

      setStats({
        dist: dist / 1000,
        velMax: Math.max(...vels, 0),
        velProm: vels.length ? vels.reduce((a, b) => a + b) / vels.length : 0,
        mov,
        stop
      });
    });
  };

  /* ================= LOADING ================= */
  if (user === undefined) return null;

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

      <Box sx={{ height: "calc(100vh - 64px)", position: "relative" }}>
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

          {path.length > 1 && tab === "live" && <Polyline positions={path} />}
          {histPath.length > 1 && tab === "history" && (
            <Polyline positions={histPath} />
          )}
        </MapContainer>

        {/* PANEL STATS */}
        {showStats && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "45%",
              bgcolor: "#0f172a",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              p: 2,
              overflowY: "auto"
            }}
          >
            {[
              ["Distancia", `${stats.dist.toFixed(2)} km`],
              ["Vel máx", `${stats.velMax.toFixed(1)} km/h`],
              ["Vel prom", `${stats.velProm.toFixed(1)} km/h`],
              ["Movimiento", `${(stats.mov / 60).toFixed(1)} min`],
              ["Detenido", `${(stats.stop / 60).toFixed(1)} min`]
            ].map(([t, v]) => (
              <Card key={t} sx={{ bgcolor: "#1f2937", mb: 1, color: "#fff" }}>
                <CardContent>
                  <Typography color="#fff">{t}</Typography>
                  <Typography variant="h5" color="#fff">
                    {v}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* FAB */}
        <Fab
          sx={{ position: "absolute", bottom: 16, right: 16 }}
          onClick={() => setShowStats((s) => !s)}
        >
          📊
        </Fab>

        {/* LOGOUT */}
        <Button
          onClick={() => signOut(auth)}
          sx={{ position: "absolute", top: 10, right: 10 }}
          variant="contained"
        >
          Cerrar sesión
        </Button>
      </Box>
    </Box>
  );
}
