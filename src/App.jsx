import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Fisica } from "./fisica/fisica.js";

// Simulacion con los parametros por defecto (los mismos de MATLAB)
const sim = Fisica.simular();

export default function App() {
  return (
    <div className="relative h-screen w-screen bg-neutral-200">
      {/* Escena 3D de prueba */}
      <Canvas shadows camera={{ position: [3, 2, 4], fov: 45 }}>
        <Environment preset="studio" />
        <mesh position={[0, 0.7, 0]} castShadow>
          <torusKnotGeometry args={[0.4, 0.14, 256, 32]} />
          <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.2} />
        </mesh>
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.6}
          scale={6}
          blur={2.5}
        />
        <OrbitControls makeDefault />
      </Canvas>

      {/* Panel de verificacion */}
      <div className="absolute left-6 top-6 rounded-2xl bg-white/80 p-5 shadow-xl backdrop-blur">
        <h1 className="text-lg font-semibold text-neutral-800">
          Gemelo digital del polipasto
        </h1>
        <p className="mt-2 text-sm text-neutral-600">Prueba de instalacion</p>
        <div className="mt-3 space-y-1 font-mono text-sm">
          <p>M_eq = {sim.d.M_eq.toFixed(2)} kg</p>
          <p>y max = {sim.eventos.y_max.toFixed(4)} m</p>
          <p>Aterrizaje = {sim.eventos.aterrizaje.toFixed(3)} s</p>
        </div>
      </div>
    </div>
  );
}
