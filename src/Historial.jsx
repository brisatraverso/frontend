import { useEffect, useState } from "react";
import { db } from "./firebase";
import { ref, onValue } from "firebase/database";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  Card,
  CardContent
} from "@mui/material";

export default function Historial({ onSelectDate }) {
  const [fechas, setFechas] = useState([]);

  useEffect(() => {
    const histRef = ref(db, "historial/vehiculo1");

    onValue(histRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const keys = Object.keys(data).sort();
        setFechas(keys);
      } else {
        setFechas([]);
      }
    });
  }, []);

  return (
    <Box
      sx={{
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        height: "100%",
        overflowY: "auto"
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Seleccioná una fecha
      </Typography>

      {fechas.length === 0 && (
        <Typography sx={{ opacity: 0.7 }}>
          No hay historial guardado
        </Typography>
      )}

      <List sx={{ width: "100%" }}>
        {fechas.map((f) => (
          <ListItemButton
            key={f}
            onClick={() => onSelectDate(f)}
            sx={{
              background: "#1f2937",
              mb: 1,
              borderRadius: "8px",
              ":hover": { background: "#374151" },
              color: "#fff"
            }}
          >
            {f}
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
