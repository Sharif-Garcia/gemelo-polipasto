/* Validacion con Simulink: carga del CSV (arrastrar, elegir o el del proyecto),
   indicador, metricas de y, ydot e ydd, tabla de eventos y exportaciones. */
import { useRef, useState } from "react";
import { usarGemelo } from "../../estado/usarGemelo.js";
import { PARAMETROS_DEFECTO } from "../../estado/escenarios.js";
import { validar, VENTANA } from "../../utilidades/validacion.js";
import { escribirCSV } from "../../utilidades/csv.js";
import { descargarTexto } from "../../utilidades/descargas.js";
import Icono from "./Icono.jsx";

const RUTA_PROYECTO = `${import.meta.env.BASE_URL}datos/datos_mecanismo.csv`;
const METRICAS = [
  { clave: "y", nombre: "y", unidad: "mm" },
  { clave: "ydot", nombre: "ẏ", unidad: "mm/s" },
  { clave: "ydd", nombre: "ÿ", unidad: "mm/s²" },
];
const mili = (v) => (Number.isFinite(v) ? (v * 1000).toFixed(3) : "—");
const boton = "rounded-lg border border-neutral-300/80 bg-white/80 px-2.5 py-1 text-xs text-neutral-800 hover:bg-white disabled:opacity-40";

function formatoEvento(e, valor) {
  if (valor === null) return "—";
  return e.esTiempo ? `${valor.toFixed(3)} s` : `${valor.toFixed(5)} m`;
}
function formatoDiferencia(e) {
  if (e.diferencia === null) return "—";
  return e.esTiempo ? `${(e.diferencia * 1000).toFixed(1)} ms` : `${(e.diferencia * 1000).toFixed(3)} mm`;
}

