/* Modo analisis: materiales semitransparentes, diagrama de fuerzas y cotas.
   La cadena se colorea por tension en Cadena.jsx.
   Acomodo de etiquetas: en cada cuadro DiagramaFuerzas y CotasAnalisis piden sus
   etiquetas (punto 3D, texto, anclaje y prioridad) y aqui se proyectan a la
   pantalla, se separan para que no se encimen y se vuelven a llevar a 3D. */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { acomodarEtiquetas, anchoTexto } from "../../analisis/etiquetas.js";
import { aplicarModoMateriales } from "./materiales.js";
import { pantallaActual } from "./pantalla.js";
import DiagramaFuerzas from "./DiagramaFuerzas.jsx";
import CotasAnalisis from "./CotasAnalisis.jsx";

const v = new Vector3();

export default function ModoAnalisis({ disp }) {
  const analisis = usarGemelo((s) => s.modo === "analisis");
  const camara = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const solicitudes = useRef([]);

  useEffect(() => {
    aplicarModoMateriales(analisis);
  }, [analisis]);

  // Corre despues de los useFrame de los hijos (se suscriben antes que el padre)
  useFrame(() => {
    const lista = solicitudes.current;
    if (lista.length === 0) return;
    lista.sort((a, b) => a.prioridad - b.prioridad);
    const { width, height, escalaTexto } = pantallaActual(size);
    const rects = lista.map((s) => {
      v.set(...s.punto).project(camara);
      s.z = v.z;
      const x = ((v.x + 1) / 2) * width;
      const tamano = s.tamano * escalaTexto;
      const ancho = anchoTexto(s.texto, tamano);
      return {
        x: s.ancla === "right" ? x - ancho : x,
        y: ((1 - v.y) / 2) * height + (s.desplazamientoY ?? 0) * escalaTexto,
        ancho,
        alto: tamano + 4,
        xAncla: x,
      };
    });
    const ys = acomodarEtiquetas(rects, 4 * escalaTexto);
    lista.forEach((s, i) => {
      v.set((rects[i].xAncla / width) * 2 - 1, 1 - (ys[i] / height) * 2, s.z).unproject(camara);
      s.etiqueta?.fijar(v.x, v.y, v.z, s.texto, true);
    });
    solicitudes.current = [];
  });

  if (!analisis) return null;
  return (
    <>
      <DiagramaFuerzas disp={disp} solicitudes={solicitudes} />
      <CotasAnalisis disp={disp} solicitudes={solicitudes} />
    </>
  );
}
