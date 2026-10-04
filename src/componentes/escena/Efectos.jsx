/* Postprocesado: oclusion ambiental (N8AO), bloom muy leve, tone mapping y SMAA.
   El EffectComposer desactiva el tone mapping del renderer, por eso se agrega aqui. */
import { EffectComposer, N8AO, Bloom, ToneMapping, SMAA } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

export default function Efectos() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.6} distanceFalloff={0.6} intensity={2} quality="medium" />
      <Bloom intensity={0.12} luminanceThreshold={0.92} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
