# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Gemelo digital del polipasto manual de cadena

Proyecto de la asignatura Modelado y Simulación (Universidad Popular del Cesar, docente Andrés Perpiñán Reyes).
Autora: Sharif Alejandra García Toledo. Este archivo le da a Claude Code el contexto del proyecto; léelo antes de cualquier tarea.

## Objetivo

Construir un gemelo digital 3D, interactivo y sincronizado, de un polipasto manual de cadena rígida con número de ramales variable (2 a 6). La guía de la asignatura exige:

- Animación 3D del mecanismo sincronizada con la simulación.
- Gráfica con cursor temporal que avanza junto con la animación.
- Valores numéricos en vivo.
- Controles (sliders) que modifican parámetros y recalculan la simulación sin reiniciar la aplicación.
- Coherencia con el modelo de MATLAB/Simulink y con el archivo `datos_mecanismo.csv` exportado desde Simulink.

El resultado debe verse profesional: estilo "estudio limpio" (fondo claro, iluminación de estudio, sombras suaves, materiales metálicos realistas) y un "modo análisis" técnico.

## Stack

- Vite + React (JavaScript, sin TypeScript)
- three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
- zustand (estado global)
- uplot (gráficas)
- Tailwind CSS v4 con `@tailwindcss/vite`
- vitest (pruebas del motor físico)
- Publicación en Vercel
- Lint con oxlint (`.oxlintrc.json`: reglas de hooks de React)

## Comandos

```
npm run dev        # servidor de desarrollo (Vite)
npm run build      # build de producción
npm run lint       # oxlint
npm test           # vitest run (pruebas de validación del motor)
npx vitest run src/fisica/fisica.test.js -t "M_eq"   # una sola prueba
```

## API del motor (`src/fisica/fisica.js`)

`Fisica` es un IIFE que expone `{ PARAMETROS_BASE, factoresRamales, derivados, fuerza, ecuaciones, simular, indice, aCSV }`.

- `Fisica.simular(cambios)` mezcla `cambios` con `PARAMETROS_BASE` (que además incluye `dt`, `tf`, `v_s = 0.01`, `holgura = 0.4`) y devuelve `{ p, d, r, Nt, eventos }`:
  - `p`: parámetros usados; `d`: derivados (`M_t, m_p_eq, m_r_eff, M_eq, lambda, c, F_min, a0, y_tope, N_poleas_moviles`).
  - `r`: series `Float64Array` de longitud `Nt` con las mismas columnas del CSV (`t, u, T, y, ydot, ydd, s, sdot, sdd, N`).
  - `eventos`: `despegue, aterrizaje` (o `null`), `y_max/t_ymax, v_max/t_vmax, v_min/t_vmin`.
- `Fisica.indice(sim, t)` convierte un tiempo de reproducción en índice de muestra; así se sincronizan escena, gráficas y panel (todos leen `sim.r[...][indice]`).
- `Fisica.aCSV(sim)` genera el CSV con el formato de Simulink.

## Estado y reloj

- `usarGemelo` guarda `parametros`, `sim`, `escenario` y el reloj (`t`, `indice`, `reproduciendo`, `velocidad`, `bucle`). La lógica del reloj vive en la acción `avanzar(dtReal)`; `useReloj` (montado una sola vez en `App`) solo la llama desde `requestAnimationFrame`.
- `setParametro` recalcula con debounce (`RETARDO_RECALCULO_MS`); en pruebas usar `vi.useFakeTimers()` o llamar `recalcular()`.
- `t` e `indice` cambian en cada cuadro: nunca leerlos con un selector de React. Usar `usarGemelo.getState()` dentro de `useFrame`, o `usarGemelo.subscribe` + refs para el DOM (ver `PanelDepuracion.jsx`).
- Los escenarios (`src/estado/escenarios.js`) son solo los cambios respecto a `PARAMETROS_DEFECTO`.

## Render 3D

- `Escena.jsx` monta el `Canvas`; `Estudio` (ciclorama, luces, sombras), `Camaras` (CameraControls) y `Efectos` (postprocesado) son fijos, y el mecanismo se agrega como hijo.
- Sombras con `shadows="percentage"` + `shadow-radius`: en three r186 `PCFSoftShadowMap` (lo que usa `shadows={true}`) ya no existe y avisa en consola.
- El `EffectComposer` desactiva el tone mapping del renderer; por eso `Efectos.jsx` termina con `ToneMapping` (ACES) y `SMAA` (`multisampling={0}`).
- Vistas de cámara en `src/componentes/escena/vistas.js`; `setVista` incrementa `solicitudVista` para que repetir la misma vista vuelva a animar. Las vistas de poleas se calculan con `encuadreVista` (distancia según el ancho del bloque); "Poleas móviles" sigue al bloque desplazando en Δy el objetivo interno de camera-controls (`_target`/`_targetEnd`) en un `useFrame` de prioridad −2, lo que conserva el giro y el zoom del usuario.
- `Text` de drei usa la fuente local `@fontsource/inter` (.woff; troika no lee .woff2) dentro de `Suspense`: sin ella, la carga de la fuente desde el CDN suspende toda la escena.

## Geometría del polipasto (`src/geometria/disposicion.js`)

