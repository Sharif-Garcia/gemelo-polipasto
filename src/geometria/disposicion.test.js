/* Pruebas de la disposicion geometrica del polipasto para n = 2..6. */
import { describe, test, expect } from "vitest";
import { Fisica } from "../fisica/fisica.js";
import {
  crearDisposicion, estadoCadena, puntoCadena, anguloPolea, DIMENSIONES,
} from "./disposicion.js";

const VALORES_N = [2, 3, 4, 5, 6];

function disposicionPara(n, cambios = {}) {
  const p = { ...Fisica.PARAMETROS_BASE, n, ...cambios };
  return { p, d: Fisica.derivados(p), disp: crearDisposicion(p) };
}

describe.each(VALORES_N)("n = %i", (n) => {
  const { p, d, disp } = disposicionPara(n);
  const ys = [0, 0.3, 1.0, 1.6388, d.y_tope];

  test("ceil(n/2) poleas fijas y floor(n/2) moviles", () => {
    const fijas = disp.poleas.filter((q) => q.bloque === "fijo").length;
    const moviles = disp.poleas.filter((q) => q.bloque === "movil").length;
    expect(fijas).toBe(Math.ceil(n / 2));
    expect(moviles).toBe(Math.floor(n / 2));
    expect(moviles).toBe(d.N_poleas_moviles);
  });

  test("amarre en el bloque fijo si n es par y en el movil si es impar", () => {
    expect(disp.amarre.bloque).toBe(n % 2 === 0 ? "fijo" : "movil");
  });

  test("la ultima polea es fija y el tramo libre baja hacia la mano", () => {
    expect(disp.poleas[n - 1].bloque).toBe("fijo");
    expect(disp.mano.x).toBeCloseTo(disp.xLibre, 12);
    expect(disp.mano.y).toBeCloseTo(disp.H_fijo - p.L1, 12);
  });

  test("la longitud total de la cadena se conserva al cambiar y", () => {
    for (const y of ys) {
      expect(estadoCadena(disp, y).longitudTotal).toBeCloseTo(disp.L_total, 6);
    }
  });

  test("el tramo libre recoge exactamente n*y", () => {
    const libre0 = estadoCadena(disp, 0).tramoLibre;
    for (const y of ys) {
      expect(estadoCadena(disp, y).tramoLibre - libre0).toBeCloseTo(n * y, 6);
    }
  });

  test("cada ramal avanza con c_j*ydot", () => {
    const c = Fisica.factoresRamales(n);
    const y = 0.8, dy = 1e-5;
    const e0 = estadoCadena(disp, y);
    const e1 = estadoCadena(disp, y + dy);
    const sep = disp.H_fijo - (DIMENSIONES.H_movil0 + y);
    const tramo = sep + Math.PI * disp.r;   // ramal + arco
    for (let j = 1; j <= n; j++) {
      const sigma = (j - 1) * tramo + sep / 2;   // mitad del ramal j
      const a = puntoCadena(e0, sigma).p;
      const b = puntoCadena(e1, sigma).p;
      const v = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / dy;
      expect(v).toBeCloseTo(c[j - 1], 4);
    }
  });

  test("la polea k gira con omega_k = k*ydot/r_polea", () => {
    for (const q of disp.poleas) {
      const omega = (anguloPolea(q, 1.0, p.r_polea) - anguloPolea(q, 0.9, p.r_polea)) / 0.1;
      expect(Math.abs(omega)).toBeCloseTo(q.k / p.r_polea, 9);
    }
  });

  test("la carga no invade el tramo libre", () => {
    const { disp: pesada } = disposicionPara(n, { M: 200 });
    expect(pesada.carga.anchoX / 2).toBeLessThanOrEqual(pesada.xLibre - DIMENSIONES.holgura_carga + 1e-12);
    expect(pesada.carga.anchoX * pesada.carga.alto * pesada.carga.fondoZ * DIMENSIONES.densidad_carga)
      .toBeCloseTo(200, 9);
  });
});
