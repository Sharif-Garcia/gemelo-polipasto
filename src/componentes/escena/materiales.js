/* Materiales PBR compartidos del polipasto (una sola instancia de cada uno). */
import { MeshStandardMaterial } from "three";

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
  // Carga de acero pintada
  carga: new MeshStandardMaterial({ color: "#3a3f47", metalness: 0.55, roughness: 0.48 }),
};
