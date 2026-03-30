import { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";
import { Box, Typography, IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const DIAS   = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES  = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Convierte "2026-03-30" → Date local sin desfase de timezone
function parseLocalDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Formatea Date → "YYYY-MM-DD"
function toKey(date) {
  const y   = date.getFullYear();
  const m   = String(date.getMonth() + 1).padStart(2, "0");
  const d   = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function Historial({ onSelectDate }) {
  const [fechasSet, setFechasSet] = useState(new Set());
  const [hoy]                     = useState(new Date());
  const [vistames, setVistaMes]   = useState(
    new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );
  const [seleccionada, setSeleccionada] = useState(null);

  // Cargar fechas con historial desde Firebase
  useEffect(() => {
    onValue(ref(db, "historial/vehiculo1"), snap => {
      const data = snap.val();
      setFechasSet(data ? new Set(Object.keys(data)) : new Set());
    });
  }, []);

  // Navegar entre meses
  const mesAnterior = () =>
    setVistaMes(new Date(vistames.getFullYear(), vistames.getMonth() - 1, 1));
  const mesSiguiente = () =>
    setVistaMes(new Date(vistames.getFullYear(), vistames.getMonth() + 1, 1));

  // Construir grilla del mes
  const year  = vistames.getFullYear();
  const month = vistames.getMonth();
  const primerDia    = new Date(year, month, 1).getDay(); // 0=Dom
  const diasEnMes    = new Date(year, month + 1, 0).getDate();

  const celdas = [];
  for (let i = 0; i < primerDia; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(new Date(year, month, d));

  const handleClick = (date) => {
    const key = toKey(date);
    if (!fechasSet.has(key)) return;
    setSeleccionada(key);
    onSelectDate(key);
  };

  return (
    <Box sx={{ color: "#fff", userSelect: "none" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        Seleccioná una fecha
      </Typography>

      {/* ── Navegación mes ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <IconButton onClick={mesAnterior} size="small" sx={{ color: "#fff" }}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
          {MESES[month]} {year}
        </Typography>
        <IconButton
          onClick={mesSiguiente}
          size="small"
          sx={{ color: "#fff" }}
          disabled={year === hoy.getFullYear() && month >= hoy.getMonth()}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* ── Encabezados días ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {DIAS.map(d => (
          <Typography
            key={d}
            sx={{ textAlign: "center", fontSize: 11, color: "#6b7280", fontWeight: 600 }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      {/* ── Grilla de días ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {celdas.map((date, i) => {
          if (!date) return <Box key={`empty-${i}`} />;

          const key        = toKey(date);
          const tieneData  = fechasSet.has(key);
          const esHoy      = toKey(hoy) === key;
          const esFutura   = date > hoy;
          const esSelec    = seleccionada === key;

          return (
            <Box
              key={key}
              onClick={() => !esFutura && handleClick(date)}
              sx={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                fontSize: 13,
                fontWeight: tieneData ? 700 : 400,
                cursor: tieneData ? "pointer" : "default",
                position: "relative",

                // Color de fondo según estado
                bgcolor: esSelec
                  ? "#2563eb"
                  : tieneData
                  ? "#1e3a5f"
                  : "transparent",

                // Borde para hoy
                border: esHoy ? "2px solid #2563eb" : "2px solid transparent",

                // Color de texto
                color: esFutura
                  ? "#374151"
                  : tieneData
                  ? "#fff"
                  : "#6b7280",

                "&:hover": tieneData
                  ? { bgcolor: esSelec ? "#1d4ed8" : "#2563eb", transition: "0.15s" }
                  : {},

                transition: "background-color 0.15s"
              }}
            >
              {date.getDate()}

              {/* Punto indicador debajo del número */}
              {tieneData && !esSelec && (
                <Box sx={{
                  position: "absolute",
                  bottom: "3px",
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  bgcolor: "#60a5fa"
                }} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Leyenda ── */}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#1e3a5f", border: "1px solid #60a5fa" }} />
          <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>Con recorrido registrado</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#2563eb" }} />
          <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>Fecha seleccionada</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #2563eb" }} />
          <Typography sx={{ fontSize: 11, color: "#9ca3af" }}>Hoy</Typography>
        </Box>
      </Box>
    </Box>
  );
}