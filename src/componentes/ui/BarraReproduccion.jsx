/* Barra de reproduccion: reiniciar, play/pausa, linea de tiempo arrastrable,
   tiempo actual, velocidad y bucle. La linea de tiempo y el tiempo se mueven en
   el DOM con una suscripcion (sin renders de React por cuadro). */
import { useEffect, useRef } from "react";
import { usarGemelo, VELOCIDADES } from "../../estado/usarGemelo.js";
import { MEDIDAS, bordesLaterales } from "./medidas.js";
import Icono from "./Icono.jsx";

const botonIcono =
  "flex size-8 items-center justify-center rounded-lg text-neutral-700 hover:bg-neutral-900/5 hover:text-neutral-950";

export default function BarraReproduccion() {
  const reproduciendo = usarGemelo((s) => s.reproduciendo);
  const velocidad = usarGemelo((s) => s.velocidad);
  const bucle = usarGemelo((s) => s.bucle);
  const tf = usarGemelo((s) => s.sim.p.tf);
  const paneles = usarGemelo((s) => s.paneles);
  const acciones = usarGemelo.getState();
  const linea = useRef(null);
  const tiempo = useRef(null);
  const arrastre = useRef(null);

  useEffect(() => {
    const pintar = ({ t }) => {
      if (linea.current) linea.current.value = t;
      if (tiempo.current) tiempo.current.textContent = t.toFixed(3);
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, [tf]);

  const { izquierda, derecha } = bordesLaterales(paneles);

  return (
    <div
      className="vidrio absolute flex items-center gap-2 px-2"
      style={{ left: izquierda, right: derecha, bottom: MEDIDAS.margen, height: MEDIDAS.altoReproduccion }}
      role="toolbar"
      aria-label="Reproducción"
    >
      <button className={botonIcono} onClick={acciones.reiniciar} title="Reiniciar (R)" aria-label="Reiniciar">
        <Icono nombre="reiniciar" />
      </button>
      <button
        className="flex size-9 items-center justify-center rounded-full bg-neutral-900 text-white shadow hover:bg-neutral-700"
        onClick={acciones.alternarReproduccion}
        title={reproduciendo ? "Pausa (espacio)" : "Reproducir (espacio)"}
        aria-label={reproduciendo ? "Pausa" : "Reproducir"}
      >
        <Icono nombre={reproduciendo ? "pausa" : "play"} />
      </button>

      <div className="flex shrink-0 items-baseline gap-1 pl-1 font-mono text-[13px] tabular-nums">
        <span ref={tiempo} className="w-[3.4rem] text-right text-neutral-900" />
        <span className="text-neutral-400">/ {tf.toFixed(1)} s</span>
      </div>

      <input
        ref={linea}
        type="range"
        min={0}
        max={tf}
        step={0.001}
        defaultValue={0}
        className="mx-1 h-1.5 min-w-0 flex-1 cursor-pointer"
        aria-label="Línea de tiempo"
        onPointerDown={() => {
          arrastre.current = usarGemelo.getState().reproduciendo;
          acciones.pausa();
        }}
        onInput={(e) => acciones.irA(Number(e.target.value))}
        onPointerUp={() => {
          if (arrastre.current) acciones.play();
          arrastre.current = null;
        }}
      />

      <div className="flex shrink-0 rounded-lg bg-neutral-900/5 p-0.5" role="group" aria-label="Velocidad">
        {VELOCIDADES.map((v) => (
          <button
            key={v}
            onClick={() => acciones.setVelocidad(v)}
            aria-pressed={v === velocidad}
            className={
              "rounded-md px-1.5 py-0.5 font-mono text-[12px] tabular-nums " +
              (v === velocidad ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-600 hover:text-neutral-900")
            }
          >
            {v}×
          </button>
        ))}
      </div>
      <button
        className={botonIcono + (bucle ? " bg-neutral-900/10 text-neutral-950" : "")}
        onClick={() => acciones.setBucle(!bucle)}
        aria-pressed={bucle}
        title="Repetir en bucle"
        aria-label="Bucle"
      >
        <Icono nombre="bucle" />
      </button>
    </div>
  );
}
