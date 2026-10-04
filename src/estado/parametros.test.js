/* Pruebas de los parametros de la interfaz: rangos, sincronizacion slider-campo,
   dependencias y paso a "Personalizado". */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { Fisica } from "../fisica/fisica.js";
import { crearDisposicion } from "../geometria/disposicion.js";
import { posturaOperario, franjaAgarre, CARRERA } from "../geometria/operario.js";
import { PARAMETROS_DEFECTO, ESCENARIOS, parametrosDeEscenario } from "./escenarios.js";
import {
  DEFINICIONES, GRUPOS, rangoParametro, acotarValor, ajustarDependientes, formatearValor, leerCampo,
} from "./parametros.js";
import { usarGemelo, RETARDO_RECALCULO_MS, PASO_FLECHAS } from "./usarGemelo.js";

const estado = () => usarGemelo.getState();

describe("Rangos", () => {
  test("los grupos cubren todos los parametros editables una sola vez", () => {
    const nombres = GRUPOS.flatMap((g) => g.parametros);
    expect(new Set(nombres).size).toBe(nombres.length);
    expect(nombres.sort()).toEqual(Object.keys(DEFINICIONES).sort());
  });

  test("rangos pedidos", () => {
    const p = PARAMETROS_DEFECTO;
    expect(rangoParametro("M", p)).toEqual({ min: 10, max: 200 });
    expect(rangoParametro("m_b", p)).toEqual({ min: 2, max: 20 });
    expect(rangoParametro("n", p)).toEqual({ min: 2, max: 6 });
    expect(rangoParametro("r_polea", p)).toEqual({ min: 0.03, max: 0.1 });
    expect(rangoParametro("J_polea", p)).toEqual({ min: 0.0001, max: 0.002 });
    expect(rangoParametro("m_r", p)).toEqual({ min: 0.5, max: 5 });
    expect(rangoParametro("F0", p)).toEqual({ min: 0, max: 600 });
    expect(rangoParametro("t_on", p)).toEqual({ min: 0, max: 2 });
    expect(rangoParametro("mu", p)).toEqual({ min: 0, max: 0.3 });
    expect(rangoParametro("b", p)).toEqual({ min: 0, max: 20 });
  });

  test("los valores por defecto y todos los escenarios estan dentro de sus rangos", () => {
    for (const p of [PARAMETROS_DEFECTO, ...ESCENARIOS.map((e) => parametrosDeEscenario(e.id))]) {
      for (const nombre of Object.keys(DEFINICIONES)) {
        const { min, max } = rangoParametro(nombre, p);
        expect(p[nombre]).toBeGreaterThanOrEqual(min);
        expect(p[nombre]).toBeLessThanOrEqual(max);
      }
    }
  });

  test("t_off siempre mayor que t_on", () => {
    expect(rangoParametro("t_off", { t_on: 1.2 }).min).toBeGreaterThan(1.2);
    const q = ajustarDependientes({ ...PARAMETROS_DEFECTO, t_on: 1.8, t_off: 1.5 });
    expect(q.t_off).toBeGreaterThan(q.t_on);
  });

  test.each([1.5, 2, 2.5, 3])("con D0 = %f m, L1 deja la mano al alcance del operario", (D0) => {
    const { min, max } = rangoParametro("L1", { ...PARAMETROS_DEFECTO, D0 });
    expect(min).toBeLessThan(max);
    for (const L1 of [min, max]) {
      const p = { ...Fisica.PARAMETROS_BASE, D0, L1 };
      const disp = crearDisposicion(p);
      expect(disp.mano.y).toBeCloseTo(disp.H_fijo - L1, 9);   // sin recortes de la geometria
      // La mano que agarra alcanza la cadena en toda la carrera, con la inclinacion maxima
      for (let s = 0; s < 2 * CARRERA; s += 0.01) {
        const q = posturaOperario({
          t: 1, s, s_on: 0, s_off: 0, t_on: 0.5, t_off: 1.5, F0: 600, F_min: 100,
          H_mano: disp.mano.y, H_fijo: disp.H_fijo,
        });
        for (const l of Object.values(q.lados)) {
          if (l.agarra) expect(Math.hypot(...l.mano.map((v, i) => v - l.objetivo[i]))).toBeLessThan(1e-9);
        }
      }
      // La franja de agarre esta sobre la parte vertical del tramo libre
      const franja = franjaAgarre(disp.mano.y, disp.H_fijo);
      expect(franja.superior).toBeLessThan(disp.H_fijo);
    }
  });

  test("al cambiar D0, L1 se corrige para seguir dentro de su rango", () => {
    const q = ajustarDependientes({ ...PARAMETROS_DEFECTO, D0: 1.5, L1: 2.0 });
    const { min, max } = rangoParametro("L1", q);
    expect(q.L1).toBeGreaterThanOrEqual(min);
    expect(q.L1).toBeLessThanOrEqual(max);
  });
});

