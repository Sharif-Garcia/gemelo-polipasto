/* Pruebas del CSV de Simulink: lectura del archivo real, errores, interpolacion
   y formato del CSV exportado. */
import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { Fisica } from "../fisica/fisica.js";
import { leerCSV, interpolar, alinearConGemelo, escribirCSV, numeroMatlab, ENCABEZADO, COLUMNAS } from "./csv.js";

const RUTA = new URL("../../public/datos/datos_mecanismo.csv", import.meta.url);
const textoReal = readFileSync(RUTA, "utf8");
const sim = Fisica.simular();

describe("Lectura del CSV real de Simulink", () => {
  const leido = leerCSV(textoReal);

  test("se lee completo, con todas las columnas y sin avisos", () => {
    expect(leido.ok).toBe(true);
    expect(leido.filas).toBe(6001);
    expect(Object.keys(leido.columnas).sort()).toEqual(COLUMNAS.map((c) => c.clave).sort());
    expect(leido.avisos).toEqual([]);
    expect(leido.columnas.t[1] - leido.columnas.t[0]).toBeCloseTo(0.001, 12);
    expect(leido.columnas.N[0]).toBe(539.55);
  });

  test("tiene la misma malla de tiempo que el gemelo: no se interpola", () => {
    const alineado = alinearConGemelo(leido.columnas, sim.r.t);
    expect(alineado.interpolado).toBe(false);
    expect(alineado.columnas.y[1829]).toBe(leido.columnas.y[1829]);
  });
});

describe("Errores claros", () => {
  test("archivo vacio o sin datos", () => {
    expect(leerCSV("").errores[0]).toMatch(/vacío/);
    expect(leerCSV(`${ENCABEZADO}\n0,0,0,0,0,0,0,0,0,0`).errores[0]).toMatch(/menos de dos filas/);
  });

  test("faltan columnas obligatorias", () => {
    const r = leerCSV("t [s],u [N]\n0,0\n0.001,0\n0.002,0");
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toMatch(/y \[m\].*ydot \[m\/s\].*ydd \[m\/s\^2\]/);
  });

  test("valor no numerico con su fila y columna", () => {
    const r = leerCSV(`${ENCABEZADO}\n0,0,0,0,0,0,0,0,0,0\n0.001,0,0,abc,0,0,0,0,0,0\n0.002,0,0,0,0,0,0,0,0,0`);
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toBe('Fila 3, columna "y [m]": valor no numérico ("abc").');
  });

  test("tiempo no creciente", () => {
    const r = leerCSV(`${ENCABEZADO}\n0,0,0,0,0,0,0,0,0,0\n0.002,0,0,0,0,0,0,0,0,0\n0.001,0,0,0,0,0,0,0,0,0`);
    expect(r.errores[0]).toMatch(/creciente/);
  });

  test("columnas en otro orden, mayusculas y punto y coma con coma decimal", () => {
    const r = leerCSV("Y [M];T [S];YDD [M/S^2];ydot [m/s]\n0,5;0;1;2\n0,6;0,001;1;2\n0,7;0,002;1;2");
    expect(r.ok).toBe(true);
    expect(Array.from(r.columnas.y)).toEqual([0.5, 0.6, 0.7]);
    expect(r.avisos[0]).toMatch(/Columnas ausentes/);
  });
});

describe("Interpolacion", () => {
  test("un CSV con paso de 2 ms se interpola en la malla de 1 ms del gemelo", () => {
    const t = Float64Array.from({ length: 3001 }, (_, i) => i * 0.002);
    const y = t.map((v) => 3 * v - 1);
    const alineado = alinearConGemelo({ t, y }, sim.r.t);
    expect(alineado.interpolado).toBe(true);
    expect(alineado.dt).toBeCloseTo(0.002, 9);
    for (const k of [0, 1, 1001, 3333, 6000]) expect(alineado.columnas.y[k]).toBeCloseTo(3 * sim.r.t[k] - 1, 9);
  });

  test("fuera del rango del CSV no hay dato (NaN)", () => {
    const r = interpolar(Float64Array.from([1, 2]), Float64Array.from([10, 20]), Float64Array.from([0.5, 1.5, 2.5]));
    expect(Number.isNaN(r[0])).toBe(true);
    expect(r[1]).toBe(15);
    expect(Number.isNaN(r[2])).toBe(true);
  });
});

describe("CSV exportado con el formato de Simulink", () => {
  const exportado = escribirCSV(sim).split("\n");
  const real = textoReal.trim().split(/\r?\n/);

  test("mismo encabezado y mismo numero de filas", () => {
    expect(exportado[0]).toBe(real[0]);
    expect(exportado).toHaveLength(real.length);
  });

  test("numeros con %.15g de MATLAB: cada celda del CSV real se reescribe igual", () => {
    let distintas = 0;
    for (const linea of real.slice(1)) {
      for (const celda of linea.split(",")) if (numeroMatlab(Number(celda)) !== celda) distintas++;
    }
    expect(distintas).toBe(0);
    expect(numeroMatlab(1.73257460612184e-6)).toBe("1.73257460612184e-06");
    expect(numeroMatlab(0.009000000000000001)).toBe("0.009");
  });

  test("la columna t y las filas en reposo coinciden caracter a caracter", () => {
    for (let k = 1; k < real.length; k++) expect(exportado[k].split(",")[0]).toBe(real[k].split(",")[0]);
    expect(exportado[1]).toBe(real[1]);
    expect(exportado[6001]).toBe(real[6001]);
  });

  test("el CSV exportado se vuelve a leer igual", () => {
    const r = leerCSV(exportado.join("\n"));
    expect(r.ok).toBe(true);
    expect(r.columnas.y[1829]).toBeCloseTo(sim.r.y[1829], 12);
  });
});
