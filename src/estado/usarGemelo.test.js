/* Pruebas del estado global: recalculo, reloj y escenarios. */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { usarGemelo, RETARDO_RECALCULO_MS } from "./usarGemelo.js";
import { ESCENARIOS } from "./escenarios.js";
import { Fisica } from "../fisica/fisica.js";

const estado = () => usarGemelo.getState();

beforeEach(() => {
  usarGemelo.setState(usarGemelo.getInitialState(), true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Recalculo al cambiar parametros", () => {
  test("cambiar n recalcula la simulacion tras el retardo", () => {
    vi.useFakeTimers();
    const M_eqAntes = estado().sim.d.M_eq;

    estado().setParametro("n", 6);
    expect(estado().parametros.n).toBe(6);
    expect(estado().sim.p.n).toBe(4);            // aun no recalcula

    vi.advanceTimersByTime(RETARDO_RECALCULO_MS);
    expect(estado().sim.p.n).toBe(6);
    expect(estado().sim.d.M_eq).not.toBeCloseTo(M_eqAntes, 6);
    expect(estado().sim.d.N_poleas_moviles).toBe(3);
  });

  test("recalcular conserva t y actualiza el indice", () => {
    estado().irA(1.0);
    estado().setParametro("M", 40);
    estado().recalcular();
    expect(estado().t).toBe(1.0);
    expect(estado().indice).toBe(1000);
  });
});

describe("irA(t)", () => {
  test("devuelve el indice de la muestra mas cercana", () => {
    expect(estado().irA(1.0)).toBe(1000);
    expect(estado().indice).toBe(Fisica.indice(estado().sim, 1.0));
    expect(estado().irA(2.4944)).toBe(2494);
  });

  test("acota t al intervalo [0, tf]", () => {
    expect(estado().irA(-1)).toBe(0);
    expect(estado().t).toBe(0);
    expect(estado().irA(99)).toBe(estado().sim.Nt - 1);
    expect(estado().t).toBe(estado().sim.p.tf);
  });
});

describe("Reloj de reproduccion", () => {
  test("avanza segun la velocidad", () => {
    estado().setVelocidad(0.5);
    estado().play();
    estado().avanzar(0.1);
    expect(estado().t).toBeCloseTo(0.05, 12);
  });

  test("no avanza en pausa", () => {
    estado().avanzar(0.1);
    expect(estado().t).toBe(0);
  });

  test("se detiene en tf sin bucle", () => {
    estado().irA(5.95);
    estado().play();
    estado().avanzar(0.1);
    expect(estado().t).toBe(6);
    expect(estado().reproduciendo).toBe(false);
  });

  test("vuelve a empezar con bucle", () => {
    estado().setBucle(true);
    estado().irA(5.95);
    estado().play();
    estado().avanzar(0.1);
    expect(estado().t).toBeCloseTo(0.05, 9);
    expect(estado().reproduciendo).toBe(true);
  });

  test("play al final reinicia desde 0", () => {
    estado().irA(6);
    estado().play();
    expect(estado().t).toBe(0);
  });
});

describe("Escenarios", () => {
  test.each(ESCENARIOS.map((e) => [e.nombre, e]))("%s genera una simulacion valida", (_, e) => {
    estado().aplicarEscenario(e.id);
    const { sim, escenario, t } = estado();

    expect(escenario).toBe(e.id);
    expect(t).toBe(0);
    for (const [nombre, valor] of Object.entries(e.cambios)) {
      expect(sim.p[nombre]).toBe(valor);
    }
    expect(sim.Nt).toBe(6001);
    for (const serie of Object.values(sim.r)) {
      expect(serie.every(Number.isFinite)).toBe(true);
    }
    expect(Math.min(...sim.r.y)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...sim.r.y)).toBeLessThanOrEqual(sim.d.y_tope);

    if (e.id === "fuerza-insuficiente") {
      expect(sim.p.F0).toBeLessThan(sim.d.F_min);
      expect(sim.eventos.despegue).toBeNull();
    } else {
      expect(sim.eventos.despegue).not.toBeNull();
      expect(sim.eventos.aterrizaje).not.toBeNull();
    }
  });

  test("cambiar un parametro marca el escenario como personalizado", () => {
    estado().setParametro("b", 5);
    expect(estado().escenario).toBeNull();
  });
});
