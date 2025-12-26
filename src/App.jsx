// App.jsx
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
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
  Fab,
  useMediaQuery
} from "@mui/material";

/* ================= ICONOS ================= */
const markerIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const startIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const endIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
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
  const isDesktop = useMediaQuery("(min-width:900px)");

  const [user, setUser] = useState(undefined);
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("live");

  const [position, setPosition] = useState(null);
  const [path, setPath] = useState([]);
  const [histPath, setHistPath] = useState([]);

  const [totalDist, setTotalDist] = useState(0);
  const [velMax, setVelMax] = useState(0);
  const [velProm, setVelProm] = useState(0);
  const [tiempoMovimiento, setTiempoMovimiento] = useState(0);
  const [tiempoDetenido, setTiempoDetenido] = useState(0);

  const [showStats, setShowStats] = useState(false);
  const [showHistoryList, setShowHistoryList] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  /* ================= CAMBIO DE TAB ================= */
  useEffect(() => {
    if (tab === "history") {
      setShowHistoryList(true);
      setShowStats(false);
      setPath([]);
    } else {
      setHistPath([]);
      setTotalDist(0);
      setVelMax(0);
      setVelProm(0);
      setTiempoMovimiento(0);
      setTiempoDetenido(0);
      setShowHistoryList(false);
      setShowStats(isDesktop);
    }
  }, [tab, isDesktop]);

  /* ================= LIVE ================= */
  useEffect(() => {
    if (tab !== "live") return;

    return onValue(ref(db, "vehiculo1"), snap => {
      const d = snap.val();
      if (!d?.lat || !d?.lng) return;
      const pos = [d.lat, d.lng];
      setPosition(pos);
      setPath(p => [...p, pos]);
    });
  }, [tab]);

  /* ================= HISTORIAL ================= */
  const loadHistory = fecha => {
    setShowHistoryList(false);
    setShowStats(true);

    onValue(ref(db, `historial/vehiculo1/${fecha}`), snap => {
      const puntos = Object.values(snap.val() || {});
      const coords = puntos.map(p => [p.lat, p.lng]);
      setHistPath(coords);

      let dist = 0;
      let vels = [];
      let mov = 0;
      let stop = 0;

      for (let i = 1; i < puntos.length; i++) {
        const d = haversine(
          puntos[i - 1].lat,
          puntos[i - 1].lng,
          puntos[i].lat,
          puntos[i].lng
        );
        dist += d;
        const dt = (puntos[i].timestamp - puntos[i - 1].timestamp) / 1000;
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

  if (user === undefined) return null;

  if (!user)
    return (
      <>
        {screen === "login" && <Login onNavigate={setScreen} />}
        {screen === "register" && <Register onNavigate={setScreen} />}
        {screen === "reset" && <ResetPassword onNavigate={setScreen} />}
      </>
    );

  return (
    <Box sx={{ height: "100vh", bgcolor: "#0d1117", color: "#fff" }}>
      {/* APPBAR */}
      <AppBar sx={{ bgcolor: "#111827", px: 2 }} position="fixed">
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            textColor="inherit"
            sx={{ flex: 1 }}
          >
            <Tab label="EN VIVO" value="live" sx={{ color: "#fff" }} />
            <Tab label="HISTORIAL" value="history" sx={{ color: "#fff" }} />
          </Tabs>

          <Button color="inherit" onClick={() => signOut(auth)}>
            CERRAR SESIÓN
          </Button>
        </Box>
      </AppBar>

      {/* CONTENIDO */}
      <Box sx={{ display: "flex", height: "calc(100vh - 64px)", mt: "64px" }}>
        {showHistoryList && (
          <Box sx={{ width: 280, bgcolor: "#0f172a", p: 2 }}>
            <Historial onSelectDate={loadHistory} />
          </Box>
        )}

        {showStats && (
          <Box sx={{ width: 300, bgcolor: "#0f172a", p: 2 }}>
            {[
              ["Distancia", `${totalDist.toFixed(2)} km`],
              ["Vel máx", `${velMax.toFixed(1)} km/h`],
              ["Vel prom", `${velProm.toFixed(1)} km/h`],
              ["Movimiento", `${(tiempoMovimiento / 60).toFixed(1)} min`],
              ["Detenido", `${(tiempoDetenido / 60).toFixed(1)} min`]
            ].map(([t, v]) => (
              <Card key={t} sx={{ bgcolor: "#1f2937", mb: 1 }}>
                <CardContent>
                  <Typography color="white">{t}</Typography>
                  <Typography variant="h5" color="white">
                    {v}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {tab === "history" && (
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2, color: "#fff", borderColor: "#fff" }}
                onClick={() => {
                  setShowStats(false);
                  setShowHistoryList(true);
                  setHistPath([]);
                }}
              >
                Seleccionar otra fecha
              </Button>
            )}
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

            {/* EN VIVO */}
            {tab === "live" && position && (
              <Marker position={position} icon={markerIcon}>
                <Popup>
                  Lat: {position[0].toFixed(6)}
                  <br />
                  Lng: {position[1].toFixed(6)}
                </Popup>
              </Marker>
            )}

            {path.length > 1 && tab === "live" && (
              <Polyline positions={path} />
            )}

            {/* HISTORIAL */}
            {histPath.length > 1 && tab === "history" && (
              <>
                <Polyline positions={histPath} />

                <Marker position={histPath[0]} icon={startIcon}>
                  <Popup>Inicio del recorrido</Popup>
                </Marker>

                <Marker
                  position={histPath[histPath.length - 1]}
                  icon={endIcon}
                >
                  <Popup>Fin del recorrido</Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </Box>
      </Box>

      {!isDesktop && (
        <Fab
          onClick={() => setShowStats(s => !s)}
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            bgcolor: "#2563eb",      // azul
            color: "#fff",
            "&:hover": {
              bgcolor: "#1d4ed8"
            }
          }}
        >
          📊
        </Fab>
      )}

    </Box>
  );
}
