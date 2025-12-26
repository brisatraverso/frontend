import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";
import { Box, Card, TextField, Button, Typography } from "@mui/material";
import fondo from "./assets/fondo.png";


export default function ResetPassword({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handleReset = async () => {
    setErr("");
    setMsg("");

    if (!email) {
      setErr("Ingresá tu correo");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMsg("Correo enviado. Revisá tu bandeja y spam.");
    } catch (e) {
      console.log("RESET ERROR:", e.code);

      if (e.code === "auth/user-not-found")
        setErr("No existe una cuenta con ese correo");

      else if (e.code === "auth/invalid-email")
        setErr("Correo inválido");

      else
        setErr("No se pudo enviar el correo");
    }
  };

  return (
    <Box sx={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundImage: `url(${fondo})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",

    }}>
      <Card sx={{
        width: 350,
        p: 4,
        bgcolor: "#111827",
        color: "#fff",
        boxShadow: "0px 0px 20px rgba(0,0,0,0.5)",
        borderRadius: 3
      }}>
        <Typography variant="h5" sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}>
          Recuperar contraseña
        </Typography>

        <TextField
          fullWidth
          label="Correo"
          variant="filled"
          sx={{
            mb: 2,
            bgcolor: "#1f2937",
            borderRadius: 1
          }}
          InputLabelProps={{ style: { color: "#9ca3af" } }}
          InputProps={{ style: { color: "#fff" } }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {msg && <Typography sx={{ color: "#10b981", mb: 2 }}>{msg}</Typography>}
        {err && <Typography sx={{ color: "#f87171", mb: 2 }}>{err}</Typography>}

        <Button
          fullWidth
          variant="contained"
          sx={{
            bgcolor: "#2563eb",
            ":hover": { bgcolor: "#1e40af" },
            py: 1,
            fontWeight: 600
          }}
          onClick={handleReset}
        >
          Enviar correo de recuperación
        </Button>

        <Typography
          sx={{
            mt: 3,
            cursor: "pointer",
            textAlign: "center",
            color: "#60a5fa",
            ":hover": { textDecoration: "underline" }
          }}
          onClick={() => onNavigate("login")}
        >
          Volver al inicio
        </Typography>
      </Card>
    </Box>
  );
}
