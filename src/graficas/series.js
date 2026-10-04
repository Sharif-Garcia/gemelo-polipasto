/* =========================================================================
   series.js
   Logica de las graficas que no depende del DOM: pestañas, series, colores,
   marcas de eventos, conversion de t a indice y zoom del eje del tiempo.
   ========================================================================= */
import { Fisica } from "../fisica/fisica.js";

/* Un color por variable, el mismo en todas las pestañas (paleta categorica
   validada para daltonismo; los de bajo contraste llevan siempre etiqueta). */
export const VARIABLES = {
  y: { nombre: "Posición", simbolo: "y", unidad: "m", color: "#2a78d6", decimales: 4 },
  ydot: { nombre: "Velocidad", simbolo: "ẏ", unidad: "m/s", color: "#eb6834", decimales: 4 },
  ydd: { nombre: "Aceleración", simbolo: "ÿ", unidad: "m/s²", color: "#1baf7a", decimales: 4 },
  u: { nombre: "Fuerza", simbolo: "u", unidad: "N", color: "#eda100", decimales: 1 },
  T: { nombre: "Tensión", simbolo: "T", unidad: "N", color: "#e87ba4", decimales: 1, trazo: [6, 4] },
  s: { nombre: "Cadena recogida", simbolo: "s", unidad: "m", color: "#008300", decimales: 4 },
  N: { nombre: "Reacción del piso", simbolo: "N", unidad: "N", color: "#4a3aa7", decimales: 1 },
};

/* Cada pestaña es una lista de graficas; cada grafica, una lista de variables
   con la misma unidad (un solo eje y). "Todas" apila cuatro graficas. */
export const PESTANAS = [
  { id: "y", nombre: "Posición y", graficas: [["y"]] },
  { id: "ydot", nombre: "Velocidad ẏ", graficas: [["ydot"]] },
  { id: "ydd", nombre: "Aceleración ÿ", graficas: [["ydd"]] },
  { id: "fuerza", nombre: "Fuerza u y tensión T", graficas: [["u", "T"]] },
  { id: "s", nombre: "Cadena s", graficas: [["s"]] },
  { id: "N", nombre: "Reacción N", graficas: [["N"]] },
  { id: "todas", nombre: "Todas", graficas: [["y"], ["ydot"], ["ydd"], ["u"]] },
];

export function buscarPestana(id) {
  return PESTANAS.find((p) => p.id === id) ?? PESTANAS[0];
}

// Hay datos de Simulink para todas las variables de la grafica
export function tieneSimulink(simulink, claves) {
  return Boolean(simulink) && claves.every((c) => simulink.columnas[c] !== undefined);
}

/* Datos en el formato de uPlot (sin copiar los arreglos):
   [t, gemelo1, gemelo2, ..., simulink1, simulink2, ...]; las series de Simulink
   solo se agregan si existen para todas las variables. */
export function datosGrafica(sim, claves, simulink = null) {
  const gemelo = claves.map((c) => sim.r[c]);
  const externas = tieneSimulink(simulink, claves) ? claves.map((c) => simulink.columnas[c]) : [];
  return [sim.r.t, ...gemelo, ...externas];
}

// Etiqueta del eje y: simbolos y unidad comun, p. ej. "u, T [N]"
export function etiquetaEje(claves) {
  const unidad = VARIABLES[claves[0]].unidad;
  return `${claves.map((c) => VARIABLES[c].simbolo).join(", ")} [${unidad}]`;
}

/* Marcas verticales: despegue, y maxima, t_off y aterrizaje.
   Si la carga nunca despega solo se marca t_off (el aterrizaje que reporta
   calcularEventos en ese caso no corresponde a una caida real). */
export function marcasEventos(sim) {
  const { eventos, p } = sim;
  const marcas = [];
  const despego = eventos.despegue !== null;
  if (despego) marcas.push({ t: eventos.despegue, etiqueta: "despegue" });
  if (despego) marcas.push({ t: eventos.t_ymax, etiqueta: "y máx" });
  marcas.push({ t: p.t_off, etiqueta: "t_off" });
  if (despego && eventos.aterrizaje !== null) marcas.push({ t: eventos.aterrizaje, etiqueta: "aterrizaje" });
  return marcas.sort((a, b) => a.t - b.t);
}

// Tiempo acotado a la simulacion y su indice de muestra
export function tiempoEIndice(sim, t) {
  const tAcotado = Math.min(Math.max(t, 0), sim.p.tf);
  return { t: tAcotado, indice: Fisica.indice(sim, tAcotado) };
}

/* Fila de cada etiqueta de marca: la primera fila donde no toca a la anterior.
   etiquetas: [{ x, ancho }] ordenadas por x (en pixeles); separacion minima en px. */
export function filasEtiquetas(etiquetas, separacion) {
  const finFila = [];
  return etiquetas.map(({ x, ancho }) => {
    let fila = finFila.findIndex((fin) => x > fin + separacion);
    if (fila < 0) fila = finFila.length;
    finFila[fila] = x + ancho;
    return fila;
  });
}

/* ---------- Zoom del eje del tiempo ---------- */

export const RANGO_MIN = 0.05;   // ancho minimo del zoom [s]

// Acota un rango [min, max] a [0, tf] conservando su ancho si es posible
export function acotarRango(min, max, tf) {
  const ancho = Math.min(Math.max(Math.abs(max - min), RANGO_MIN), tf);
  let a = Math.min(min, max);
  if (a < 0) a = 0;
  if (a + ancho > tf) a = tf - ancho;
  return { min: a, max: a + ancho };
}

// Zoom con la rueda alrededor del tiempo bajo el puntero (factor < 1 acerca)
export function zoomRueda(rango, tPuntero, factor, tf) {
  const min = tPuntero - (tPuntero - rango.min) * factor;
  const max = tPuntero + (rango.max - tPuntero) * factor;
  return acotarRango(min, max, tf);
}

export function rangoCompleto(sim) {
  return { min: 0, max: sim.p.tf };
}

export function esRangoCompleto(rango, sim) {
  return rango.min <= 0 && rango.max >= sim.p.tf;
}
