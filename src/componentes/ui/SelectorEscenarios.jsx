/* Selector de escenario ("Personalizado" al mover cualquier parametro) y boton
   para restablecer todos los parametros. */
import { usarGemelo } from "../../estado/usarGemelo.js";
import { ESCENARIOS } from "../../estado/escenarios.js";
import Icono from "./Icono.jsx";

export default function SelectorEscenarios() {
  const escenario = usarGemelo((s) => s.escenario);
  const aplicarEscenario = usarGemelo((s) => s.aplicarEscenario);
  const restablecerTodo = usarGemelo((s) => s.restablecerTodo);
  const actual = ESCENARIOS.find((e) => e.id === escenario);

  return (
    <div className="mb-2 border-b border-neutral-900/10 pb-3">
      <label htmlFor="escenario" className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        Escenario
      </label>
      <div className="mt-1 flex gap-2">
        <select
          id="escenario"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300/80 bg-white/80 px-2 py-1 text-[13px] text-neutral-900 outline-none focus:border-neutral-500"
          value={escenario ?? ""}
          onChange={(e) => aplicarEscenario(e.target.value)}
        >
          {escenario === null && <option value="">Personalizado</option>}
          {ESCENARIOS.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <button
          className="flex items-center gap-1 rounded-lg border border-neutral-300/80 bg-white/70 px-2 py-1 text-xs text-neutral-700 hover:bg-white"
          onClick={restablecerTodo}
          title="Restablecer todos los parámetros"
        >
          <Icono nombre="restablecer" />
          Todo
        </button>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-snug text-neutral-500">
        {actual ? actual.descripcion : "Parámetros modificados a mano."}
      </p>
    </div>
  );
}
