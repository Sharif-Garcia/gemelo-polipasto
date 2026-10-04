/* Bloque fijo: ceil(n/2) poleas, amarre si n es par y suspension hasta la viga. */
import { MATERIALES } from "./materiales.js";
import PlacasBloque, { Z_PLACA } from "./PlacasBloque.jsx";
import Polea from "./Polea.jsx";

export default function BloqueFijo({ disp }) {
  const { H_fijo, poleas, amarre, bloques, viga, r } = disp;
  const fijas = poleas.filter((q) => q.bloque === "fijo");
  const { xMin, xMax } = bloques.fijo;
  const xc = (xMin + xMax) / 2;
  const alto = bloques.medioAlto;
  const largoSuspension = viga.yInferior - H_fijo - alto;

  return (
    <group position={[0, H_fijo, 0]}>
      <PlacasBloque
        xMin={xMin}
        xMax={xMax}
        medioAlto={alto}
        r={r}
        ejes={fijas.map((q) => q.x)}
        amarreX={amarre.bloque === "fijo" ? amarre.x : null}
      />
      {fijas.map((q) => <Polea key={q.k} polea={q} r={r} />)}

      {/* Travesaño superior y barra de suspension */}
      <mesh position={[xc, alto + 0.012, 0]} material={MATERIALES.bloque} castShadow>
        <boxGeometry args={[Math.min(xMax - xMin, 0.12), 0.024, 2 * Z_PLACA + 0.008]} />
      </mesh>
      <mesh position={[xc, alto + largoSuspension / 2, 0]} material={MATERIALES.eje} castShadow>
        <cylinderGeometry args={[0.012, 0.012, largoSuspension, 16]} />
      </mesh>
    </group>
  );
}
