/* Pruebas del motor fisico contra los valores de validacion de MATLAB/Simulink
   (tabla de CLAUDE.md, parametros por defecto). */
import { describe, test, expect } from "vitest";
import { Fisica } from "./fisica.js";

const sim = Fisica.simular();
const { d, eventos, r } = sim;

// Tolerancias: 1e-4 para valores continuos y 1e-3 para tiempos. Los valores
// publicados con 2 decimales se comparan con media unidad del ultimo decimal.
const TOL_VALOR = 1e-4;
const TOL_TIEMPO = 1e-3;
const TOL_2_DECIMALES = 5e-3;

function cerca(real, esperado, tol) {
  expect(Math.abs(real - esperado)).toBeLessThanOrEqual(tol);
}

describe("Valores de validacion (parametros por defecto)", () => {
  test("M_t = 55.00 kg", () => cerca(d.M_t, 55.0, TOL_2_DECIMALES));
  test("m_p_eq = 6.00 kg", () => cerca(d.m_p_eq, 6.0, TOL_2_DECIMALES));
  test("m_r_eff = 11.50 kg", () => cerca(d.m_r_eff, 11.5, TOL_2_DECIMALES));
  test("M_eq = 72.50 kg", () => cerca(d.M_eq, 72.5, TOL_2_DECIMALES));
  test("F_min = 149.88 N", () => cerca(d.F_min, 149.88, TOL_2_DECIMALES));
  test("a0 = 2.4890 m/s^2", () => cerca(d.a0, 2.489, TOL_VALOR));

  test("Despegue en t = 0.501 s", () => {
    cerca(eventos.despegue, 0.501, TOL_TIEMPO);
  });

  test("y maxima = 1.6388 m en t = 1.829 s", () => {
    cerca(eventos.y_max, 1.6388, TOL_VALOR);
    cerca(eventos.t_ymax, 1.829, TOL_TIEMPO);
  });

  test("v maxima = 2.4561 m/s en t = 1.500 s", () => {
    cerca(eventos.v_max, 2.4561, TOL_VALOR);
    cerca(eventos.t_vmax, 1.5, TOL_TIEMPO);
  });

  test("v minima = -4.9072 m/s en t = 2.494 s", () => {
    cerca(eventos.v_min, -4.9072, TOL_VALOR);
    cerca(eventos.t_vmin, 2.494, TOL_TIEMPO);
  });

  test("Aterrizaje en t = 2.495 s", () => {
    cerca(eventos.aterrizaje, 2.495, TOL_TIEMPO);
  });

  test("ydd(1.0 s) = 2.4548 m/s^2", () => {
    cerca(r.ydd[Fisica.indice(sim, 1.0)], 2.4548, TOL_VALOR);
  });

  test("ydd(2.0 s) = -7.4070 m/s^2", () => {
    cerca(r.ydd[Fisica.indice(sim, 2.0)], -7.407, TOL_VALOR);
  });
});

describe("Disposicion de poleas segun n", () => {
  test("bloque movil con floor(n/2) poleas para n = 2..6", () => {
    for (let n = 2; n <= 6; n++) {
      const dn = Fisica.derivados({ ...Fisica.PARAMETROS_BASE, n });
      expect(dn.N_poleas_moviles).toBe(Math.floor(n / 2));
    }
  });
});
