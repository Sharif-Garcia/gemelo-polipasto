/* Carga de acero con etiqueta de masa. Coordenadas locales: yInferior = base. */
import { Suspense } from "react";
import { RoundedBox, Text } from "@react-three/drei";
// Fuente local (troika no lee woff2): la escena funciona sin conexion
import fuente from "@fontsource/inter/files/inter-latin-700-normal.woff?url";
import { MATERIALES } from "./materiales.js";

export default function Carga({ carga, M, yInferior }) {
  const { anchoX, alto, fondoZ } = carga;
  const tamanoTexto = Math.min(0.06, anchoX * 0.3);
  return (
    <group position={[0, yInferior + alto / 2, 0]}>
      <RoundedBox
        args={[anchoX, alto, fondoZ]}
        radius={0.01}
        smoothness={3}
        material={MATERIALES.carga}
        castShadow
        receiveShadow
      />
      <Suspense fallback={null}>
        <Text
          font={fuente}
          position={[0, 0, fondoZ / 2 + 0.002]}
          fontSize={tamanoTexto}
          color="#f2f2f2"
          anchorX="center"
          anchorY="middle"
        >
          {`${M} kg`}
        </Text>
      </Suspense>
    </group>
  );
}
