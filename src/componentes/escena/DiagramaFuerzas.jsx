/* Diagrama de cuerpo libre del conjunto movil (bloque + carga), a la izquierda
   del bloque y dentro del portico, para no tapar el polipasto: flechas verticales
   con escala comun y etiqueta numerica en vivo (las etiquetas las acomoda
   ModoAnalisis). Barra de escala en el piso. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { alturaBloqueMovil, DIMENSIONES } from "../../geometria/disposicion.js";
import { fuerzasBloque, escalaFuerzas } from "../../analisis/fuerzas.js";
import VectorFuerza from "./VectorFuerza.jsx";
import Etiqueta3D from "./Etiqueta3D.jsx";
import { COLORES_FUERZA } from "./coloresFuerza.js";

const IDS = ["traccion", "peso", "N", "seca", "viscosa", "tope"];   // orden de prioridad de las etiquetas
// Columna de cada flecha respecto al ancla [m]: las opuestas comparten columna
const COLUMNA = { traccion: 0, peso: 0, N: 0.15, tope: 0.15, seca: -0.15, viscosa: -0.3 };
const SEPARACION_BLOQUE = 0.7;   // del borde izquierdo del bloque al ancla [m]
const TAMANO_PX = 13;

export default function DiagramaFuerzas({ disp, solicitudes }) {
  const sim = usarGemelo((s) => s.sim);
  const escala = useMemo(() => escalaFuerzas(sim), [sim]);
  const flechas = useRef({});
  const etiquetas = useRef({});
  const ancla = useRef(null);
  const conector = useRef(null);
  const barra = useRef(null);
  const etiquetaBarra = useRef(null);

  const xBloque = disp.bloques.movil.xMin;
  // Lejos del bloque pero sin llegar a la columna izquierda
  const bordeColumna = -(DIMENSIONES.x_columna - DIMENSIONES.ala_columna - 0.07);
  const xAncla = Math.max(xBloque - SEPARACION_BLOQUE, bordeColumna - COLUMNA.viscosa);

  useFrame(() => {
    const { indice } = usarGemelo.getState();
    const Hm = alturaBloqueMovil(sim.r.y[indice]);
    ancla.current.position.set(xAncla, Hm, 0);
    conector.current.position.set((xAncla + xBloque) / 2, Hm, 0);
    conector.current.scale.set(1, xBloque - xAncla, 1);

    const porId = Object.fromEntries(fuerzasBloque(sim, indice).map((f) => [f.id, f]));
    IDS.forEach((id, prioridad) => {
      const f = porId[id];
      const x = xAncla + COLUMNA[id];
      const visible = Boolean(f?.visible);
      const largo = visible ? f.valor * escala.escala : 0;
      flechas.current[id]?.fijar(x, Hm, 0, f?.sentido ?? 1, largo, visible);
      if (!visible) { etiquetas.current[id]?.fijar(0, 0, 0, undefined, false); return; }
      // Etiqueta a la izquierda de la punta (el texto crece alejandose del polipasto)
      solicitudes.current.push({
        etiqueta: etiquetas.current[id],
        punto: [x - 0.04, Hm + f.sentido * largo, 0],
        texto: `${f.nombre} = ${f.valor.toFixed(1)} N`,
        ancla: "right",
        tamano: TAMANO_PX,
        desplazamientoY: -f.sentido * 9,
        prioridad,
      });
    });

    // Barra de escala en el piso, delante del diagrama
    const xFin = xAncla + COLUMNA.N;
    barra.current.position.set(xFin - escala.largoReferencia / 2, 0.03, 0.35);
    barra.current.scale.set(1, escala.largoReferencia, 1);
    solicitudes.current.push({
      etiqueta: etiquetaBarra.current,
      punto: [xFin - escala.largoReferencia - 0.04, 0.03, 0.35],
      texto: `escala: ${escala.referencia} N`,
      ancla: "right",
      tamano: 12,
      prioridad: 20,
    });
  });

  return (
    <group>
      {/* Ancla del diagrama y union con el bloque */}
      <mesh ref={ancla}>
        <sphereGeometry args={[0.022, 16, 12]} />
        <meshBasicMaterial color="#1f1f1d" toneMapped={false} />
      </mesh>
      <mesh ref={conector} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
        <meshBasicMaterial color="#1f1f1d" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {IDS.map((id) => (
        <VectorFuerza key={id} ref={(r) => { flechas.current[id] = r; }} color={COLORES_FUERZA[id]} />
      ))}
      {IDS.map((id) => (
        <Etiqueta3D key={id} ref={(r) => { etiquetas.current[id] = r; }} tamanoPx={TAMANO_PX} anclaX="right" />
      ))}
      <mesh ref={barra} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
        <meshBasicMaterial color="#1f1f1d" toneMapped={false} />
      </mesh>
      <Etiqueta3D ref={etiquetaBarra} tamanoPx={12} anclaX="right" />
    </group>
  );
}
