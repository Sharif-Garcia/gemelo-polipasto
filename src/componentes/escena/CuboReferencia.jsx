/* Cubo de 1 m para verificar la escala (temporal, Fase 2). */
export default function CuboReferencia() {
  return (
    <mesh position={[-1.5, 0.5, 0.5]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#b8bcc2" metalness={0.9} roughness={0.25} />
    </mesh>
  );
}
