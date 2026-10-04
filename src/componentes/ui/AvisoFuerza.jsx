/* Aviso cuando F0 < F_min: la carga no despega. Se calcula con los parametros
   actuales (sin esperar el recalculo de la simulacion). */
import { usarGemelo } from "../../estado/usarGemelo.js";
import { Fisica } from "../../fisica/fisica.js";
import Icono from "./Icono.jsx";

export default function AvisoFuerza({ compacto = false }) {
  const parametros = usarGemelo((s) => s.parametros);
  const { F_min } = Fisica.derivados({ ...Fisica.PARAMETROS_BASE, ...parametros });
  if (parametros.F0 >= F_min) return null;

  const texto = `La fuerza no alcanza para levantar la carga (F_min = ${F_min.toFixed(2)} N)`;
  return (
    <div
      role="status"
      className={
        "flex items-start gap-2 rounded-xl border border-amber-300/80 bg-amber-50/90 text-amber-900 " +
        (compacto ? "mt-1 px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[13px] font-medium shadow-lg backdrop-blur")
      }
    >
      <Icono nombre="alerta" className="mt-px text-amber-600" />
      <span>{texto}</span>
    </div>
  );
}
