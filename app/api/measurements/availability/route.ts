import { apiError, json } from '@/lib/api';
import { availableSlots } from '@/lib/domain/leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Свободные слоты для записи на замер (§8.3, §12).
 *
 * Отдаём только то, что нужно интерфейсу: время начала, читаемую подпись и
 * признак доступности. Никаких данных других клиентов — даже количество
 * занятых мест показываем как «свободно/занято», а не «2 из 2».
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? undefined;
    const to = url.searchParams.get('to') ?? undefined;

    const slots = await availableSlots(from, to);

    return json(
      {
        slots: slots.map((slot) => ({
          startsAt: slot.startsAt,
          label: slot.label,
          available: slot.available,
          free: slot.free,
        })),
      },
      200,
      // Слоты меняются редко, но кэшировать их нельзя: запись должна быть честной.
      { 'cache-control': 'no-store' },
    );
  } catch (error) {
    console.error('[availability] ошибка:', error instanceof Error ? error.message : error);
    return apiError('server_error', 'Не удалось загрузить свободное время', 500);
  }
}
