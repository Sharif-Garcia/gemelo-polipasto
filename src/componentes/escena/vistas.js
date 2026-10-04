/* Vistas predefinidas de la camara.
   Cada vista tiene una direccion (desde el objetivo hacia la camara) y una caja
   que debe quedar encuadrada. La distancia se calcula para el fov y la
   proporcion reales del lienzo, asi la vista aprovecha el area visible con
   cualquier tamaño de ventana y con el panel de graficas abierto o plegado.
   "Poleas moviles" ademas sigue al bloque en vivo. */
import { alturaBloqueMovil, DIMENSIONES } from "../../geometria/disposicion.js";
import { ubicacionOperario } from "../../geometria/operario.js";

export const VISTAS = [
  { id: "general", nombre: "General", direccion: [5.2, 1.15, 6.8], caja: "portico" },
  { id: "frontal", nombre: "Frontal", direccion: [0, 0.08, 1], caja: "portico" },
  { id: "lateral", nombre: "Lateral", direccion: [1, 0.08, 0], caja: "portico" },
  { id: "poleasFijas", nombre: "Poleas fijas", direccion: [0.25, 0.18, 1], caja: "fijo" },
  { id: "poleasMoviles", nombre: "Poleas móviles", direccion: [0.25, 0.18, 1], caja: "movil", sigue: true },
  { id: "operario", nombre: "Operario", direccion: [1.1, 0.4, 2.9], caja: "operario" },
];

const MARGEN = 1.05;           // aire alrededor de la caja
const DISTANCIA_MIN = 0.85;    // >= minDistance de los controles
const DISTANCIA_MAX = 13.5;    // <= maxDistance de los controles

export function buscarVista(id) {
  return VISTAS.find((v) => v.id === id) ?? VISTAS[0];
}

const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unitario = (a) => { const m = Math.hypot(...a); return a.map((c) => c / m); };

// Caja [min, max] que encuadra cada vista
export function cajaVista(tipo, disp, y) {
  const { bloques, H_fijo, viga, xLibre } = disp;
  if (tipo === "portico") {
    // Columnas con sus placas base, viga, operario y monton de cadena
    const x = DIMENSIONES.x_columna + 0.15;
    return { min: [-x, 0, -0.45], max: [x, viga.yInferior + 0.2, 0.3] };
  }
  if (tipo === "operario") {
    const xo = ubicacionOperario(disp).x;
    return { min: [xLibre - 0.1, 0, -0.3], max: [xo + 0.5, 1.82, 0.3] };
  }
  const { xMin, xMax } = bloques[tipo];
  const yc = tipo === "fijo" ? H_fijo : alturaBloqueMovil(y);
  const h = bloques.medioAlto + 0.03;
  return { min: [xMin, yc - h, -0.05], max: [xMax, yc + h, 0.05] };
}

// Base de la camara: f hacia la camara, r a la derecha y u hacia arriba de la pantalla
export function baseCamara(direccion) {
  const f = unitario(direccion);
  const r = unitario(cruz([0, 1, 0], f));
  return { f, r, u: cruz(f, r) };
}

// Distancia minima desde el centro de la caja para que sus 8 esquinas queden en el
// cuadro (perspectiva exacta, con el objetivo en el centro de la caja)
export function distanciaEncuadre(caja, direccion, fovVertical, aspecto, margen = MARGEN) {
  const { f, r, u } = baseCamara(direccion);
  const c = caja.min.map((v, i) => (v + caja.max[i]) / 2);
  const tanV = Math.tan(fovVertical / 2) / margen;
  const tanH = tanV * aspecto;
  let d = 0;
  for (const x of [caja.min[0], caja.max[0]]) {
    for (const y of [caja.min[1], caja.max[1]]) {
      for (const z of [caja.min[2], caja.max[2]]) {
        const q = resta([x, y, z], c);
        const hacia = punto(q, f);   // las esquinas mas cerca de la camara necesitan mas distancia
        d = Math.max(d, hacia + Math.abs(punto(q, r)) / tanH, hacia + Math.abs(punto(q, u)) / tanV);
      }
    }
  }
  return d;
}

// Posicion y objetivo de la vista para la disposicion, la posicion y y el lienzo
export function encuadreVista(id, disp, y, fovVertical, aspecto) {
  const vista = buscarVista(id);
  const caja = cajaVista(vista.caja, disp, y);
  const objetivo = caja.min.map((v, i) => (v + caja.max[i]) / 2);
  const d = Math.min(DISTANCIA_MAX, Math.max(DISTANCIA_MIN,
    distanciaEncuadre(caja, vista.direccion, fovVertical, aspecto)));
  const { f } = baseCamara(vista.direccion);
  return { posicion: objetivo.map((v, i) => v + f[i] * d), objetivo };
}
