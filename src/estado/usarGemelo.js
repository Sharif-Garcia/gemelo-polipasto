/* Estado global del gemelo digital (zustand).
   Unica fuente de verdad de parametros, simulacion y reloj de reproduccion.
   Los componentes que necesitan valores en cada cuadro NO deben suscribirse a t
   con un selector: deben leer getState() o usar usarGemelo.subscribe con refs. */
import { create } from "zustand";
import { Fisica } from "../fisica/fisica.js";
import { PARAMETROS_DEFECTO, parametrosDeEscenario } from "./escenarios.js";

export const VELOCIDADES = [0.25, 0.5, 1, 2];
export const RETARDO_RECALCULO_MS = 60;   // debounce de los sliders

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

  // Cambia un parametro al instante y recalcula con un retardo corto.
  setParametro: (nombre, valor) => {
    set((s) => ({ parametros: { ...s.parametros, [nombre]: valor }, escenario: null }));
    clearTimeout(temporizadorRecalculo);
    temporizadorRecalculo = setTimeout(() => get().recalcular(), RETARDO_RECALCULO_MS);
  },

  // Recalcula la simulacion sin mover el tiempo de reproduccion.
  recalcular: () => {
    clearTimeout(temporizadorRecalculo);
    const nuevo = simularConTiempo(get().parametros);
    set({ ...nuevo, indice: Fisica.indice(nuevo.sim, get().t) });
  },

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
