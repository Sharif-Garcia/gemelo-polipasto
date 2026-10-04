/* Postprocesado: oclusion ambiental (N8AO), bloom muy leve, tone mapping y SMAA.
   El EffectComposer desactiva el tone mapping del renderer, por eso se agrega aqui.
   Con calidad baja (equipos lentos) se quitan N8AO y bloom. */
import { EffectComposer, N8AO, Bloom, ToneMapping, SMAA } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { usarGemelo } from "../../estado/usarGemelo.js";

export default function Efectos({ ref }) {
  const alta = usarGemelo((s) => s.calidad === "alta");
  return (
    <EffectComposer ref={ref} multisampling={0}>
      {alta && <N8AO aoRadius={0.6} distanceFalloff={0.6} intensity={2} quality="medium" />}
      {alta && <Bloom intensity={0.12} luminanceThreshold={0.92} mipmapBlur />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
