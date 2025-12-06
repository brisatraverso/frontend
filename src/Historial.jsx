import { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";

// MUI DatePicker
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

// MUI UI
import { Box, Typography, Card, CardContent } from "@mui/material";

export default function Historial({ onSelectDate }) {
  const [fechas, setFechas] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const histRef = ref(db, "historial/vehiculo1");

    onValue(histRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const keys = Object.keys(data);
        setFechas(keys);
      } else {
        setFechas([]);
      }
    });
  }, []);

  // Fechas válidas en formato dayjs
  const fechasValidas = fechas.map((f) => dayjs(f));

  const handleChange = (newValue) => {
    setSelected(newValue);

    if (!newValue) return;
    const fechaFormateada = newValue.format("YYYY-MM-DD");

    if (fechas.includes(fechaFormateada)) {
      onSelectDate(fechaFormateada);
    }
  };

  return (
    <Card
      sx={{
        background: "#1f2937",
        color: "white",
        p: 2,
        borderRadius: 2,
        mb: 2,
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Seleccioná una fecha del historial
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Fecha"
            value={selected}
            onChange={handleChange}
            format="YYYY-MM-DD"
            sx={{
              width: "100%",
              "& .MuiInputBase-root": {
                color: "white",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#4b5563",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#9ca3af",
              },
              "& .MuiSvgIcon-root": {
                color: "white",
              },
            }}
            shouldDisableDate={(date) => {
              return !fechasValidas.some((f) => f.isSame(date, "day"));
            }}
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
          />
        </LocalizationProvider>

        {fechas.length === 0 && (
          <Typography sx={{ mt: 2, color: "#9ca3af" }}>
            No hay historial guardado
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
