/* Polipasto completo. La disposicion se recalcula solo cuando cambia la
   simulacion (parametros); la animacion la hace cada pieza en useFrame. */
import { usarGemelo } from "../../estado/usarGemelo.js";
import { obtenerDisposicion } from "../../geometria/disposicion.js";
import Viga from "./Viga.jsx";
import BloqueFijo from "./BloqueFijo.jsx";
import BloqueMovil from "./BloqueMovil.jsx";
import Cadena from "./Cadena.jsx";

export default function Polipasto() {
  const p = usarGemelo((s) => s.sim.p);
  const disp = obtenerDisposicion(p);

  return (
    <group>
      <Viga disp={disp} />
      <BloqueFijo disp={disp} />
      <BloqueMovil disp={disp} M={p.M} />
      <Cadena disp={disp} />
    </group>
  );
}
