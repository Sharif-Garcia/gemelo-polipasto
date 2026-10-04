/* Placas laterales con ventanas, ejes con tuercas y pasador de amarre de un
   bloque de poleas. Las ventanas dejan ver el giro de las poleas.
   Coordenadas locales: y = 0 en el eje de las poleas. */
import { useMemo } from "react";
import { ExtrudeGeometry, Path, Shape } from "three";
import { MATERIALES } from "./materiales.js";
import { ANCHO_POLEA } from "./Polea.jsx";

const ESPESOR_PLACA = 0.008;
const Z_PLACA = ANCHO_POLEA / 2 + 0.006 + ESPESOR_PLACA / 2;

function Eje({ x, radio = 0.011 }) {
  const largo = 2 * Z_PLACA + 0.03;
  return (
    <group position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={MATERIALES.eje} castShadow>
        <cylinderGeometry args={[radio, radio, largo, 20]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * (Z_PLACA + ESPESOR_PLACA / 2 + 0.004), 0]} material={MATERIALES.eje}>
          <cylinderGeometry args={[radio * 1.6, radio * 1.6, 0.008, 6]} />
        </mesh>
      ))}
    </group>
  );
}

const RADIO_ESQUINA = 0.008;

// Rectangulo redondeado con una ventana circular frente a cada polea
function crearPlaca(xMin, xMax, h, ventanas, radioVentana) {
  const e = RADIO_ESQUINA;
  const s = new Shape();
  s.moveTo(xMin + e, -h);
  s.lineTo(xMax - e, -h);
  s.absarc(xMax - e, -h + e, e, -Math.PI / 2, 0, false);
  s.lineTo(xMax, h - e);
  s.absarc(xMax - e, h - e, e, 0, Math.PI / 2, false);
  s.lineTo(xMin + e, h);
  s.absarc(xMin + e, h - e, e, Math.PI / 2, Math.PI, false);
  s.lineTo(xMin, -h + e);
  s.absarc(xMin + e, -h + e, e, Math.PI, 1.5 * Math.PI, false);
  for (const x of ventanas) {
    const hueco = new Path();
    hueco.absarc(x, 0, radioVentana, 0, Math.PI * 2, true);
    s.holes.push(hueco);
  }
  const g = new ExtrudeGeometry(s, { depth: ESPESOR_PLACA, bevelEnabled: false, curveSegments: 32 });
  g.translate(0, 0, -ESPESOR_PLACA / 2);
  return g;
}

export default function PlacasBloque({ xMin, xMax, medioAlto, ejes, r, amarreX = null }) {
  const claveEjes = ejes.join(",");
  const placa = useMemo(
    () => crearPlaca(xMin, xMax, medioAlto, claveEjes.split(",").map(Number), r + 0.017),
    [xMin, xMax, medioAlto, claveEjes, r],
  );
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={placa}
          position={[0, 0, s * Z_PLACA]}
          material={MATERIALES.bloque}
          castShadow
          receiveShadow
        />
      ))}
      {ejes.map((x) => <Eje key={x} x={x} />)}
      {amarreX !== null && <Eje x={amarreX} radio={0.008} />}
    </group>
  );
}

export { Z_PLACA, ESPESOR_PLACA };
