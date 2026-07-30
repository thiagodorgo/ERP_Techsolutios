// Ω5P PR-17b — pipeline de MINIMIZAÇÃO de fotos de evidência, buffer-in/buffer-out, ZERO disco (Recon #2: reusa
// o mesmo espírito de `resolveAttachmentDownload` — tudo em memória). Única dependência nova aprovada pela
// junta-5 (UNÂNIME, D-SAN-AUTONOMIA §C7.1): `jimp@^1.6.1` (MIT, JS puro, zero binário nativo — PD-Ω5P-FOTOS-DEP).
//
// Camadas de decode-safety (defense-in-depth, na ORDEM em que rodam):
//   (1) cap de BYTES do buffer de origem (≤12MB) — defensivo, ANTES de qualquer parse.
//   (2) header-guard (S1+C1, image-header-guard.ts) — rejeita dimensão absurda ANTES de `Jimp.read()`.
//   (3) `Jimp.read()` só roda DEPOIS de (1)+(2) — nunca aloca o bitmap de um arquivo já rejeitado pelo header.
//   (4) timeout de 4000ms (trava de RESPOSTA HTTP — NÃO é a defesa primária de CPU; quem contém o CPU-bound
//       síncrono é o semáforo de concorrência em photo-concurrency-guard.ts, chamado pelo owner-portal.service).
//
// Marca-d'água FIXA "PÁTIO — CONSULTA PÚBLICA · <data servidor>" — deliberadamente SEM placa/Renavam/processId/
// órgão (não aumentar PII na imagem, LGPD art.11). Resize maior lado ≤1024px + JPEG quality 70 — nunca full-res
// chega ao cliente.

import { Jimp, loadFont } from "jimp";
import { SANS_16_WHITE } from "jimp/fonts";

import { formatDateLabelPtBr } from "./owner-portal.dto.js";
import { assertSafeImageDimensions, ImageHeaderRejectedError } from "./image-header-guard.js";

export const PHOTO_MAX_SOURCE_BYTES = 12 * 1024 * 1024; // (1) cap de bytes defensivo ANTES do decode
export const PHOTO_MAX_LONGEST_SIDE_PX = 1024;
export const PHOTO_JPEG_QUALITY = 70;
export const PHOTO_PIPELINE_TIMEOUT_MS = 4000;

// Erro SEMPRE genérico ao cliente (§2.8) — decode falho, timeout, dimensão rejeitada, buffer grande demais:
// nenhum desses motivos é distinguível na resposta (evita dar pistas a quem está sondando o pipeline).
export class PhotoPipelineError extends Error {
  constructor() {
    super("Não foi possível processar a foto.");
    this.name = "PhotoPipelineError";
  }
}

export type PhotoPipelineResult = { readonly buffer: Buffer; readonly contentType: "image/jpeg" };

let cachedFontPromise: ReturnType<typeof loadFont> | undefined;
function loadWatermarkFont(): ReturnType<typeof loadFont> {
  cachedFontPromise ??= loadFont(SANS_16_WHITE);
  return cachedFontPromise;
}

// Ponto de entrada para chamadores DIRETOS (sem semáforo — ex.: testes de pipeline isolado): decodifica +
// timeout de resposta em volta do trabalho real. NÃO é o caminho usado pelo owner-portal.service — ver
// `runPhotoPipeline` + `withTimeout` abaixo, compostos na ORDEM CORRIGIDA (guard por fora, timeout por fora do
// guard) para não mentir sobre o slot do semáforo estar livre enquanto o trabalho real ainda roda (C2 — ver
// photo-concurrency-guard.ts).
export async function minimizePhotoBuffer(sourceBuffer: Buffer, now: () => Date = () => new Date()): Promise<PhotoPipelineResult> {
  return withTimeout(runPipeline(sourceBuffer, now), PHOTO_PIPELINE_TIMEOUT_MS);
}

// Trabalho REAL, SEM timeout embutido — é isto que o semáforo de concorrência precisa envolver diretamente
// (owner-portal.service.ts: `withTimeout(guard.run(() => runPipeline(...)), PHOTO_PIPELINE_TIMEOUT_MS)`), para
// que `inFlight` só decremente quando a decodificação de fato terminar (resolve OU rejeita) — nunca quando um
// timeout de resposta HTTP externo dispara antes dela.
export async function runPipeline(sourceBuffer: Buffer, now: () => Date): Promise<PhotoPipelineResult> {
  try {
    if (sourceBuffer.length > PHOTO_MAX_SOURCE_BYTES) {
      throw new PhotoPipelineError(); // (1) cap de bytes — rejeita ANTES de tocar o parser de header
    }
    assertSafeImageDimensions(sourceBuffer); // (2) S1+C1 — ANTES de Jimp.read()

    const image = await Jimp.read(sourceBuffer); // (3) só decodifica DEPOIS dos gates acima
    const { width, height } = image.bitmap;
    const longestSide = Math.max(width, height);
    if (longestSide > PHOTO_MAX_LONGEST_SIDE_PX) {
      const scale = PHOTO_MAX_LONGEST_SIDE_PX / longestSide;
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));
      image.resize({ w: targetWidth, h: targetHeight });
    }

    const font = await loadWatermarkFont();
    const label = `PÁTIO — CONSULTA PÚBLICA · ${formatDateLabelPtBr(now())}`;
    image.print({ font, x: 8, y: Math.max(0, image.height - 20), text: label });

    const buffer = await image.getBuffer("image/jpeg", { quality: PHOTO_JPEG_QUALITY });
    return { buffer, contentType: "image/jpeg" };
  } catch (error) {
    if (error instanceof PhotoPipelineError) throw error;
    if (error instanceof ImageHeaderRejectedError) throw new PhotoPipelineError();
    // Decode falho / erro interno do jimp → erro GENÉRICO, NUNCA a stack/mensagem original ao cliente.
    throw new PhotoPipelineError();
  }
}

// Exportado — reusado pelo owner-portal.service.ts para envolver o RESULTADO de `guard.run(...)` (timeout de
// resposta HTTP), nunca o trabalho real que o guard já está medindo (C2, ver comentário acima).
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new PhotoPipelineError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new PhotoPipelineError());
      },
    );
  });
}
