# Plan de desarrollo del gemelo digital

Cada fase tiene un objetivo, los archivos que se crean, los criterios para darla por terminada y el **prompt** listo para pegar en Claude Code. Se avanza una fase a la vez y no se pasa a la siguiente hasta cumplir todos los criterios.

## Cómo trabajar cada fase

1. Abrir la terminal en la carpeta `gemelo-polipasto` y ejecutar `claude`.
2. Pegar el prompt de la fase.
3. Revisar los cambios que propone Claude Code y aceptarlos.
4. Probar en el navegador con `npm run dev`.
5. Verificar los criterios de la fase.
6. Guardar el avance: `git add .` y `git commit -m "Fase X: ..."`.
7. Marcar la casilla de la fase en este archivo.

Si algo falla, copiar el error completo de la terminal o de la consola del navegador (F12) y pegarlo en Claude Code.

---

## Fase 0. Arreglar la base y validar la física

- [x] Completada

**Objetivo:** que el proyecto cargue sin pantalla en blanco, con la estructura de carpetas definitiva y con el motor físico probado automáticamente contra MATLAB.

**Archivos:** `src/fisica/fisica.js`, `src/fisica/fisica.test.js`, `src/App.jsx`, `vite.config.js`, `package.json`.

**Criterios:**
- `npm run dev` muestra una escena de prueba con un objeto metálico y un panel con M_eq = 72.50 kg.
- `npm test` ejecuta 13 pruebas con los valores de validación de `CLAUDE.md` y todas pasan.
- No hay errores en la consola del navegador.

**Prompt:**

```
Lee CLAUDE.md y PLAN.md. Vamos con la Fase 0.
El navegador muestra la pantalla en blanco. Revisa la configuración (vite.config.js, main.jsx,
index.css, App.jsx), corrige lo necesario y deja una escena mínima de React Three Fiber con
Environment "studio", un objeto metálico, ContactShadows, OrbitControls y un panel con Tailwind
que muestre M_eq, y máxima y aterrizaje leídos de src/fisica/fisica.js.
Luego instala vitest y crea src/fisica/fisica.test.js con los 13 valores de validación de
CLAUDE.md (tolerancia de 1e-4 para valores continuos y 1e-3 para tiempos). No modifiques las
ecuaciones de fisica.js. Explícame paso a paso qué cambiaste.
```

---

## Fase 1. Estado global y reloj de reproducción

- [x] Completada

**Objetivo:** un solo lugar donde viven los parámetros, la simulación y el tiempo de reproducción, para que la escena, las gráficas y el panel estén siempre sincronizados.

**Archivos:** `src/estado/usarGemelo.js`, `src/estado/escenarios.js`, `src/hooks/useReloj.js`.

**Contenido del estado:**
- `parametros` (valores por defecto de CLAUDE.md) y `setParametro(nombre, valor)`.
- `sim`: resultado de `Fisica.simular(parametros)`, recalculado al cambiar un parámetro (con un retardo corto para que los sliders vayan fluidos).
- Reproducción: `t`, `reproduciendo`, `velocidad` (0.25x, 0.5x, 1x, 2x), `bucle`, `play()`, `pausa()`, `reiniciar()`, `irA(t)`.
- `indice` actual de la muestra, calculado con `Fisica.indice(sim, t)`.
- `escenarios` predefinidos: Estándar, Carga pesada (M = 120 kg), Fuerza insuficiente (F0 menor que F_min), Seis ramales (n = 6), Sin fricción (mu = 0, b = 0), Jalón largo (t_off = 2.5 s).

**Criterios:**
- Un panel de depuración temporal muestra t avanzando y los valores de y, ydot y ydd del índice actual.
- Al cambiar n desde la consola o un botón temporal, la simulación se recalcula en menos de 50 ms.

**Prompt:**

```
Fase 1 de PLAN.md. Crea el estado global con zustand en src/estado/usarGemelo.js, los escenarios
en src/estado/escenarios.js y un hook useReloj que avance t con requestAnimationFrame según la
velocidad, se detenga en tf (o reinicie si bucle está activo) y no provoque renders innecesarios.
Agrega un panel temporal de depuración con botones Play, Pausa, Reiniciar, un selector de
escenario y los valores en vivo de t, y, ydot, ydd y u. Explícame la arquitectura brevemente.
```

---

## Fase 2. Estudio 3D y cámara

- [x] Completada

