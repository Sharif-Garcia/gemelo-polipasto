/* Portico de acero: viga superior de perfil I sobre dos columnas, con un carro
   de sujecion en el ala inferior sobre el bloque fijo. */
import { useMemo } from "react";
import { ExtrudeGeometry, Shape } from "three";
import { MATERIALES } from "./materiales.js";
import { DIMENSIONES } from "../../geometria/disposicion.js";

const PERFIL = { alto: 0.2, ancho: 0.12, ala: 0.012, alma: 0.008 };
const X_COLUMNA = DIMENSIONES.x_columna;
const LARGO_VIGA = 3.0;

// Perfil I en el plano (u, v), extruido a lo largo de z
function crearPerfilI(largo) {
  const { alto: h, ancho: b, ala: tf, alma: tw } = PERFIL;
  const s = new Shape();
  s.moveTo(-b / 2, 0);
  s.lineTo(b / 2, 0);
  s.lineTo(b / 2, tf);
  s.lineTo(tw / 2, tf);
  s.lineTo(tw / 2, h - tf);
  s.lineTo(b / 2, h - tf);
  s.lineTo(b / 2, h);
  s.lineTo(-b / 2, h);
  s.lineTo(-b / 2, h - tf);
  s.lineTo(-tw / 2, h - tf);
  s.lineTo(-tw / 2, tf);
  s.lineTo(-b / 2, tf);
  s.closePath();
  return new ExtrudeGeometry(s, { depth: largo, bevelEnabled: false });
}

export default function Viga({ disp }) {
  const yViga = disp.viga.yInferior;
  const xCarro = (disp.bloques.fijo.xMin + disp.bloques.fijo.xMax) / 2;

  const geoViga = useMemo(() => {
    const g = crearPerfilI(LARGO_VIGA);
    g.rotateY(Math.PI / 2);                 // extrusion a lo largo de x
    g.translate(-LARGO_VIGA / 2, 0, 0);
    return g;
  }, []);

  const geoColumna = useMemo(() => {
    const g = crearPerfilI(yViga);
    g.rotateX(-Math.PI / 2);                // extrusion a lo largo de y
    g.translate(0, 0, PERFIL.alto / 2);     // el perfil queda en z = [-alto, 0]
    return g;
  }, [yViga]);

  return (
    <group>
      <mesh geometry={geoViga} position={[0, yViga, 0]} material={MATERIALES.viga} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * X_COLUMNA, 0, 0]}>
          <mesh geometry={geoColumna} material={MATERIALES.viga} castShadow receiveShadow />
          <mesh position={[0, 0.01, 0]} material={MATERIALES.viga} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.02, 0.32]} />
          </mesh>
        </group>
      ))}
      {/* Carro de sujecion bajo el ala inferior */}
      <mesh position={[xCarro, yViga - 0.025, 0]} material={MATERIALES.bloque} castShadow>
        <boxGeometry args={[0.14, 0.05, 0.15]} />
      </mesh>
    </group>
  );
}
