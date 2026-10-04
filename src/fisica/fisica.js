/* =========================================================================
   fisica.js
   Motor fisico del gemelo digital del polipasto con cadena rigida (1 GDL).
   Replica el modelo de MATLAB/Simulink:
      M_eq*ydd = n*u - mu*n*u*tanh(ydot/v_s) - M_t*g - b*ydot + N
   con el piso como limite inferior (y >= 0).
   ========================================================================= */
const Fisica = (() => {

  /* 1. Parametros por defecto (iguales a parametros_polipasto.m) */
  const PARAMETROS_BASE = {
    M: 50,            // Masa de la carga [kg]
    m_b: 5,           // Masa del bloque movil [kg]
    n: 4,             // Numero de ramales [-]
    g: 9.81,          // Gravedad [m/s^2]
    b: 2,             // Friccion viscosa [N*s/m]
    mu: 0.1,          // Friccion seca en los ejes [-]
    J_polea: 0.0005,  // Inercia de una polea [kg*m^2]
    r_polea: 0.05,    // Radio de la polea [m]
    m_r: 1.5,         // Masa total de la cadena [kg]
    D0: 2.5,          // Separacion entre bloques [m]
    L1: 2.0,          // Cadena libre hasta el operario [m]
    F0: 200,          // Fuerza del operario [N]
    t_on: 0.5,        // Empieza a jalar [s]
    t_off: 1.5,       // Suelta la cadena [s]
    dt: 0.001,        // Paso de integracion [s]
    tf: 6.0,          // Tiempo final [s]
    v_s: 0.01,        // Suavizado del signo [m/s]
    holgura: 0.4      // Distancia minima entre bloques [m]
  };

  /* 2. Factor de velocidad c_j de cada ramal, ecuacion (3) */
  function factoresRamales(n) {
    const c = [];
    for (let j = 1; j <= n; j++) {
      c.push(n % 2 === 0 ? 2 * Math.floor(j / 2) : 2 * Math.ceil(j / 2) - 1);
    }
    return c;
  }

  /* 3. Masas equivalentes y valores de verificacion */
  function derivados(p) {
    const n = p.n;
    const M_t = p.M + p.m_b;

    let sumaK2 = 0;
    for (let k = 1; k <= n; k++) sumaK2 += k * k;
    const m_p_eq = (p.J_polea / (p.r_polea * p.r_polea)) * sumaK2;

    const c = factoresRamales(n);
    const sumaC2 = c.reduce((acum, cj) => acum + cj * cj, 0);
    const lambda = p.m_r / (n * p.D0 + p.L1);
    const m_r_eff = lambda * (p.D0 * sumaC2 + p.L1 * n * n);

    const M_eq = M_t + m_p_eq + m_r_eff;

    return {
      M_t, m_p_eq, m_r_eff, M_eq, lambda, c,
      N_poleas_moviles: Math.ceil(n / 2),
      F_min: M_t * p.g / (n * (1 - p.mu)),
      a0: (n * p.F0 * (1 - p.mu) - M_t * p.g) / M_eq,
      y_tope: p.D0 - p.holgura
    };
  }

  /* 4. Fuerza del operario u(t) = F = T */
  function fuerza(t, p) {
    return (t >= p.t_on && t < p.t_off) ? p.F0 : 0;
  }

  /* 5. Ecuaciones de movimiento con piso y tope superior */
  function ecuaciones(x, u, p, d) {
    const y = x[0], v = x[1];
    const F_neta = p.n * u
                 - p.mu * p.n * u * Math.tanh(v / p.v_s)
                 - d.M_t * p.g
                 - p.b * v;

    if (y <= 0 && v <= 0 && F_neta <= 0) {
      return { xdot: [v, 0], N: -F_neta };          // el piso sostiene la carga
    }
    if (y >= d.y_tope && v >= 0 && F_neta >= 0) {
      return { xdot: [v, 0], N: 0 };                // tope superior
    }
    return { xdot: [v, F_neta / d.M_eq], N: 0 };    // segunda ley de Newton
  }

  /* 6. Simulacion completa con RK4 de paso fijo */
  function simular(cambios = {}) {
    const p = { ...PARAMETROS_BASE, ...cambios };
    const d = derivados(p);
    const Nt = Math.round(p.tf / p.dt) + 1;

    const r = {};
    ['t', 'u', 'T', 'y', 'ydot', 'ydd', 's', 'sdot', 'sdd', 'N']
      .forEach(nombre => { r[nombre] = new Float64Array(Nt); });

    const f = (x, t) => ecuaciones(x, fuerza(t, p), p, d).xdot;
    let x = [0, 0];                                  // carga en el piso
    const h = p.dt;

    for (let k = 0; k < Nt; k++) {
      const t = k * h;
      const u = fuerza(t, p);
      const e = ecuaciones(x, u, p, d);

      r.t[k] = t;            r.u[k] = u;            r.T[k] = u;
      r.y[k] = x[0];         r.ydot[k] = x[1];      r.ydd[k] = e.xdot[1];
      r.s[k] = p.n * x[0];   r.sdot[k] = p.n * x[1]; r.sdd[k] = p.n * e.xdot[1];
      r.N[k] = e.N;

      if (k === Nt - 1) break;

      const k1 = f(x, t);
      const k2 = f([x[0] + h / 2 * k1[0], x[1] + h / 2 * k1[1]], t + h / 2);
      const k3 = f([x[0] + h / 2 * k2[0], x[1] + h / 2 * k2[1]], t + h / 2);
      const k4 = f([x[0] + h * k3[0],     x[1] + h * k3[1]],     t + h);

      x = [
        x[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
        x[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
      ];

      if (x[0] < 0)        x = [0, 0];               // choque con el piso
      if (x[0] > d.y_tope) x = [d.y_tope, 0];        // choque con el bloque fijo
    }

    return { p, d, r, Nt, eventos: calcularEventos(r, p) };
  }

  /* 7. Eventos importantes */
  function calcularEventos(r, p) {
    const Nt = r.t.length;
    let iDesp = -1, iAter = -1, iYmax = 0, iVmax = 0, iVmin = 0;
    for (let k = 0; k < Nt; k++) {
      if (iDesp < 0 && r.y[k] > 0) iDesp = k;
      if (iAter < 0 && r.t[k] > p.t_off && r.y[k] <= 0) iAter = k;
      if (r.y[k] > r.y[iYmax]) iYmax = k;
      if (r.ydot[k] > r.ydot[iVmax]) iVmax = k;
      if (r.ydot[k] < r.ydot[iVmin]) iVmin = k;
    }
    return {
      despegue:   iDesp >= 0 ? r.t[iDesp] : null,
      aterrizaje: iAter >= 0 ? r.t[iAter] : null,
      y_max: r.y[iYmax],    t_ymax: r.t[iYmax],
      v_max: r.ydot[iVmax], t_vmax: r.t[iVmax],
      v_min: r.ydot[iVmin], t_vmin: r.t[iVmin]
    };
  }

  /* 8. Indice de la muestra mas cercana a un tiempo t (para sincronizar) */
  function indice(sim, t) {
    const k = Math.round(t / sim.p.dt);
    return Math.max(0, Math.min(sim.Nt - 1, k));
  }

  /* 9. Texto CSV con el mismo formato de datos_mecanismo.csv */
  function aCSV(sim) {
    const r = sim.r;
    const filas = ['t [s],u [N],T [N],y [m],ydot [m/s],ydd [m/s^2],' +
                   's [m],sdot [m/s],sdd [m/s^2],N [N]'];
    for (let k = 0; k < sim.Nt; k++) {
      filas.push([r.t[k], r.u[k], r.T[k], r.y[k], r.ydot[k], r.ydd[k],
                  r.s[k], r.sdot[k], r.sdd[k], r.N[k]].join(','));
    }
    return filas.join('\n');
  }

  return { PARAMETROS_BASE, factoresRamales, derivados, fuerza,
           ecuaciones, simular, indice, aCSV };
})();
