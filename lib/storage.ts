/**
 * Хранилище загруженных файлов (галерея работ, чертежи в B2B-заявках).
 *
 * Драйвер `local` (по умолчанию) складывает файлы вне публичного каталога и
 * отдаёт их только через защищённый маршрут `/api/admin/files/[key]` — это
 * требование §15 («раздача не из корня приложения»).
 *
 * Файлы всегда переименовываются в случайный ключ: имя, присланное клиентом,
 * не участвует в пути, поэтому «../../etc/passwd» физически невозможно.
 *
 * Для продакшна с несколькими репликами включите S3-совместимое хранилище
 * (S3_ENDPOINT/S3_BUCKET или BLOB_READ_WRITE_TOKEN) — см. docs/RISKS.md.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { dataRoot, serverlessTempDir } from '@/lib/runtime';

export type StorageDriver = 'local' | 's3' | 'blob';

export interface StoredFile {
  key: string;
  originalName: string;
  mime: string;
  size: number;
}

/** Белый список типов (§15): всё остальное отклоняем. */
export const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/acad': 'dwg',
  'image/vnd.dwg': 'dwg',
  'application/dxf': 'dxf',
  'image/vnd.dxf': 'dxf',
};

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024; // 15 МБ — чертежи B2B (§6.4)
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 МБ — фото галереи (§9)

export function storageDriver(): StorageDriver {
  if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID) return 's3';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  return 'local';
}

function uploadsRoot(): string {
  // На serverless рабочий каталог только для чтения — dataRoot() вернёт
  // временный каталог, чтобы загрузка не падала с ошибкой файловой системы.
  return path.join(dataRoot(), 'uploads');
}

/**
 * Локальный драйвер хранения не подходит для serverless: файлы не переживут
 * перезапуск инстанса и не будут видны другим репликам.
 */
export function isLocalStorageEphemeral(): boolean {
  return storageDriver() === 'local' && serverlessTempDir() !== null;
}

/** Проверяет пару «тип + размер» и возвращает безопасное расширение. */
export function validateUpload(
  mime: string,
  size: number,
  allowed: Record<string, string> = ALLOWED_DOCUMENT_TYPES,
  maxBytes = MAX_DOCUMENT_BYTES,
): { ok: true; extension: string } | { ok: false; message: string } {
  const extension = allowed[(mime || '').toLowerCase()];
  if (!extension) {
    return {
      ok: false,
      message: 'Такой тип файла не поддерживается. Пришлите PDF, JPG, PNG или чертёж DWG/DXF.',
    };
  }
  if (size > maxBytes) {
    return { ok: false, message: `Файл слишком большой: максимум ${Math.round(maxBytes / 1024 / 1024)} МБ.` };
  }
  if (size <= 0) {
    return { ok: false, message: 'Пустой файл — проверьте вложение.' };
  }
  return { ok: true, extension };
}

/** Путь на диске по ключу. Ключ — только из наших случайных символов. */
export function localPathFor(key: string): string {
  if (!/^[a-zA-Z0-9_-]+\.[a-z0-9]{2,5}$/.test(key)) {
    throw new Error('Некорректный ключ файла');
  }
  return path.join(uploadsRoot(), key);
}

export async function saveLocalFile(
  data: Buffer | Uint8Array,
  extension: string,
  originalName: string,
  mime: string,
): Promise<StoredFile> {
  const key = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${extension}`;
  const target = path.join(uploadsRoot(), key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  return { key, originalName: path.basename(originalName).slice(0, 200), mime, size: data.byteLength };
}

export async function readLocalFile(key: string): Promise<Buffer> {
  return fs.readFile(localPathFor(key));
}

export async function deleteLocalFile(key: string): Promise<void> {
  try {
    await fs.unlink(localPathFor(key));
  } catch {
    // Файла нет — цель достигнута.
  }
}

/**
 * Публичный URL файла. Никогда не отдаём файл напрямую из корня приложения.
 */
export function fileUrl(key: string): string {
  return `/api/admin/files/${key}`;
}

/**
 * Локальная «оптимизация» изображений. `sharp` не обязателен: без него
 * сохраняем оригинал как есть, но честно сообщаем об этом в админке.
 * Установите sharp на проде, чтобы получить WebP/AVIF и уменьшенные копии (§9).
 */
export async function optimizeImage(
  data: Buffer,
  mime: string,
): Promise<{ data: Buffer; mime: string; note: string | null }> {
  try {
    const sharp = (await import('sharp' as string)) as any;
    const output = await sharp(data)
      .resize({ width: 2000, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { data: output, mime: 'image/webp', note: null };
  } catch {
    return {
      data,
      mime,
      note: 'sharp не установлен — файл сохранён без сжатия. Установите sharp для WebP/AVIF.',
    };
  }
}
