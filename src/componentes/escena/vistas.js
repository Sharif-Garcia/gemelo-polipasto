/* Vistas predefinidas de la camara [m], ajustadas a la disposicion por defecto:
   bloque movil centrado en x = 0, bloque fijo a 3.3 m, viga a 3.6 m,
   mano del operario a 1.3 m y monton de cadena a la derecha. */
export const VISTAS = [
  { id: "general", nombre: "General", posicion: [5.2, 3.0, 6.8], objetivo: [0, 1.85, 0] },
  { id: "frontal", nombre: "Frontal", posicion: [0, 1.9, 6.5], objetivo: [0, 1.9, 0] },
  { id: "lateral", nombre: "Lateral", posicion: [6.5, 1.9, 0], objetivo: [0, 1.9, 0] },
  { id: "poleas", nombre: "Detalle de poleas", posicion: [0.45, 3.55, 0.95], objetivo: [0.05, 3.22, 0] },
  { id: "operario", nombre: "Operario", posicion: [1.9, 1.45, 2.3], objetivo: [0.35, 0.85, 0] },
];

export function buscarVista(id) {
  return VISTAS.find((v) => v.id === id) ?? VISTAS[0];
}
