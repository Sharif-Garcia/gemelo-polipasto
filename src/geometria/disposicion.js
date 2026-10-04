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

   Ejes: x a la derecha, y hacia arriba, z hacia la camara frontal. Las poleas
   y los ramales estan en el plano z = 0.
   ========================================================================= */

export const DIMENSIONES = {
  H_movil0: 0.8,          // altura del eje del bloque movil con la carga en el piso [m]
  h_carga: 0.3,           // altura de la carga [m]
  densidad_carga: 7850,   // acero [kg/m^3]
  holgura_carga: 0.04,    // separacion minima entre la carga y el tramo libre [m]
  margen_bloque: 0.035,   // placas del bloque mas alla del borde de las poleas [m]
  suspension_fijo: 0.22,  // del borde superior del bloque fijo a la viga [m]
  paso: 0.022,            // paso de la cadena (largo interior del eslabon) [m]
  d_alambre: 0.005,       // diametro del alambre del eslabon [m]
  ancho_eslabon: 0.0185,  // ancho exterior del eslabon [m]
  mano_min: 0.5,          // altura minima de la mano [m]
  largo_monton0: 0.8,     // cadena en el piso con y = 0 [m]
  monton: {
    separacion_x: 0.12,   // del tramo libre al inicio del monton [m]
    largo_fila: 0.42,
    separacion_filas: 0.035,
    filas_por_capa: 14,
    z_inicio: -0.35,
    alto_capa: 0.011,
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
  return evaluarSegmento(tr.segmentos[lo], sAcotado - tr.acum[lo], out);
}

export function nuevoPunto() {
  return { p: [0, 0, 0], t: [0, 1, 0], ref: Z };
}

/* ---------- Monton de cadena en el piso ---------- */

// Trayecto en zigzag medido desde el extremo final de la cadena (fijo en el piso).
function crearMonton(xInicio, largoNecesario) {
  const m = DIMENSIONES.monton;
  const yBase = DIMENSIONES.ancho_eslabon / 2;
  const porFila = m.largo_fila + m.separacion_filas;
  const filas = Math.ceil(largoNecesario / porFila) + 2;
  const puntos = [];
  for (let i = 0; i < filas; i++) {
    const capa = Math.floor(i / m.filas_por_capa);
    const fila = i % m.filas_por_capa;
    const indiceZ = capa % 2 === 0 ? fila : m.filas_por_capa - 1 - fila;
    const z = m.z_inicio + indiceZ * m.separacion_filas;
    const y = yBase + capa * m.alto_capa;
    const x0 = i % 2 === 0 ? xInicio : xInicio + m.largo_fila;
    const x1 = i % 2 === 0 ? xInicio + m.largo_fila : xInicio;
    puntos.push([x0, y, z], [x1, y, z]);
  }
  const segmentos = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    segmentos.push(recta(puntos[i], puntos[i + 1], Y));
  }
  return crearTrayecto(segmentos);
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

  const largoMax = D.largo_monton0 + n * D0 + 1;
  const monton = crearMonton(xLibre + D.monton.separacion_x, largoMax);

  const disp = {
    n, r, D0, H_fijo, poleas, amarre, ramales, xLibre, bloques, mano, carga, viga, monton,
  };

  // Longitud total con y = 0 y el monton inicial
  const Q = evaluarTrayecto(monton, D.largo_monton0, nuevoPunto()).p;
  disp.L_total = largoFijo(disp, 0) + distancia([mano.x, mano.y, mano.z], Q) + D.largo_monton0;
  disp.numEslabones = Math.floor(disp.L_total / D.paso);
  return disp;
}

function distancia(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
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

export function estadoCadena(disp, y) {
  const { n, r, H_fijo, poleas, ramales, amarre, mano, monton } = disp;
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
  segmentos.push(recta([x, H_fijo, 0], [mano.x, mano.y, mano.z], Z));

  // Largo del monton: ell + |mano - Q(ell)| = L_total - largoFijo (biseccion, funcion creciente)
  const objetivo = disp.L_total - largoFijo(disp, y);
  const pm = [mano.x, mano.y, mano.z];
  const aux = nuevoPunto();
  const g = (ell) => ell + distancia(pm, evaluarTrayecto(monton, ell, aux).p);
  let lo = 0, hi = monton.L;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) < objetivo) lo = mid; else hi = mid;
  }
  const largoMonton = (lo + hi) / 2;
  const caida = evaluarTrayecto(monton, largoMonton, nuevoPunto()).p;
  segmentos.push(recta(pm, caida, Z));

  const principal = crearTrayecto(segmentos);
  return {
    principal,
    largoMonton,
    monton,
    longitudTotal: principal.L + largoMonton,
    tramoLibre: (H_fijo - mano.y) + distancia(pm, caida) + largoMonton,
  };
}

// Punto material sigma (medido desde el amarre)
export function puntoCadena(estado, sigma, out = nuevoPunto()) {
  const { principal, largoMonton, monton } = estado;
  if (sigma <= principal.L) return evaluarTrayecto(principal, sigma, out);
  // En el monton el trayecto se recorre al reves, desde la caida hasta el extremo final
  evaluarTrayecto(monton, largoMonton - (sigma - principal.L), out);
  out.t[0] = -out.t[0];
  out.t[1] = -out.t[1];
  out.t[2] = -out.t[2];
  return out;
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
