import { useMap } from "react-leaflet";
import { useEffect } from "react";

export default function MapFixer({ position }) {
  const map = useMap();

  useEffect(() => {
    console.log("MapFixer ejecutado. position:", position);

    // Evita el mapa gris después de cargar
    map.invalidateSize();

    // Si hay posición, mover el mapa
    if (position) {
      map.setView(position, 15);
    }
  }, [map, position]);

  return null;
}
