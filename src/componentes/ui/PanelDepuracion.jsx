/* Panel temporal de depuracion (Fase 1): controles del reloj, escenario, n
   y valores en vivo. Los valores en vivo se escriben directo en el DOM con una
   suscripcion transitoria para no provocar renders de React en cada cuadro. */
import { useEffect, useRef } from "react";
import { usarGemelo, VELOCIDADES } from "../../estado/usarGemelo.js";
import { ESCENARIOS } from "../../estado/escenarios.js";

const VARIABLES_EN_VIVO = [
  { nombre: "t", unidad: "s", decimales: 3 },
  { nombre: "y", unidad: "m", decimales: 4 },
  { nombre: "ydot", unidad: "m/s", decimales: 4 },
  { nombre: "ydd", unidad: "m/s²", decimales: 4 },
  { nombre: "u", unidad: "N", decimales: 1 },
  { nombre: "N", unidad: "N", decimales: 1 },
];

function ValoresEnVivo() {
  const celdas = useRef({});

  useEffect(() => {
    const pintar = ({ sim, indice, t }) => {
      for (const { nombre, decimales } of VARIABLES_EN_VIVO) {
        const valor = nombre === "t" ? t : sim.r[nombre][indice];
        const celda = celdas.current[nombre];
        if (celda) celda.textContent = valor.toFixed(decimales);
      }
    };
    pintar(usarGemelo.getState());
    return usarGemelo.subscribe(pintar);
  }, []);

  return (
    <table className="mt-3 w-full font-mono text-sm">
      <tbody>
        {VARIABLES_EN_VIVO.map(({ nombre, unidad }) => (
          <tr key={nombre}>
            <td className="pr-3 text-neutral-500">{nombre}</td>
            <td
              className="text-right tabular-nums"
              ref={(el) => (celdas.current[nombre] = el)}
            />
            <td className="pl-2 text-neutral-500">{unidad}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PanelDepuracion() {
  const reproduciendo = usarGemelo((s) => s.reproduciendo);
  const velocidad = usarGemelo((s) => s.velocidad);
  const bucle = usarGemelo((s) => s.bucle);
  const escenario = usarGemelo((s) => s.escenario);
  const n = usarGemelo((s) => s.parametros.n);
  const d = usarGemelo((s) => s.sim.d);
  const msSimulacion = usarGemelo((s) => s.msSimulacion);
  const acciones = usarGemelo.getState();

  const boton = "rounded-lg bg-neutral-800 px-3 py-1 text-sm text-white hover:bg-neutral-700";

  return (
    <div className="absolute right-6 top-6 max-h-[calc(100%-3rem)] w-72 overflow-y-auto rounded-2xl bg-white/85 p-5 text-neutral-800 shadow-xl backdrop-blur">
      <h2 className="font-semibold">Depuración (Fase 1)</h2>

      <div className="mt-3 flex gap-2">
        {reproduciendo ? (
          <button className={boton} onClick={acciones.pausa}>Pausa</button>
        ) : (
          <button className={boton} onClick={acciones.play}>Play</button>
        )}
        <button className={boton} onClick={acciones.reiniciar}>Reiniciar</button>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={bucle}
            onChange={(e) => acciones.setBucle(e.target.checked)}
          />
          Bucle
        </label>
      </div>

      <label className="mt-3 block text-sm">
        Velocidad
        <select
          className="ml-2 rounded border px-1"
          value={velocidad}
          onChange={(e) => acciones.setVelocidad(Number(e.target.value))}
        >
          {VELOCIDADES.map((v) => (
            <option key={v} value={v}>{v}x</option>
          ))}
        </select>
      </label>

      <label className="mt-2 block text-sm">
        Escenario
        <select
          className="ml-2 rounded border px-1"
          value={escenario ?? ""}
          onChange={(e) => acciones.aplicarEscenario(e.target.value)}
        >
          {escenario === null && <option value="">Personalizado</option>}
          {ESCENARIOS.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </label>

      <label className="mt-2 block text-sm">
        n = {n} ramales
        <input
          className="block w-full"
          type="range"
          min={2}
          max={6}
          step={1}
          value={n}
          onChange={(e) => acciones.setParametro("n", Number(e.target.value))}
        />
      </label>

      <ValoresEnVivo />

      <p className="mt-3 font-mono text-xs text-neutral-500">
        M_eq = {d.M_eq.toFixed(2)} kg · F_min = {d.F_min.toFixed(2)} N
        <br />
        Simulación recalculada en {msSimulacion.toFixed(1)} ms
      </p>
    </div>
  );
}
