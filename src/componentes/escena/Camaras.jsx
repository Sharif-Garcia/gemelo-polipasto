/* Control de camara con giro de 360°, limites y transicion suave a las vistas. */
import { useEffect, useRef } from "react";
import { Box3, Vector3 } from "three";
import { CameraControls } from "@react-three/drei";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { buscarVista } from "./vistas.js";

// Zona donde puede moverse el punto al que mira la camara [m]
const LIMITES_OBJETIVO = new Box3(new Vector3(-4, 0.2, -2.5), new Vector3(4, 4.5, 4));

export default function Camaras() {
  const controles = useRef(null);
  const solicitudVista = usarGemelo((s) => s.solicitudVista);
  const primeraVez = useRef(true);

  useEffect(() => {
    const c = controles.current;
    if (!c) return;
    const { posicion, objetivo } = buscarVista(usarGemelo.getState().vista);
    // La primera vista se coloca sin animacion; las demas con transicion.
    c.setLookAt(...posicion, ...objetivo, !primeraVez.current);
    primeraVez.current = false;
  }, [solicitudVista]);

  useEffect(() => {
    controles.current?.setBoundary(LIMITES_OBJETIVO);
  }, []);

  return (
    <CameraControls
      ref={controles}
      makeDefault
      minDistance={0.8}
      maxDistance={14}
      maxPolarAngle={Math.PI / 2 - 0.05}   // no pasar por debajo del piso
      smoothTime={0.6}
    />
  );
}
