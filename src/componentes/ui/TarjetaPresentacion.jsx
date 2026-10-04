/* Modo presentacion: tarjeta compacta con t, y, ydot, ydd y u (en el DOM con
   una suscripcion, sin renders por cuadro). */
import { useEffect, useRef } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { VARIABLES } from "../../graficas/series.js";
import { MEDIDAS } from "./medidas.js";
import Simbolo from "./Simbolo.jsx";

const FILAS = [
  { clave: "t", simbolo: ["t"], unidad: "s", decimales: 3 },
  { clave: "y", simbolo: ["y"], unidad: "m", decimales: 3 },
  { clave: "ydot", simbolo: ["ẏ"], unidad: "m/s", decimales: 3 },
  { clave: "ydd", simbolo: ["ÿ"], unidad: "m/s²", decimales: 3 },
  { clave: "u", simbolo: ["u"], unidad: "N", decimales: 1 },
];

export default function TarjetaPresentacion() {
  const celdas = useRef({});

  useEffect(() => {
    const pintar = ({ sim, indice, t }) => {
      for (const f of FILAS) {
        const celda = celdas.current[f.clave];
        if (celda) celda.textContent = (f.clave === "t" ? t : sim.r[f.clave][indice]).toFixed(f.decimales);
      }
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, []);

  return (
    <div className="vidrio absolute px-4 py-3" style={{ left: MEDIDAS.margen, top: MEDIDAS.margen }}>
      <dl className="grid grid-cols-[auto_auto_auto] items-baseline gap-x-3 gap-y-1">
        {FILAS.map((f) => (
          <div key={f.clave} className="contents">
            <dt className="flex items-center gap-2">
              <span className="h-3 w-1 rounded-full" style={{ background: VARIABLES[f.clave]?.color ?? "transparent" }} aria-hidden="true" />
              <Simbolo partes={f.simbolo} className="text-[18px] text-neutral-900" />
            </dt>
            <dd ref={(el) => { celdas.current[f.clave] = el; }} className="text-right font-mono text-[20px] tabular-nums text-neutral-900" />
            <dd className="text-[13px] text-neutral-500">{f.unidad}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-neutral-400">P o Esc: salir de la presentación</p>
    </div>
  );
}