**Objetivo:** el ambiente visual profesional donde vivirá el polipasto.

**Archivos:** `src/componentes/escena/Escena.jsx`, `Estudio.jsx`, `Camaras.jsx`, `Efectos.jsx`.

**Detalles:**
- Fondo tipo ciclorama (piso y pared curva continuos) en gris muy claro.
- Iluminación: `Environment` de estudio + una luz direccional principal con sombras suaves.
- `ContactShadows` o `AccumulativeShadows` bajo los objetos.
- Postprocesado: SSAO (o N8AO), SMAA y un bloom muy leve.
- `OrbitControls` con giro de 360°, límites de zoom y sin atravesar el piso.
- Vistas predefinidas con transición suave: General, Frontal, Lateral, Detalle de poleas, Operario.

**Criterios:**
- 60 cuadros por segundo en un portátil normal.
- Los botones de vista mueven la cámara con una animación suave.

**Prompt:**

```
Fase 2 de PLAN.md. Construye el estudio 3D estilo "estudio limpio": ciclorama claro, Environment
de estudio, luz principal con sombras suaves, sombras de contacto y postprocesado (N8AO o SSAO,
SMAA, bloom leve) con @react-three/postprocessing. Agrega OrbitControls con 360°, límites
razonables, y un componente de cámaras con vistas predefinidas (General, Frontal, Lateral,
Detalle de poleas, Operario) con transición suave usando CameraControls de drei o interpolación
propia. Deja un cubo de referencia de 1 m para verificar la escala.
```

---

## Fase 3. Polipasto paramétrico

- [x] Completada

**Objetivo:** el mecanismo completo en 3D, construido por código y que cambia automáticamente con n.

**Archivos:** `src/componentes/escena/Polipasto.jsx`, `Viga.jsx`, `BloqueFijo.jsx`, `BloqueMovil.jsx`, `Polea.jsx`, `Cadena.jsx`, `Gancho.jsx`, `Carga.jsx`, `src/geometria/disposicion.js`.

**Geometría (escala real en metros):**
- Viga superior de acero (perfil I) y soporte del bloque fijo.
- Bloque fijo con `ceil(n/2)` poleas y bloque móvil con `N_poleas_moviles = floor(n/2)` poleas (en total n poleas). Si n es impar, el extremo muerto de la cadena se amarra al bloque móvil.
- Separación entre bloques: `D0 - y` (el bloque móvil sube con la carga).
- Poleas con ranura, eje y placas laterales; giran con `omega_k = k*ydot/r_polea`.
- Cadena de eslabones reales con `InstancedMesh`: n ramales verticales entre poleas y tramo libre hasta la mano del operario. Los eslabones se desplazan a lo largo de cada ramal con la velocidad `c_j*ydot` (el ramal 1 queda quieto si n es par).
- Gancho y carga (pesa o caja industrial) con etiqueta de masa que cambia con M.
- `src/geometria/disposicion.js` calcula posiciones de poleas, ramales y puntos de amarre para cualquier n entre 2 y 6.

**Criterios:**
- Al cambiar n de 2 a 6 la escena se reconstruye correctamente: número de poleas, ramales y amarre (bloque fijo si n es par, bloque móvil si n es impar).
- Con la reproducción activa la carga sube, se detiene en 1.64 m, cae y aterriza en 2.495 s.
- Las poleas giran en el sentido correcto y más rápido cuanto mayor es k.

**Prompt:**

```
Fase 3 de PLAN.md. Construye el polipasto paramétrico en escala real. Primero crea
src/geometria/disposicion.js que, dado n (2 a 6), D0 y y, calcule posiciones de poleas fijas y
móviles, extremos de cada ramal, punto de amarre según la paridad y el tramo libre. Después crea
los componentes Viga, BloqueFijo, BloqueMovil, Polea, Cadena (InstancedMesh de eslabones
alternando 90°), Gancho y Carga, con materiales PBR metálicos. Anima todo en useFrame leyendo y,
ydot del índice actual del estado: bloque móvil y carga en y, poleas con omega_k = k*ydot/r_polea,
eslabones deslizando con c_j*ydot. Valida con n = 2, 3, 4, 5 y 6.
```

---

## Fase 4. Operario

- [x] Completada

**Objetivo:** una persona que jala la cadena de forma sincronizada con u(t).

**Archivos:** `src/componentes/escena/Operario.jsx`, `src/geometria/operario.js`, `src/geometria/operario.test.js`.

