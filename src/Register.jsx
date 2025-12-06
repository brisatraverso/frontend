import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { Box, Button, TextField, Typography, Card } from "@mui/material";

export default function Register({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const handleRegister = async () => {
    setErr("");
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      console.log("Usuario creado:", userCred.user.uid);
      onNavigate("login");
    } catch (e) {
      console.error("Firebase Error:", e.code);

      if (e.code === "auth/email-already-in-use")
        setErr("El correo ya está registrado");

      else if (e.code === "auth/invalid-email")
        setErr("Correo inválido");

      else if (e.code === "auth/weak-password")
        setErr("La contraseña debe tener al menos 6 caracteres");

      else
        setErr("Error al crear la cuenta");
    }
  };

  return (
    <Box sx={{
    height: "100vh", display: "flex", justifyContent: "center",
    alignItems: "center", backgroundImage: "url('/src/assets/fondo.png')",
    backgroundSize: "cover", backgroundPosition: "center", 
    backgroundRepeat: "no-repeat",color: "#fff"
    }}>
      <Card sx={{ p: 4, bgcolor: "#111827", width: 350 }}>
        <Typography variant="h5" sx={{ mb: 3, textAlign: "center", color: "#fff", fontWeight: 600 }}>
         Crear cuenta
        </Typography>

        <TextField
          fullWidth
          label="Correo"
          variant="filled"
          sx={{ mb: 2 }}
          onChange={(e) => setEmail(e.target.value)}
          InputLabelProps={{ style: { color: "#fff" } }}
          inputProps={{ style: { color: "#fff" } }}
        />

        <TextField
          fullWidth
          type="password"
          label="Contraseña"
          variant="filled"
          sx={{ 
            mb: 2,
            bgcolor: "#1f2937",
            borderRadius: 1,}}
          onChange={(e) => setPass(e.target.value)}
          InputLabelProps={{ style: { color: "#fff" } }}
          inputProps={{ style: { color: "#fff" } }}
        />

        {err && <Typography sx={{ color: "red", mb: 2 }}>{err}</Typography>}

        <Button fullWidth variant="contained" onClick={handleRegister}>
          Crear cuenta
        </Button>

        <Button
          fullWidth
          sx={{ mt: 2, color: "#60a5fa" }}
          onClick={() => onNavigate("login")}
        >
          Ya tengo cuenta
        </Button>
      </Card>
    </Box>
  );
}
