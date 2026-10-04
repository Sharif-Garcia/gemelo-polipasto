/* Parametros por defecto (CLAUDE.md) y escenarios predefinidos.
   Cada escenario solo indica los parametros que cambian respecto a los de defecto. */

export const PARAMETROS_DEFECTO = {
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
};

export const ESCENARIOS = [
  {
    id: "estandar",
    nombre: "Estándar",
    descripcion: "Parámetros por defecto, validados contra MATLAB/Simulink.",
    cambios: {},
  },
  {
    id: "carga-pesada",
    nombre: "Carga pesada",
    descripcion: "M = 120 kg; F0 = 400 N para superar F_min = 340.6 N.",
    cambios: { M: 120, F0: 400 },
  },
  {
    id: "fuerza-insuficiente",
    nombre: "Fuerza insuficiente",
    descripcion: "F0 = 120 N, menor que F_min: la carga no despega.",
    cambios: { F0: 120 },
  },
  {
    id: "ventaja-mecanica",
    nombre: "Ventaja mecánica",
    descripcion: "F0 = 120 N con n = 6: F_min baja a 99.9 N y la carga sí sube (comparar con Fuerza insuficiente).",
    cambios: { n: 6, F0: 120 },
  },
  {
    id: "seis-ramales",
    nombre: "Seis ramales",
    descripcion: "n = 6: menos fuerza por ramal, más cadena recogida.",
    cambios: { n: 6 },
  },
  {
    id: "sin-friccion",
    nombre: "Sin fricción",
    descripcion: "mu = 0 y b = 0.",
    cambios: { mu: 0, b: 0 },
  },
  {
    id: "jalon-largo",
    nombre: "Jalón largo",
    descripcion: "El operario suelta en t_off = 2.5 s.",
    cambios: { t_off: 2.5 },
  },
];

export function parametrosDeEscenario(id) {
  const escenario = ESCENARIOS.find((e) => e.id === id);
  return { ...PARAMETROS_DEFECTO, ...(escenario ? escenario.cambios : {}) };
}
