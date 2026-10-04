/* =========================================================================
   disposicion.js
   Geometria del polipasto (funciones puras, sin three.js).
   - crearDisposicion(p): posiciones fijas de poleas, ramales, amarre, mano,
     carga y monton de cadena a partir de n, r_polea, D0, L1 y M.
   - estadoCadena(disp, y): trayectoria de la cadena para una posicion y.
   - puntoCadena / recorrerCadena: posicion de cada punto material de la cadena.

   La cadena se describe con una coordenada material sigma medida desde el
   amarre (extremo muerto). Cada eslabon conserva su sigma; su posicion en el
   mundo es el punto sigma de la trayectoria. Asi los ramales avanzan con
   c_j*ydot sin integrar velocidades, y la longitud total es constante: lo que
   pierden los n ramales (n*y) se acumula en el tramo libre.

   Tramo libre: vertical desde la ultima polea hasta la mano (H_fijo - L1),
   curva suave hasta la cima del monton y monton conico en el piso. Cada
   eslabon del monton se ubica segun su distancia lambda al extremo final
   (fija para cada eslabon), sobre la superficie del cono de "largo" lambda,
   con angulo, radio y giro pseudoaleatorios: los eslabones nuevos caen encima
   de los anteriores y ninguno cambia de lugar mientras esta en el monton.

   Ejes: x a la derecha, y hacia arriba, z hacia la camara frontal. Las poleas
   y los ramales estan en el plano z = 0.
   ========================================================================= */

export const DIMENSIONES = {
  H_movil0: 0.8,          // altura del eje del bloque movil con la carga en el piso [m]
  h_carga: 0.3,           // altura de la carga [m]
  densidad_carga: 7850,   // acero [kg/m^3]
  holgura_carga: 0.06,    // separacion minima entre la carga y el tramo libre (y los puños) [m]
  margen_bloque: 0.035,   // placas del bloque mas alla del borde de las poleas [m]
  suspension_fijo: 0.22,  // del borde superior del bloque fijo a la viga [m]
  x_columna: 1.35,        // eje de las columnas del portico [m]
  ala_columna: 0.06,      // media ala del perfil de las columnas [m]
  paso: 0.022,            // paso de la cadena (largo interior del eslabon) [m]
  d_alambre: 0.005,       // diametro del alambre del eslabon [m]
  ancho_eslabon: 0.0185,  // ancho exterior del eslabon [m]
  mano_min: 0.5,          // altura minima de la mano [m]
  largo_monton0: 0.8,     // cadena en el piso con y = 0 [m]
  segmentos_curva: 24,    // tramos rectos de la curva mano-monton
  monton: {
    separacion_x: 0.08,   // del tramo libre al centro del monton [m]
    z: -0.35,             // detras del plano de la cadena, lejos del operario [m]
    radio_min: 0.015,     // radio del cono con lambda = 0 [m]
    talud: 0.45,          // altura / radio del cono
    volumen_por_metro: 1.5e-4, // volumen aparente de 1 m de cadena amontonada [m^3/m]
    asentamiento: 0.15,   // cadena recien caida que aun se desliza desde la cima [m]
  },
};

const Z = [0, 0, 1];
const Y = [0, 1, 0];

/* ---------- Segmentos de trayectoria ---------- */

function recta(a, b, ref) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return { tipo: 0, a, b, L, ref };
}

// Arco en el plano z = 0 recorrido del angulo a0 al a1
function arco(cx, cy, R, a0, a1) {
  return { tipo: 1, cx, cy, R, a0, a1, L: Math.abs(a1 - a0) * R, ref: Z };
}

