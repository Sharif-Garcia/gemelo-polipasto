/* Operario: maniqui de estudio que jala la cadena mano sobre mano.
   Toda la postura sale de geometria/operario.js; aqui solo se dibuja. */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { Fisica } from "../../fisica/fisica.js";
import { obtenerDisposicion } from "../../geometria/disposicion.js";
import { posturaOperario, ubicacionOperario, CUERPO } from "../../geometria/operario.js";
import { MATERIALES } from "./materiales.js";

const LADOS = ["der", "izq"];
const EJE_Y = new Vector3(0, 1, 0);
const va = new Vector3(), vb = new Vector3(), dir = new Vector3();
const q = new Quaternion();

// Radios [extremo a, extremo b] de cada segmento (cilindro de altura 1)
const SEGMENTOS = {
  brazo: [0.046, 0.038],
  antebrazo: [0.036, 0.029],
  muslo: [0.075, 0.056],
  pierna: [0.052, 0.038],
};
const DISTANCIA_MUNECA = CUERPO.antebrazo - 0.065;   // codo - muñeca
const PUNO = [0.085, 0.1, 0.09];        // ancho, largo, grosor
const ABIERTA = [0.1, 0.17, 0.035];

// Coloca un cilindro de altura 1 entre los puntos a y b
function colocarSegmento(malla, a, b) {
  va.fromArray(a);
  vb.fromArray(b);
  dir.subVectors(vb, va);
  const largo = dir.length();
  malla.position.addVectors(va, vb).multiplyScalar(0.5);
  malla.quaternion.setFromUnitVectors(EJE_Y, dir.divideScalar(largo));
  malla.scale.set(1, largo, 1);
}

function Esfera({ radio, material = MATERIALES.articulacion, ...props }) {
  return (
    <mesh material={material} castShadow {...props}>
      <sphereGeometry args={[radio, 24, 16]} />
    </mesh>
  );
}

