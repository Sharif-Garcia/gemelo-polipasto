import { useReloj } from "./hooks/useReloj.js";
import { useAtajos } from "./hooks/useAtajos.js";
import { usarGemelo } from "./estado/usarGemelo.js";
import Escena from "./componentes/escena/Escena.jsx";
import PanelParametros from "./componentes/ui/PanelParametros.jsx";
import ValoresEnVivo from "./componentes/ui/ValoresEnVivo.jsx";
import SelectorVistas from "./componentes/ui/SelectorVistas.jsx";
import BarraReproduccion from "./componentes/ui/BarraReproduccion.jsx";
import AvisoFuerza from "./componentes/ui/AvisoFuerza.jsx";
import Graficas from "./componentes/ui/Graficas.jsx";
import { MEDIDAS, bordesLaterales } from "./componentes/ui/medidas.js";

export default function App() {
  useReloj();
  useAtajos();
  const paneles = usarGemelo((s) => s.paneles);
  const { izquierda, derecha } = bordesLaterales(paneles);

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-200 font-sans">
      {/* Escena al centro con los paneles de vidrio encima; las graficas debajo */}
      <main className="relative min-h-0 flex-1">
        <Escena />
        <SelectorVistas />
        <div
          className="pointer-events-none absolute flex justify-center"
          style={{ left: izquierda, right: derecha, top: 2 * MEDIDAS.margen + MEDIDAS.altoVistas }}
        >
          <AvisoFuerza />
        </div>
        <PanelParametros />
        <ValoresEnVivo />
        <BarraReproduccion />
      </main>
      <Graficas />
    </div>
  );
}
