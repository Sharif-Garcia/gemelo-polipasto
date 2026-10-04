/* Vistas predefinidas de la camara [m]. El polipasto se ubica en x = 0, z = 0,
   con la carga en el piso y el bloque fijo cerca de 3.2 m de altura.
   Se ajustaran en las fases 3 y 4 cuando exista la geometria real. */
export const VISTAS = [
  { id: "general", nombre: "General", posicion: [5, 3, 6.5], objetivo: [0, 1.7, 0] },
  { id: "frontal", nombre: "Frontal", posicion: [0, 1.8, 7], objetivo: [0, 1.8, 0] },
  { id: "lateral", nombre: "Lateral", posicion: [7, 1.8, 0], objetivo: [0, 1.8, 0] },
  { id: "poleas", nombre: "Detalle de poleas", posicion: [1.2, 3.4, 1.8], objetivo: [0, 3.1, 0] },
  { id: "operario", nombre: "Operario", posicion: [2.8, 1.6, 2.6], objetivo: [0.6, 1.1, 0] },
];

export function buscarVista(id) {
  return VISTAS.find((v) => v.id === id) ?? VISTAS[0];
}