export default function Operario() {
  const sim = usarGemelo((s) => s.sim);
  const disp = obtenerDisposicion(sim.p);
  const ubicacion = ubicacionOperario(disp);
  const r = useRef({});   // referencias a las piezas animadas
  const ref = (nombre) => (el) => { r.current[nombre] = el; };

  // Cadena recogida al empezar y al terminar el jalon
  const s_on = sim.r.s[Fisica.indice(sim, sim.p.t_on)];
  const s_off = sim.r.s[Fisica.indice(sim, sim.p.t_off)];

  useFrame(() => {
    const { t, indice } = usarGemelo.getState();
    const pose = posturaOperario({
      t, s: sim.r.s[indice], s_on, s_off, t_on: sim.p.t_on, t_off: sim.p.t_off,
      F0: sim.p.F0, F_min: sim.d.F_min, H_mano: disp.mano.y, H_fijo: disp.H_fijo,
    });
    const m = r.current;
    m.torso.position.fromArray(pose.pelvis);
    m.torso.rotation.x = -pose.inclinacion;
    m.cabeza.rotation.x = 0.6 * pose.inclinacion;   // mira hacia la cadena

    for (const lado of LADOS) {
      const l = pose.lados[lado];
      colocarSegmento(m[`brazo_${lado}`], l.hombro, l.codo);
      colocarSegmento(m[`antebrazo_${lado}`], l.codo, l.mano);
      colocarSegmento(m[`muslo_${lado}`], l.cadera, l.rodilla);
      colocarSegmento(m[`pierna_${lado}`], l.rodilla, l.tobillo);
      m[`hombro_${lado}`].position.fromArray(l.hombro);
      m[`codo_${lado}`].position.fromArray(l.codo);
      m[`cadera_${lado}`].position.fromArray(l.cadera);
      m[`rodilla_${lado}`].position.fromArray(l.rodilla);

      // Muñeca y mano orientadas con el antebrazo; la mano se abre al soltar
      va.fromArray(l.codo);
      dir.fromArray(l.mano).sub(va).normalize();
      m[`muneca_${lado}`].position.copy(va).addScaledVector(dir, DISTANCIA_MUNECA);
      const mano = m[`mano_${lado}`];
      mano.position.fromArray(l.mano);
      mano.quaternion.copy(q.setFromUnitVectors(EJE_Y, dir));
      const k = l.abierta;
      mano.scale.set(
        PUNO[0] + (ABIERTA[0] - PUNO[0]) * k,
        PUNO[1] + (ABIERTA[1] - PUNO[1]) * k,
        PUNO[2] + (ABIERTA[2] - PUNO[2]) * k,
      );
    }
  });

  return (
    <group position={[ubicacion.x, 0, ubicacion.z]} rotation={[0, ubicacion.rotY, 0]}>
      {/* Torso: pelvis, abdomen, pecho, cuello y cabeza giran juntos con la inclinacion */}
      <group ref={ref("torso")} position={[0, CUERPO.pelvis, 0]}>
        <mesh material={MATERIALES.maniqui} scale={[0.165, 0.11, 0.115]} castShadow>
          <sphereGeometry args={[1, 32, 20]} />
        </mesh>
        <mesh material={MATERIALES.maniqui} position={[0, 0.16, 0]} scale={[0.13, 0.13, 0.095]} castShadow>
          <sphereGeometry args={[1, 32, 20]} />
        </mesh>
        <mesh material={MATERIALES.maniqui} position={[0, 0.34, 0]} scale={[0.185, 0.165, 0.115]} castShadow>
          <sphereGeometry args={[1, 32, 20]} />
        </mesh>
        <Esfera radio={0.035} position={[0, 0.07, 0.02]} />
        <mesh material={MATERIALES.maniqui} position={[0, 0.535, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.046, 0.09, 20]} />
        </mesh>
        <group ref={ref("cabeza")} position={[0, 0.58, 0]}>
          <Esfera radio={0.042} />
          <mesh material={MATERIALES.maniqui} position={[0, 0.115, 0.012]} scale={[0.085, 0.115, 0.1]} castShadow>
            <sphereGeometry args={[1, 32, 24]} />
          </mesh>
          {/* Casco de seguridad: cupula y ala con visera al frente (+z) */}
          <mesh material={MATERIALES.casco} position={[0, 0.125, 0.012]} scale={[0.1, 0.115, 0.116]} castShadow>
            <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={MATERIALES.casco} position={[0, 0.127, 0.03]} scale={[0.112, 1, 0.134]} castShadow>
            <cylinderGeometry args={[1, 1, 0.008, 40]} />
          </mesh>
        </group>
      </group>

      {LADOS.map((lado) => (
        <group key={lado}>
          {Object.entries(SEGMENTOS).map(([nombre, [ra, rb]]) => (
            <mesh key={nombre} ref={ref(`${nombre}_${lado}`)} material={MATERIALES.maniqui} castShadow>
              <cylinderGeometry args={[rb, ra, 1, 20]} />
            </mesh>
          ))}
          <Esfera ref={ref(`hombro_${lado}`)} radio={0.055} />
          <Esfera ref={ref(`codo_${lado}`)} radio={0.042} />
          <Esfera ref={ref(`muneca_${lado}`)} radio={0.032} />
          <Esfera ref={ref(`cadera_${lado}`)} radio={0.068} />
          <Esfera ref={ref(`rodilla_${lado}`)} radio={0.055} />
          <RoundedBox
            ref={ref(`mano_${lado}`)}
            args={[1, 1, 1]}
            radius={0.3}
            smoothness={4}
            material={MATERIALES.maniqui}
            castShadow
          />
          {/* Tobillo y pie (fijos en el piso) */}
          <Esfera radio={0.042} position={[CUERPO.pies[lado][0], CUERPO.tobillo, CUERPO.pies[lado][1]]} />
          <RoundedBox
            args={[0.09, 0.07, 0.25]}
            radius={0.03}
            smoothness={4}
            position={[CUERPO.pies[lado][0], 0.035, CUERPO.pies[lado][1] + 0.06]}
            material={MATERIALES.maniqui}
            castShadow
            receiveShadow
          />
        </group>
      ))}
    </group>
  );
}
