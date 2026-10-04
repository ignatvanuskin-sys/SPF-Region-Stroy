import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { apiError } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Генератор QR-кодов (§8.6) для ссылок с метками источника.
 *
 * Доступен только из админки: QR-коды предназначены для печатной продукции
 * компании, а не для публичного использования как сервис.
 *
 * Параметры: data (обязательно), size (по умолчанию 320), format=png|svg.
 * Запрос ограничиваем по длине, чтобы картинку нельзя было использовать для
 * генерации «тяжёлых» изображений на нашем сервере.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError('unauthorized', 'Нужен вход в админку', 401);

  const url = new URL(request.url);
  const data = url.searchParams.get('data') ?? '';
  const size = Math.min(Math.max(Number(url.searchParams.get('size') ?? 320) || 320, 120), 1200);
  const format = url.searchParams.get('format') === 'svg' ? 'svg' : 'png';

  if (!data) return apiError('bad_request', 'Не передан параметр data', 400);
  if (data.length > 500) return apiError('bad_request', 'Слишком длинная ссылка для QR-кода', 400);

  try {
    if (format === 'svg') {
      const svg = await QRCode.toString(data, {
        type: 'svg',
        margin: 1,
        width: size,
        errorCorrectionLevel: 'M',
        color: { dark: '#14181c', light: '#ffffff' },
      });
      return new NextResponse(svg, {
        status: 200,
        headers: {
          'content-type': 'image/svg+xml; charset=utf-8',
          'cache-control': 'private, max-age=3600',
        },
      });
    }

    const png = await QRCode.toBuffer(data, {
      type: 'png',
      margin: 1,
      width: size,
      errorCorrectionLevel: 'M',
      color: { dark: '#14181c', light: '#ffffff' },
    });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[qr] ошибка генерации:', error instanceof Error ? error.message : error);
    return apiError('server_error', 'Не удалось создать QR-код', 500);
  }
}
