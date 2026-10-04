/* Lienzo 3D: estudio, camaras, efectos y contenido de la escena. */
import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats, PerformanceMonitor } from "@react-three/drei";
import { usarGemelo } from "../../estado/usarGemelo.js";
import Estudio from "./Estudio.jsx";
import Camaras from "./Camaras.jsx";
import Efectos from "./Efectos.jsx";
import Polipasto from "./Polipasto.jsx";
import Capturador from "./Capturador.jsx";
import PrimerCuadro from "./PrimerCuadro.jsx";

export default function Escena() {
  const mostrarFPS = usarGemelo((s) => s.mostrarFPS);   // tecla F
  const compositor = useRef(null);
  const baja = usarGemelo((s) => s.calidad === "baja");
  const setCalidad = usarGemelo((s) => s.setCalidad);
  return (
    <Canvas
      shadows="percentage"
      dpr={baja ? 1 : [1, 2]}
      gl={{ antialias: false, preserveDrawingBuffer: true }}
      camera={{ fov: 40, near: 0.05, far: 60, position: [5, 3, 6.5], manual: true }}
    >
      {/* Si el promedio de cuadros cae bajo el limite, baja la calidad (y la sube si sobra) */}
      <PerformanceMonitor
        onDecline={() => setCalidad("baja")}
        onIncline={() => setCalidad("alta")}
        flipflops={3}
        onFallback={() => setCalidad("baja")}
      />
      <PrimerCuadro />
      <Estudio />
      <Camaras />
      <Polipasto />
      <Efectos ref={compositor} />
      <Capturador compositor={compositor} />
      {mostrarFPS && <Stats />}
    </Canvas>
  );
}