**Decisión:** maniquí procedural (no se usa Mixamo). Toda la postura sale de funciones puras con pruebas; el componente solo la dibuja.

**Aspecto:**
- Maniquí de estudio de unos 1.75 m, blanco satinado, con articulaciones esféricas visibles (hombros, codos, muñecas, caderas, rodillas, tobillos), puños cerrados y cabeza ovalada sin rostro.

**Comportamiento:**
- De pie del lado +x del tramo libre, mirando la cadena, que cae entre sus manos a la altura H_fijo - L1.
- Brazos y piernas con cinemática inversa analítica de dos segmentos.
- Jalón mano sobre mano mientras `u > 0`: la mano que agarra baja con la cadena a `sdot = n*ydot`; la otra sube abierta por fuera. El ritmo sale del avance de la cadena (si la cadena no se mueve, las manos tampoco).
- Torso inclinado hacia atrás en proporción a u / F_min (con límite), cadera baja y atrás, rodillas flexionadas.
- Cuando `u = 0` suelta la cadena y vuelve a reposo en 0.3 s; al volver `u > 0` la retoma en 0.3 s.

**Criterios:**
- El operario empieza a jalar en t_on y suelta en t_off, sincronizado con la gráfica de u(t).
- La mano que agarra queda exactamente sobre la cadena y baja con ella sin patinar.
- Con "Fuerza insuficiente" jala inclinado aunque la cadena no se mueva.
- No choca con el pórtico ni con el montón para n de 2 a 6.

---

## Fase 5. Gráficas sincronizadas

- [x] Completada

**Objetivo:** gráficas con cursor temporal que avanza con la animación.

**Archivos:** `src/componentes/ui/Graficas.jsx`, `src/componentes/ui/GraficaUPlot.jsx`.

**Detalles:**
- Pestañas: Posición y, Velocidad ydot, Aceleración ydd, Fuerza u y tensión T, Cadena s, Reacción del piso N, y "Todas" (4 apiladas).
- Cursor vertical en el t actual y punto resaltado sobre la curva.
- Clic o arrastre sobre la gráfica para mover la reproducción a ese instante.
- Zoom en el eje del tiempo y botón para restablecerlo.
- Marcas de eventos: despegue, y máxima, aterrizaje.

**Criterios:**
- El cursor y la animación 3D coinciden en todo momento.
- Las gráficas se actualizan al mover un slider.

**Prompt:**

```
Fase 5 de PLAN.md. Crea un componente GraficaUPlot reutilizable y un panel Graficas con pestañas
(y, ydot, ydd, u y T, s, N y Todas). Dibuja un cursor vertical en el t actual del estado sin
recrear la gráfica en cada cuadro, permite hacer clic o arrastrar para llamar irA(t), agrega zoom
en el tiempo y marcas de despegue, y máxima y aterrizaje. Estilo limpio y legible.
```

---

## Fase 6. Interfaz completa

- [ ] Completada

**Objetivo:** el panel de control profesional.

**Archivos:** `src/componentes/ui/PanelParametros.jsx`, `ValoresEnVivo.jsx`, `BarraReproduccion.jsx`, `SelectorEscenarios.jsx`, `Deslizador.jsx`, `Layout.jsx`.

**Detalles:**
- Disposición: escena 3D al centro, panel de parámetros a la izquierda, valores en vivo a la derecha, gráficas abajo (plegables).
- Sliders agrupados: Carga (M, m_b), Polipasto (n, r_polea, J_polea), Cadena (m_r, D0, L1), Operario (F0, t_on, t_off), Fricción (mu, b).
- Cada slider con su valor, unidad y botón para restablecer.
- Valores en vivo: t, y, ydot, ydd, u, T, s, N y los derivados M_eq, m_p_eq, m_r_eff, F_min.
- Aviso visible cuando F0 < F_min ("la carga no despega").
- Barra de reproducción: Play/Pausa, Reiniciar, línea de tiempo arrastrable, velocidad y bucle.
- Atajos de teclado: espacio (play/pausa), R (reiniciar), 1 a 5 (vistas de cámara).

**Criterios:**
- Mover cualquier slider recalcula sin reiniciar la aplicación.
- La interfaz se ve bien en 1366 x 768 y en pantallas grandes.

**Prompt:**

