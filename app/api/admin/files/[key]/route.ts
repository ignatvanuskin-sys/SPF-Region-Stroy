import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { localPathFor } from '@/lib/storage';
import { promises as fs } from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Раздача загруженных файлов (§15).
 *
 * Файлы лежат вне публичного каталога и отдаются только здесь — и только
 * пользователю с активной сессией админки. Именно так «раздача не из корня
 * приложения» выполняется буквально, а не формально.
 *
 * Заголовки ответа запрещают индексацию, встраивание и кэширование посредником.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const user = await getCurrentUser();
  if (!user) return apiError('unauthorized', 'Нужен вход в админку', 401);

  const { key } = await params;

  let filePath: string;
  try {
    // localPathFor проверяет ключ по строгому шаблону: «../» невозможен.
    filePath = localPathFor(key);
  } catch {
    return apiError('bad_request', 'Некорректный ключ файла', 400);
  }

  try {
    const data = await fs.readFile(filePath);
    const extension = key.split('.').pop()?.toLowerCase();
    const mime =
      extension === 'pdf'
        ? 'application/pdf'
        : extension === 'png'
          ? 'image/png'
          : extension === 'webp'
            ? 'image/webp'
            : extension === 'avif'
              ? 'image/avif'
              : extension === 'dwg' || extension === 'dxf'
                ? 'application/octet-stream'
                : 'image/jpeg';

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        'content-type': mime,
        'content-disposition': 'inline',
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex, nofollow',
      },
    });
  } catch {
    return apiError('not_found', 'Файл не найден', 404);
  }
}
