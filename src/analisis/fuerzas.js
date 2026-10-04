/* =========================================================================
   fuerzas.js
   Magnitudes del modo analisis (funciones puras, leen la simulacion):
   - Ecuacion de movimiento evaluada en cada muestra:
       M_eq*ydd = n*u - mu*n*u*sgn(ydot) - M_t*g - b*ydot + N  (+ R_tope)
     con sgn(ydot) = tanh(ydot/v_s), como en fisica.js. R_tope es la reaccion
     del tope superior: alli el modelo fija ydd = 0 con N = 0.
   - Fuerzas sobre el bloque movil y su escala comun para las flechas.
   - Tension de cada ramal (CLAUDE.md):
       T_j = u - (J_polea/r_polea^2)*ydd*sum(k, k=j..n) - lambda*L1*n*ydd
   ========================================================================= */

export const LARGO_MAX_FLECHA = 0.9;   // flecha de la fuerza mayor de la simulacion [m]
const UMBRAL_FUERZA = 0.5;             // por debajo no se dibuja la flecha [N]

/* Terminos de la ecuacion de movimiento en la muestra k */
export function evaluarEcuacion(sim, k) {
  const { p, d, r } = sim;
  const u = r.u[k], ydot = r.ydot[k], ydd = r.ydd[k];
  const terminos = [
    { id: "traccion", simbolo: "n·u", valor: p.n * u },
    { id: "seca", simbolo: "−μ·n·u·sgn(ẏ)", valor: -p.mu * p.n * u * Math.tanh(ydot / p.v_s) },
    { id: "peso", simbolo: "−M_t·g", valor: -d.M_t * p.g },
    { id: "viscosa", simbolo: "−b·ẏ", valor: -p.b * ydot },
    { id: "N", simbolo: "+N", valor: r.N[k] },
  ];
  const izquierda = d.M_eq * ydd;
  const suma = terminos.reduce((a, t) => a + t.valor, 0);
  // En el tope superior el modelo detiene la carga: la diferencia es la reaccion del tope
  const enTope = r.y[k] >= d.y_tope - 1e-9 && ydd === 0 && r.N[k] === 0;
  if (enTope && Math.abs(izquierda - suma) > 1e-9) {
    terminos.push({ id: "tope", simbolo: "+R_tope", valor: izquierda - suma });
  }
  const derecha = terminos.reduce((a, t) => a + t.valor, 0);
  return { izquierda, derecha, terminos, enTope };
}

/* Fuerzas sobre el conjunto movil (bloque + carga) en la muestra k.
   sentido: +1 hacia arriba, -1 hacia abajo. */
export function fuerzasBloque(sim, k) {
  const { terminos } = evaluarEcuacion(sim, k);
  const v = Object.fromEntries(terminos.map((t) => [t.id, t.valor]));
  const fuerza = (id, nombre, valor) => ({
    id, nombre, valor: Math.abs(valor), sentido: valor >= 0 ? 1 : -1, visible: Math.abs(valor) >= UMBRAL_FUERZA,
  });
  const lista = [
    fuerza("traccion", "n·T", v.traccion),
    fuerza("peso", "M_t·g", v.peso),
    fuerza("seca", "F seca", v.seca),
    fuerza("viscosa", "F viscosa", v.viscosa),
    fuerza("N", "N", v.N),
  ];
  if (v.tope !== undefined) lista.push(fuerza("tope", "R tope", v.tope));
  return lista;
}

// Numero "redondo" (1, 2, 2.5 o 5 por potencia de 10) cercano a x por debajo
function redondo(x) {
  const potencia = 10 ** Math.floor(Math.log10(x));
  const base = [5, 2.5, 2, 1].find((b) => b * potencia <= x) ?? 1;
  return base * potencia;
}

/* Escala comun de las flechas [m/N]: la fuerza mayor de toda la simulacion mide
   LARGO_MAX_FLECHA. referencia: fuerza redonda para la barra de la leyenda. */
export function escalaFuerzas(sim) {
  let fMax = 0;
  for (let k = 0; k < sim.Nt; k += 1) {
    for (const f of fuerzasBloque(sim, k)) if (f.valor > fMax) fMax = f.valor;
  }
  const escala = LARGO_MAX_FLECHA / fMax;
  const referencia = redondo(fMax / 3);
  return { escala, fMax, referencia, largoReferencia: referencia * escala };
}

/* Tensiones T_1..T_n de los ramales en la muestra k */
export function tensionesRamales(sim, k) {
  const { p, d, r } = sim;
  const inercia = p.J_polea / (p.r_polea * p.r_polea);
  const cadena = d.lambda * p.L1 * p.n * r.ydd[k];
  const tensiones = [];
  let suma = 0;                     // sum(k, k=j..n), de j = n hacia j = 1
  for (let j = p.n; j >= 1; j--) {
    suma += j;
    tensiones[j - 1] = r.u[k] - inercia * r.ydd[k] * suma - cadena;
  }
  return tensiones;
}

/* Mayor |T_j - u| de toda la simulacion: rango simetrico de la barra de colores */
export function rangoDiferenciaTension(sim) {
  let maximo = 0;
  for (let k = 0; k < sim.Nt; k++) {
    for (const T of tensionesRamales(sim, k)) maximo = Math.max(maximo, Math.abs(T - sim.r.u[k]));
  }
  return Math.max(maximo, 1);
}

/* Color divergente de T_j - u: azul (menor que u), gris (igual), rojo (mayor).
   Escala de raiz cuadrada: las diferencias pequeñas del jalon (unos pocos N) se
   distinguen sin saturar las grandes al soltar. Devuelve [r, g, b] en 0..1. */
const AZUL = [0x2a, 0x78, 0xd6], GRIS = [0xa9, 0xa8, 0xa3], ROJO = [0xe3, 0x49, 0x48];
export function colorDiferencia(diferencia, rango) {
  const x = Math.max(-1, Math.min(1, diferencia / rango));
  const extremo = x < 0 ? AZUL : ROJO;
  const f = Math.sqrt(Math.abs(x));
  return GRIS.map((g, i) => (g + (extremo[i] - g) * f) / 255);
}
