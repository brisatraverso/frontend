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
  Button
} from "@mui/material";

// ICONO MAPA
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

// FIX MAP RESIZE
function FixMapResize() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);
  return null;
}

const defaultPosition = [-32.48, -58.23];

// HAVERSINE
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
  // AUTENTICACIÓN
  const [user, setUser] = useState(undefined);
  const [screen, setScreen] = useState("login");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // ESTADOS EN VIVO
  const [tab, setTab] = useState("live");
  const [position, setPosition] = useState(null);
  const [path, setPath] = useState([]);
  const [velocidadActual, setVelocidadActual] = useState(0);

  // HISTORIAL
  const [histPath, setHistPath] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [totalDist, setTotalDist] = useState(0);
  const [velMax, setVelMax] = useState(0);
  const [velProm, setVelProm] = useState(0);

  const [tiempoMovimiento, setTiempoMovimiento] = useState(0);
  const [tiempoDetenido, setTiempoDetenido] = useState(0);

  const [frenadas, setFrenadas] = useState(0);
  const [aceleradas, setAceleradas] = useState(0);

  // CONTROL DE VISTA (selector ⇆ estadísticas)
  const [showStats, setShowStats] = useState(false);

  // Cuando vuelvo a EN VIVO, limpiar datos de historial
  useEffect(() => {
    if (tab === "live") {
      setHistPath([]);
      setSelectedDate(null);
      setTotalDist(0);
      setVelMax(0);
      setVelProm(0);
      setTiempoMovimiento(0);
      setTiempoDetenido(0);
      setFrenadas(0);
      setAceleradas(0);
      setShowStats(false); // vuelve a ocultar stats
    }
  }, [tab]);


  // EN VIVO
  useEffect(() => {
    if (tab !== "live") return;

    let lastPos = null;

    const starRef = ref(db, "vehiculo1");

    const unsub = onValue(starRef, (snapshot) => {
      const data = snapshot.val();

      if (data?.lat && data?.lng) {
        const newPos = [data.lat, data.lng];

        // calcular velocidad correctamente
        if (lastPos) {
          const d = haversine(lastPos[0], lastPos[1], newPos[0], newPos[1]);
          const dt = 1; // 1 segundo
          const v = (d / dt) * 3.6;

          setVelocidadActual(v);
        }

        lastPos = newPos;

        setPosition(newPos);
        setPath((prev) => [...prev, newPos]);
      }
    });

    return () => unsub();
  }, [tab]);


  // HISTORIAL → cargar fecha
  const loadHistory = (fecha) => {
    setSelectedDate(fecha);
    setTab("history");
    setShowStats(true); // aquí se despliega el sidebar

    const refFecha = ref(db, `historial/vehiculo1/${fecha}`);

    onValue(refFecha, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const puntos = Object.values(data);
      const coords = puntos.map((p) => [p.lat, p.lng]);
      setHistPath(coords);

      let distancia = 0;
      let velocidades = [];

      let fren = 0;
      let acel = 0;

      let mov = 0;
      let stop = 0;

      for (let i = 1; i < puntos.length; i++) {
        const p1 = puntos[i - 1];
        const p2 = puntos[i];

        const d = haversine(p1.lat, p1.lng, p2.lat, p2.lng);
        distancia += d;

        if (p1.timestamp && p2.timestamp) {
          const dt = (p2.timestamp - p1.timestamp) / 1000;
          const v = (d / dt) * 3.6;
          if (dt > 0) velocidades.push(v);

          if (v > 2) mov += dt;
          else stop += dt;

          // Clasificación acelerómetro
          if (p1.acc && p2.acc) {
            const diff = p2.acc - p1.acc;
            if (diff < -2.5) fren++;
            if (diff > 2.5) acel++;
          }
        }
      }

      setTotalDist(distancia / 1000);
      setVelMax(velocidades.length ? Math.max(...velocidades) : 0);
      setVelProm(
        velocidades.length
          ? velocidades.reduce((a, b) => a + b, 0) / velocidades.length
          : 0
      );

      setTiempoMovimiento(mov);
      setTiempoDetenido(stop);
      setFrenadas(fren);
      setAceleradas(acel);
    });
  };

  // LOADING
  if (user === undefined) {
    return (
      <Box
        sx={{
          height: "100vh",
          color: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#0d1117"
        }}
      >
        Cargando...
      </Box>
    );
  }

  // LOGIN / REGISTER / RESET
  if (!user) {
    return (
      <>
        {screen === "login" && <Login onNavigate={setScreen} />}
        {screen === "register" && <Register onNavigate={setScreen} />}
        {screen === "reset" && <ResetPassword onNavigate={setScreen} />}
      </>
    );
  }

  // UI PRINCIPAL
  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        bgcolor: "#0d1117",
        color: "#eee",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* LOGOUT */}
      <Box sx={{ position: "absolute", top: 10, right: 10, zIndex: 2000 }}>
        <Button
          onClick={() => signOut(auth)}
          variant="contained"
          sx={{
            bgcolor: "#321892ff",
            ":hover": { bgcolor: "#4528c9" }
          }}
        >
          Cerrar sesión
        </Button>
      </Box>

      {/* NAVBAR */}
      <AppBar position="static" sx={{ background: "#111827" }}>
        <Tabs
          value={tab}
          onChange={(e, value) => {
            setTab(value);
            if (value !== "history") setShowStats(false);
          }}
          textColor="inherit"
          centered
        >
          <Tab label="En vivo" value="live" />
          <Tab label="Historial" value="history" />
        </Tabs>
      </AppBar>

      <Box sx={{ flexGrow: 1, display: "flex" }}>
        {/* === SIDEBAR EN VIVO === */}
        {tab === "live" && (
          <Box
            sx={{
              width: "280px",
              bgcolor: "#0f172a",
              borderRight: "1px solid #1f2937",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              height: "100vh",
              overflowY: "auto"
            }}
          >
            {/* VELOCIDAD */}
            <Card sx={{ background: "#1f2937", color: "#fff" }}>
              <CardContent>
                <Typography variant="h6">Velocidad actual</Typography>
                <Typography variant="h4">
                  {velocidadActual.toFixed(1)} km/h
                </Typography>
              </CardContent>
            </Card>

            {/* COORDENADAS */}
            <Card sx={{ background: "#1f2937", color: "#fff" }}>
              <CardContent>
                <Typography variant="h6">Coordenadas</Typography>
                <Typography>
                  Lat: {position ? position[0].toFixed(6) : "-"}
                </Typography>
                <Typography>
                  Lng: {position ? position[1].toFixed(6) : "-"}
                </Typography>
              </CardContent>
            </Card>

             {/* DISTANCIA RECORRIDA */}
            <Card sx={{ background: "#1f2937", color: "#fff", minHeight: "110px" }}>
              <CardContent>
                <Typography variant="h6">Distancia recorrida</Typography>
                <Typography variant="h4">
                  {(totalDist || 0).toFixed(2)} km
                </Typography>
              </CardContent>
            </Card>

            {/* VEL. MÁXIMA */}
            <Card sx={{ background: "#1f2937", color: "#fff", minHeight: "110px" }}>
              <CardContent>
                <Typography variant="h6">Velocidad máxima</Typography>
                <Typography variant="h4">
                  {velMax.toFixed(1)} km/h
                </Typography>
              </CardContent>
            </Card>

            {/* VEL. PROMEDIO */}
            <Card sx={{ background: "#1f2937", color: "#fff", minHeight: "110px" }}>
              <CardContent>
                <Typography variant="h6">Velocidad promedio</Typography>
                <Typography variant="h4">
                  {velProm.toFixed(1)} km/h
                </Typography>
              </CardContent>
            </Card>

            {/* TIEMPO EN MOVIMIENTO */}
            <Card sx={{ background: "#1f2937", color: "#fff", minHeight: "110px" }}>
              <CardContent>
                <Typography variant="h6">Tiempo en movimiento</Typography>
                <Typography variant="h4">
                  {(tiempoMovimiento / 60).toFixed(1)} min
                </Typography>
              </CardContent>
            </Card>

            {/* TIEMPO DETENIDO */}
            <Card sx={{ background: "#1f2937", color: "#fff", minHeight: "110px" }}>
              <CardContent>
                <Typography variant="h6">Tiempo detenido</Typography>
                <Typography variant="h4">
                  {(tiempoDetenido / 60).toFixed(1)} min
                </Typography>
              </CardContent>
            </Card>

            {/* FRENADAS */}
            <Card sx={{ background: "#1f2937", color: "#fff", minHeight: "110px" }}>
              <CardContent>
                <Typography variant="h6">Frenadas fuertes</Typography>
                <Typography variant="h4">{frenadas}</Typography>
              </CardContent>
            </Card>

            {/* ACELERADAS */}
            <Card sx={{ background: "#1f2937", color: "#fff", minHeight: "110px" }}>
              <CardContent>
                <Typography variant="h6">Aceleraciones fuertes</Typography>
                <Typography variant="h4">{aceleradas}</Typography>
              </CardContent>
            </Card>

          </Box>
        )}


        {/* === SIDEBAR HISTORIAL → ESTADÍSTICAS === */}
        {tab === "history" && showStats && (
          <Box
            sx={{
              width: "280px",
              bgcolor: "#0f172a",
              borderRight: "1px solid #1f2937",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              height: "100vh",
              overflowY: "auto"
            }}
          >
            <Button
              variant="contained"
              onClick={() => setShowStats(false)}
              sx={{
                bgcolor: "#321892ff",
                ":hover": { bgcolor: "#4528c9" },
                mb: 2
              }}
            >
              Cambiar fecha
            </Button>

            {[ 
              { label: "Distancia total", value: `${totalDist.toFixed(2)} km` },
              { label: "Velocidad máxima", value: `${velMax.toFixed(1)} km/h` },
              { label: "Velocidad promedio", value: `${velProm.toFixed(1)} km/h` },
              {
                label: "Tiempo en movimiento",
                value: `${(tiempoMovimiento / 60).toFixed(1)} min`
              },
              {
                label: "Tiempo detenido",
                value: `${(tiempoDetenido / 60).toFixed(1)} min`
              },
              { label: "Frenadas fuertes", value: frenadas },
              { label: "Aceleraciones fuertes", value: aceleradas }
            ].map((item, i) => (
              <Card
                key={i}
                sx={{
                  background: "#1f2937",
                  color: "#fff",
                  flex: "0 0 120px",
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

        {/* === SELECTOR DE FECHAS === */}
        {tab === "history" && !showStats && (
          <Box
            sx={{
              width: "320px",
              bgcolor: "#0f172a",
              borderRight: "1px solid #1f2937",
              p: 2,
              height: "100vh",
              overflowY: "auto"
            }}
          >
            <Historial onSelectDate={loadHistory} />
          </Box>
        )}

        {/* MAPA */}
        <Box sx={{ flexGrow: 1 }}>
          <MapContainer
            center={defaultPosition}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <FixMapResize />

            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {tab === "live" && position && (
              <>
                <ChangeView center={position} />
                <Marker position={position} icon={markerIcon}>
                  <Popup>
                    <b>Lat:</b> {position[0].toFixed(6)} <br />
                    <b>Lng:</b> {position[1].toFixed(6)}
                  </Popup>
                </Marker>
                {path.length > 1 && <Polyline positions={path} />}
              </>
            )}

            {tab === "history" && histPath.length > 1 && (
              <>
                <Polyline positions={histPath} />
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
