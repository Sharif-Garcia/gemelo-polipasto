/* Control de camara con giro de 360°, limites, transicion suave a las vistas
   y seguimiento en vivo del bloque movil en la vista "Poleas moviles". */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Box3, Vector3 } from "three";
import { CameraControls } from "@react-three/drei";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { obtenerDisposicion, alturaBloqueMovil } from "../../geometria/disposicion.js";
import { buscarVista, encuadreVista } from "./vistas.js";

// Zona donde puede moverse el punto al que mira la camara [m]
const LIMITES_OBJETIVO = new Box3(new Vector3(-4, 0.2, -2.5), new Vector3(4, 4.5, 4));

// camera-controls no tiene una API publica para desplazar a la vez el objetivo
// actual y el final: moveTo/setTarget sin transicion cortan la animacion en curso
// (salto) y con transicion se retrasan respecto al bloque. Se desplazan ambos
// vectores internos; update() recoloca la camara como objetivo + esfera, asi que
// el giro y el zoom del usuario se conservan.
function desplazarVertical(controles, dy) {
  controles._target.y += dy;
  controles._targetEnd.y += dy;
  controles._needsUpdate = true;
}

export default function Camaras() {
  const controles = useRef(null);
  const solicitudVista = usarGemelo((s) => s.solicitudVista);
  const p = usarGemelo((s) => s.sim.p);
  const primeraVez = useRef(true);
  const pAnterior = useRef(p);
  const alturaSeguida = useRef(0);

  // Lleva la camara a la vista actual (con animacion salvo la primera vez)
  const encuadrar = (animar) => {
    const c = controles.current;
    if (!c) return;
    const { vista, sim, indice } = usarGemelo.getState();
    const y = sim.r.y[indice];
    const { posicion, objetivo } = encuadreVista(vista, obtenerDisposicion(sim.p), y);
    c.setLookAt(...posicion, ...objetivo, animar);
    alturaSeguida.current = alturaBloqueMovil(y);
  };

  useEffect(() => {
    encuadrar(!primeraVez.current);
    primeraVez.current = false;
  }, [solicitudVista]);

  // Si cambian los parametros (n, r_polea...), las vistas de poleas se reencuadran
  useEffect(() => {
    if (pAnterior.current === p) return;
    pAnterior.current = p;
    if (buscarVista(usarGemelo.getState().vista).bloque) encuadrar(true);
  }, [p]);

  useEffect(() => {
    controles.current?.setBoundary(LIMITES_OBJETIVO);
  }, []);

  // Seguimiento: antes de que los controles actualicen la camara (prioridad -1)
  useFrame(() => {
    const { vista, sim, indice } = usarGemelo.getState();
    if (!buscarVista(vista).sigue || !controles.current) return;
    const altura = alturaBloqueMovil(sim.r.y[indice]);
    const dy = altura - alturaSeguida.current;
    alturaSeguida.current = altura;
    if (dy !== 0) desplazarVertical(controles.current, dy);
  }, -2);

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
