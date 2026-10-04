/* Barra de colores divergente para T_j - u [N]: azul (menor que u), gris, rojo. */
import { colorDiferencia } from "../../analisis/fuerzas.js";

const aCss = (rgb) => `rgb(${rgb.map((c) => Math.round(c * 255)).join(" ")})`;

export default function BarraColores({ rango }) {
  const paradas = [-1, -0.5, 0, 0.5, 1].map((f) => `${aCss(colorDiferencia(f * rango, rango))} ${(f + 1) * 50}%`);
  return (
    <div>
      <div className="h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${paradas.join(", ")})` }} />
      <div className="mt-0.5 flex justify-between font-mono text-[10.5px] tabular-nums text-neutral-500">
        <span>−{rango.toFixed(1)}</span>
        <span>0</span>
        <span>+{rango.toFixed(1)} N</span>
      </div>
    </div>
  );
}
