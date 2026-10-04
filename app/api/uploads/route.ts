import { apiError, clientIp, isSameOrigin, json, rateLimited } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  saveLocalFile,
  storageDriver,
  validateUpload,
} from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Приём файлов: чертежи и спецификации из B2B-формы, фото — из админки (§15).
 *
 * Безопасность загрузки:
 *  • белый список MIME-типов (PDF, JPG, PNG, WebP, DWG, DXF);
 *  • ограничение размера до 15 МБ;
 *  • файл сохраняется под случайным именем, оригинальное имя не участвует в
 *    пути — обход каталога невозможен;
 *  • раздача только через защищённый маршрут, не из корня приложения.
 *
 * Если включено объектное хранилище (S3/R2/Blob), сюда нужно добавить выдачу
 * предподписанной ссылки — см. docs/RISKS.md и README.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError('forbidden', 'Запрос отклонён', 403);

  const ip = clientIp(request);
  const limit = rateLimit(`upload:${ip}`, 10, 10 * 60_000);
  if (!limit.ok) return rateLimited(limit.retryAfterSec);

  const driver = storageDriver();
  if (driver !== 'local') {
    return apiError(
      'storage_not_configured',
      'Загрузка через сайт пока недоступна. Пришлите файл в WhatsApp — менеджер приложит его к заявке.',
      503,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError('bad_request', 'Не удалось прочитать файл', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return apiError('bad_request', 'Файл не приложен', 400);
  }

  const check = validateUpload(file.type, file.size, ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES);
  if (!check.ok) {
    return apiError('invalid_file', check.message, 415);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await saveLocalFile(buffer, check.extension, file.name, file.type);
    return json({ key: stored.key, name: stored.originalName, size: stored.size, mime: stored.mime }, 201);
  } catch (error) {
    console.error('[uploads] ошибка сохранения:', error instanceof Error ? error.message : error);
    return apiError('server_error', 'Не удалось сохранить файл. Пришлите его в WhatsApp.', 500);
  }
}
