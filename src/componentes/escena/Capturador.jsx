/* Captura PNG de la escena en 1920x1080 (16:9) con la misma camara, sin importar
   el tamaño de la ventana ni los paneles. Cambia el tamaño del bufer de dibujo,
   dibuja con el mismo postprocesado, lee la imagen y restaura todo en el mismo
   paso (no se ve en pantalla). */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { descargarURL } from "../../utilidades/descargas.js";
import { aplicarCuadroCamara } from "./cuadroCamara.js";

const TAMANO_CAPTURA = { ancho: 1920, alto: 1080 };

export default function Capturador({ compositor }) {
  const solicitud = usarGemelo((s) => s.solicitudCaptura);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const c = compositor.current;
    if (solicitud === 0 || !c) return;
    const { gl, camera, size } = get();
    const relacionPixeles = gl.getPixelRatio();
    const { ancho, alto } = TAMANO_CAPTURA;

    gl.setPixelRatio(1);
    c.setSize(ancho, alto, false);
    camera.clearViewOffset();
    camera.aspect = ancho / alto;
    camera.updateProjectionMatrix();
    c.render();
    const url = gl.domElement.toDataURL("image/png");

    gl.setPixelRatio(relacionPixeles);
    c.setSize(size.width, size.height, false);
    const { paneles, t, modo } = usarGemelo.getState();
    aplicarCuadroCamara(camera, size.width, size.height, paneles);
    descargarURL(url, `polipasto_${modo ?? "estudio"}_t${t.toFixed(3)}s.png`);
  }, [solicitud, get, compositor]);

  return null;
}
