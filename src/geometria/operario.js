/* =========================================================================
   operario.js
   Postura del operario (maniqui) en funcion del tiempo y de la cadena.
   Funciones puras, sin three.js.

   Marco local del operario (metros): origen en el piso entre los pies,
   +z hacia la cadena, +y hacia arriba, +x a su izquierda. La cadena es la
   recta vertical x = 0, z = DISTANCIA_CADENA.

   Jalon mano sobre mano: el avance de la cadena desde t_on (s - s_on) define
   la fase. En cada carrera de largo CARRERA una mano agarra y baja con la
   cadena (misma velocidad sdot = n*ydot, sin patinar) y la otra sube abierta,
   separada de la cadena, para agarrar arriba. La frecuencia sale de sdot: si
   la cadena no se mueve (fuerza insuficiente), las manos tampoco.
   ========================================================================= */

export const CUERPO = {
  altura: 1.75,
  pelvis: 0.94,            // altura del centro de la pelvis de pie [m]
  cadera_lateral: 0.09,    // separacion lateral de las articulaciones de cadera
  cadera_bajo_pelvis: 0.03,
  muslo: 0.42,
  pierna: 0.42,
  tobillo: 0.08,           // altura del tobillo
  hombro_sobre_pelvis: 0.46,
  hombro_lateral: 0.18,
  brazo: 0.3,              // hombro - codo
  antebrazo: 0.33,         // codo - centro del puño
  pies: { der: [-0.11, -0.06], izq: [0.11, 0.08] },   // [x, z] de cada tobillo
};

export const DISTANCIA_CADENA = 0.32;   // de los pies a la cadena [m]
export const CARRERA = 0.3;             // recorrido de cada mano en un jalon [m]
export const TRANSICION = 0.3;          // agarrar / soltar [s]
const INCLINACION_MAX = 0.32;           // [rad] (unos 18°)
const ESFUERZO_PLENO = 1.4;             // u/F_min con el que se alcanza la inclinacion maxima
const ALTURA_AGARRE_MIN = 1.15;         // franja de agarre lo mas baja posible [m]
const MANO_REPOSO = [0.24, 0.785, 0.05]; // puño en reposo: brazos colgando casi rectos

const LADOS = { der: -1, izq: 1 };

/* ---------- Utilidades vectoriales ---------- */

const suma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const escala = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norma = (a) => Math.hypot(a[0], a[1], a[2]);
const mezcla = (a, b, k) => suma(a, escala(resta(b, a), k));
const suave = (x) => x * x * (3 - 2 * x);

/* ---------- Cinematica inversa analitica de dos segmentos ---------- */

// Devuelve { medio, fin }: articulacion intermedia (codo o rodilla) y extremo.
// 'polo' indica hacia donde se dobla la articulacion intermedia.
export function cinematicaInversa(raiz, objetivo, a, b, polo) {
  const v = resta(objetivo, raiz);
  const dReal = norma(v);
  const d = Math.min(Math.max(dReal, Math.abs(a - b) + 1e-6), a + b - 1e-6);
  const dir = escala(v, 1 / dReal);
  const p = resta(polo, escala(dir, punto(polo, dir)));   // polo sin la componente de dir
  const n = escala(p, 1 / norma(p));
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const medio = suma(raiz, suma(escala(dir, a * cosA), escala(n, a * sinA)));
  return { medio, fin: suma(raiz, escala(dir, d)) };
}

/* ---------- Esfuerzo e inclinacion ---------- */

// Inclinacion del torso hacia atras [rad]: crece con u/F_min hasta un limite
export function inclinacion(u, F_min) {
  return INCLINACION_MAX * Math.min(1, Math.max(0, u / F_min) / ESFUERZO_PLENO);
}

// Peso de la pose de jalon: 0 en reposo, 1 jalando; rampas suaves de TRANSICION
export function pesoJalon(t, t_on, t_off) {
  if (t < t_on) return 0;
  const entrada = Math.min(1, (t - t_on) / TRANSICION);
  if (t < t_off) return suave(entrada);
  const alSoltar = Math.min(1, (t_off - t_on) / TRANSICION);
  const salida = Math.max(0, 1 - (t - t_off) / TRANSICION);
  return suave(alSoltar * salida);
}

// Franja de agarre: sobre la parte vertical del tramo libre, a la altura de la mano
export function franjaAgarre(H_mano, H_fijo) {
  const inferior = Math.min(Math.max(H_mano, ALTURA_AGARRE_MIN), H_fijo - CARRERA - 0.15);
  return { inferior, superior: inferior + CARRERA };
}

/* ---------- Manos sobre la cadena ---------- */

