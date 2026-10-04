/* Panel de graficas plegable en la parte inferior, con pestañas.
   Las graficas apiladas comparten el zoom del eje del tiempo. */
import { useState } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { PESTANAS, buscarPestana, datosGrafica, marcasEventos, esRangoCompleto } from "../../graficas/series.js";
import GraficaUPlot from "./GraficaUPlot.jsx";

const ALTO_UNA = 175;      // grafica sola [px]
const ALTO_APILADA = 62;   // cada grafica de "Todas" [px]
const EJE_TIEMPO = 44;     // espacio extra de la grafica que lleva el eje t

export default function Graficas() {
  const sim = usarGemelo((s) => s.sim);
  const [abierto, setAbierto] = useState(true);
  const [pestanaId, setPestanaId] = useState("y");
  const [rango, setRango] = useState(null);   // null = tiempo completo

  const pestana = buscarPestana(pestanaId);
  const marcas = marcasEventos(sim);
  const apiladas = pestana.graficas.length > 1;
  const zoomActivo = rango !== null && !esRangoCompleto(rango, sim);

  return (
    <section className="shrink-0 border-t border-neutral-200 bg-white/85 backdrop-blur" aria-label="Gráficas">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
        <button
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
        >
          <span className={"inline-block transition-transform " + (abierto ? "rotate-90" : "")}>›</span>
          Gráficas
        </button>
        <nav className="flex flex-wrap gap-1" role="tablist">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={p.id === pestanaId}
              onClick={() => { setPestanaId(p.id); setAbierto(true); }}
              className={
                "rounded-lg px-2.5 py-1 text-xs transition-colors " +
                (p.id === pestanaId ? "bg-neutral-800 text-white" : "text-neutral-600 hover:bg-neutral-100")
              }
            >
              {p.nombre}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
          <span className="hidden lg:inline">Arrastra para mover el tiempo · rueda o Shift + arrastrar para zoom</span>
          <button
            className="rounded-lg border border-neutral-300 px-2 py-1 text-neutral-700 enabled:hover:bg-neutral-100 disabled:opacity-40"
            onClick={() => setRango(null)}
            disabled={!zoomActivo}
          >
            Restablecer zoom
          </button>
        </div>
      </header>

      {/* Se pliega animando la altura: el lienzo 3D crece poco a poco y la camara se reencuadra */}
      <div
        className={"grid transition-[grid-template-rows] duration-300 ease-out " +
          (abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="min-h-0 overflow-hidden" inert={!abierto}>
          <div className="flex flex-col px-4 pb-2">
          {pestana.graficas.map((claves, i) => {
            const ultima = i === pestana.graficas.length - 1;
            const alto = (apiladas ? ALTO_APILADA : ALTO_UNA) + (ultima ? EJE_TIEMPO : 0);
            return (
              <GraficaUPlot
                key={`${pestana.id}-${claves.join(",")}`}
                claves={claves}
                datos={datosGrafica(sim, claves)}
                marcas={marcas}
                rango={rango}
                alto={alto}
                ejeTiempo={ultima}
                etiquetasMarcas={i === 0}
                compacta={apiladas}
                onZoom={setRango}
              />
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
