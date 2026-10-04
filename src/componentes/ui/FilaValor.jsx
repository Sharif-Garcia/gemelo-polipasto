/* Fila del panel de valores: color de la serie, simbolo, nombre, valor y unidad. */
import { VARIABLES } from "../../graficas/series.js";
import Simbolo from "./Simbolo.jsx";

// Color de la serie en las graficas (la velocidad de la cadena usa el de s)
const colorDe = (clave) => VARIABLES[clave === "sdot" ? "s" : clave]?.color;

export default function FilaValor({ fila, valor, celda }) {
  const color = colorDe(fila.clave);
  return (
    <div className="flex items-center gap-2 py-[2px] text-[12.5px]" title={fila.completo ?? fila.nombre}>
      <span className="h-2.5 w-0.5 shrink-0 rounded-full" style={{ background: color ?? "transparent" }} aria-hidden="true" />
      <Simbolo partes={fila.simbolo} className="w-8 shrink-0 text-[14px] text-neutral-900" />
      <span className="min-w-0 flex-1 truncate text-neutral-600">{fila.nombre}</span>
      <span ref={celda} className="w-[4.3rem] shrink-0 text-right font-mono tabular-nums text-neutral-900">{valor}</span>
      <span className="w-8 shrink-0 text-[11px] text-neutral-500">{fila.unidad}</span>
    </div>
  );
}