```
Fase 6 de PLAN.md. Construye la interfaz completa con Tailwind siguiendo la disposición del plan:
panel de parámetros agrupado con sliders reutilizables (valor, unidad, restablecer), valores en
vivo, selector de escenarios, barra de reproducción con línea de tiempo arrastrable, velocidad y
bucle, aviso cuando F0 < F_min y atajos de teclado. Diseño moderno tipo panel de vidrio
(fondo blanco translúcido, bordes redondeados, sombras suaves) y tipografía legible.
```

---

## Fase 7. Modo análisis

- [ ] Completada

**Objetivo:** la vista técnica que conecta el 3D con la física de la memoria.

**Archivos:** `src/componentes/escena/ModoAnalisis.jsx`, `VectorFuerza.jsx`, `Etiqueta3D.jsx`.

**Detalles:**
- Botón para alternar entre "Estudio" y "Análisis".
- En análisis: materiales semitransparentes, flechas de fuerza sobre el bloque móvil (n·T, M_t·g, fricción, N) con longitud proporcional a su valor, etiquetas 3D con las variables (y, s, T, n, D0).
- Ramales coloreados según su tensión `T_j` (fórmula en CLAUDE.md) con una barra de colores.
- Cotas dinámicas de y y de s.
- Cuadro con la ecuación de movimiento y los valores numéricos del instante actual.

**Criterios:**
- Las flechas cambian de tamaño en vivo y la flecha N solo aparece cuando la carga está en el piso.

**Prompt:**

```
Fase 7 de PLAN.md. Agrega el modo análisis: alternador Estudio/Análisis, materiales
semitransparentes, flechas de fuerza proporcionales sobre el bloque móvil (n*T, M_t*g, fricción
seca y viscosa, N), etiquetas 3D de y, s, T, n y D0, ramales coloreados por T_j con barra de
colores, cotas dinámicas y un cuadro con la ecuación de movimiento evaluada en el instante actual.
```

---

## Fase 8. Validación con Simulink y exportación

- [ ] Completada

**Objetivo:** demostrar que el gemelo coincide con Simulink.

**Archivos:** `src/componentes/ui/ValidacionCSV.jsx`, `src/utilidades/csv.js`.

**Detalles:**
- Arrastrar y soltar `datos_mecanismo.csv` (o botón para cargarlo).
- Superponer las curvas de Simulink (línea punteada) sobre las del gemelo.
- Calcular el error máximo y el error RMS de y, ydot e ydd, y mostrar un indicador "Validado" si el error de y es menor a 1 mm.
- Botón "Descargar CSV" con la simulación actual del gemelo (`Fisica.aCSV`).
- Botón para capturar la escena como imagen PNG (para la memoria).

**Criterios:**
- Con el CSV de Simulink y los parámetros por defecto, el error máximo de y es cercano a 0.5 mm.

**Prompt:**

```
Fase 8 de PLAN.md. Crea la validación con Simulink: carga de datos_mecanismo.csv por arrastrar y
soltar, lectura con src/utilidades/csv.js respetando los encabezados con unidades, superposición
punteada en las gráficas, error máximo y RMS de y, ydot e ydd, indicador de validación, botón para
descargar el CSV del gemelo y botón para capturar la escena en PNG.
```

---

## Fase 9. Pulido y publicación

- [ ] Completada

**Objetivo:** dejarlo listo para la exposición y para el enlace de la memoria.

**Detalles:**
- Pantalla de carga con el título del proyecto.
- Revisión de rendimiento (memoización, instancias, sombras) y prueba en celular.
- `README.md` con descripción, capturas, instrucciones y créditos (incluido el modelo de Mixamo).
- Subir a GitHub y publicar en Vercel; copiar el enlace en la sección 4.2.3 de la memoria.

**Prompt:**

```
Fase 9 de PLAN.md. Revisa rendimiento y errores, agrega una pantalla de carga con el título del
proyecto, mejora la adaptación a pantallas pequeñas, escribe README.md en español y guíame paso a
paso para subir el proyecto a GitHub y publicarlo en Vercel.
```

---

## Orden de prioridad si el tiempo es corto

1. Fases 0, 1, 3, 5 y 6: cumplen todos los requisitos de la rúbrica (animación sincronizada, gráfica con cursor, valores en vivo y sliders).
2. Fases 2 y 4: elevan la calidad visual.
3. Fases 7, 8 y 9: suman puntos en la exposición y en la validación.
