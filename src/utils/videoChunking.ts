// src/utils/videoChunking.ts

export const CHUNK_SIZE_BYTES = 45 * 1024 * 1024; // 45MB

export function splitFileIntoChunks(
  file: File,
  chunkSize = CHUNK_SIZE_BYTES
): Blob[] {
  const chunks: Blob[] = [];
  let offset = 0;

  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }

  return chunks;
}

export function getChunkPath(lessonId: string, chunkIndex: number) {
  return `${lessonId}/chunk-${chunkIndex}`;
}