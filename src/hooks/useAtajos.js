/* Atajos de teclado globales. No se activan al escribir en un campo de texto,
   en un selector ni con Ctrl/Alt/Cmd.
   Espacio: play/pausa · R: reiniciar · 1-6: vistas · flechas: ±0.01 s en pausa ·
   A: estudio / analisis · F: medidor de FPS. */
import { useEffect } from "react";
import { usarGemelo } from "../estado/usarGemelo.js";
import { VISTAS } from "../componentes/escena/vistas.js";

// Elementos donde las teclas son del usuario: campos de texto y selectores reciben
// todas; en un slider (type="range") solo las flechas, que lo mueven.
export function teclaParaElElemento(el, tecla) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const etiqueta = el.tagName;
  if (etiqueta === "TEXTAREA" || etiqueta === "SELECT") return true;
  if (etiqueta !== "INPUT") return false;
  if (el.type === "range") return tecla === "ArrowLeft" || tecla === "ArrowRight";
  return el.type !== "checkbox" && el.type !== "button";
}

export function accionDeTecla(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === " ") return { tipo: "reproduccion" };
  if (e.key === "r" || e.key === "R") return { tipo: "reiniciar" };
  if (e.key === "f" || e.key === "F") return { tipo: "fps" };
  if (e.key === "a" || e.key === "A") return { tipo: "modo" };
  if (e.key === "ArrowLeft") return { tipo: "paso", sentido: -1 };
  if (e.key === "ArrowRight") return { tipo: "paso", sentido: 1 };
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1 && n <= VISTAS.length) return { tipo: "vista", id: VISTAS[n - 1].id };
  return null;
}

export function useAtajos() {
  useEffect(() => {
    const alPresionar = (e) => {
      if (teclaParaElElemento(e.target, e.key)) return;
      const accion = accionDeTecla(e);
      if (!accion) return;
      e.preventDefault();   // espacio no "pulsa" el boton enfocado ni desplaza la pagina
      const g = usarGemelo.getState();
      if (accion.tipo === "reproduccion") g.alternarReproduccion();
      if (accion.tipo === "reiniciar") g.reiniciar();
      if (accion.tipo === "fps") g.alternarFPS();
      if (accion.tipo === "modo") g.alternarModo();
      if (accion.tipo === "paso") g.pasoManual(accion.sentido);
      if (accion.tipo === "vista") g.setVista(accion.id);
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);
}
