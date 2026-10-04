/* Panel derecho: valores instantaneos (actualizados en el DOM en cada cuadro,
   sin renders de React) y magnitudes derivadas de los parametros. Formato fijo
   y cifras tabulares para que los numeros no salten. */
import { useEffect, useRef } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { Fisica } from "../../fisica/fisica.js";
import { MEDIDAS } from "./medidas.js";
import PanelLateral from "./PanelLateral.jsx";
import FilaValor from "./FilaValor.jsx";

const INSTANTANEOS = [
  { clave: "t", simbolo: ["t"], nombre: "Tiempo", unidad: "s", decimales: 3 },
  { clave: "y", simbolo: ["y"], nombre: "Posición", completo: "Posición de la carga", unidad: "m", decimales: 4 },
  { clave: "ydot", simbolo: ["ẏ"], nombre: "Velocidad", unidad: "m/s", decimales: 4 },
  { clave: "ydd", simbolo: ["ÿ"], nombre: "Aceleración", unidad: "m/s²", decimales: 4 },
  { clave: "u", simbolo: ["u"], nombre: "Fuerza", completo: "Fuerza del operario", unidad: "N", decimales: 1 },
  { clave: "T", simbolo: ["T"], nombre: "Tensión", completo: "Tensión de la cadena", unidad: "N", decimales: 1 },
  { clave: "s", simbolo: ["s"], nombre: "Cadena", completo: "Cadena recogida", unidad: "m", decimales: 4 },
  { clave: "sdot", simbolo: ["ṡ"], nombre: "Vel. cadena", completo: "Velocidad de la cadena", unidad: "m/s", decimales: 4 },
  { clave: "N", simbolo: ["N"], nombre: "Reacción", completo: "Reacción del piso", unidad: "N", decimales: 1 },
];

const DERIVADOS = [
  { clave: "M_eq", simbolo: ["M", "eq"], nombre: "Total", completo: "Masa equivalente total", unidad: "kg", decimales: 2 },
  { clave: "m_p_eq", simbolo: ["m", "p,eq"], nombre: "Poleas", completo: "Masa equivalente de las poleas", unidad: "kg", decimales: 2 },
  { clave: "m_r_eff", simbolo: ["m", "r,eff"], nombre: "Cadena", completo: "Masa equivalente de la cadena", unidad: "kg", decimales: 2 },
  { clave: "F_min", simbolo: ["F", "min"], nombre: "Mínima", completo: "Fuerza mínima para levantar la carga", unidad: "N", decimales: 2 },
  { clave: "n", simbolo: ["n"], nombre: "Ventaja", completo: "Ventaja mecánica ideal (sin fricción)", unidad: "", decimales: 0 },
];

export default function ValoresEnVivo() {
  const abierto = usarGemelo((s) => s.paneles.valores);
  const alternarPanel = usarGemelo((s) => s.alternarPanel);
  const parametros = usarGemelo((s) => s.parametros);
  const celdas = useRef({});
  const d = Fisica.derivados({ ...Fisica.PARAMETROS_BASE, ...parametros });

  useEffect(() => {
    if (!abierto) return undefined;
    const pintar = ({ sim, indice, t }) => {
      for (const f of INSTANTANEOS) {
        const celda = celdas.current[f.clave];
        const valor = f.clave === "t" ? t : sim.r[f.clave][indice];
        if (celda) celda.textContent = valor.toFixed(f.decimales);
      }
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, [abierto]);

  return (
    <PanelLateral
      lado="derecha"
      titulo="Valores en vivo"
      ancho={MEDIDAS.anchoValores}
      abierto={abierto}
      onAlternar={() => alternarPanel("valores")}
    >
      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Instantáneos</h3>
      {INSTANTANEOS.map((f) => (
        <FilaValor key={f.clave} fila={f} celda={(el) => { celdas.current[f.clave] = el; }} />
      ))}
      <h3 className="mt-3 border-t border-neutral-900/10 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        Derivados de los parámetros
      </h3>
      {DERIVADOS.map((f) => (
        <FilaValor key={f.clave} fila={f} valor={(f.clave === "n" ? parametros.n : d[f.clave]).toFixed(f.decimales)} />
      ))}
    </PanelLateral>
  );
}
