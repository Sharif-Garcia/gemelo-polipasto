/* Pruebas de la postura del operario. */
import { describe, test, expect } from "vitest";
import { Fisica } from "../fisica/fisica.js";
import { crearDisposicion, DIMENSIONES } from "./disposicion.js";
import {
  posturaOperario, inclinacion, pesoJalon, franjaAgarre, ubicacionOperario, aMundo,
  CUERPO, DISTANCIA_CADENA, CARRERA, TRANSICION,
} from "./operario.js";

const p = Fisica.PARAMETROS_BASE;
const d = Fisica.derivados(p);
const disp = crearDisposicion(p);

function entrada(t, s, cambios = {}) {
  return {
    t, s, s_on: 0, s_off: 3, t_on: p.t_on, t_off: p.t_off, F0: p.F0, F_min: d.F_min,
    H_mano: disp.mano.y, H_fijo: disp.H_fijo, ...cambios,
  };
}

// Distancia de un punto a la cadena (recta x = 0, z = DISTANCIA_CADENA)
const aCadena = (q) => Math.hypot(q[0], q[2] - DISTANCIA_CADENA);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const t = 1.0;   // jalando, con la transicion terminada

describe("Jalon mano sobre mano", () => {
  test("la mano que agarra esta sobre la cadena y baja con ella (sdot)", () => {
    const s = 0.4, ds = 0.05;   // a mitad de una carrera
    const a = posturaOperario(entrada(t, s));
    const b = posturaOperario(entrada(t, s + ds));
    const lado = a.lados.der.agarra ? "der" : "izq";
    expect(a.lados[lado].agarra).toBe(true);
    expect(b.lados[lado].agarra).toBe(true);
    expect(aCadena(a.lados[lado].mano)).toBeLessThan(1e-9);
    expect(dist(a.lados[lado].mano, a.lados[lado].objetivo)).toBeLessThan(1e-9);   // IK exacta
    expect(b.lados[lado].mano[1] - a.lados[lado].mano[1]).toBeCloseTo(-ds, 9);
  });

  test("la mano que agarra alcanza la cadena en toda la carrera", () => {
    for (const F0 of [p.F0, 120]) {
      for (let s = 0; s < 2 * CARRERA; s += 0.005) {
        const q = posturaOperario(entrada(t, s, { F0 }));
        for (const l of Object.values(q.lados)) {
          if (l.agarra) expect(dist(l.mano, l.objetivo)).toBeLessThan(1e-9);
        }
      }
    }
  });

  test("las manos se alternan en cada carrera y la otra mano no toca la cadena", () => {
    const agarran = [];
    for (let s = 0.05; s < 4 * CARRERA; s += CARRERA) {
      const q = posturaOperario(entrada(t, s + 0.1));
      const lado = q.lados.der.agarra ? "der" : "izq";
      const otro = lado === "der" ? "izq" : "der";
      expect(q.lados[otro].agarra).toBe(false);
      expect(aCadena(q.lados[otro].mano)).toBeGreaterThan(0.05);
      agarran.push(lado);
    }
    expect(agarran).toEqual(["der", "izq", "der", "izq"]);
  });

  test("el ritmo sale de la cadena: si sdot = 0 las manos no se mueven", () => {
    const a = posturaOperario(entrada(0.9, 0.2));
    const b = posturaOperario(entrada(1.4, 0.2));
    for (const lado of ["der", "izq"]) {
      expect(dist(a.lados[lado].mano, b.lados[lado].mano)).toBeLessThan(1e-12);
    }
  });

  test("brazos y piernas conservan sus longitudes", () => {
    const q = posturaOperario(entrada(t, 0.37));
    for (const l of Object.values(q.lados)) {
      expect(dist(l.hombro, l.codo)).toBeCloseTo(CUERPO.brazo, 9);
      expect(dist(l.codo, l.mano)).toBeCloseTo(CUERPO.antebrazo, 9);
      expect(dist(l.cadera, l.rodilla)).toBeCloseTo(CUERPO.muslo, 9);
      expect(dist(l.rodilla, l.tobillo)).toBeCloseTo(CUERPO.pierna, 9);
    }
  });
});

