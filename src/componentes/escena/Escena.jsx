/* Lienzo 3D: estudio, camaras, efectos y contenido de la escena. */
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import Estudio from "./Estudio.jsx";
import Camaras from "./Camaras.jsx";
import Efectos from "./Efectos.jsx";
import Polipasto from "./Polipasto.jsx";

export default function Escena() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: false }}
      camera={{ fov: 40, near: 0.05, far: 60, position: [5, 3, 6.5] }}
    >
      <Estudio />
      <Camaras />
      <Polipasto />
      <Efectos />
      {import.meta.env.DEV && <Stats className="left-auto! right-0! top-auto! bottom-0!" />}
    </Canvas>
  );
}
