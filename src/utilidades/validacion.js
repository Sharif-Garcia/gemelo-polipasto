/* =========================================================================
   validacion.js
   Comparacion del gemelo con los datos de Simulink (funciones puras).
   - Error RMS sobre todas las muestras.
   - Error maximo excluyendo una ventana de ±5 ms alrededor de cada
     discontinuidad (t_on, t_off, despegues y aterrizajes): un desfase de un
     paso en un salto no debe parecer un error grande.
   - Tabla de eventos (despegue, y maxima y su tiempo, aterrizaje).
   ========================================================================= */

export const VENTANA = 0.005;          // media ventana alrededor de cada salto [s]
export const TOLERANCIA_Y = 0.001;     // error maximo admisible de y [m]
export const TOLERANCIA_EVENTO = 0.002; // diferencia admisible en los tiempos de evento [s]

// Eventos de una trayectoria y(t), con el mismo criterio para el gemelo y Simulink
export function eventosSerie(t, y, t_off) {
  let iDesp = -1, iAter = -1, iMax = 0;
  for (let k = 0; k < t.length; k++) {
    if (!Number.isFinite(y[k])) continue;
    if (iDesp < 0 && y[k] > 0) iDesp = k;
    if (iDesp >= 0 && iAter < 0 && t[k] > t_off && y[k] <= 0) iAter = k;
    if (y[k] > y[iMax] || !Number.isFinite(y[iMax])) iMax = k;
  }
  return {
    despegue: iDesp >= 0 ? t[iDesp] : null,
    y_max: y[iMax],
    t_ymax: t[iMax],
    aterrizaje: iAter >= 0 ? t[iAter] : null,
  };
}

// Instantes de discontinuidad del modelo para ambas trayectorias
export function discontinuidades(p, eventosGemelo, eventosSimulink) {
  const tiempos = [p.t_on, p.t_off];
  for (const e of [eventosGemelo, eventosSimulink]) {
    if (e.despegue !== null) tiempos.push(e.despegue);
    if (e.aterrizaje !== null) tiempos.push(e.aterrizaje);
  }
  return [...new Set(tiempos)].sort((a, b) => a - b);
}

/* Errores de una serie: rms (todas las muestras), max fuera de las ventanas y
   maxTotal (incluidas las ventanas). Ignora las muestras sin dato de Simulink. */
export function erroresSerie(t, gemelo, simulink, saltos, ventana = VENTANA) {
  let suma = 0, n = 0, max = 0, tMax = null, maxTotal = 0;
  for (let k = 0; k < t.length; k++) {
    if (!Number.isFinite(simulink[k])) continue;
    const e = Math.abs(gemelo[k] - simulink[k]);
    suma += e * e;
    n++;
    if (e > maxTotal) maxTotal = e;
    if (saltos.some((ts) => Math.abs(t[k] - ts) <= ventana + 1e-9)) continue;
    if (e > max) { max = e; tMax = t[k]; }
  }
  return { rms: n > 0 ? Math.sqrt(suma / n) : NaN, max, tMax, maxTotal, muestras: n };
}

const diferencia = (a, b) => (a === null || b === null ? null : a - b);

/* Validacion completa. sim: simulacion del gemelo; columnas: datos de Simulink
   alineados con sim.r.t; parametrosIguales: si el gemelo usa los parametros con
   los que se genero el CSV. */
export function validar(sim, columnas, parametrosIguales = true) {
  const { t } = sim.r;
  const eG = eventosSerie(t, sim.r.y, sim.p.t_off);
  const eS = eventosSerie(t, columnas.y, sim.p.t_off);
  const saltos = discontinuidades(sim.p, eG, eS);
  const errores = {};
  for (const clave of ["y", "ydot", "ydd"]) errores[clave] = erroresSerie(t, sim.r[clave], columnas[clave], saltos);

  const eventos = [
    { nombre: "Despegue", unidad: "s", gemelo: eG.despegue, simulink: eS.despegue, esTiempo: true },
    { nombre: "y máxima", unidad: "m", gemelo: eG.y_max, simulink: eS.y_max, esTiempo: false },
    { nombre: "t de y máxima", unidad: "s", gemelo: eG.t_ymax, simulink: eS.t_ymax, esTiempo: true },
    { nombre: "Aterrizaje", unidad: "s", gemelo: eG.aterrizaje, simulink: eS.aterrizaje, esTiempo: true },
  ].map((e) => ({ ...e, diferencia: diferencia(e.gemelo, e.simulink) }));

  const motivos = [];
  if (!parametrosIguales) motivos.push("Los parámetros actuales no son los usados para generar el CSV.");
  if (!(errores.y.max < TOLERANCIA_Y)) {
    motivos.push(`El error máximo de y es ${(errores.y.max * 1000).toFixed(3)} mm (debe ser menor a 1 mm).`);
  }
  for (const e of eventos.filter((x) => x.esTiempo)) {
    const unoNulo = (e.gemelo === null) !== (e.simulink === null);
    if (unoNulo) motivos.push(`${e.nombre}: ocurre en una simulación y no en la otra.`);
    else if (e.diferencia !== null && !(Math.abs(e.diferencia) < TOLERANCIA_EVENTO)) {
      motivos.push(`${e.nombre}: difiere ${(Math.abs(e.diferencia) * 1000).toFixed(1)} ms (debe ser menor a 2 ms).`);
    }
  }
  return { validado: motivos.length === 0, motivos, errores, eventos, saltos };
}
