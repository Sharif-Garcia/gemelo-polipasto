/* =========================================================================
   csv.js
   Lectura y escritura del CSV de Simulink (datos_mecanismo.csv).
   Encabezados con unidades:
     t [s],u [N],T [N],y [m],ydot [m/s],ydd [m/s^2],s [m],sdot [m/s],sdd [m/s^2],N [N]
   Funciones puras (sin DOM).
   ========================================================================= */

export const COLUMNAS = [
  { clave: "t", encabezado: "t [s]" },
  { clave: "u", encabezado: "u [N]" },
  { clave: "T", encabezado: "T [N]" },
  { clave: "y", encabezado: "y [m]" },
  { clave: "ydot", encabezado: "ydot [m/s]" },
  { clave: "ydd", encabezado: "ydd [m/s^2]" },
  { clave: "s", encabezado: "s [m]" },
  { clave: "sdot", encabezado: "sdot [m/s]" },
  { clave: "sdd", encabezado: "sdd [m/s^2]" },
  { clave: "N", encabezado: "N [N]" },
];
export const ENCABEZADO = COLUMNAS.map((c) => c.encabezado).join(",");

// Columnas sin las que no se puede validar
const OBLIGATORIAS = ["t", "y", "ydot", "ydd"];

// "ydd [m/s^2]", " YDD [M/S^2] " -> "ydd [m/s^2]"
const normalizar = (texto) => texto.trim().replace(/^\uFEFF/, "").replace(/\s+/g, " ").toLowerCase();

/* Lee el texto del CSV. Devuelve
   { ok: true, columnas: { t: Float64Array, ... }, filas, avisos } o
   { ok: false, errores: [mensajes] } */
export function leerCSV(texto) {
  const lineas = String(texto).replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return { ok: false, errores: ["El archivo está vacío."] };
  if (lineas.length < 3) return { ok: false, errores: ["El archivo tiene menos de dos filas de datos."] };

  const separador = lineas[0].includes(";") && !lineas[0].includes(",") ? ";" : ",";
  const encabezados = lineas[0].split(separador).map(normalizar);
  const indices = {};
  for (const c of COLUMNAS) {
    const i = encabezados.indexOf(normalizar(c.encabezado));
    if (i >= 0) indices[c.clave] = i;
  }

  const faltan = OBLIGATORIAS.filter((c) => indices[c] === undefined);
  if (faltan.length > 0) {
    const nombres = faltan.map((c) => `"${COLUMNAS.find((x) => x.clave === c).encabezado}"`).join(", ");
    return {
      ok: false,
      errores: [
        `Faltan columnas obligatorias: ${nombres}.`,
        `Se esperaba el encabezado de Simulink: ${ENCABEZADO}`,
      ],
    };
  }
  const avisos = [];
  const opcionales = COLUMNAS.filter((c) => indices[c.clave] === undefined).map((c) => c.encabezado);
  if (opcionales.length > 0) avisos.push(`Columnas ausentes (no se superponen): ${opcionales.join(", ")}.`);

  const filas = lineas.length - 1;
  const columnas = {};
  for (const clave of Object.keys(indices)) columnas[clave] = new Float64Array(filas);
  const errores = [];
  for (let f = 0; f < filas && errores.length < 5; f++) {
    const celdas = lineas[f + 1].split(separador);
    for (const [clave, i] of Object.entries(indices)) {
      const celda = (celdas[i] ?? "").trim();
      const valor = celda === "" ? NaN : Number(separador === ";" ? celda.replace(",", ".") : celda);
      if (!Number.isFinite(valor)) {
        errores.push(`Fila ${f + 2}, columna "${COLUMNAS.find((c) => c.clave === clave).encabezado}": valor no numérico ("${celda}").`);
        break;
      }
      columnas[clave][f] = valor;
    }
  }
  if (errores.length > 0) return { ok: false, errores };

  for (let f = 1; f < filas; f++) {
    if (!(columnas.t[f] > columnas.t[f - 1])) {
      return { ok: false, errores: [`El tiempo debe ser creciente: fila ${f + 2} (t = ${columnas.t[f]} s).`] };
    }
  }
  return { ok: true, columnas, filas, avisos };
}

// Interpola linealmente (tOrigen, valores) en los instantes tDestino; NaN fuera del rango
export function interpolar(tOrigen, valores, tDestino) {
  const salida = new Float64Array(tDestino.length);
  let j = 0;
  const n = tOrigen.length;
  for (let i = 0; i < tDestino.length; i++) {
    const t = tDestino[i];
    if (t < tOrigen[0] - 1e-12 || t > tOrigen[n - 1] + 1e-12) { salida[i] = NaN; continue; }
    while (j < n - 2 && tOrigen[j + 1] < t) j++;
    const t0 = tOrigen[j], t1 = tOrigen[j + 1];
    const f = t1 > t0 ? Math.min(Math.max((t - t0) / (t1 - t0), 0), 1) : 0;
    salida[i] = valores[j] + (valores[j + 1] - valores[j]) * f;
  }
  return salida;
}

/* Lleva las columnas del CSV a la malla de tiempo del gemelo. Si los tiempos
   coinciden (mismo paso), copia sin interpolar. */
export function alinearConGemelo(columnas, tGemelo) {
  const t = columnas.t;
  const mismaMalla = t.length === tGemelo.length && t.every((v, i) => Math.abs(v - tGemelo[i]) < 1e-9);
  const alineadas = {};
  for (const [clave, valores] of Object.entries(columnas)) {
    if (clave === "t") continue;
    alineadas[clave] = mismaMalla ? Float64Array.from(valores) : interpolar(t, valores, tGemelo);
  }
  const pasos = [];
  for (let i = 1; i < Math.min(t.length, 50); i++) pasos.push(t[i] - t[i - 1]);
  return {
    columnas: alineadas,
    interpolado: !mismaMalla,
    dt: pasos.reduce((a, b) => a + b, 0) / pasos.length,
    tMin: t[0],
    tMax: t[t.length - 1],
  };
}

/* ---------- Escritura ---------- */

// Numero como lo escribe MATLAB con %.15g: 15 cifras significativas sin ceros
// sobrantes; notacion exponencial (exponente de dos digitos) si el exponente es
// menor que -4 o mayor que 14.
export function numeroMatlab(v) {
  if (v === 0 || Object.is(v, -0)) return "0";
  const [mantisa, exp] = v.toExponential(14).split("e");
  const e = Number(exp);
  if (e < -4 || e >= 15) {
    const m = mantisa.replace(/\.?0+$/, "");
    const signo = e < 0 ? "-" : "+";
    return `${m}e${signo}${String(Math.abs(e)).padStart(2, "0")}`;
  }
  const fijo = v.toFixed(Math.max(0, 14 - e));
  return fijo.includes(".") ? fijo.replace(/\.?0+$/, "") : fijo;
}

// CSV del gemelo con el formato exacto de Simulink (mismas columnas que Fisica.aCSV)
export function escribirCSV(sim) {
  const r = sim.r;
  const filas = [ENCABEZADO];
  for (let k = 0; k < sim.Nt; k++) {
    filas.push(COLUMNAS.map((c) => numeroMatlab(r[c.clave][k])).join(","));
  }
  return filas.join("\n");
}
