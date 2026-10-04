/* Cadena de eslabones con InstancedMesh. Cada eslabon conserva su coordenada
   material; en cada cuadro se coloca sobre la trayectoria de disposicion.js y
   los eslabones consecutivos alternan 90° alrededor de la tangente.
   En modo analisis cada ramal se colorea segun T_j - u (barra de colores del
   panel de analisis); el tramo libre y el monton quedan en gris (T = u). */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Curve, Matrix4, TubeGeometry, Vector3 } from "three";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { recorrerCadena, ramalDePunto, DIMENSIONES } from "../../geometria/disposicion.js";
import { tensionesRamales, rangoDiferenciaTension, colorDiferencia } from "../../analisis/fuerzas.js";
import { MATERIALES } from "./materiales.js";

// Linea media de un eslabon ovalado (estadio) en el plano xy, eje largo en x
class CurvaEslabon extends Curve {
  constructor(largo, ancho) {
    super();
    this.rc = ancho / 2;                 // radio de los extremos
    this.recto = largo - ancho;          // largo de cada tramo recto
    this.perimetro = 2 * this.recto + 2 * Math.PI * this.rc;
  }
  getPoint(t, destino = new Vector3()) {
    const { rc, recto, perimetro } = this;
    let s = t * perimetro;
    const h = recto / 2;
    if (s < recto) return destino.set(-h + s, -rc, 0);
    s -= recto;
    if (s < Math.PI * rc) {
      const a = -Math.PI / 2 + s / rc;
      return destino.set(h + rc * Math.cos(a), rc * Math.sin(a), 0);
    }
    s -= Math.PI * rc;
    if (s < recto) return destino.set(h - s, rc, 0);
    s -= recto;
    const a = Math.PI / 2 + s / rc;
    return destino.set(-h + rc * Math.cos(a), rc * Math.sin(a), 0);
  }
}

function crearGeometriaEslabon() {
  const { paso, d_alambre, ancho_eslabon } = DIMENSIONES;
  const curva = new CurvaEslabon(paso + d_alambre, ancho_eslabon - d_alambre);
  return new TubeGeometry(curva, 40, d_alambre / 2, 8, true);
}

const t = new Vector3(), w = new Vector3(), b = new Vector3(), ref = new Vector3();
const matriz = new Matrix4();
const color = new Color();
const BLANCO = new Color(1, 1, 1);
const colores = [];   // color de cada ramal (0 = tramo libre)

export default function Cadena({ disp }) {
  const malla = useRef(null);
  const geometria = useMemo(() => crearGeometriaEslabon(), []);
  const ultimo = useRef("");
  const sim = usarGemelo((s) => s.sim);
  const rango = useMemo(() => rangoDiferenciaTension(sim), [sim]);

  useEffect(() => {
    ultimo.current = "";   // forzar la actualizacion con la nueva disposicion
  }, [disp, rango]);

  useFrame(() => {
    const { indice, modo } = usarGemelo.getState();
    const y = sim.r.y[indice];
    const analisis = modo === "analisis";
    // En analisis los colores cambian con ydd aunque y no cambie
    const clave = analisis ? `a${indice}` : `e${y}`;
    if (clave === ultimo.current || !malla.current) return;
    ultimo.current = clave;

    if (analisis) {
      const T = tensionesRamales(sim, indice);
      const u = sim.r.u[indice];
      colores[0] = colorDiferencia(0, rango);
      T.forEach((Tj, j) => { colores[j + 1] = colorDiferencia(Tj - u, rango); });
    }

    recorrerCadena(disp, y, (i, punto) => {
      t.fromArray(punto.t);
      ref.fromArray(punto.ref);
      // Direccion del ancho: la referencia sin su componente tangente
      w.copy(ref).addScaledVector(t, -ref.dot(t)).normalize();
      if (i % 2 === 1) w.crossVectors(t, w);   // eslabones alternos girados 90°
      b.crossVectors(t, w);
      matriz.makeBasis(t, w, b).setPosition(punto.p[0], punto.p[1], punto.p[2]);
      malla.current.setMatrixAt(i, matriz);
      malla.current.setColorAt(i, analisis ? color.fromArray(colores[ramalDePunto(punto, disp.n)]) : BLANCO);
    });
    malla.current.instanceMatrix.needsUpdate = true;
    malla.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      key={disp.numEslabones}
      ref={malla}
      args={[geometria, MATERIALES.cadena, disp.numEslabones]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  );
}
