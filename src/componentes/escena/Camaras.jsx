/* Control de camara con giro de 360°, limites, transicion suave a las vistas
   y seguimiento en vivo del bloque movil en la vista "Poleas moviles". */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Vector3 } from "three";
import { CameraControls } from "@react-three/drei";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { obtenerDisposicion, alturaBloqueMovil } from "../../geometria/disposicion.js";
import { buscarVista, encuadreVista } from "./vistas.js";
import { areaVisible } from "../ui/medidas.js";

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

// Lleva la camara a la vista actual para el area visible del lienzo.
// Devuelve la altura del bloque movil en ese momento (punto de partida del seguimiento).
function encuadrar(controles, { camera, size }, animar) {
  const { vista, sim, indice, paneles } = usarGemelo.getState();
  const y = sim.r.y[indice];
  const fov = (camera.fov * Math.PI) / 180;
  const area = areaVisible(size.width, size.height, paneles);
  const { posicion, objetivo } = encuadreVista(vista, obtenerDisposicion(sim.p), y, fov, area.ancho / area.alto);
  controles.setLookAt(...posicion, ...objetivo, animar);
  return alturaBloqueMovil(y);
}

export default function Camaras() {
  const controles = useRef(null);
  const solicitudVista = usarGemelo((s) => s.solicitudVista);
  const paneles = usarGemelo((s) => s.paneles);
  const get = useThree((s) => s.get);
  const ancho = useThree((s) => s.size.width);
  const alto = useThree((s) => s.size.height);
  const primeraVez = useRef(true);
  const alturaSeguida = useRef(0);

  // El cuadro de la camara es el area libre entre paneles y barras; el lienzo sigue
  // dibujando debajo de ellos (setViewOffset). Al cambiar el tamaño o plegar un panel
  // solo se corrige este desplazamiento: el giro y el zoom del usuario se conservan.
  // La camara es "manual" (Escena.jsx) para que R3F no sobrescriba el aspecto.
  useLayoutEffect(() => {
    const { camera } = get();
    const area = areaVisible(ancho, alto, paneles);
    camera.aspect = area.ancho / area.alto;
    camera.setViewOffset(area.ancho, area.alto, -area.x, -area.y, ancho, alto);
    camera.updateProjectionMatrix();
  }, [ancho, alto, paneles, get]);

  // Reencuadre completo solo al elegir una vista (sin animacion la primera vez)
  useEffect(() => {
    if (!controles.current) return;
    alturaSeguida.current = encuadrar(controles.current, get(), !primeraVez.current);
    primeraVez.current = false;
  }, [solicitudVista, get]);

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
