/* Medidas de la interfaz sobre la escena [px]. Las usan la distribucion de los
   paneles y la camara (setViewOffset), para que el cuadro de la camara sea el
   area libre entre los paneles y las barras. */
export const MEDIDAS = {
  margen: 12,
  anchoParametros: 304,
  anchoValores: 276,
  anchoPlegado: 40,
  altoVistas: 44,
  altoReproduccion: 52,
};

// Bordes izquierdo y derecho que ocupan los paneles laterales
export function bordesLaterales(paneles) {
  const { margen, anchoParametros, anchoValores, anchoPlegado } = MEDIDAS;
  return {
    izquierda: margen + (paneles.parametros ? anchoParametros : anchoPlegado) + margen,
    derecha: margen + (paneles.valores ? anchoValores : anchoPlegado) + margen,
  };
}

// Rectangulo libre de la escena: { x, y, ancho, alto } dentro del lienzo
export function areaVisible(anchoLienzo, altoLienzo, paneles) {
  const { margen, altoVistas, altoReproduccion } = MEDIDAS;
  const { izquierda, derecha } = bordesLaterales(paneles);
  const arriba = margen + altoVistas + margen;
  const abajo = margen + altoReproduccion + margen;
  return {
    x: izquierda,
    y: arriba,
    ancho: Math.max(1, anchoLienzo - izquierda - derecha),
    alto: Math.max(1, altoLienzo - arriba - abajo),
  };
}
