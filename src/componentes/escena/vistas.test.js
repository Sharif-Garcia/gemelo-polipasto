/* Pruebas del encuadre de las vistas de camara. */
import { describe, test, expect } from "vitest";
import { Fisica } from "../../fisica/fisica.js";
import { crearDisposicion } from "../../geometria/disposicion.js";
import { VISTAS, cajaVista, baseCamara, encuadreVista } from "./vistas.js";

const FOV = (40 * Math.PI) / 180;
const ASPECTOS = [1366 / 330, 1366 / 650, 1920 / 640, 1920 / 1000, 0.6];

// Proyeccion de las 8 esquinas: devuelve la mayor fraccion del medio cuadro ocupada
function ocupacion(caja, posicion, direccion, aspecto) {
  const { f, r, u } = baseCamara(direccion);
  const tanV = Math.tan(FOV / 2), tanH = tanV * aspecto;
  let maximo = 0;
  for (const x of [caja.min[0], caja.max[0]]) {
    for (const y of [caja.min[1], caja.max[1]]) {
      for (const z of [caja.min[2], caja.max[2]]) {
        const q = [x - posicion[0], y - posicion[1], z - posicion[2]];
        const prof = -(q[0] * f[0] + q[1] * f[1] + q[2] * f[2]);
        const h = Math.abs(q[0] * r[0] + q[1] * r[1] + q[2] * r[2]) / prof / tanH;
        const v = Math.abs(q[0] * u[0] + q[1] * u[1] + q[2] * u[2]) / prof / tanV;
        maximo = Math.max(maximo, h, v);
      }
    }
  }
  return maximo;
}

describe.each([2, 4, 6])("n = %i", (n) => {
  const p = { ...Fisica.PARAMETROS_BASE, n };
  const disp = crearDisposicion(p);

  test.each(VISTAS.map((v) => [v.nombre, v]))("%s encuadra su caja en cualquier proporcion", (_, vista) => {
    for (const y of [0, 1.6]) {
      for (const aspecto of ASPECTOS) {
        const { posicion } = encuadreVista(vista.id, disp, y, FOV, aspecto);
        const caja = cajaVista(vista.caja, disp, y);
        const ocupa = ocupacion(caja, posicion, vista.direccion, aspecto);
        expect(ocupa).toBeLessThanOrEqual(1 + 1e-9);   // todo dentro del cuadro
        // Ajustado (salvo cuando manda la distancia minima de los controles)
        if (vista.caja === "portico" || vista.caja === "operario") expect(ocupa).toBeGreaterThan(0.85);
      }
    }
  });
});

test("en una ventana angosta la camara se aleja para que quepa el ancho", () => {
  const disp = crearDisposicion(Fisica.PARAMETROS_BASE);
  const dist = (aspecto) => {
    const { posicion, objetivo } = encuadreVista("frontal", disp, 0, FOV, aspecto);
    return Math.hypot(...posicion.map((v, i) => v - objetivo[i]));
  };
  // Lienzo ancho: manda el alto del portico (misma distancia); angosto: manda el ancho
  expect(dist(1366 / 330)).toBeCloseTo(dist(1920 / 640), 9);
  expect(dist(0.6)).toBeGreaterThan(dist(1366 / 650) * 1.2);
});
