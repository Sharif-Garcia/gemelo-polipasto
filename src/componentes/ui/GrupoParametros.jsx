/* Seccion plegable del panel de parametros. */
import { useState } from "react";
import Deslizador from "./Deslizador.jsx";
import AvisoFuerza from "./AvisoFuerza.jsx";
import Icono from "./Icono.jsx";

export default function GrupoParametros({ grupo }) {
  const [abierto, setAbierto] = useState(true);
  return (
    <section className="border-b border-neutral-900/10 py-1.5 last:border-b-0">
      <button
        className="flex w-full items-center gap-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-800"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
      >
        <Icono nombre="abajo" className={"transition-transform " + (abierto ? "" : "-rotate-90")} />
        {grupo.nombre}
      </button>
      {abierto && (
        <div>
          {grupo.parametros.map((nombre) => (
            <div key={nombre}>
              <Deslizador nombre={nombre} />
              {nombre === "F0" && <AvisoFuerza compacto />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
