/* Pruebas de las metricas de validacion: datos sinteticos (incluido el desfase
   de un paso en el aterrizaje) y el CSV real de Simulink. */
import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { Fisica } from "../fisica/fisica.js";
import { leerCSV, alinearConGemelo } from "./csv.js";
import { eventosSerie, erroresSerie, validar, discontinuidades, VENTANA } from "./validacion.js";

const dt = 0.001;
const t = Float64Array.from({ length: 1001 }, (_, i) => i * dt);
const p = { t_on: 0.1, t_off: 0.3 };

// Vuelo parabolico que toca el piso con velocidad (cruza y = 0 en t = 0.6008 s).
// 'corte' es el primer instante en el piso: el gemelo corta en 0.600 y Simulink,
// un paso despues, en 0.601 (conserva la muestra de 0.600 con y = 2 mm).
const vueloLibre = (v) => 5 * (v - p.t_on) * (0.6008 - v);
function vuelo(corte, desfase = 0, retraso = 0) {
  return t.map((v) => (v > p.t_on && v < corte - 1e-9 ? Math.max(0, vueloLibre(v - retraso)) + desfase : 0));
}

describe("Datos sinteticos", () => {
  test("eventos de una trayectoria", () => {
    const e = eventosSerie(t, vuelo(0.6), p.t_off);
    expect(e.despegue).toBeCloseTo(0.101, 12);
    expect(e.aterrizaje).toBeCloseTo(0.6, 12);
    expect(e.t_ymax).toBeCloseTo(0.35, 12);
  });

  test("RMS y maximo de una diferencia conocida", () => {
    const a = Float64Array.from(t, () => 1);
    const b = Float64Array.from(t, (_, i) => (i % 2 === 0 ? 1.002 : 0.998));
    const e = erroresSerie(t, a, b, []);
    expect(e.rms).toBeCloseTo(0.002, 12);
    expect(e.max).toBeCloseTo(0.002, 12);
  });

  test("aterrizar un paso despues no aparece como un error grande", () => {
    const gemelo = vuelo(0.6);
    const simulink = vuelo(0.601);   // Simulink aterriza 1 ms despues
    const eG = eventosSerie(t, gemelo, p.t_off), eS = eventosSerie(t, simulink, p.t_off);
    const saltos = discontinuidades(p, eG, eS);
    const e = erroresSerie(t, gemelo, simulink, saltos);
    // La unica diferencia es la muestra de 0.600 s (2 mm), dentro de la ventana del aterrizaje
    expect(e.maxTotal).toBeCloseTo(0.002, 9);
    expect(e.max).toBe(0);
    expect(eS.aterrizaje - eG.aterrizaje).toBeCloseTo(0.001, 12);
  });

  test("la ventana excluida es de ±5 ms alrededor de cada salto", () => {
    const a = new Float64Array(t.length);
    const b = Float64Array.from(t, (v) => (Math.abs(v - 0.5) <= VENTANA ? 1 : 0));
    expect(erroresSerie(t, a, b, [0.5]).max).toBe(0);
    expect(erroresSerie(t, a, b, [0.5]).maxTotal).toBe(1);
    expect(erroresSerie(t, a, b, [0.49]).max).toBe(1);
  });

  test("validar: verde con el desfase de un paso, ambar con un error real", () => {
    const sim = { p: { ...p }, r: { t, y: vuelo(0.6), ydot: new Float64Array(t.length), ydd: new Float64Array(t.length) } };
    const cols = (y) => ({ y, ydot: new Float64Array(t.length), ydd: new Float64Array(t.length) });
    expect(validar(sim, cols(vuelo(0.601))).validado).toBe(true);

    const malo = validar(sim, cols(vuelo(0.6, 0.002)));     // 2 mm de error en todo el vuelo
    expect(malo.validado).toBe(false);
    expect(malo.motivos[0]).toMatch(/error máximo de y/);

    const tarde = validar(sim, cols(vuelo(0.606, 0, 0.005))); // todo el vuelo 5 ms despues
    expect(tarde.validado).toBe(false);
    expect(tarde.motivos.some((m) => /^Aterrizaje: difiere \d+\.\d ms/.test(m))).toBe(true);

    expect(validar(sim, cols(vuelo(0.601)), false).motivos[0]).toMatch(/parámetros/);
  });
});

describe("CSV real de Simulink contra el gemelo (parametros por defecto)", () => {
  const sim = Fisica.simular();
  const leido = leerCSV(readFileSync(new URL("../../public/datos/datos_mecanismo.csv", import.meta.url), "utf8"));
  const { columnas } = alinearConGemelo(leido.columnas, sim.r.t);
  const v = validar(sim, columnas);

  test("queda validado: error de y menor a 1 mm y eventos a menos de 2 ms", () => {
    expect(v.validado).toBe(true);
    expect(v.errores.y.max).toBeLessThan(0.001);
    for (const e of v.eventos.filter((x) => x.esTiempo)) expect(Math.abs(e.diferencia)).toBeLessThan(0.002);
  });

  test("errores del orden esperado", () => {
    expect(v.errores.y.rms).toBeLessThan(0.0005);
    expect(v.errores.ydot.max).toBeLessThan(0.001);
    expect(v.errores.ydd.max).toBeLessThan(0.01);
  });
});
