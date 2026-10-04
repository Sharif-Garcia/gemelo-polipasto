import { useReloj } from "./hooks/useReloj.js";
import Escena from "./componentes/escena/Escena.jsx";
import PanelDepuracion from "./componentes/ui/PanelDepuracion.jsx";
import SelectorVistas from "./componentes/ui/SelectorVistas.jsx";

export default function App() {
  useReloj();

  return (
    <div className="relative h-screen w-screen bg-neutral-200">
      <Escena />
      <PanelDepuracion />
      <SelectorVistas />
    </div>
  );
}
