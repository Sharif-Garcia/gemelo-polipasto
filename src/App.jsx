import { useReloj } from "./hooks/useReloj.js";
import Escena from "./componentes/escena/Escena.jsx";
import PanelDepuracion from "./componentes/ui/PanelDepuracion.jsx";
import SelectorVistas from "./componentes/ui/SelectorVistas.jsx";
import Graficas from "./componentes/ui/Graficas.jsx";

export default function App() {
  useReloj();

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-200">
      {/* La escena ocupa el espacio que deja el panel de graficas: nunca queda tapada */}
      <div className="relative min-h-0 flex-1">
        <Escena />
        <PanelDepuracion />
        <SelectorVistas />
      </div>
      <Graficas />
    </div>
  );
}
