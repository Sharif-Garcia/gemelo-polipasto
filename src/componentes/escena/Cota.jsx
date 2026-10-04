/* Cota vertical: linea con flechas en ambos extremos y lineas de referencia
   cortas. API del ref: ref.current.fijar(x, y0, y1, z, visible) */
import { useImperativeHandle, useRef } from "react";

const COLOR = "#3b3a37";
const RADIO = 0.006;
const PUNTA = { radio: 0.02, largo: 0.05 };
const REFERENCIA = 0.09;   // largo de las lineas de referencia horizontales [m]

export default function Cota({ ref, color = COLOR }) {
  const grupo = useRef(null);
  const linea = useRef(null);
  const arriba = useRef(null);
  const abajo = useRef(null);
  const refArriba = useRef(null);
  const refAbajo = useRef(null);

  useImperativeHandle(ref, () => ({
    fijar(x, y0, y1, z, visible = true) {
      const g = grupo.current;
      if (!g) return;
      const largo = Math.abs(y1 - y0);
      g.visible = visible && largo > 0.005;
      if (!g.visible) return;
      g.position.set(x, Math.min(y0, y1), z);
      const punta = Math.min(PUNTA.largo, largo / 2.5);
      const k = punta / PUNTA.largo;
      linea.current.scale.set(1, Math.max(largo - 2 * punta, 1e-4), 1);
      linea.current.position.y = largo / 2;
      abajo.current.scale.setScalar(k);
      abajo.current.position.y = punta / 2;
      arriba.current.scale.setScalar(k);
      arriba.current.position.y = largo - punta / 2;
      refAbajo.current.position.y = 0;
      refArriba.current.position.y = largo;
    },
  }), []);

  return (
    <group ref={grupo} visible={false}>
      <mesh ref={linea}>
        <cylinderGeometry args={[RADIO, RADIO, 1, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={arriba}>
        <coneGeometry args={[PUNTA.radio, PUNTA.largo, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={abajo} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[PUNTA.radio, PUNTA.largo, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={refArriba} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[RADIO * 0.7, RADIO * 0.7, REFERENCIA, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={refAbajo} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[RADIO * 0.7, RADIO * 0.7, REFERENCIA, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
