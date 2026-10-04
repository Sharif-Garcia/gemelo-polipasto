/* Polea con ranura, alma con agujeros y cubo. Gira con theta_k = k*y/r_polea. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { LatheGeometry, Vector2 } from "three";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { anguloPolea } from "../../geometria/disposicion.js";
import { MATERIALES } from "./materiales.js";

export const ANCHO_POLEA = 0.032;   // [m]
const NUM_AGUJEROS = 5;

function crearGeometriaPolea(r) {
  const rg = r - 0.0095;            // fondo de la ranura (la cadena va centrada en r)
  const rf = r + 0.007;             // borde de las pestañas (la cadena asoma por encima)
  const rAlma = rg - 0.006;
  const rCubo = Math.min(0.018, rAlma * 0.5);
  const w = ANCHO_POLEA / 2, wCubo = 0.018, wAlma = 0.005;
  const perfil = [
    [0.001, -wCubo], [rCubo, -wCubo], [rCubo, -wAlma], [rAlma, -wAlma], [rAlma, -w],
    [rf, -w], [rf, -w + 0.003], [rg, -0.0095], [rg, 0.0095], [rf, w - 0.003], [rf, w],
    [rAlma, w], [rAlma, wAlma], [rCubo, wAlma], [rCubo, wCubo], [0.001, wCubo],
  ].map(([x, y]) => new Vector2(x, y));
  const geometria = new LatheGeometry(perfil, 48);
  geometria.rotateX(Math.PI / 2);   // eje de giro en z
  return { geometria, rAgujeros: (rCubo + rAlma) / 2, radioAgujero: (rAlma - rCubo) * 0.38 };
}

export default function Polea({ polea, r, y0 = 0 }) {
  const giratorio = useRef(null);
  const { geometria, rAgujeros, radioAgujero } = useMemo(() => crearGeometriaPolea(r), [r]);

  useFrame(() => {
    const { sim, indice } = usarGemelo.getState();
    giratorio.current.rotation.z = anguloPolea(polea, sim.r.y[indice], r);
  });

  return (
    <group position={[polea.x, y0, 0]}>
      <group ref={giratorio}>
        <mesh geometry={geometria} material={MATERIALES.polea} castShadow receiveShadow />
        {Array.from({ length: NUM_AGUJEROS }, (_, i) => {
          const ang = (i / NUM_AGUJEROS) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[rAgujeros * Math.cos(ang), rAgujeros * Math.sin(ang), 0]}
              rotation={[Math.PI / 2, 0, 0]}
              material={MATERIALES.hueco}
            >
              <cylinderGeometry args={[radioAgujero, radioAgujero, 0.0115, 16]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
