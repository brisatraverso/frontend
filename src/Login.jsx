import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { Box, Card, TextField, Button, Typography } from "@mui/material";
import fondo from "./assets/fondo.png";


export default function Login({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const handleLogin = async () => {
    setErr("");

    if (!email || !pass) {
      setErr("Completa todos los campos");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      console.log("ERROR LOGIN:", e.code);

      if (e.code === "auth/invalid-email")
        setErr("Correo inválido");
      else if (e.code === "auth/user-not-found")
        setErr("El usuario no existe");
      else if (e.code === "auth/wrong-password")
        setErr("Contraseña incorrecta");
      else
        setErr("Correo o contraseña incorrectos");
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
        <Typography variant="h5" sx={{ mb: 3, textAlign: "center", color: "#fff", fontWeight: 600 }}>
          Iniciar sesión
        </Typography>

        <TextField
          fullWidth
          label="Correo"
          variant="filled"
          sx={{
            mb: 2,
            bgcolor: "#1f2937",
            borderRadius: 1,
          }}
          InputLabelProps={{ style: { color: "#9ca3af" } }}
          InputProps={{ style: { color: "#fff" } }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          fullWidth
          label="Contraseña"
          type="password"
          variant="filled"
          sx={{
            mb: 2,
            bgcolor: "#1f2937",
            borderRadius: 1,
          }}
          InputLabelProps={{ style: { color: "#9ca3af" } }}
          InputProps={{ style: { color: "#fff" } }}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

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
          onClick={handleLogin}
        >
          Entrar
        </Button>

        <Typography
          sx={{
            mt: 3,
            cursor: "pointer",
            textAlign: "center",
            color: "#60a5fa",
            ":hover": { textDecoration: "underline" }
          }}
          onClick={() => onNavigate("register")}
        >
          Crear cuenta
        </Typography>

        <Typography
          sx={{
            mt: 1,
            cursor: "pointer",
            textAlign: "center",
            color: "#93c5fd",
            ":hover": { textDecoration: "underline" }
          }}
          onClick={() => onNavigate("reset")}
        >
          ¿Olvidaste tu contraseña?
        </Typography>
      </Card>
    </Box>
  );
}