describe("Postura y esfuerzo", () => {
  test("la inclinacion crece con u hasta un limite", () => {
    const valores = [0, 50, 100, 150, 200].map((u) => inclinacion(u, d.F_min));
    for (let i = 1; i < valores.length; i++) expect(valores[i]).toBeGreaterThan(valores[i - 1]);
    expect(inclinacion(1000, d.F_min)).toBe(inclinacion(5000, d.F_min));
    expect(inclinacion(1000, d.F_min)).toBeLessThan(0.4);
  });

  test("con fuerza insuficiente se inclina aunque la cadena no se mueva", () => {
    const q = posturaOperario(entrada(1.0, 0, { F0: 120, s_off: 0 }));
    expect(q.inclinacion).toBeGreaterThan(0.1);
    const lado = q.lados.der.agarra ? "der" : "izq";
    expect(aCadena(q.lados[lado].mano)).toBeLessThan(1e-9);
  });

  test("al jalar la cadera baja y las rodillas se flexionan", () => {
    const reposo = posturaOperario(entrada(0.2, 0));
    const jalando = posturaOperario(entrada(t, 0.4));
    expect(jalando.pelvis[1]).toBeLessThan(reposo.pelvis[1]);
    const flexion = (q) => q.lados.der.rodilla[2] - (q.lados.der.cadera[2] + q.lados.der.tobillo[2]) / 2;
    expect(flexion(jalando)).toBeGreaterThan(flexion(reposo));
  });
});

describe("Reposo y transiciones", () => {
  test("en reposo ninguna mano toca la cadena", () => {
    for (const tr of [0, 0.3, p.t_off + TRANSICION + 0.01, 3, 6]) {
      const q = posturaOperario(entrada(tr, tr > p.t_off ? 3 : 0));
      expect(q.peso).toBe(0);
      for (const l of Object.values(q.lados)) {
        expect(l.agarra).toBe(false);
        expect(aCadena(l.mano)).toBeGreaterThan(0.15);
      }
    }
  });

  test("agarra y suelta con rampas suaves de 0.3 s", () => {
    expect(pesoJalon(p.t_on, p.t_on, p.t_off)).toBe(0);
    const medio = pesoJalon(p.t_on + TRANSICION / 2, p.t_on, p.t_off);
    expect(medio).toBeGreaterThan(0.3);
    expect(medio).toBeLessThan(0.7);
    expect(pesoJalon(p.t_on + TRANSICION, p.t_on, p.t_off)).toBe(1);
    expect(pesoJalon(p.t_off + TRANSICION / 2, p.t_on, p.t_off)).toBeCloseTo(medio, 9);
    expect(pesoJalon(p.t_off + TRANSICION, p.t_on, p.t_off)).toBe(0);
  });
});

describe.each([2, 3, 4, 5, 6])("Ubicacion con n = %i", (n) => {
  const dn = crearDisposicion({ ...p, n });
  const ub = ubicacionOperario(dn);

  test("la cadena cae entre sus manos a la altura de la mano", () => {
    const franja = franjaAgarre(dn.mano.y, dn.H_fijo);
    expect(franja.inferior).toBeCloseTo(Math.max(dn.mano.y, 1.15), 9);
    const enMundo = aMundo(ub, [0, franja.inferior, DISTANCIA_CADENA]);
    expect(enMundo[0]).toBeCloseTo(dn.xLibre, 9);
    expect(enMundo[2]).toBeCloseTo(0, 9);
  });

  test("no choca con el portico ni con el monton", () => {
    const q = posturaOperario(entrada(t, 0.4));
    const bordeColumna = DIMENSIONES.x_columna - DIMENSIONES.ala_columna;
    // Cabeza: 0.23 m sobre los hombros con la inclinacion maxima, mas su radio
    const cabeza = q.pelvis[2] - (CUERPO.hombro_sobre_pelvis + 0.23) * Math.sin(q.inclinacion) - 0.1;
    expect(aMundo(ub, [0, 0, cabeza])[0]).toBeLessThan(bordeColumna);
    const radioMonton = 0.2;   // mayor que el cono con toda la cadena recogida
    for (const l of Object.values(q.lados)) {
      const pie = aMundo(ub, l.tobillo);
      const separacion = Math.hypot(pie[0] - dn.centroMonton[0], pie[2] - dn.centroMonton[2]);
      expect(separacion).toBeGreaterThan(radioMonton + 0.1);
    }
  });
});