// Escribe en out la posicion (p), la tangente unitaria (t) y la referencia (ref)
function evaluarSegmento(seg, s, out) {
  if (seg.tipo === 0) {
    const f = seg.L > 0 ? s / seg.L : 0;
    const { a, b } = seg;
    out.p[0] = a[0] + (b[0] - a[0]) * f;
    out.p[1] = a[1] + (b[1] - a[1]) * f;
    out.p[2] = a[2] + (b[2] - a[2]) * f;
    if (seg.L > 0) {
      out.t[0] = (b[0] - a[0]) / seg.L;
      out.t[1] = (b[1] - a[1]) / seg.L;
      out.t[2] = (b[2] - a[2]) / seg.L;
    }
  } else {
    const sentido = Math.sign(seg.a1 - seg.a0);
    const ang = seg.a0 + sentido * (s / seg.R);
    const c = Math.cos(ang), sn = Math.sin(ang);
    out.p[0] = seg.cx + seg.R * c;
    out.p[1] = seg.cy + seg.R * sn;
    out.p[2] = 0;
    out.t[0] = -sentido * sn;
    out.t[1] = sentido * c;
    out.t[2] = 0;
  }
  out.ref = seg.ref;
  return out;
}

function crearTrayecto(segmentos) {
  const acum = [0];
  for (const seg of segmentos) acum.push(acum[acum.length - 1] + seg.L);
  return { segmentos, acum, L: acum[acum.length - 1] };
}

function evaluarTrayecto(tr, s, out) {
  const sAcotado = Math.min(Math.max(s, 0), tr.L);
  let lo = 0, hi = tr.segmentos.length - 1;
  while (lo < hi) {                       // ultimo segmento con acum <= s
    const mid = (lo + hi + 1) >> 1;
    if (tr.acum[mid] <= sAcotado) lo = mid; else hi = mid - 1;
  }
  out.segmento = lo;
  return evaluarSegmento(tr.segmentos[lo], sAcotado - tr.acum[lo], out);
}

// segmento: indice en el trayecto principal (-1 en el monton). En la cadena, los
// segmentos 2(j-1) y 2(j-1)+1 son el ramal j y su arco sobre la polea j.
export function nuevoPunto() {
  return { p: [0, 0, 0], t: [0, 1, 0], ref: Z, segmento: -1 };
}

// Ramal (1..n) de un punto de la cadena, o 0 si esta en el tramo libre o el monton
export function ramalDePunto(punto, n) {
  return punto.segmento >= 0 && punto.segmento < 2 * n ? Math.floor(punto.segmento / 2) + 1 : 0;
}