export default function PanelValidacion() {
  const sim = usarGemelo((s) => s.sim);
  const simulink = usarGemelo((s) => s.simulink);
  const errores = usarGemelo((s) => s.erroresSimulink);
  const parametros = usarGemelo((s) => s.parametros);
  const { cargarSimulink, quitarSimulink, restablecerTodo } = usarGemelo.getState();
  const [encima, setEncima] = useState(false);
  const [cargando, setCargando] = useState(false);
  const selector = useRef(null);

  const iguales = Object.keys(PARAMETROS_DEFECTO).every((k) => parametros[k] === PARAMETROS_DEFECTO[k]);
  const resultado = simulink ? validar(sim, simulink.columnas, iguales) : null;

  const leerArchivo = async (archivo) => {
    if (!archivo) return;
    cargarSimulink(await archivo.text(), archivo.name);
  };
  const cargarDelProyecto = async () => {
    setCargando(true);
    try {
      const respuesta = await fetch(RUTA_PROYECTO);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      cargarSimulink(await respuesta.text(), "datos_mecanismo.csv (proyecto)");
    } catch (e) {
      usarGemelo.setState({ erroresSimulink: [`No se pudo leer ${RUTA_PROYECTO} (${e.message}).`] });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className={"flex h-full flex-col gap-2 overflow-y-auto pl-4 text-[12.5px] " + (encima ? "bg-sky-50/60" : "")}
      onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => { e.preventDefault(); setEncima(false); leerArchivo(e.dataTransfer.files[0]); }}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-neutral-900">Validación con Simulink</h3>
        {resultado && (
          <span
            className={"ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
              (resultado.validado ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900")}
          >
            <span aria-hidden="true">{resultado.validado ? "✓" : "!"}</span>
            {resultado.validado ? "Validado" : "Revisar"}
          </span>
        )}
      </div>

      {!simulink && (
        <div className="rounded-xl border border-dashed border-neutral-400/70 bg-white/50 px-3 py-3 text-center text-neutral-600">
          <p>Arrastra aquí <span className="font-mono">datos_mecanismo.csv</span></p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button className={boton} onClick={() => selector.current?.click()}>Elegir archivo</button>
            <button className={boton} onClick={cargarDelProyecto} disabled={cargando}>
              {cargando ? "Cargando…" : "Cargar datos de Simulink del proyecto"}
            </button>
          </div>
          <input ref={selector} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { leerArchivo(e.target.files[0]); e.target.value = ""; }} />
        </div>
      )}

      {errores && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-red-900">
          <p className="font-medium">El archivo no es válido:</p>
          <ul className="mt-1 list-disc pl-4">{errores.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      {simulink && resultado && (
        <>
          <div className="flex items-center gap-2 text-[11.5px] text-neutral-500">
            <span className="min-w-0 truncate" title={simulink.nombre}>
              {simulink.nombre} · {simulink.filas} filas · Δt = {(simulink.dt * 1000).toFixed(2)} ms ·{" "}
              {simulink.interpolado ? "interpolado a la malla del gemelo" : "misma malla que el gemelo"}
            </span>
            <button className="ml-auto shrink-0 underline hover:text-neutral-800" onClick={quitarSimulink}>Quitar</button>
          </div>
          {simulink.avisos.map((a) => <p key={a} className="text-[11.5px] text-amber-800">{a}</p>)}

          {!iguales && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/80 bg-amber-50/90 px-3 py-2 text-amber-900">
              <Icono nombre="alerta" className="text-amber-600" />
              <span className="flex-1">El CSV se generó con los parámetros por defecto y los actuales son distintos.</span>
              <button className={boton + " shrink-0"} onClick={restablecerTodo}>Usar los parámetros de Simulink</button>
            </div>
          )}

          <div className={"rounded-lg px-3 py-2 " + (resultado.validado ? "bg-emerald-50/90 text-emerald-900" : "bg-amber-50/90 text-amber-900")}>
            {resultado.validado ? (
              <p>
                Error máximo de y: {mili(resultado.errores.y.max)} mm (menor a 1 mm) y eventos a menos de 2 ms.
              </p>
            ) : (
              <ul className="list-disc pl-4">{resultado.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
            )}
          </div>

          <table className="w-full text-right font-mono tabular-nums">
            <thead className="font-sans text-[11px] text-neutral-500">
              <tr>
                <th className="text-left font-medium">Error</th>
                <th className="font-medium">RMS</th>
                <th className="font-medium" title={`Excluye ±${VENTANA * 1000} ms alrededor de t_on, t_off, despegues y aterrizajes`}>
                  Máx. fuera de saltos
                </th>
                <th className="font-medium">Máx. total</th>
              </tr>
            </thead>
            <tbody>
              {METRICAS.map((m) => {
                const e = resultado.errores[m.clave];
                return (
                  <tr key={m.clave}>
                    <td className="text-left font-serif italic">{m.nombre} <span className="font-sans text-[11px] not-italic text-neutral-500">[{m.unidad}]</span></td>
                    <td>{mili(e.rms)}</td>
                    <td className="font-semibold">{mili(e.max)}</td>
                    <td className="text-neutral-500">{mili(e.maxTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="w-full text-right font-mono tabular-nums">
            <thead className="font-sans text-[11px] text-neutral-500">
              <tr>
                <th className="text-left font-medium">Evento</th>
                <th className="font-medium">Gemelo</th>
                <th className="font-medium">Simulink</th>
                <th className="font-medium">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {resultado.eventos.map((e) => (
                <tr key={e.nombre}>
                  <td className="text-left font-sans">{e.nombre}</td>
                  <td>{formatoEvento(e, e.gemelo)}</td>
                  <td>{formatoEvento(e, e.simulink)}</td>
                  <td>{formatoDiferencia(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-neutral-900/10 pt-2">
        <button className={boton} onClick={() => descargarTexto(escribirCSV(sim), "datos_gemelo.csv")}>
          Descargar CSV del gemelo
        </button>
        <button className={boton} onClick={() => usarGemelo.getState().capturarEscena()} title="PNG de 1920 × 1080 con la cámara actual">
          Capturar escena (1920 × 1080)
        </button>
      </div>
    </div>
  );
}
