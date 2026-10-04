/* Vistas predefinidas de la camara [m].
   Las vistas fijas estan ajustadas a la disposicion por defecto (bloque movil
   en x = 0, bloque fijo a 3.3 m). Las vistas de poleas y del operario se
   calculan con la disposicion actual para encuadrar con cualquier n; "Poleas
   moviles" ademas sigue al bloque en vivo. */
import { alturaBloqueMovil } from "../../geometria/disposicion.js";
import { ubicacionOperario } from "../../geometria/operario.js";

export const VISTAS = [
  { id: "general", nombre: "General", posicion: [5.2, 3.0, 6.8], objetivo: [0, 1.85, 0] },
  { id: "frontal", nombre: "Frontal", posicion: [0, 1.9, 6.5], objetivo: [0, 1.9, 0] },
  { id: "lateral", nombre: "Lateral", posicion: [6.5, 1.9, 0], objetivo: [0, 1.9, 0] },
  { id: "poleasFijas", nombre: "Poleas fijas", bloque: "fijo" },
  { id: "poleasMoviles", nombre: "Poleas móviles", bloque: "movil", sigue: true },
  { id: "operario", nombre: "Operario", operario: true },
];

// Direccion de la camara para los bloques: de frente, un poco a la derecha y arriba
const DIRECCION_BLOQUE = (() => {
  const v = [0.25, 0.18, 1];
  const m = Math.hypot(...v);
  return v.map((c) => c / m);
})();
const DISTANCIA_MIN = 0.85;      // >= minDistance de los controles
const DISTANCIA_POR_ANCHO = 1.8; // el bloque ocupa cerca del 40 % del ancho (pantalla 16:9, fov 40°)

export function buscarVista(id) {
  return VISTAS.find((v) => v.id === id) ?? VISTAS[0];
}

// Posicion y objetivo de la vista para la disposicion y la posicion y actuales
export function encuadreVista(id, disp, y) {
  const vista = buscarVista(id);
  if (vista.operario) {
    // Cuerpo entero (1.75 m) y la cadena entre sus manos, de frente y algo a la derecha
    const xc = (disp.xLibre + ubicacionOperario(disp).x) / 2 + 0.05;
    return { posicion: [xc + 1.1, 1.35, 2.9], objetivo: [xc, 0.95, 0] };
  }
  if (!vista.bloque) return vista;
  const { xMin, xMax } = disp.bloques[vista.bloque];
  const xc = (xMin + xMax) / 2;
  const yc = vista.bloque === "fijo" ? disp.H_fijo : alturaBloqueMovil(y);
  const d = Math.max(DISTANCIA_MIN, DISTANCIA_POR_ANCHO * (xMax - xMin));
  const [dx, dy, dz] = DIRECCION_BLOQUE;
  return {
    posicion: [xc + dx * d, yc + dy * d, dz * d],
    objetivo: [xc, yc, 0],
  };
}
