/* Control de camara con giro de 360°, limites, transicion suave a las vistas
   y seguimiento en vivo del bloque movil en la vista "Poleas moviles". */
import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Vector3 } from "three";
import { CameraControls } from "@react-three/drei";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { obtenerDisposicion, alturaBloqueMovil } from "../../geometria/disposicion.js";
import { buscarVista, encuadreVista } from "./vistas.js";

// Franja inferior del lienzo tapada por la barra de vistas [px]: no cuenta para encuadrar
export const FRANJA_INFERIOR = 84;

// Area util del lienzo (sin la franja inferior)
const areaUtil = (size) => ({ ancho: size.width, alto: Math.max(1, size.height - FRANJA_INFERIOR) });

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

// Lleva la camara a la vista actual para el tamaño actual del lienzo.
// Devuelve la altura del bloque movil en ese momento (punto de partida del seguimiento).
function encuadrar(controles, { camera, size }, animar) {
  const { vista, sim, indice } = usarGemelo.getState();
  const y = sim.r.y[indice];
  const fov = (camera.fov * Math.PI) / 180;
  const { ancho, alto } = areaUtil(size);
  const { posicion, objetivo } = encuadreVista(vista, obtenerDisposicion(sim.p), y, fov, ancho / alto);
  controles.setLookAt(...posicion, ...objetivo, animar);
  return alturaBloqueMovil(y);
}

export default function Camaras() {
  const controles = useRef(null);
  const solicitudVista = usarGemelo((s) => s.solicitudVista);
  const p = usarGemelo((s) => s.sim.p);
  const get = useThree((s) => s.get);
  const ancho = useThree((s) => s.size.width);
  const altoLienzo = useThree((s) => s.size.height);
  const aspecto = areaUtil({ width: ancho, height: altoLienzo });

  // Proyeccion centrada en el area util: el cuadro de la camara es el area sobre la barra
  // de vistas y el lienzo sigue dibujando la franja inferior (setViewOffset). La camara es
  // "manual" (Escena.jsx) para que R3F no sobrescriba el aspecto al cambiar el tamaño.
  useLayoutEffect(() => {
    const { camera } = get();
    const { alto } = areaUtil({ width: ancho, height: altoLienzo });
    camera.aspect = ancho / alto;
    camera.setViewOffset(ancho, alto, 0, 0, ancho, altoLienzo);
    camera.updateProjectionMatrix();
  }, [ancho, altoLienzo, get]);
  const primeraVez = useRef(true);
  const pAnterior = useRef(p);
  const alturaSeguida = useRef(0);

  // Nueva vista (sin animacion la primera vez)
  useEffect(() => {
    if (!controles.current) return;
    alturaSeguida.current = encuadrar(controles.current, get(), !primeraVez.current);
    primeraVez.current = false;
  }, [solicitudVista, get]);

  // Si cambian los parametros (n, r_polea...), las vistas de bloques y del operario se reencuadran
  useEffect(() => {
    if (pAnterior.current === p || !controles.current) return;
    pAnterior.current = p;
    if (buscarVista(usarGemelo.getState().vista).caja !== "portico") {
      alturaSeguida.current = encuadrar(controles.current, get(), true);
    }
  }, [p, get]);

  // Al cambiar el tamaño del lienzo (ventana o panel de graficas) se reencuadra con transicion
  useEffect(() => {
    if (primeraVez.current || !controles.current) return;
    alturaSeguida.current = encuadrar(controles.current, get(), true);
  }, [aspecto.ancho, aspecto.alto, get]);

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
