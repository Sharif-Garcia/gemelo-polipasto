/* Botones de vistas predefinidas de la camara. */
import { usarGemelo } from "../../estado/usarGemelo.js";
import { VISTAS } from "../escena/vistas.js";

export default function SelectorVistas() {
  const vista = usarGemelo((s) => s.vista);
  const setVista = usarGemelo((s) => s.setVista);

  return (
    <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-2xl bg-white/85 p-1.5 shadow-xl backdrop-blur">
      {VISTAS.map((v) => (
        <button
          key={v.id}
          onClick={() => setVista(v.id)}
          className={
            "rounded-xl px-3 py-1.5 text-sm transition-colors " +
            (v.id === vista
              ? "bg-neutral-800 text-white"
              : "text-neutral-700 hover:bg-neutral-200")
          }
        >
          {v.nombre}
        </button>
      ))}
    </div>
  );
}
