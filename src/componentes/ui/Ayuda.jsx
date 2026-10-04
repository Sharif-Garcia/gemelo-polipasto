/* Cuadro de ayuda (tecla H o ?): atajos de teclado y que hace cada panel. */
import { usarGemelo } from "../../estado/usarGemelo.js";

const ATAJOS = [
  ["Espacio", "Reproducir / pausar"],
  ["R", "Reiniciar (t = 0)"],
  ["← →", "Retroceder / avanzar 0.01 s (en pausa)"],
  ["1 a 6", "Vistas: General, Frontal, Lateral, Poleas fijas, Poleas móviles, Operario"],
  ["A", "Alternar Estudio / Análisis"],
  ["P", "Modo presentación (solo reproducción y valores clave)"],
  ["H o ?", "Mostrar u ocultar esta ayuda"],
  ["Esc", "Cerrar la ayuda o salir del modo presentación"],
  ["F", "Medidor de cuadros por segundo"],
];

const PANELES = [
  ["Parámetros (izquierda)", "Sliders y campos numéricos de la carga, el polipasto, la cadena, el operario y la fricción. Cada cambio recalcula la simulación sin reiniciar; los escenarios cargan casos típicos."],
  ["Valores en vivo (derecha)", "Variables del instante actual (t, y, ẏ, ÿ, u, T, s, ṡ, N) y magnitudes derivadas (M_eq, F_min, ventaja mecánica)."],
  ["Análisis (derecha, modo Análisis)", "Ecuación de movimiento con los números del instante y su verificación, fuerzas sobre el bloque móvil y tensión de cada ramal."],
  ["Vistas (arriba)", "Encuadres de cámara; «Poleas móviles» sigue al bloque. Con el mouse: arrastrar gira, rueda acerca, clic derecho desplaza."],
  ["Reproducción (abajo)", "Play, reinicio, línea de tiempo arrastrable, velocidad y bucle."],
  ["Gráficas (inferior)", "Curvas con cursor sincronizado. Arrastrar mueve el tiempo; rueda o Shift + arrastrar hace zoom. «Validación con Simulink» carga el CSV, compara y exporta."],
];

export default function Ayuda() {
  const abierta = usarGemelo((s) => s.ayuda);
  const alternarAyuda = usarGemelo((s) => s.alternarAyuda);
  if (!abierta) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/25 p-4" onClick={alternarAyuda}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-ayuda"
        className="vidrio max-h-[90vh] w-[min(760px,100%)] overflow-y-auto p-6 text-[13px] text-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="titulo-ayuda" className="text-base font-semibold text-neutral-900">Ayuda</h2>
          <button className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-900/5" onClick={alternarAyuda} aria-label="Cerrar ayuda">
            Cerrar (Esc)
          </button>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Atajos de teclado</h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              {ATAJOS.map(([tecla, accion]) => (
                <div key={tecla} className="contents">
                  <dt><kbd className="rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 font-mono text-[12px]">{tecla}</kbd></dt>
                  <dd className="text-neutral-700">{accion}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Paneles</h3>
            <dl className="mt-2 space-y-2">
              {PANELES.map(([nombre, texto]) => (
                <div key={nombre}>
                  <dt className="font-medium text-neutral-900">{nombre}</dt>
                  <dd className="text-neutral-600">{texto}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <p className="mt-4 border-t border-neutral-900/10 pt-3 text-[12px] text-neutral-500">
          Modelo: M_eq·ÿ = n·u − μ·n·u·sgn(ẏ) − M_t·g − b·ẏ + N, integrado con RK4 (Δt = 1 ms), validado contra MATLAB/Simulink.
        </p>
      </div>
    </div>
  );
}