// Posicion de cada puño en la pose de jalon y si esta agarrando
export function manosJalon(avance, franja) {
  const ciclo = ((avance % (2 * CARRERA)) + 2 * CARRERA) % (2 * CARRERA);
  const agarra = ciclo < CARRERA ? "der" : "izq";
  const f = (ciclo % CARRERA) / CARRERA;              // fraccion de la carrera
  const z = DISTANCIA_CADENA;
  const manos = {};
  for (const lado of ["der", "izq"]) {
    if (lado === agarra) {
      // Baja con la cadena: desde arriba hasta abajo de la franja
      manos[lado] = { p: [0, franja.superior - f * CARRERA, z], agarra: true, abierta: 0 };
    } else {
      // Sube abierta por fuera de la cadena, de abajo hacia arriba
      const arco = Math.sin(Math.PI * f);
      manos[lado] = {
        p: [LADOS[lado] * 0.12 * arco, franja.inferior + f * CARRERA, z - 0.06 * arco],
        agarra: false,
        abierta: Math.min(1, 3 * arco),
      };
    }
  }
  return manos;
}

/* ---------- Postura completa ---------- */

/* entrada: { t, s, s_on, s_off, t_on, t_off, F0, F_min, H_mano, H_fijo }
   s es la cadena recogida n*y; s_on y s_off sus valores en t_on y t_off. */
export function posturaOperario(e) {
  const w = pesoJalon(e.t, e.t_on, e.t_off);
  const esfuerzo = w * Math.min(1, Math.max(0, e.F0 / e.F_min) / ESFUERZO_PLENO);
  const theta = w * inclinacion(e.F0, e.F_min);

  // Cadera: baja y se va hacia atras con el esfuerzo (el peso cuelga de la cadena)
  const pelvis = [0, CUERPO.pelvis - 0.01 - 0.045 * esfuerzo, -0.065 * esfuerzo];
  const rotar = (v) => [v[0], v[1] * Math.cos(theta) + v[2] * Math.sin(theta),
    -v[1] * Math.sin(theta) + v[2] * Math.cos(theta)];

  // Avance de la cadena durante el jalon; al soltar se congela
  const sEfectivo = e.t < e.t_off ? e.s : e.s_off;
  const activas = manosJalon(sEfectivo - e.s_on, franjaAgarre(e.H_mano, e.H_fijo));

  const resultado = { pelvis, inclinacion: theta, peso: w, lados: {} };
  for (const [lado, signo] of Object.entries(LADOS)) {
    const hombro = suma(pelvis, rotar([signo * CUERPO.hombro_lateral, CUERPO.hombro_sobre_pelvis, 0]));
    const reposo = [signo * MANO_REPOSO[0], MANO_REPOSO[1], MANO_REPOSO[2]];
    const objetivo = mezcla(reposo, activas[lado].p, w);
    const brazo = cinematicaInversa(hombro, objetivo, CUERPO.brazo, CUERPO.antebrazo, [signo * 0.5, -1, -0.4]);

    const cadera = suma(pelvis, [signo * CUERPO.cadera_lateral, -CUERPO.cadera_bajo_pelvis, 0]);
    const [xp, zp] = CUERPO.pies[lado];
    const tobillo = [xp, CUERPO.tobillo, zp];
    const pierna = cinematicaInversa(cadera, tobillo, CUERPO.muslo, CUERPO.pierna, [0, 0, 1]);

    resultado.lados[lado] = {
      hombro,
      codo: brazo.medio,
      mano: brazo.fin,
      objetivo,
      agarra: w > 0.999 && activas[lado].agarra,
      abierta: w * activas[lado].abierta + (1 - w) * 0.3,
      cadera,
      rodilla: pierna.medio,
      tobillo: pierna.fin,
    };
  }
  return resultado;
}

/* ---------- Ubicacion en la escena ---------- */

// El operario se para del lado +x del tramo libre, mirando hacia -x
export function ubicacionOperario(disp) {
  return { x: disp.xLibre + DISTANCIA_CADENA, z: 0, rotY: -Math.PI / 2 };
}

// Del marco local del operario al marco del mundo
export function aMundo(ubicacion, p) {
  // rotY = -pi/2: +z local -> -x mundo, +x local -> +z mundo
  return [ubicacion.x - p[2], p[1], ubicacion.z + p[0]];
}

/* ---------- Alcance ---------- */

// Altura mas alta de la franja de agarre en la que la mano que agarra alcanza la
// cadena exactamente en toda la carrera, con la inclinacion maxima (el peor caso).
// Se calcula una vez con la propia postura, asi sigue valiendo si cambia el cuerpo.
let alcanceCache = null;
export function alturaAgarreMaxima() {
  if (alcanceCache !== null) return alcanceCache;
  const alcanza = (h) => {
    for (let s = 0; s < 2 * CARRERA; s += 0.01) {
      const q = posturaOperario({
        t: 1, s, s_on: 0, s_off: 0, t_on: 0, t_off: 2, F0: 1e9, F_min: 1, H_mano: h, H_fijo: 10,
      });
      for (const l of Object.values(q.lados)) {
        if (l.agarra && norma(resta(l.mano, l.objetivo)) > 1e-9) return false;
      }
    }
    return true;
  };
  let h = ALTURA_AGARRE_MIN;
  while (alcanza(h + 0.005)) h += 0.005;
  alcanceCache = h;
  return h;
}

