/* Bloque movil: floor(n/2) poleas, amarre si n es impar, gancho y carga.
   Todo el grupo sube con y (eje de las poleas en alturaBloqueMovil(y)). */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { alturaBloqueMovil, DIMENSIONES } from "../../geometria/disposicion.js";
import { MATERIALES } from "./materiales.js";
import PlacasBloque, { Z_PLACA } from "./PlacasBloque.jsx";
import Polea from "./Polea.jsx";
import Gancho from "./Gancho.jsx";
import Carga from "./Carga.jsx";

export default function BloqueMovil({ disp, M }) {
  const grupo = useRef(null);
  const { poleas, amarre, bloques, carga, r } = disp;
  const moviles = poleas.filter((q) => q.bloque === "movil");
  const { xMin, xMax } = bloques.movil;
  const alto = bloques.medioAlto;
  const yBase = -DIMENSIONES.H_movil0;           // piso, relativo al eje con y = 0
  const yCarga = yBase + DIMENSIONES.h_carga;     // cara superior de la carga

  useFrame(() => {
    const { sim, indice } = usarGemelo.getState();
    grupo.current.position.y = alturaBloqueMovil(sim.r.y[indice]);
  });

  return (
    <group ref={grupo} position={[0, alturaBloqueMovil(0), 0]}>
      <PlacasBloque
        xMin={xMin}
        xMax={xMax}
        medioAlto={alto}
        r={r}
        ejes={moviles.map((q) => q.x)}
        amarreX={amarre.bloque === "movil" ? amarre.x : null}
      />
      {moviles.map((q) => <Polea key={q.k} polea={q} r={r} />)}

      {/* Travesaño inferior donde se sujeta el gancho */}
      <mesh position={[-0.035, -alto - 0.012, 0]} material={MATERIALES.bloque} castShadow>
        <boxGeometry args={[0.07, 0.024, 2 * Z_PLACA + 0.008]} />
      </mesh>
      <Gancho yInicio={-alto - 0.024} yCarga={yCarga} />
      <Carga carga={carga} M={M} yInferior={yBase} />
    </group>
  );
}
