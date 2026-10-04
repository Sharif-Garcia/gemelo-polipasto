/* Gancho con caña, giratorio y anilla de izaje de la carga.
   Coordenadas locales del bloque movil: yInicio = borde inferior de las placas,
   yCarga = cara superior de la carga. La anilla queda centrada en x = 0. */
import { useMemo } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { MATERIALES } from "./materiales.js";

const R_GANCHO = 0.035, TUBO_GANCHO = 0.011;
const R_ANILLA = 0.03, TUBO_ANILLA = 0.006;
const ALTO_PERNO = 0.03;

function crearGeometriaGancho(yInicio, yCentro) {
  const puntos = [];
  // Caña vertical en x = -R_GANCHO
  for (let i = 0; i <= 6; i++) {
    puntos.push(new Vector3(-R_GANCHO, yInicio + ((yCentro - yInicio) * i) / 6, 0));
  }
  // Curva del gancho: de la izquierda, por debajo, hasta la punta a la derecha
  for (let i = 1; i <= 24; i++) {
    const ang = Math.PI + ((Math.PI + 1.0) * i) / 24;
    puntos.push(new Vector3(R_GANCHO * Math.cos(ang), yCentro + R_GANCHO * Math.sin(ang), 0));
  }
  return new TubeGeometry(new CatmullRomCurve3(puntos), 96, TUBO_GANCHO, 12, false);
}

export default function Gancho({ yInicio, yCarga }) {
  const yAnilla = yCarga + ALTO_PERNO + R_ANILLA + TUBO_ANILLA;
  // La anilla descansa sobre el fondo del gancho
  const yCentro = yAnilla + (R_ANILLA - TUBO_ANILLA) - TUBO_GANCHO + R_GANCHO;
  const geometria = useMemo(() => crearGeometriaGancho(yInicio - 0.03, yCentro), [yInicio, yCentro]);

  return (
    <group>
      {/* Giratorio bajo el bloque */}
      <mesh position={[-R_GANCHO, yInicio - 0.015, 0]} material={MATERIALES.eje} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.03, 20]} />
      </mesh>
      <mesh geometry={geometria} material={MATERIALES.gancho} castShadow />
      <mesh position={[0, yAnilla, 0]} rotation={[0, Math.PI / 2, 0]} material={MATERIALES.eje} castShadow>
        <torusGeometry args={[R_ANILLA, TUBO_ANILLA, 12, 32]} />
      </mesh>
      <mesh position={[0, yCarga + ALTO_PERNO / 2, 0]} material={MATERIALES.eje} castShadow>
        <cylinderGeometry args={[0.008, 0.012, ALTO_PERNO, 12]} />
      </mesh>
    </group>
  );
}
