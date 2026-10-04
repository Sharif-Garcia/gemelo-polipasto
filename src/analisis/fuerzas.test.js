/* Pruebas del modo analisis: ecuacion evaluada, escala de flechas y T_j. */
import { describe, test, expect } from "vitest";
import { Fisica } from "../fisica/fisica.js";
import { ESCENARIOS, parametrosDeEscenario } from "../estado/escenarios.js";
import {
  evaluarEcuacion, fuerzasBloque, escalaFuerzas, tensionesRamales, rangoDiferenciaTension,
  colorDiferencia, LARGO_MAX_FLECHA,
} from "./fuerzas.js";

const sim = Fisica.simular();
const k = (t) => Fisica.indice(sim, t);

describe("Ecuacion de movimiento evaluada", () => {
  test.each(ESCENARIOS.map((e) => [e.nombre, e.id]))("%s: el lado izquierdo es igual al derecho en todo instante", (_, id) => {
    const s = Fisica.simular(parametrosDeEscenario(id));
    let peor = 0;
    for (let i = 0; i < s.Nt; i++) {
      const { izquierda, derecha } = evaluarEcuacion(s, i);
      peor = Math.max(peor, Math.abs(izquierda - derecha));
    }
    expect(peor).toBeLessThan(1e-9);
  });

  test("en el piso la reaccion N equilibra las fuerzas (ydd = 0)", () => {
    const e = evaluarEcuacion(sim, k(0.3));
    expect(e.izquierda).toBe(0);
    expect(e.terminos.find((t) => t.id === "N").valor).toBeCloseTo(539.55, 9);
  });

  test("durante el jalon: numeros del instante t = 1.0 s", () => {
    const e = evaluarEcuacion(sim, k(1.0));
    const v = Object.fromEntries(e.terminos.map((t) => [t.id, t.valor]));
    expect(v.traccion).toBe(800);
    expect(v.peso).toBeCloseTo(-539.55, 9);
    expect(v.N).toBe(0);
    expect(e.izquierda).toBeCloseTo(72.5 * 2.4548, 2);
    expect(e.enTope).toBe(false);
  });

  test("R_tope solo aparece cuando la carga esta en el tope superior", () => {
    const tope = Fisica.simular(parametrosDeEscenario("seis-ramales"));
    let conTope = 0;
    for (let i = 0; i < tope.Nt; i++) if (evaluarEcuacion(tope, i).terminos.some((t) => t.id === "tope")) conTope++;
    expect(conTope).toBeGreaterThan(0);
    for (let i = 0; i < sim.Nt; i++) expect(evaluarEcuacion(sim, i).enTope).toBe(false);
  });
});

describe("Fuerzas sobre el bloque y escala de las flechas", () => {
  const escala = escalaFuerzas(sim);

  test("la fuerza mayor de la simulacion mide el largo maximo", () => {
    expect(escala.fMax).toBe(800);   // n*F0
    expect(escala.fMax * escala.escala).toBeCloseTo(LARGO_MAX_FLECHA, 12);
  });

  test("todas las flechas usan la misma escala y nunca superan el largo maximo", () => {
    for (let i = 0; i < sim.Nt; i += 7) {
      for (const f of fuerzasBloque(sim, i)) expect(f.valor * escala.escala).toBeLessThanOrEqual(LARGO_MAX_FLECHA + 1e-12);
    }
    const [traccion, peso] = fuerzasBloque(sim, k(1.0));
    expect(traccion.valor * escala.escala / (peso.valor * escala.escala)).toBeCloseTo(800 / 539.55, 12);
  });

  test("la barra de referencia es un numero redondo", () => {
    expect([50, 100, 200, 250, 500]).toContain(escala.referencia);
    expect(escala.largoReferencia).toBeCloseTo(escala.referencia * escala.escala, 12);
  });

  test("sentidos: n*T arriba, peso abajo, fricciones opuestas a ydot, N solo en el piso", () => {
    const subiendo = Object.fromEntries(fuerzasBloque(sim, k(1.0)).map((f) => [f.id, f]));
    expect(subiendo.traccion.sentido).toBe(1);
    expect(subiendo.peso.sentido).toBe(-1);
    expect(subiendo.seca.sentido).toBe(-1);
    expect(subiendo.viscosa.sentido).toBe(-1);
    expect(subiendo.N.visible).toBe(false);
    const bajando = Object.fromEntries(fuerzasBloque(sim, k(2.0)).map((f) => [f.id, f]));
    expect(bajando.viscosa.sentido).toBe(1);   // ydot < 0: la friccion viscosa empuja hacia arriba
    expect(bajando.seca.visible).toBe(false);  // u = 0: sin friccion seca
    const piso = Object.fromEntries(fuerzasBloque(sim, k(0.3)).map((f) => [f.id, f]));
    expect(piso.N.visible).toBe(true);
    expect(piso.traccion.visible).toBe(false);
  });
});

describe("Tension de cada ramal T_j", () => {
  test("valores a t = 1.0 s (formula de CLAUDE.md)", () => {
    const ydd = sim.r.ydd[k(1.0)];
    const T = tensionesRamales(sim, k(1.0));
    const esperado = [10, 9, 7, 4].map((suma) => 200 - 0.2 * ydd * suma - 0.125 * 2 * 4 * ydd);
    T.forEach((v, j) => expect(v).toBeCloseTo(esperado[j], 12));
  });

  test("al acelerar hacia arriba T_1 < ... < T_n; al soltar se invierte", () => {
    const sube = tensionesRamales(sim, k(1.0));
    for (let j = 1; j < sube.length; j++) expect(sube[j]).toBeGreaterThan(sube[j - 1]);
    const cae = tensionesRamales(sim, k(2.0));   // u = 0, ydd < 0
    for (let j = 1; j < cae.length; j++) expect(cae[j]).toBeLessThan(cae[j - 1]);
    expect(Math.min(...cae)).toBeGreaterThan(0);
  });

  test("sin inercia de poleas ni masa de cadena todas valen u", () => {
    const ideal = Fisica.simular({ J_polea: 0, m_r: 0 });
    for (const t of [0.3, 1.0, 2.0]) {
      const i = Fisica.indice(ideal, t);
      for (const T of tensionesRamales(ideal, i)) expect(T).toBeCloseTo(ideal.r.u[i], 12);
    }
  });

  test("barra de colores: rango simetrico y colores en los extremos", () => {
    const rango = rangoDiferenciaTension(sim);
    expect(rango).toBeGreaterThan(5);
    expect(colorDiferencia(-rango, rango).map((c) => Math.round(c * 255))).toEqual([0x2a, 0x78, 0xd6]);
    expect(colorDiferencia(0, rango).map((c) => Math.round(c * 255))).toEqual([0xa9, 0xa8, 0xa3]);
    expect(colorDiferencia(2 * rango, rango).map((c) => Math.round(c * 255))).toEqual([0xe3, 0x49, 0x48]);
    // Raiz cuadrada: un cuarto del rango ya esta a mitad de camino hacia el extremo
    const cuarto = colorDiferencia(rango / 4, rango).map((c) => Math.round(c * 255));
    expect(cuarto).toEqual([0xa9, 0xa8, 0xa3].map((g, i) => Math.round(g + ([0xe3, 0x49, 0x48][i] - g) * 0.5)));
  });
});
