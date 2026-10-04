/* =========================================================================
   parametros.js
   Definicion de los parametros editables en la interfaz: grupos, rangos,
   pasos, formato y dependencias. Funciones puras (sin React).
   - D0: el portico y la carrera minima de la carga.
   - L1: la mano (H_fijo - L1) debe quedar al alcance del operario y sobre
     la altura minima de la mano.
   - t_off: siempre mayor que t_on.
   ========================================================================= */
import { DIMENSIONES } from "../geometria/disposicion.js";
import { alturaAgarreMaxima } from "../geometria/operario.js";

// simbolo: [base, subindice] como en MATLAB y la memoria
export const DEFINICIONES = {
  M: { simbolo: ["M"], etiqueta: "Masa de la carga", unidad: "kg", min: 10, max: 200, paso: 1, decimales: 0 },
  m_b: { simbolo: ["m", "b"], etiqueta: "Masa del bloque móvil", unidad: "kg", min: 2, max: 20, paso: 0.5, decimales: 1 },
  n: { simbolo: ["n"], etiqueta: "Número de ramales", unidad: "", min: 2, max: 6, paso: 1, decimales: 0 },
  r_polea: { simbolo: ["r", "polea"], etiqueta: "Radio de la polea", unidad: "m", min: 0.03, max: 0.1, paso: 0.005, decimales: 3 },
  J_polea: { simbolo: ["J", "polea"], etiqueta: "Inercia de la polea", unidad: "kg·m²", min: 0.0001, max: 0.002, paso: 0.0001, decimales: 4 },
  m_r: { simbolo: ["m", "r"], etiqueta: "Masa de la cadena", unidad: "kg", min: 0.5, max: 5, paso: 0.1, decimales: 1 },
  D0: { simbolo: ["D", "0"], etiqueta: "Separación entre bloques", unidad: "m", min: 1.5, max: 3, paso: 0.05, decimales: 2 },
  L1: { simbolo: ["L", "1"], etiqueta: "Cadena libre hasta la mano", unidad: "m", paso: 0.05, decimales: 2 },
  F0: { simbolo: ["F", "0"], etiqueta: "Fuerza del operario", unidad: "N", min: 0, max: 600, paso: 5, decimales: 0 },
  t_on: { simbolo: ["t", "on"], etiqueta: "Empieza a jalar", unidad: "s", min: 0, max: 2, paso: 0.05, decimales: 2 },
  t_off: { simbolo: ["t", "off"], etiqueta: "Suelta la cadena", unidad: "s", max: 5, paso: 0.05, decimales: 2 },
  mu: { simbolo: ["μ"], etiqueta: "Fricción seca", unidad: "", min: 0, max: 0.3, paso: 0.01, decimales: 2 },
  b: { simbolo: ["b"], etiqueta: "Fricción viscosa", unidad: "N·s/m", min: 0, max: 20, paso: 0.5, decimales: 1 },
};

export const GRUPOS = [
  { id: "carga", nombre: "Carga", parametros: ["M", "m_b"] },
  { id: "polipasto", nombre: "Polipasto", parametros: ["n", "r_polea", "J_polea"] },
  { id: "cadena", nombre: "Cadena", parametros: ["m_r", "D0", "L1"] },
  { id: "operario", nombre: "Operario", parametros: ["F0", "t_on", "t_off"] },
  { id: "friccion", nombre: "Fricción", parametros: ["mu", "b"] },
];

const SEPARACION_T = 0.05;   // t_off - t_on minimo [s]

// Redondea al paso por dentro del intervalo (sin errores de coma flotante)
function alPaso(valor, min, paso, decimales) {
  return Number((min + Math.round((valor - min) / paso) * paso).toFixed(decimales));
}
const haciaArriba = (v, paso) => Math.ceil(v / paso - 1e-9) * paso;
const haciaAbajo = (v, paso) => Math.floor(v / paso + 1e-9) * paso;

// Rango [min, max] del parametro con los demas valores actuales
export function rangoParametro(nombre, p) {
  const def = DEFINICIONES[nombre];
  if (nombre === "L1") {
    const H_fijo = DIMENSIONES.H_movil0 + p.D0;
    return {
      min: Number(haciaArriba(H_fijo - alturaAgarreMaxima(), def.paso).toFixed(2)),
      max: Number(haciaAbajo(H_fijo - DIMENSIONES.mano_min, def.paso).toFixed(2)),
    };
  }
  if (nombre === "t_off") {
    return { min: Number((p.t_on + SEPARACION_T).toFixed(2)), max: def.max };
  }
  return { min: def.min, max: def.max };
}

// Valor acotado al rango y redondeado al paso del parametro
export function acotarValor(nombre, valor, p) {
  const def = DEFINICIONES[nombre];
  const { min, max } = rangoParametro(nombre, p);
  const acotado = Math.min(Math.max(valor, min), max);
  return alPaso(acotado, min, def.paso, def.decimales);
}

// Corrige los parametros que dependen de otros (L1 de D0, t_off de t_on)
export function ajustarDependientes(p) {
  const q = { ...p };
  q.L1 = acotarValor("L1", q.L1, q);
  q.t_off = acotarValor("t_off", q.t_off, q);
  return q;
}

// Texto con el formato fijo del parametro
export function formatearValor(nombre, valor) {
  return valor.toFixed(DEFINICIONES[nombre].decimales);
}

// Lee un campo numerico escrito por el usuario (acepta coma decimal); null si no es numero
export function leerCampo(texto) {
  const limpio = String(texto).trim().replace(",", ".");
  if (limpio === "" || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(limpio)) return null;
  return Number(limpio);
}
