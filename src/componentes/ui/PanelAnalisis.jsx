/* Panel derecho en modo analisis: ecuacion de movimiento con los numeros del
   instante actual (y verificacion de que ambos lados coinciden), fuerzas sobre el
   bloque, tension por ramal con su barra de colores y escala de las flechas.
   Los numeros se escriben en el DOM con una suscripcion (sin renders por cuadro). */
import { useEffect, useMemo, useRef } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import {
  evaluarEcuacion, fuerzasBloque, tensionesRamales, rangoDiferenciaTension, escalaFuerzas, colorDiferencia,
} from "../../analisis/fuerzas.js";
import { COLORES_FUERZA } from "../escena/coloresFuerza.js";
import { MEDIDAS } from "./medidas.js";
import PanelLateral from "./PanelLateral.jsx";
import BarraColores from "./BarraColores.jsx";

const FUERZAS = [
  { id: "traccion", nombre: "n·T" }, { id: "peso", nombre: "M_t·g" }, { id: "seca", nombre: "F seca" },
  { id: "viscosa", nombre: "F viscosa" }, { id: "N", nombre: "N" }, { id: "tope", nombre: "R tope" },
];
const f2 = (v) => v.toFixed(2);
const conSigno = (v) => (v < 0 ? `− ${Math.abs(v).toFixed(2)}` : `+ ${v.toFixed(2)}`);

// Ecuacion con los numeros del instante: cada termino con sus factores
function sustitucion(sim, k, e) {
  const { p, d, r } = sim;
  const sgn = Math.tanh(r.ydot[k] / p.v_s);
  const partes = [
    `${p.n}·(${r.u[k].toFixed(1)})`,
    `− ${p.mu.toFixed(2)}·${p.n}·(${r.u[k].toFixed(1)})·(${sgn.toFixed(3)})`,
    `− ${f2(d.M_t * p.g)}`,
    `− ${p.b.toFixed(1)}·(${r.ydot[k].toFixed(4)})`,
    `+ ${f2(r.N[k])}`,
  ];
  const tope = e.terminos.find((t) => t.id === "tope");
  if (tope) partes.push(`${conSigno(tope.valor)} (tope)`);
  return `${f2(d.M_eq)}·(${r.ydd[k].toFixed(4)}) = ${partes.join(" ")}`;
}

const titulo = "mt-3 border-t border-neutral-900/10 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500";

export default function PanelAnalisis() {
  const abierto = usarGemelo((s) => s.paneles.valores);
  const alternarPanel = usarGemelo((s) => s.alternarPanel);
  const sim = usarGemelo((s) => s.sim);
  const rango = useMemo(() => rangoDiferenciaTension(sim), [sim]);
  const escala = useMemo(() => escalaFuerzas(sim), [sim]);
  const el = useRef({});

  useEffect(() => {
    if (!abierto) return undefined;
    const pintar = ({ indice }) => {
      const e = evaluarEcuacion(sim, indice);
      const m = el.current;
      if (!m.sustitucion) return;
      m.sustitucion.textContent = sustitucion(sim, indice, e);
      m.izquierda.textContent = `${f2(e.izquierda)} N`;
      m.derecha.textContent = `${f2(e.derecha)} N`;
      const coincide = Math.abs(e.izquierda - e.derecha) < 1e-6;
      m.verificacion.textContent = coincide
        ? `✓ Ambos lados coinciden (diferencia ${Math.abs(e.izquierda - e.derecha).toExponential(1)} N)`
        : `✗ No coinciden (diferencia ${(e.izquierda - e.derecha).toFixed(3)} N)`;
      m.verificacion.className = `mt-1 text-[11.5px] ${coincide ? "text-emerald-800" : "text-red-700"}`;

      const fuerzas = Object.fromEntries(fuerzasBloque(sim, indice).map((f) => [f.id, f]));
      for (const { id } of FUERZAS) {
        const f = fuerzas[id];
        const celda = m[`f_${id}`];
        if (!celda) continue;
        celda.textContent = f && f.visible ? `${f.sentido > 0 ? "↑" : "↓"} ${f.valor.toFixed(1)} N` : "—";
      }
      const T = tensionesRamales(sim, indice);
      T.forEach((Tj, j) => {
        const celda = m[`T_${j}`];
        const chip = m[`c_${j}`];
        if (celda) celda.textContent = `${Tj.toFixed(2)} N`;
        if (chip) {
          const c = colorDiferencia(Tj - sim.r.u[indice], rango).map((x) => Math.round(x * 255));
          chip.style.background = `rgb(${c.join(" ")})`;
        }
      });
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, [abierto, sim, rango]);

  const guardar = (nombre) => (nodo) => { el.current[nombre] = nodo; };

  return (
    <PanelLateral
      lado="derecha"
      titulo="Análisis"
      ancho={MEDIDAS.anchoValores}
      abierto={abierto}
      onAlternar={() => alternarPanel("valores")}
    >
      <h3 className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Ecuación de movimiento</h3>
      <p className="mt-1 font-serif text-[13px] italic leading-snug text-neutral-900">
        M<sub>eq</sub>·ÿ = n·u − μ·n·u·sgn(ẏ) − M<sub>t</sub>·g − b·ẏ + N
      </p>
      <p className="text-[10.5px] text-neutral-500">sgn(ẏ) ≈ tanh(ẏ/v<sub>s</sub>), v<sub>s</sub> = {sim.p.v_s} m/s</p>
      <p ref={guardar("sustitucion")} className="mt-1.5 rounded-md bg-neutral-900/5 px-2 py-1 font-mono text-[11px] leading-snug text-neutral-800" />
      <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-2 font-mono text-[12px] tabular-nums">
        <span className="font-sans text-neutral-600">Lado izquierdo</span><span ref={guardar("izquierda")} className="text-right" />
        <span className="font-sans text-neutral-600">Lado derecho</span><span ref={guardar("derecha")} className="text-right" />
      </div>
      <p ref={guardar("verificacion")} className="mt-1 text-[11.5px]" />

      <h3 className={titulo}>Fuerzas sobre el bloque móvil</h3>
      <div className="mt-1 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-0.5 text-[12px]">
        {FUERZAS.map(({ id, nombre }) => (
          <div key={id} className="contents">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORES_FUERZA[id] }} aria-hidden="true" />
            <span className="text-neutral-700">{nombre}</span>
            <span ref={guardar(`f_${id}`)} className="text-right font-mono tabular-nums text-neutral-900" />
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">
        Escala de las flechas: 1 m = {(1 / escala.escala).toFixed(0)} N (barra del piso = {escala.referencia} N).
      </p>

      <h3 className={titulo}>Tensión por ramal T<sub>j</sub></h3>
      <p className="mt-0.5 text-[11px] text-neutral-500">Color de cada ramal: T<sub>j</sub> − u</p>
      <div className="mt-1"><BarraColores rango={rango} /></div>
      <div className="mt-1.5 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-0.5 text-[12px]">
        {Array.from({ length: sim.p.n }, (_, j) => (
          <div key={j} className="contents">
            <span ref={guardar(`c_${j}`)} className="h-2.5 w-2.5 rounded-sm" aria-hidden="true" />
            <span className="font-serif italic text-neutral-800">T<sub>{j + 1}</sub></span>
            <span ref={guardar(`T_${j}`)} className="text-right font-mono tabular-nums text-neutral-900" />
          </div>
        ))}
      </div>
    </PanelLateral>
  );
}
