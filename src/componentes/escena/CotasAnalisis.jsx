/* Cotas y etiquetas del modo analisis (las etiquetas las acomoda ModoAnalisis):
   - y: desde el piso hasta la base de la carga (centrada bajo la carga).
   - D0: separacion entre bloques con y = 0 (junto a la columna derecha).
   - s: a lo largo de la cadena, desde la mano hasta el eslabon que estaba en la mano
     al empezar el jalon (marcado); mide n*y mientras ese eslabon no llega al monton.
   - n (sobre el bloque fijo) y T = u (en el tramo libre). */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { Fisica } from "../../fisica/fisica.js";
import {
  DIMENSIONES, alturaBloqueMovil, estadoCadena, puntoCadena, sigmaMano, nuevoPunto,
} from "../../geometria/disposicion.js";
import Cota from "./Cota.jsx";
import Etiqueta3D from "./Etiqueta3D.jsx";

const PUNTOS_S = 32;
const COLOR_S = "#008300";   // mismo color que s en las graficas
const TAMANO_PX = 13;
const punto = nuevoPunto();
const posiciones = new Float32Array(PUNTOS_S * 3);

export default function CotasAnalisis({ disp, solicitudes }) {
  const sim = usarGemelo((s) => s.sim);
  const cotaY = useRef(null);
  const etiquetaY = useRef(null);
  const cotaD0 = useRef(null);
  const etiquetaD0 = useRef(null);
  const lineaS = useRef(null);
  const marca = useRef(null);
  const etiquetaS = useRef(null);
  const etiquetaN = useRef(null);
  const etiquetaT = useRef(null);

  const { carga, H_fijo, mano, xLibre, n, bloques } = disp;
  const zFrente = carga.fondoZ / 2 + 0.05;
  const xD0 = DIMENSIONES.x_columna - 0.23;
  const H0 = alturaBloqueMovil(0);
  // Eslabon que estaba en la mano al empezar a jalar
  const sigmaMarca = sigmaMano(disp, sim.r.y[Fisica.indice(sim, sim.p.t_on)]);

  useFrame(() => {
    const { indice } = usarGemelo.getState();
    const y = sim.r.y[indice];
    const s = sim.r.s[indice];
    const pedir = (etiqueta, punto3, texto, ancla, prioridad) =>
      solicitudes.current.push({ etiqueta, punto: punto3, texto, ancla, tamano: TAMANO_PX, prioridad });

    cotaY.current?.fijar(0, 0, y, zFrente, y > 0.003);
    pedir(etiquetaY.current, [0.05, Math.max(y / 2, 0.1), zFrente], `y = ${y.toFixed(3)} m`, "left", 10);

    cotaD0.current?.fijar(xD0, H0, H_fijo, 0, true);
    pedir(etiquetaD0.current, [xD0 + 0.06, (H0 + H_fijo) / 2, 0], `D0 = ${disp.D0.toFixed(2)} m`, "left", 14);

    // Cota de s a lo largo de la cadena (un poco hacia la camara para no tapar los eslabones)
    const estado = estadoCadena(disp, y);
    const desde = sigmaMano(disp, y);
    const hasta = Math.min(sigmaMarca, estado.principal.L);
    for (let i = 0; i < PUNTOS_S; i++) {
      const q = puntoCadena(estado, desde + ((hasta - desde) * i) / (PUNTOS_S - 1), punto).p;
      posiciones.set([q[0] + 0.035, q[1], q[2] + 0.05], i * 3);
    }
    if (lineaS.current) {
      lineaS.current.geometry.setPositions(posiciones);
      lineaS.current.visible = hasta - desde > 0.005;
    }
    const pm = puntoCadena(estado, sigmaMarca, punto).p;
    marca.current?.position.set(pm[0], pm[1], pm[2] + 0.03);
    if (marca.current) marca.current.visible = s > 0.001;
    if (s > 0.001) pedir(etiquetaS.current, [pm[0] + 0.07, pm[1] + 0.05, pm[2] + 0.05], `s = n·y = ${s.toFixed(3)} m`, "left", 11);
    else etiquetaS.current?.fijar(0, 0, 0, undefined, false);

    pedir(etiquetaN.current, [bloques.fijo.xMin - 0.08, H_fijo + 0.02, 0], `n = ${n} ramales`, "right", 12);
    pedir(etiquetaT.current, [xLibre + 0.06, (H_fijo + mano.y) / 2, 0.03], `T = u = ${sim.r.u[indice].toFixed(1)} N`, "left", 13);
  });

  return (
    <group>
      <Cota ref={cotaY} />
      <Etiqueta3D ref={etiquetaY} tamanoPx={TAMANO_PX} />
      <Cota ref={cotaD0} />
      <Etiqueta3D ref={etiquetaD0} tamanoPx={TAMANO_PX} />
      <Line ref={lineaS} points={[[0, 0, 0], [0, 0.01, 0]]} color={COLOR_S} lineWidth={2.5} />
      <mesh ref={marca}>
        <sphereGeometry args={[0.025, 16, 12]} />
        <meshBasicMaterial color={COLOR_S} toneMapped={false} />
      </mesh>
      <Etiqueta3D ref={etiquetaS} tamanoPx={TAMANO_PX} color="#0d5c0d" />
      <Etiqueta3D ref={etiquetaN} tamanoPx={TAMANO_PX} anclaX="right" />
      <Etiqueta3D ref={etiquetaT} tamanoPx={TAMANO_PX} />
    </group>
  );
}
