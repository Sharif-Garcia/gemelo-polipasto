/* Estado global del gemelo digital (zustand).
   Unica fuente de verdad de parametros, simulacion y reloj de reproduccion.
   Los componentes que necesitan valores en cada cuadro NO deben suscribirse a t
   con un selector: deben leer getState() o usar usarGemelo.subscribe con refs. */
import { create } from "zustand";
import { Fisica } from "../fisica/fisica.js";
import { PARAMETROS_DEFECTO, parametrosDeEscenario } from "./escenarios.js";
import { acotarValor, ajustarDependientes } from "./parametros.js";
import { leerCSV, alinearConGemelo } from "../utilidades/csv.js";

export const VELOCIDADES = [0.25, 0.5, 1, 2];
export const RETARDO_RECALCULO_MS = 60;   // debounce de los sliders
export const PASO_FLECHAS = 0.01;         // avance con las flechas en pausa [s]

let temporizadorRecalculo = null;

function simularConTiempo(parametros) {
  const inicio = performance.now();
  const sim = Fisica.simular(parametros);
  return { sim, msSimulacion: performance.now() - inicio };
}

export const usarGemelo = create((set, get) => ({
  /* Parametros y simulacion */
  parametros: { ...PARAMETROS_DEFECTO },
  escenario: "estandar",
  ...simularConTiempo(PARAMETROS_DEFECTO),

  /* Reloj de reproduccion */
  t: 0,
  indice: 0,
  reproduciendo: false,
  velocidad: 1,
  bucle: false,

  /* Camara: solicitudVista aumenta en cada clic para repetir la misma vista */
  vista: "general",
  solicitudVista: 0,
  setVista: (vista) => set((s) => ({ vista, solicitudVista: s.solicitudVista + 1 })),

  /* Datos de Simulink: columnas alineadas con la malla de tiempo del gemelo */
  simulink: null,          // { nombre, columnas, interpolado, dt, tMin, tMax, filas, avisos }
  erroresSimulink: null,   // mensajes si el ultimo archivo no era valido
  cargarSimulink: (texto, nombre) => {
    const leido = leerCSV(texto);
    if (!leido.ok) {
      set({ erroresSimulink: leido.errores });
      return false;
    }
    const alineado = alinearConGemelo(leido.columnas, get().sim.r.t);
    set({ simulink: { nombre, filas: leido.filas, avisos: leido.avisos, ...alineado }, erroresSimulink: null });
    return true;
  },
  quitarSimulink: () => set({ simulink: null, erroresSimulink: null }),

  /* Captura PNG de la escena en 1920x1080 (la atiende Capturador.jsx) */
  solicitudCaptura: 0,
  capturarEscena: () => set((s) => ({ solicitudCaptura: s.solicitudCaptura + 1 })),

  /* Interfaz: paneles laterales y medidor de FPS */
  paneles: { parametros: true, valores: true },
  mostrarFPS: false,
  alternarPanel: (nombre) => set((s) => ({ paneles: { ...s.paneles, [nombre]: !s.paneles[nombre] } })),
  alternarFPS: () => set((s) => ({ mostrarFPS: !s.mostrarFPS })),

  // Cambia un parametro al instante (acotado a su rango y paso, corrigiendo los que
  // dependen de el), marca el escenario como personalizado y recalcula con retardo.
  setParametro: (nombre, valor) => {
    set((s) => {
      const acotado = acotarValor(nombre, valor, s.parametros);
      return { parametros: ajustarDependientes({ ...s.parametros, [nombre]: acotado }), escenario: null };
    });
    clearTimeout(temporizadorRecalculo);
    temporizadorRecalculo = setTimeout(() => get().recalcular(), RETARDO_RECALCULO_MS);
  },

  // Recalcula la simulacion sin mover el tiempo de reproduccion.
  recalcular: () => {
    clearTimeout(temporizadorRecalculo);
    const nuevo = simularConTiempo(get().parametros);
    set({ ...nuevo, indice: Fisica.indice(nuevo.sim, get().t) });
  },

  restablecerParametro: (nombre) => get().setParametro(nombre, PARAMETROS_DEFECTO[nombre]),
  restablecerTodo: () => get().aplicarEscenario("estandar"),

  aplicarEscenario: (id) => {
    set({ parametros: parametrosDeEscenario(id), escenario: id });
    get().recalcular();
    get().reiniciar();
  },

  play: () => {
    // Si ya termino, vuelve a empezar desde 0.
    if (get().t >= get().sim.p.tf) get().irA(0);
    set({ reproduciendo: true });
  },
  pausa: () => set({ reproduciendo: false }),
  reiniciar: () => {
    set({ reproduciendo: false });
    get().irA(0);
  },
  alternarReproduccion: () => (get().reproduciendo ? get().pausa() : get().play()),
  // Avance cuadro a cuadro (flechas): solo en pausa
  pasoManual: (sentido) => {
    if (!get().reproduciendo) get().irA(get().t + sentido * PASO_FLECHAS);
  },
  setVelocidad: (velocidad) => set({ velocidad }),
  setBucle: (bucle) => set({ bucle }),

  // Mueve la reproduccion al instante t (acotado a [0, tf]) y devuelve el indice.
  irA: (t) => {
    const { sim } = get();
    const tAcotado = Math.min(Math.max(t, 0), sim.p.tf);
    const indice = Fisica.indice(sim, tAcotado);
    set({ t: tAcotado, indice });
    return indice;
  },

  // Avanza el reloj dtReal segundos de tiempo real (lo llama useReloj en cada cuadro).
  avanzar: (dtReal) => {
    const { reproduciendo, velocidad, bucle, t, sim } = get();
    if (!reproduciendo) return;
    const tf = sim.p.tf;
    const tNuevo = t + dtReal * velocidad;
    if (tNuevo < tf) {
      get().irA(tNuevo);
    } else if (bucle) {
      get().irA(tNuevo - tf);
    } else {
      get().irA(tf);
      set({ reproduciendo: false });
    }
  },
}));
