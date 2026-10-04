/* Pruebas de la logica de las graficas (sin DOM). */
import { describe, test, expect } from "vitest";
import { Fisica } from "../fisica/fisica.js";
import { parametrosDeEscenario } from "../estado/escenarios.js";
import {
  VARIABLES, PESTANAS, buscarPestana, datosGrafica, etiquetaEje, marcasEventos,
  tiempoEIndice, acotarRango, zoomRueda, RANGO_MIN, filasEtiquetas,
} from "./series.js";

const sim = Fisica.simular();

describe("Pestañas y series", () => {
  test("estan todas las pestañas pedidas", () => {
    expect(PESTANAS.map((p) => p.id)).toEqual(["y", "ydot", "ydd", "fuerza", "s", "N", "todas"]);
  });

  test("cada variable de cada pestaña existe en la simulacion y tiene un color propio", () => {
    const colores = Object.values(VARIABLES).map((v) => v.color);
    expect(new Set(colores).size).toBe(colores.length);
    for (const p of PESTANAS) {
      for (const claves of p.graficas) {
        for (const c of claves) {
          expect(VARIABLES[c]).toBeDefined();
          expect(sim.r[c]).toBeDefined();
        }
        // Una sola unidad por grafica (un solo eje y)
        expect(new Set(claves.map((c) => VARIABLES[c].unidad)).size).toBe(1);
      }
    }
  });

  test("'Todas' apila y, ydot, ydd y u", () => {
    expect(buscarPestana("todas").graficas).toEqual([["y"], ["ydot"], ["ydd"], ["u"]]);
  });

  test("los datos usan el tiempo comun y los arreglos de la simulacion", () => {
    const datos = datosGrafica(sim, ["u", "T"]);
    expect(datos).toHaveLength(3);
    expect(datos[0]).toBe(sim.r.t);
    expect(datos[1]).toBe(sim.r.u);
    expect(datos[2]).toBe(sim.r.T);
    for (const serie of datos) expect(serie).toHaveLength(sim.Nt);
  });

  test("con datos de Simulink se agregan despues de las del gemelo", () => {
    const simulink = { columnas: { u: new Float64Array(sim.Nt), T: new Float64Array(sim.Nt) } };
    const datos = datosGrafica(sim, ["u", "T"], simulink);
    expect(datos).toHaveLength(5);
    expect(datos[3]).toBe(simulink.columnas.u);
    expect(datos[4]).toBe(simulink.columnas.T);
    // Si falta una variable en el CSV no se superpone nada en esa grafica
    expect(datosGrafica(sim, ["N"], simulink)).toHaveLength(2);
  });

  test("la etiqueta del eje lleva simbolos y unidad", () => {
    expect(etiquetaEje(["u", "T"])).toBe("u, T [N]");
    expect(etiquetaEje(["ydd"])).toBe("ÿ [m/s²]");
  });
});

describe("Marcas de eventos", () => {
  test("parametros por defecto: despegue, y max, t_off y aterrizaje", () => {
    const marcas = marcasEventos(sim);
    expect(marcas.map((m) => m.etiqueta)).toEqual(["despegue", "t_off", "y máx", "aterrizaje"]);
    const t = Object.fromEntries(marcas.map((m) => [m.etiqueta, m.t]));
    expect(t.despegue).toBeCloseTo(0.501, 3);
    expect(t["y máx"]).toBeCloseTo(1.829, 3);
    expect(t.t_off).toBe(1.5);
    expect(t.aterrizaje).toBeCloseTo(2.495, 3);
  });

  test("si la carga no despega solo se marca t_off", () => {
    const insuficiente = Fisica.simular(parametrosDeEscenario("fuerza-insuficiente"));
    expect(marcasEventos(insuficiente).map((m) => m.etiqueta)).toEqual(["t_off"]);
  });
});

describe("Etiquetas de las marcas", () => {
  test("dos etiquetas cercanas alternan de fila y las lejanas comparten la primera", () => {
    // despegue lejos; t_off y y max casi juntas; aterrizaje lejos
    const filas = filasEtiquetas(
      [{ x: 100, ancho: 50 }, { x: 300, ancho: 26 }, { x: 315, ancho: 30 }, { x: 500, ancho: 55 }], 6);
    expect(filas).toEqual([0, 0, 1, 0]);
  });

  test("tres etiquetas encimadas usan tres filas", () => {
    expect(filasEtiquetas([{ x: 0, ancho: 40 }, { x: 10, ancho: 40 }, { x: 20, ancho: 40 }], 6)).toEqual([0, 1, 2]);
  });
});

describe("Tiempo e indice", () => {
  test("convierte t al indice de la muestra mas cercana", () => {
    expect(tiempoEIndice(sim, 1.0)).toEqual({ t: 1.0, indice: 1000 });
    expect(tiempoEIndice(sim, 2.4944).indice).toBe(2494);
  });

  test("acota t a [0, tf]", () => {
    expect(tiempoEIndice(sim, -3)).toEqual({ t: 0, indice: 0 });
    expect(tiempoEIndice(sim, 10)).toEqual({ t: 6, indice: sim.Nt - 1 });
  });
});

describe("Zoom del tiempo", () => {
  test("la rueda acerca alrededor del puntero", () => {
    const r = zoomRueda({ min: 0, max: 6 }, 3, 0.5, 6);
    expect(r).toEqual({ min: 1.5, max: 4.5 });
  });

  test("el rango no sale de [0, tf] y conserva su ancho", () => {
    expect(acotarRango(-1, 1, 6)).toEqual({ min: 0, max: 2 });
    expect(acotarRango(5, 7, 6)).toEqual({ min: 4, max: 6 });
    expect(zoomRueda({ min: 0, max: 6 }, 0, 3, 6)).toEqual({ min: 0, max: 6 });
  });

  test("ancho minimo y seleccion invertida", () => {
    const r = acotarRango(2, 2.001, 6);
    expect(r.max - r.min).toBeCloseTo(RANGO_MIN, 12);
    expect(acotarRango(3, 1, 6)).toEqual({ min: 1, max: 3 });
  });
});
