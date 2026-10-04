/* Estudio fotografico: ciclorama claro (piso y pared con curva continua),
   iluminacion de estudio y sombras suaves. */
import { useMemo } from "react";
import { PlaneGeometry } from "three";
import { Environment, ContactShadows } from "@react-three/drei";

export const COLOR_ESTUDIO = "#e8e8eb";

// Perfil del ciclorama en el plano (z, y) [m]
const ANCHO = 80;          // a lo largo de x (bordes ocultos por la niebla)
const FONDO_PISO = 9;      // piso desde z = +6 hasta el inicio de la curva
const Z_FRENTE = 6;
const RADIO_CURVA = 2.5;
const ALTO_PARED = 8;

function crearCiclorama() {
  const largoCurva = (Math.PI / 2) * RADIO_CURVA;
  const largoTotal = FONDO_PISO + largoCurva + ALTO_PARED;
  const geometria = new PlaneGeometry(ANCHO, largoTotal, 1, 120);
  const pos = geometria.attributes.position;
  const zInicioCurva = Z_FRENTE - FONDO_PISO;

  // Cada vertice se ubica segun su distancia s a lo largo del perfil.
  for (let i = 0; i < pos.count; i++) {
    const s = pos.getY(i) + largoTotal / 2;
    let y, z;
    if (s <= FONDO_PISO) {
      y = 0;
      z = Z_FRENTE - s;
    } else if (s <= FONDO_PISO + largoCurva) {
      const ang = (s - FONDO_PISO) / RADIO_CURVA;
      y = RADIO_CURVA * (1 - Math.cos(ang));
      z = zInicioCurva - RADIO_CURVA * Math.sin(ang);
    } else {
      y = RADIO_CURVA + (s - FONDO_PISO - largoCurva);
      z = zInicioCurva - RADIO_CURVA;
    }
    pos.setXYZ(i, pos.getX(i), y, z);
  }
  geometria.computeVertexNormals();
  return geometria;
}

export default function Estudio() {
  const ciclorama = useMemo(() => crearCiclorama(), []);

  return (
    <>
      <color attach="background" args={[COLOR_ESTUDIO]} />
      <fog attach="fog" args={[COLOR_ESTUDIO, 16, 34]} />

      <Environment preset="studio" environmentIntensity={0.8} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[4, 8, 5]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={6}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />

      <mesh geometry={ciclorama} receiveShadow>
        <meshStandardMaterial color={COLOR_ESTUDIO} roughness={0.95} metalness={0} />
      </mesh>

      <ContactShadows position={[0, 0.002, 0]} opacity={0.45} scale={8} blur={2.4} far={3} />
    </>
  );
}