- Funciones puras (sin three.js) con pruebas en `disposicion.test.js`. `crearDisposicion(sim.p)` se recalcula solo cuando cambia la simulación; los componentes de `escena/` solo la dibujan.
- Poleas y ramales en el plano z = 0. La polea k une los ramales k y k+1 (separados 2·r_polea). Bloque móvil centrado en x = 0; su eje está en `alturaBloqueMovil(y) = H_movil0 + y` y el fijo en `H_fijo = H_movil0 + D0`.
- La cadena usa una coordenada material σ medida desde el amarre: cada eslabón conserva su σ y su posición es el punto σ de la trayectoria para el y actual (`recorrerCadena`). Así los ramales avanzan con c_j·ydot sin integrar nada, también al adelantar o retroceder la reproducción.
- Tramo libre: vertical hasta la mano fija en `H_fijo - L1`, curva de Bézier hasta la cima del montón y montón cónico. El largo del montón se resuelve por bisección para conservar la longitud total exacta.
- Montón: cada eslabón se ubica según su distancia λ al extremo final (fija) sobre el cono de tamaño λ (`conoMonton`), con ángulo, radio y giro pseudoaleatorios por índice (`aleatorio`, sin `Math.random`). Los eslabones recién caídos se deslizan desde la cima durante `monton.asentamiento`; después no se mueven.
- `obtenerDisposicion(p)` cachea por objeto de parámetros: úsala en vez de `crearDisposicion` en componentes (la comparten `Polipasto` y `Camaras`).
- Giro de poleas: `anguloPolea = giro·k·y/r_polea` (`giro` = +1 móvil, −1 fija).


## Modelo físico (NO modificar sin pedirlo)

El motor está en `src/fisica/fisica.js` y ya fue validado contra MATLAB y Simulink. Es la única fuente de verdad de la física: la escena, las gráficas y la interfaz solo leen sus resultados.

Ecuación de movimiento (1 GDL, `y` = posición de la carga, positiva hacia arriba desde el piso):

```
M_eq * ydd = n*u - mu*n*u*tanh(ydot/v_s) - M_t*g - b*ydot + N
M_t     = M + m_b
m_p_eq  = (J_polea / r_polea^2) * sum(k^2, k = 1..n)
lambda  = m_r / (n*D0 + L1)
c_j     = 2*floor(j/2)       si n es par   (amarre en el bloque fijo)
        = 2*ceil(j/2) - 1    si n es impar (amarre en el bloque móvil)
m_r_eff = lambda * (D0 * sum(c_j^2) + L1 * n^2)
M_eq    = M_t + m_p_eq + m_r_eff
```

- Piso: si `y <= 0`, `ydot <= 0` y `F_neta <= 0`, entonces `ydd = 0` y `N = -F_neta`. Al tocar el piso la velocidad se anula (choque sin rebote).
- Tope superior visual: `y_tope = D0 - holgura` (no se activa con los parámetros por defecto).
- Entrada: `u(t) = F0` si `t_on <= t < t_off`, y 0 en otro caso. `T = F = u`.
- Poleas: n en total; `ceil(n/2)` en el bloque fijo y `N_poleas_moviles = floor(n/2)` en el bloque móvil.
- Cinemática: `s = n*y` (cadena recogida en el extremo libre). La polea k gira con `omega_k = k*ydot/r_polea`. El ramal j avanza con `c_j*ydot`.
- Tensión de cada ramal (sin fricción, útil para el modo análisis): `T_j = u - (J_polea/r_polea^2)*ydd*sum(k, k=j..n) - lambda*L1*n*ydd`.
- Integración: RK4 de paso fijo, `dt = 0.001 s`, `tf = 6 s`, 6001 muestras.

### Valores de validación (parámetros por defecto)

| Magnitud | Valor |
|---|---|
| M_t | 55.00 kg |
| m_p_eq | 6.00 kg |
| m_r_eff | 11.50 kg |
| M_eq | 72.50 kg |
| F_min | 149.88 N |
| a0 | 2.4890 m/s² |
| Despegue | 0.501 s |
| y máxima | 1.6388 m en t = 1.829 s |
| v máxima | 2.4561 m/s en t = 1.500 s |
| v mínima | -4.9072 m/s en t = 2.494 s |
| Aterrizaje | 2.495 s |
| ydd(1.0 s) | 2.4548 m/s² |
| ydd(2.0 s) | -7.4070 m/s² |

Cualquier cambio en el código debe mantener estas pruebas en verde (`npm test`).

## Parámetros y nomenclatura

Usar siempre estos nombres (son los mismos de MATLAB y de la memoria del proyecto):
`M, m_b, M_t, n, g, b, mu, J_polea, r_polea, N_poleas_moviles, m_r, m_r_eff, m_p_eq, M_eq, D0, L1, F0, t_on, t_off, u, F, T, y, ydot, ydd, s, sdot, sdd, N, t`.

Valores por defecto: M = 50 kg, m_b = 5 kg, n = 4, g = 9.81, b = 2 N·s/m, mu = 0.1, J_polea = 0.0005 kg·m², r_polea = 0.05 m, m_r = 1.5 kg, D0 = 2.5 m, L1 = 2.0 m, F0 = 200 N, t_on = 0.5 s, t_off = 1.5 s.

Formato del CSV (igual al de Simulink): `t [s],u [N],T [N],y [m],ydot [m/s],ydd [m/s^2],s [m],sdot [m/s],sdd [m/s^2],N [N]`.

## Convenciones

- Interfaz y comentarios en español. Nombres de variables físicas como en la tabla anterior.
- Unidades SI. En la interfaz, mostrar unidades junto a cada valor.
- Componentes pequeños, uno por archivo, en `src/componentes/` (3D en `src/componentes/escena/`, interfaz en `src/componentes/ui/`).
- Estado global solo en `src/estado/usarGemelo.js` (zustand).
- No poner lógica física dentro de componentes 3D; leer siempre de la simulación.
- Rendimiento: usar `useFrame` y referencias para animar; no provocar renders de React en cada cuadro. Cadena con `InstancedMesh`.
- Trabajar por fases (ver `PLAN.md`). Al terminar cada fase: `npm test`, `npm run build` sin errores y un commit de git.
- Explicar los cambios paso a paso y de forma breve.
