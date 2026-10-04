/* Pruebas de los atajos de teclado (sin DOM: elementos y eventos simulados). */
import { describe, test, expect } from "vitest";
import { accionDeTecla, teclaParaElElemento } from "./useAtajos.js";
import { VISTAS } from "../componentes/escena/vistas.js";

const tecla = (key, extra = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, ...extra });

describe("Acciones", () => {
  test("espacio, R, F, flechas y 1 a 6", () => {
    expect(accionDeTecla(tecla(" "))).toEqual({ tipo: "reproduccion" });
    expect(accionDeTecla(tecla("r"))).toEqual({ tipo: "reiniciar" });
    expect(accionDeTecla(tecla("R"))).toEqual({ tipo: "reiniciar" });
    expect(accionDeTecla(tecla("f"))).toEqual({ tipo: "fps" });
    expect(accionDeTecla(tecla("a"))).toEqual({ tipo: "modo" });
    expect(accionDeTecla(tecla("A"))).toEqual({ tipo: "modo" });
    expect(accionDeTecla(tecla("ArrowLeft"))).toEqual({ tipo: "paso", sentido: -1 });
    expect(accionDeTecla(tecla("ArrowRight"))).toEqual({ tipo: "paso", sentido: 1 });
    VISTAS.forEach((v, i) => expect(accionDeTecla(tecla(String(i + 1)))).toEqual({ tipo: "vista", id: v.id }));
  });

  test("otras teclas y combinaciones con Ctrl/Alt/Cmd no hacen nada", () => {
    expect(accionDeTecla(tecla("7"))).toBeNull();
    expect(accionDeTecla(tecla("0"))).toBeNull();
    expect(accionDeTecla(tecla("x"))).toBeNull();
    expect(accionDeTecla(tecla("r", { ctrlKey: true }))).toBeNull();
    expect(accionDeTecla(tecla("1", { altKey: true }))).toBeNull();
  });
});

describe("No se activan al escribir", () => {
  const input = (type) => ({ tagName: "INPUT", type });

  test("campos de texto, selectores y areas de texto reciben todas las teclas", () => {
    for (const el of [input("text"), input("number"), { tagName: "SELECT" }, { tagName: "TEXTAREA" }, { tagName: "DIV", isContentEditable: true }]) {
      for (const k of [" ", "r", "1", "ArrowLeft"]) expect(teclaParaElElemento(el, k)).toBe(true);
    }
  });

  test("en un slider solo las flechas son del slider", () => {
    expect(teclaParaElElemento(input("range"), "ArrowLeft")).toBe(true);
    expect(teclaParaElElemento(input("range"), " ")).toBe(false);
    expect(teclaParaElElemento(input("range"), "2")).toBe(false);
  });

  test("botones y el resto de la pagina usan los atajos", () => {
    expect(teclaParaElElemento({ tagName: "BUTTON" }, " ")).toBe(false);
    expect(teclaParaElElemento({ tagName: "BODY" }, "r")).toBe(false);
    expect(teclaParaElElemento(null, "r")).toBe(false);
  });
});
