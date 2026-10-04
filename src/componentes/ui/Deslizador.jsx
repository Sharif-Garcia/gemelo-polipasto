/* Parametro con slider y campo numerico sincronizados, unidad, valor por defecto
   y boton de restablecer. El campo acepta coma o punto; se aplica con Enter o al
   salir (Escape cancela). Rango, paso y formato salen de estado/parametros.js. */
import { useRef, useState } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { PARAMETROS_DEFECTO } from "../../estado/escenarios.js";
import { DEFINICIONES, rangoParametro, formatearValor, leerCampo } from "../../estado/parametros.js";
import Simbolo from "./Simbolo.jsx";
import Icono from "./Icono.jsx";

export default function Deslizador({ nombre }) {
  const def = DEFINICIONES[nombre];
  const parametros = usarGemelo((s) => s.parametros);
  const setParametro = usarGemelo((s) => s.setParametro);
  const restablecer = usarGemelo((s) => s.restablecerParametro);
  const [texto, setTexto] = useState(null);   // null: no se esta editando
  const cancelar = useRef(false);

  const valor = parametros[nombre];
  const { min, max } = rangoParametro(nombre, parametros);
  const porDefecto = PARAMETROS_DEFECTO[nombre];
  const unidad = def.unidad ? ` ${def.unidad}` : "";
  const id = `parametro-${nombre}`;

  const confirmar = () => {
    const leido = leerCampo(texto ?? "");
    if (!cancelar.current && leido !== null) setParametro(nombre, leido);
    cancelar.current = false;
    setTexto(null);
  };

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="flex min-w-0 flex-1 items-baseline gap-2 text-[13px]">
          <Simbolo partes={def.simbolo} className="shrink-0 text-[15px] text-neutral-900" />
          <span className="truncate text-neutral-600" title={def.etiqueta}>{def.etiqueta}</span>
        </label>
        <button
          className="rounded-md p-0.5 text-neutral-500 enabled:hover:bg-neutral-900/5 enabled:hover:text-neutral-900 disabled:opacity-25"
          onClick={() => restablecer(nombre)}
          disabled={valor === porDefecto}
          title={`Restablecer (${formatearValor(nombre, porDefecto)}${unidad})`}
          aria-label={`Restablecer ${def.etiqueta}`}
        >
          <Icono nombre="restablecer" />
        </button>
      </div>
      <div className="mt-0.5 flex items-start gap-2">
        <div className="min-w-0 flex-1 pt-1">
          <input
            type="range"
            min={min}
            max={max}
            step={def.paso}
            value={valor}
            onChange={(e) => setParametro(nombre, Number(e.target.value))}
            className="block h-1.5 w-full cursor-pointer"
            aria-label={`${def.etiqueta}${unidad}`}
          />
          <div className="mt-0.5 flex justify-between font-mono text-[10px] tabular-nums text-neutral-400">
            <span>{formatearValor(nombre, min)}</span>
            <span>def. {formatearValor(nombre, porDefecto)}</span>
            <span>{formatearValor(nombre, max)}</span>
          </div>
        </div>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={texto ?? formatearValor(nombre, valor)}
          onFocus={(e) => { setTexto(formatearValor(nombre, valor)); e.target.select(); }}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") { cancelar.current = true; e.currentTarget.blur(); }
          }}
          className="w-[4.6rem] shrink-0 rounded-md border border-neutral-300/80 bg-white/80 px-1.5 py-0.5 text-right font-mono text-[13px] tabular-nums text-neutral-900 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/10"
        />
        <span className="w-10 shrink-0 pt-0.5 text-[11px] text-neutral-500">{def.unidad}</span>
      </div>
    </div>
  );
}
