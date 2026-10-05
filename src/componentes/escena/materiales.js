/* Materiales PBR compartidos del polipasto (una sola instancia de cada uno). */
import { MeshPhysicalMaterial, MeshStandardMaterial } from "three";

export const MATERIALES = {
  // Pintura industrial amarilla de los bloques
  bloque: new MeshStandardMaterial({ color: "#d9a300", metalness: 0.25, roughness: 0.42 }),
  // Acero mecanizado de poleas y ejes
  polea: new MeshStandardMaterial({ color: "#d0d4d9", metalness: 1, roughness: 0.34 }),
  eje: new MeshStandardMaterial({ color: "#8d939a", metalness: 1, roughness: 0.35 }),
  hueco: new MeshStandardMaterial({ color: "#2a2d31", metalness: 0.6, roughness: 0.6 }),
  // Acero galvanizado de la cadena
  cadena: new MeshStandardMaterial({ color: "#a8adb3", metalness: 1, roughness: 0.32 }),
  // Acero forjado del gancho
  gancho: new MeshStandardMaterial({ color: "#6f757c", metalness: 0.95, roughness: 0.38 }),
  // Viga y columnas pintadas
  viga: new MeshStandardMaterial({ color: "#46505c", metalness: 0.4, roughness: 0.55 }),
  // Maniqui de estudio: blanco satinado y articulaciones gris claro
  maniqui: new MeshPhysicalMaterial({
    color: "#ecebe7", roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.45,
  }),
  articulacion: new MeshPhysicalMaterial({
    color: "#c7cbd0", roughness: 0.4, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3,
  }),
  // Casco de seguridad amarillo (plastico brillante)
  casco: new MeshPhysicalMaterial({
    color: "#f2b705", roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25,
  }),
  // Carga de acero pintada
  carga: new MeshStandardMaterial({ color: "#3a3f47", metalness: 0.55, roughness: 0.48 }),
};

/* Modo analisis: portico, bloques y operario semitransparentes; cadena, gancho y
   carga opacos. La cadena pasa a un acabado mate claro para que se vean los
   colores de tension por ramal (los multiplica el color de cada instancia). */
const TRANSPARENTES = { viga: 0.5, bloque: 0.62, polea: 0.62, eje: 0.62, hueco: 0.62, maniqui: 0.42, articulacion: 0.42, casco: 0.42 };
const CADENA_ESTUDIO = { color: MATERIALES.cadena.color.getHex(), metalness: MATERIALES.cadena.metalness, roughness: MATERIALES.cadena.roughness };

export function aplicarModoMateriales(analisis) {
  for (const [nombre, opacidad] of Object.entries(TRANSPARENTES)) {
    const m = MATERIALES[nombre];
    m.transparent = analisis;
    m.opacity = analisis ? opacidad : 1;
    m.depthWrite = !analisis;
    m.needsUpdate = true;
  }
  const c = MATERIALES.cadena;
  c.color.setHex(analisis ? 0xffffff : CADENA_ESTUDIO.color);
  c.metalness = analisis ? 0.15 : CADENA_ESTUDIO.metalness;
  c.roughness = analisis ? 0.5 : CADENA_ESTUDIO.roughness;
  c.needsUpdate = true;
}

