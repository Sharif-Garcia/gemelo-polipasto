import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { useReloj } from "./hooks/useReloj.js";
import PanelDepuracion from "./componentes/ui/PanelDepuracion.jsx";

export default function App() {
  useReloj();

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

      <PanelDepuracion />
    </div>
  );
}