function distancia(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/* ---------- Monton conico ---------- */

// Radio y altura del cono que forman lambda metros de cadena
export function conoMonton(lambda) {
  const m = DIMENSIONES.monton;
  const v = Math.max(lambda, 0) * m.volumen_por_metro;
  const R = m.radio_min + Math.cbrt((3 * v) / (Math.PI * m.talud));
  return { R, H: m.talud * R };
}

// Numero pseudoaleatorio en [0, 1) reproducible a partir de (i, k)
function aleatorio(i, k) {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Eslabon numero i (desde el amarre), a lambda metros del extremo final y que
// cayo hace 'reciente' metros: llega por la cima y se desliza hasta su lugar.
function puntoMonton(centro, lambda, reciente, i, out) {
  const { R, H } = conoMonton(lambda);
  const asentado = Math.min(1, reciente / DIMENSIONES.monton.asentamiento);
  const u = Math.sqrt(aleatorio(i, 0)) * asentado;   // reparto uniforme en el circulo
  const ang = 2 * Math.PI * aleatorio(i, 1);
  const rho = R * u;
  out.p[0] = centro[0] + rho * Math.cos(ang);
  out.p[1] = DIMENSIONES.ancho_eslabon / 2 + H * (1 - u);
  out.p[2] = centro[2] + rho * Math.sin(ang);

  const giro = 2 * Math.PI * aleatorio(i, 2);
  const inclinacion = (aleatorio(i, 3) - 0.5) * 1.1;   // ±0.55 rad
  const c = Math.cos(inclinacion);
  out.t[0] = Math.cos(giro) * c;
  out.t[1] = Math.sin(inclinacion);
  out.t[2] = Math.sin(giro) * c;
  out.ref = Y;
  return out;
}

/* ---------- Curva de la mano al monton ---------- */

// Bezier cubica: sale vertical de la mano y cae vertical sobre la cima
function puntosCurva(mano, cima) {
  const caida = mano[1] - cima[1];
  const P1 = [mano[0], mano[1] - 0.55 * caida, mano[2]];
  const P2 = [cima[0], cima[1] + 0.3 * caida, cima[2]];
  const N = DIMENSIONES.segmentos_curva;
  const puntos = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, r = 1 - s;
    const a = r * r * r, b = 3 * r * r * s, c = 3 * r * s * s, d = s * s * s;
    puntos.push([0, 1, 2].map((e) => a * mano[e] + b * P1[e] + c * P2[e] + d * cima[e]));
  }
  return puntos;
}

function largoPolilinea(puntos) {
  let L = 0;
  for (let i = 1; i < puntos.length; i++) L += distancia(puntos[i - 1], puntos[i]);
  return L;
}

function cimaMonton(centro, largo) {
  return [centro[0], DIMENSIONES.ancho_eslabon / 2 + conoMonton(largo).H, centro[2]];
}

/* ---------- Disposicion fija ---------- */

export function crearDisposicion(p) {
  const { n, r_polea: r, D0, L1, M } = p;
  const D = DIMENSIONES;
  const H_fijo = D.H_movil0 + D0;

  // Ramal j (1..n) y tramo libre (j = n+1) separados 2r; la polea k une los ramales k y k+1.
  const xRamal = (j) => (j - 1) * 2 * r;
  const poleas = [];
  for (let k = 1; k <= n; k++) {
    // n par: amarre en el bloque fijo, la polea 1 es movil. n impar: al reves.
    const enMovil = n % 2 === 0 ? k % 2 === 1 : k % 2 === 0;
    poleas.push({
      k,
      bloque: enMovil ? "movil" : "fijo",
      x: xRamal(k) + r,
      giro: enMovil ? 1 : -1,   // +1 antihorario visto desde +z (la cadena pasa por debajo)
    });
  }
  const amarre = { bloque: n % 2 === 0 ? "fijo" : "movil", x: xRamal(1) };

  const extremos = (bloque) => {
    const xs = poleas.filter((q) => q.bloque === bloque).flatMap((q) => [q.x - r, q.x + r]);
    if (amarre.bloque === bloque) xs.push(amarre.x);
    return { xMin: Math.min(...xs) - D.margen_bloque, xMax: Math.max(...xs) + D.margen_bloque };
  };

  // Centrar el bloque movil (y la carga) en x = 0
  const em = extremos("movil");
  const dx = -(em.xMin + em.xMax) / 2;
  poleas.forEach((q) => (q.x += dx));
  amarre.x += dx;
  const ramales = Array.from({ length: n + 1 }, (_, i) => xRamal(i + 1) + dx);
  const xLibre = ramales[n];

  const bloques = {
    movil: extremos("movil"),
    fijo: extremos("fijo"),
    medioAlto: r + D.margen_bloque,   // mitad de la altura de las placas
  };

  const mano = {
    x: xLibre,
    y: Math.min(Math.max(H_fijo - L1, D.mano_min), H_fijo - 0.2),
    z: 0,
  };

  // Carga de acero de altura fija; el ancho en x no invade el tramo libre.
  const ladoCubo = Math.sqrt(M / (D.densidad_carga * D.h_carga));
  const anchoX = Math.min(ladoCubo, 2 * (xLibre - D.holgura_carga));
  const carga = { anchoX, alto: D.h_carga, fondoZ: M / (D.densidad_carga * D.h_carga * anchoX) };

  const viga = { yInferior: H_fijo + bloques.medioAlto + D.suspension_fijo };

  const centroMonton = [xLibre + D.monton.separacion_x, 0, D.monton.z];

  const disp = {
    n, r, D0, H_fijo, poleas, amarre, ramales, xLibre, bloques, mano, carga, viga, centroMonton,
    // El monton nunca supera lo que cabe en los ramales mas el monton inicial
    largoMontonMax: D.largo_monton0 + n * D0,
  };

  // Longitud total con y = 0 y el monton inicial
  const pm = [mano.x, mano.y, mano.z];
  disp.L_total = largoFijo(disp, 0)
    + largoPolilinea(puntosCurva(pm, cimaMonton(centroMonton, D.largo_monton0)))
    + D.largo_monton0;
  disp.numEslabones = Math.floor(disp.L_total / D.paso);
  return disp;
}

// Una sola disposicion por objeto de parametros (la comparten escena y camaras)
const cache = new WeakMap();
export function obtenerDisposicion(p) {
  if (!cache.has(p)) cache.set(p, crearDisposicion(p));
  return cache.get(p);
}

// Ramales + arcos + tramo vertical hasta la mano
function largoFijo(disp, y) {
  const sep = disp.H_fijo - (DIMENSIONES.H_movil0 + y);
  return disp.n * sep + disp.n * Math.PI * disp.r + (disp.H_fijo - disp.mano.y);
}

/* ---------- Cadena para una posicion y ---------- */

// Altura del eje del bloque movil
export function alturaBloqueMovil(y) {
  return DIMENSIONES.H_movil0 + y;
}

// Angulo de la polea k: omega_k = k*ydot/r_polea  =>  theta_k = k*y/r_polea
export function anguloPolea(polea, y, r_polea) {
  return (polea.giro * polea.k * y) / r_polea;
}

// Coordenada material del punto de la cadena que esta en la mano con la posicion y.
// Al subir la carga disminuye en n*y: el eslabon que estaba en la mano baja s = n*y.
export function sigmaMano(disp, y) {
  return largoFijo(disp, y);
}

export function estadoCadena(disp, y) {
  const { n, r, H_fijo, poleas, ramales, amarre, mano, centroMonton } = disp;
  const Hm = alturaBloqueMovil(y);
  const segmentos = [];

  let x = ramales[0];
  let yy = amarre.bloque === "fijo" ? H_fijo : Hm;
  for (let k = 0; k < n; k++) {
    const q = poleas[k];
    const Hq = q.bloque === "fijo" ? H_fijo : Hm;
    segmentos.push(recta([x, yy, 0], [x, Hq, 0], Z));
    // Movil: la cadena pasa por debajo (antihorario). Fijo: por encima (horario).
    segmentos.push(q.bloque === "movil" ? arco(q.x, Hq, r, Math.PI, 2 * Math.PI) : arco(q.x, Hq, r, Math.PI, 0));
    x = q.x + r;
    yy = Hq;
  }
  const pm = [mano.x, mano.y, mano.z];
  segmentos.push(recta([x, H_fijo, 0], pm, Z));

  // Largo del monton: ell + largo de la curva(ell) = L_total - largoFijo (biseccion, funcion creciente)
  const objetivo = disp.L_total - largoFijo(disp, y);
  const g = (ell) => ell + largoPolilinea(puntosCurva(pm, cimaMonton(centroMonton, ell)));
  let lo = 0, hi = disp.largoMontonMax + 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) < objetivo) lo = mid; else hi = mid;
  }
  const largoMonton = (lo + hi) / 2;
  const curva = puntosCurva(pm, cimaMonton(centroMonton, largoMonton));
  for (let i = 1; i < curva.length; i++) segmentos.push(recta(curva[i - 1], curva[i], Z));

  const principal = crearTrayecto(segmentos);
  return {
    principal,
    largoMonton,
    centroMonton,
    cima: curva[curva.length - 1],
    longitudTotal: principal.L + largoMonton,
    tramoLibre: (H_fijo - mano.y) + largoPolilinea(curva) + largoMonton,
  };
}

// Punto material sigma (medido desde el amarre)
export function puntoCadena(estado, sigma, out = nuevoPunto()) {
  const { principal, largoMonton, centroMonton } = estado;
  if (sigma <= principal.L) return evaluarTrayecto(principal, sigma, out);
  // Distancia al extremo final (fija para cada eslabon) e indice del eslabon
  const reciente = sigma - principal.L;
  const i = Math.floor(sigma / DIMENSIONES.paso);
  out.segmento = -1;
  return puntoMonton(centroMonton, largoMonton - reciente, reciente, i, out);
}

// Llama fn(i, punto) con el centro de cada eslabon (el punto se reutiliza)
export function recorrerCadena(disp, y, fn) {
  const estado = estadoCadena(disp, y);
  const punto = nuevoPunto();
  const paso = DIMENSIONES.paso;
  for (let i = 0; i < disp.numEslabones; i++) {
    fn(i, puntoCadena(estado, (i + 0.5) * paso, punto));
  }
  return estado;
}