describe("Sincronizacion slider - campo", () => {
  const p = PARAMETROS_DEFECTO;

  test("el valor se acota al rango y se redondea al paso", () => {
    expect(acotarValor("M", 250, p)).toBe(200);
    expect(acotarValor("M", 3, p)).toBe(10);
    expect(acotarValor("M", 57.4, p)).toBe(57);
    expect(acotarValor("r_polea", 0.0512, p)).toBe(0.05);
    expect(acotarValor("J_polea", 0.00051, p)).toBe(0.0005);
    expect(acotarValor("n", 4.6, p)).toBe(5);
  });

  test("el campo acepta coma o punto y rechaza texto no numerico", () => {
    expect(leerCampo("2,5")).toBe(2.5);
    expect(leerCampo(" 0.05 ")).toBe(0.05);
    expect(leerCampo("1e-3")).toBe(0.001);
    expect(leerCampo("")).toBeNull();
    expect(leerCampo("abc")).toBeNull();
    expect(leerCampo("1.2.3")).toBeNull();
  });

  test("el texto del campo tiene formato fijo por parametro", () => {
    expect(formatearValor("J_polea", 0.0005)).toBe("0.0005");
    expect(formatearValor("D0", 2.5)).toBe("2.50");
    expect(formatearValor("M", 50)).toBe("50");
  });

  test("lo escrito en el campo y lo movido en el slider dan el mismo valor", () => {
    const desdeCampo = acotarValor("D0", leerCampo("2,47"), p);
    const desdeSlider = acotarValor("D0", 2.47, p);
    expect(desdeCampo).toBe(desdeSlider);
    expect(formatearValor("D0", desdeCampo)).toBe("2.45");
  });
});

describe("Estado: escenarios y Personalizado", () => {
  beforeEach(() => usarGemelo.setState(usarGemelo.getInitialState(), true));
  afterEach(() => vi.useRealTimers());

  test("al mover un parametro el escenario pasa a Personalizado y se recalcula", () => {
    vi.useFakeTimers();
    estado().setParametro("M", 80);
    expect(estado().escenario).toBeNull();
    expect(estado().parametros.M).toBe(80);
    vi.advanceTimersByTime(RETARDO_RECALCULO_MS);
    expect(estado().sim.p.M).toBe(80);
  });

  test("setParametro acota valores fuera de rango", () => {
    estado().setParametro("F0", 9999);
    expect(estado().parametros.F0).toBe(600);
  });

  test("al elegir un escenario los parametros (sliders) toman sus valores", () => {
    estado().aplicarEscenario("carga-pesada");
    expect(estado().escenario).toBe("carga-pesada");
    expect(estado().parametros.M).toBe(120);
    expect(estado().parametros.F0).toBe(400);
  });

  test("restablecer un parametro y restablecer todo", () => {
    estado().setParametro("mu", 0.25);
    estado().restablecerParametro("mu");
    expect(estado().parametros.mu).toBe(PARAMETROS_DEFECTO.mu);
    estado().setParametro("n", 6);
    estado().restablecerTodo();
    expect(estado().parametros).toEqual(PARAMETROS_DEFECTO);
    expect(estado().escenario).toBe("estandar");
  });

  test("las flechas avanzan 0.01 s solo en pausa", () => {
    estado().irA(1);
    estado().pasoManual(1);
    expect(estado().t).toBeCloseTo(1 + PASO_FLECHAS, 12);
    estado().pasoManual(-1);
    estado().pasoManual(-1);
    expect(estado().t).toBeCloseTo(1 - PASO_FLECHAS, 12);
    estado().play();
    const t = estado().t;
    estado().pasoManual(1);
    expect(estado().t).toBe(t);
  });
});
