// App.jsx
import { useEffect, useState, useRef } from "react";
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

/* ================= CONFIG ================= */
const MIN_STOP_TIME   = 120;
const STOP_TIMEOUT_MS = 20000; // ms sin datos para considerar vehículo detenido

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

const stopIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
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

// ── Helper notificaciones push ────────────────────────────
function mostrarNotificacion(titulo, cuerpo) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(titulo, {
    body: cuerpo,
    icon: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    tag:  "gps-tracker"
  });
}

export default function App() {
  const isDesktop = useMediaQuery("(min-width:900px)");

  const [user, setUser]     = useState(undefined);
  const [screen, setScreen] = useState("login");
  const [tab, setTab]       = useState("live");

  const [position, setPosition] = useState(null);
  const [path, setPath]         = useState([]);
  const [histPath, setHistPath] = useState([]);
  const [stops, setStops]       = useState([]);

  const [totalDist, setTotalDist]               = useState(0);
  const [velMax, setVelMax]                     = useState(0);
  const [velProm, setVelProm]                   = useState(0);
  const [tiempoMovimiento, setTiempoMovimiento] = useState(0);
  const [tiempoDetenido, setTiempoDetenido]     = useState(0);

  const [showStats, setShowStats]             = useState(false);
  const [showHistoryList, setShowHistoryList] = useState(false);

  // ── Refs para acumular valores sin causar re-renders ──
  const prevPointRef     = useRef(null);
  const prevTimestampRef = useRef(null);
  const acumDistRef      = useRef(0);
  const acumVelsRef      = useRef([]);
  const acumMovRef       = useRef(0);
  const acumStopRef      = useRef(0);
  const stopTimerRef     = useRef(null);  // timer para detección de parada
  const estadoRef        = useRef(null);  // "movimiento" | "quieto" | null

  // ── Pedir permiso de notificaciones al montar ─────────
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  /* ================= CAMBIO DE TAB ================= */
  useEffect(() => {
    if (tab === "history") {
      setShowHistoryList(true);
      setShowStats(false);
      setPath([]);
    } else {
      setHistPath([]);
      setStops([]);
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

    // Resetear acumuladores al entrar a EN VIVO
    prevPointRef.current     = null;
    prevTimestampRef.current = null;
    acumDistRef.current      = 0;
    acumVelsRef.current      = [];
    acumMovRef.current       = 0;
    acumStopRef.current      = 0;
    estadoRef.current        = null;

    // Limpiar timer si quedó de sesión anterior
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    const unsubscribe = onValue(ref(db, "vehiculo1"), snap => {
      const d = snap.val();
      if (!d?.lat || !d?.lng) return;

      const pos = [d.lat, d.lng];
      setPosition(pos);
      setPath(p => [...p, pos]);

      const now = d.timestamp || Date.now();

      // ── Cada dato que llega = movimiento ─────────────
      // Notificar solo si venía de estado quieto o es la primera vez
      if (estadoRef.current === "quieto") {
        mostrarNotificacion(
          "🚗 Vehículo en movimiento",
          "El vehículo comenzó a moverse."
        );
      }
      estadoRef.current = "movimiento";

      // ── Reiniciar timer de parada ─────────────────────
      // Si no llega ningún dato en STOP_TIMEOUT_MS → vehículo detenido
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(() => {
        if (estadoRef.current === "movimiento") {
          mostrarNotificacion(
            "🅿️ Vehículo detenido",
            "El vehículo se detuvo."
          );
          estadoRef.current = "quieto";
        }
      }, STOP_TIMEOUT_MS);

      // ── Calcular estadísticas en tiempo real ─────────
      if (prevPointRef.current && prevTimestampRef.current) {
        const [prevLat, prevLng] = prevPointRef.current;
        const dist = haversine(prevLat, prevLng, d.lat, d.lng);
        acumDistRef.current += dist;
        setTotalDist(acumDistRef.current / 1000);

        const dt = (now - prevTimestampRef.current) / 1000;
        if (dt > 0 && dt < 300) {
          const vel = (dist / dt) * 3.6;
          acumVelsRef.current.push(vel);
          setVelMax(v => Math.max(v, vel));
          setVelProm(
            acumVelsRef.current.reduce((a, b) => a + b, 0) /
            acumVelsRef.current.length
          );
          if (vel > 2) {
            acumMovRef.current += dt;
          } else {
            acumStopRef.current += dt;
          }
          setTiempoMovimiento(acumMovRef.current);
          setTiempoDetenido(acumStopRef.current);
        }
      }

      prevPointRef.current     = pos;
      prevTimestampRef.current = now;
    });

    // Limpiar listener y timer al salir de EN VIVO
    return () => {
      unsubscribe();
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    };
  }, [tab]);

  /* ================= HISTORIAL ================= */
  const loadHistory = fecha => {
    setShowHistoryList(false);
    setShowStats(true);
    setStops([]);

    onValue(ref(db, `historial/vehiculo1/${fecha}`), snap => {
      const puntos = Object.values(snap.val() || {});
      if (puntos.length < 2) return;

      const coords = puntos.map(p => [p.lat, p.lng]);
      setHistPath(coords);

      let dist = 0;
      let vels = [];
      let mov  = 0;
      let stop = 0;

      let currentStop   = null;
      let detectedStops = [];

      for (let i = 1; i < puntos.length; i++) {
        const d = haversine(
          puntos[i - 1].lat,
          puntos[i - 1].lng,
          puntos[i].lat,
          puntos[i].lng
        );

        dist += d;

        const dt = (puntos[i].timestamp - puntos[i - 1].timestamp) / 1000;
        if (dt <= 0) continue;

        const v = (d / dt) * 3.6;
        vels.push(v);

        if (v <= 2) {
          stop += dt;
          if (!currentStop) {
            currentStop = { lat: puntos[i].lat, lng: puntos[i].lng, time: dt };
          } else {
            currentStop.time += dt;
          }
        } else {
          mov += dt;
          if (currentStop && currentStop.time >= MIN_STOP_TIME) {
            detectedStops.push(currentStop);
          }
          currentStop = null;
        }
      }

      if (currentStop && currentStop.time >= MIN_STOP_TIME) {
        detectedStops.push(currentStop);
      }

      setStops(detectedStops);
      setTotalDist(dist / 1000);
      setVelMax(Math.max(...vels, 0));
      setVelProm(
        vels.length ? vels.reduce((a, b) => a + b) / vels.length : 0
      );
      setTiempoMovimiento(mov);
      setTiempoDetenido(stop);
    });
  };

  if (user === undefined) return null;

  if (!user)
    return (
      <>
        {screen === "login"    && <Login onNavigate={setScreen} />}
        {screen === "register" && <Register onNavigate={setScreen} />}
        {screen === "reset"    && <ResetPassword onNavigate={setScreen} />}
      </>
    );

  return (
    <Box sx={{ height: "100vh", bgcolor: "#0d1117", color: "#fff" }}>
      {/* APPBAR */}
      <AppBar sx={{ bgcolor: "#111827", px: 2 }} position="fixed">
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ flex: 1 }}>
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
              ["Distancia",  `${totalDist.toFixed(2)} km`],
              ["Vel máx",    `${velMax.toFixed(1)} km/h`],
              ["Vel prom",   `${velProm.toFixed(1)} km/h`],
              ["Movimiento", `${(tiempoMovimiento / 60).toFixed(1)} min`],
              ["Detenido",   `${(tiempoDetenido / 60).toFixed(1)} min`]
            ].map(([t, v]) => (
              <Card key={t} sx={{ bgcolor: "#1f2937", mb: 1 }}>
                <CardContent>
                  <Typography color="white">{t}</Typography>
                  <Typography variant="h5" color="white">{v}</Typography>
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
                  setStops([]);
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
                  Lat: {position[0].toFixed(6)}<br />
                  Lng: {position[1].toFixed(6)}
                </Popup>
              </Marker>
            )}
            {tab === "live" && path.length > 1 && (
              <Polyline positions={path} />
            )}

            {/* HISTORIAL */}
            {tab === "history" && histPath.length > 1 && (
              <>
                <Polyline positions={histPath} />
                <Marker position={histPath[0]} icon={startIcon}>
                  <Popup>Inicio del recorrido</Popup>
                </Marker>
                <Marker position={histPath[histPath.length - 1]} icon={endIcon}>
                  <Popup>Fin del recorrido</Popup>
                </Marker>
                {stops.map((s, i) => (
                  <Marker key={i} position={[s.lat, s.lng]} icon={stopIcon}>
                    <Popup>Detenido {(s.time / 60).toFixed(1)} min</Popup>
                  </Marker>
                ))}
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
            bgcolor: "#2563eb",
            color: "#fff",
            "&:hover": { bgcolor: "#1d4ed8" }
          }}
        >
          📊
        </Fab>
      )}
    </Box>
  );
}
