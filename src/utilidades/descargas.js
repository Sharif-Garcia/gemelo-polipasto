/* Descargas desde el navegador: CSV del gemelo y captura PNG de la escena. */
import { areaVisible } from "../componentes/ui/medidas.js";

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function descargarTexto(texto, nombre) {
  descargar(new Blob([texto], { type: "text/csv;charset=utf-8" }), nombre);
}

/* PNG del area libre de la escena (sin los paneles que la cubren). El lienzo
   se crea con preserveDrawingBuffer para poder leerlo despues de dibujar. */
export function capturarEscena(lienzo, paneles, nombre) {
  const escala = lienzo.width / lienzo.clientWidth;
  const area = areaVisible(lienzo.clientWidth, lienzo.clientHeight, paneles);
  const recorte = document.createElement("canvas");
  recorte.width = Math.round(area.ancho * escala);
  recorte.height = Math.round(area.alto * escala);
  recorte.getContext("2d").drawImage(
    lienzo,
    Math.round(area.x * escala), Math.round(area.y * escala), recorte.width, recorte.height,
    0, 0, recorte.width, recorte.height,
  );
  recorte.toBlob((blob) => blob && descargar(blob, nombre), "image/png");
}
