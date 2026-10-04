/* Flecha vertical de una fuerza. API del ref:
     ref.current.fijar(x, y, z, sentido, largo, visible)
   sentido +1 hacia arriba, -1 hacia abajo; largo en metros (escala comun). */
import { useImperativeHandle, useRef } from "react";

const RADIO = 0.012;
const PUNTA = { radio: 0.032, largo: 0.075 };

export default function VectorFuerza({ ref, color }) {
  const grupo = useRef(null);
  const cuerpo = useRef(null);
  const punta = useRef(null);

  useImperativeHandle(ref, () => ({
    fijar(x, y, z, sentido, largo, visible) {
      const g = grupo.current;
      if (!g) return;
      g.visible = visible && largo > 1e-4;
      if (!g.visible) return;
      g.position.set(x, y, z);
      g.scale.y = sentido;   // la flecha se dibuja hacia +y y se refleja si apunta abajo
      const largoPunta = Math.min(PUNTA.largo, largo * 0.5);
      const largoCuerpo = largo - largoPunta;
      cuerpo.current.scale.set(1, largoCuerpo, 1);
      cuerpo.current.position.y = largoCuerpo / 2;
      punta.current.scale.set(largoPunta / PUNTA.largo, largoPunta / PUNTA.largo, largoPunta / PUNTA.largo);
      punta.current.position.y = largoCuerpo + largoPunta / 2;
    },
  }), []);

  return (
    <group ref={grupo} visible={false}>
      <mesh ref={cuerpo} renderOrder={10}>
        <cylinderGeometry args={[RADIO, RADIO, 1, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={punta} renderOrder={10}>
        <coneGeometry args={[PUNTA.radio, PUNTA.largo, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
