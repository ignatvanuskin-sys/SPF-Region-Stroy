import { Card } from '@/components/ui/card';
import { Alert, Badge } from '@/components/ui/feedback';
import { Input, Label, Textarea } from '@/components/ui/form-controls';
import { ActionForm, InlineActionForm } from '@/components/admin/action-form';
import { reviewDeleteAction, reviewSaveAction } from '@/app/admin/actions';
import { getStore } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Отзывы (§9.6).
 *
 * Рекомендованные цитаты публикуются только с явной отметкой «согласие
 * получено». Без неё запись можно хранить, но на сайте она не появится — это
 * защита и от претензий авторов, и от площадок-источников.
 */
export default async function ReviewsPage() {
  const store = getStore();
  const user = await getCurrentUser();
  const reviews = await store.listReviews({ publishedOnly: false });
  const settings = await store.getSetting<Record<string, unknown>>('rating');

  if (user?.role !== 'owner') {
    return (
      <Alert tone="warning">
        Раздел отзывов доступен только владельцу: здесь решается, что публиковать от имени компании.
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Отзывы</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          Рейтинг 2ГИС обновляется вручную в разделе «Настройки». Дословные отзывы добавляйте только с
          согласия их авторов.
        </p>
      </div>

      <Alert tone="info">
        Мы не копируем отзывы из 2ГИС автоматически: у площадки и авторов есть свои права на текст.
        Отметьте «согласие получено» только если автор действительно разрешил публикацию.
      </Alert>

      <Card className="p-5">
        <p className="font-bold">Добавить отзыв</p>
        <ActionForm action={reviewSaveAction} submitLabel="Сохранить отзыв" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="review-author" required>
                Автор
              </Label>
              <Input id="review-author" name="author_label" required placeholder="Имя Ф." />
              <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                Только имя и первая буква фамилии — персональные данные лишний раз не публикуем.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="review-source" required>
                Ссылка на источник
              </Label>
              <Input
                id="review-source"
                name="source_url"
                type="url"
                required
                defaultValue="https://2gis.kz/astana/firm/70000001042561575/tab/reviews"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="review-text" required>
                Текст отзыва
              </Label>
              <Textarea id="review-text" name="text" required placeholder="Дословный текст отзыва" />
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.875rem]">
              <input type="checkbox" name="consent_obtained" className="size-4 accent-[var(--color-glass)]" />
              Согласие автора получено
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.875rem]">
              <input type="checkbox" name="published" className="size-4 accent-[var(--color-glass)]" />
              Опубликовать на сайте
            </label>
          </div>
        </ActionForm>
        <p className="mt-3 text-[0.75rem] text-[var(--color-ink-muted)]">
          Отзыв появится на сайте только если отмечены оба пункта.
        </p>
      </Card>

      <Card className="p-5">
        <p className="font-bold">Текущий рейтинг в настройках</p>
        <dl className="mt-3 grid gap-2 text-[0.875rem] sm:grid-cols-2">
          {[
            ['Рейтинг', settings?.value ?? '—'],
            ['Оценок', settings?.ratingsCount ?? '—'],
            ['Отзывов', settings?.reviewsCount ?? '—'],
            ['Проверено', settings?.checkedAt ?? '—'],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-4 border-b border-[var(--color-line)] py-1.5">
              <dt className="text-[var(--color-ink-muted)]">{String(label)}</dt>
              <dd className="font-medium">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={review.published && review.consent_obtained ? 'success' : 'neutral'}>
                  {review.published && review.consent_obtained ? 'на сайте' : 'не опубликован'}
                </Badge>
                {review.consent_obtained ? (
                  <Badge tone="info">согласие есть</Badge>
                ) : (
                  <Badge tone="warning">нет согласия</Badge>
                )}
                <span className="text-[0.8125rem] font-semibold">{review.author_label}</span>
              </div>

              <ActionForm
                action={reviewSaveAction}
                submitLabel="Сохранить"
                variant="outline"
                size="sm"
                hidden={{ id: review.id }}
                className="mt-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`ra-${review.id}`}>Автор</Label>
                    <Input id={`ra-${review.id}`} name="author_label" defaultValue={review.author_label} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`rs-${review.id}`}>Источник</Label>
                    <Input id={`rs-${review.id}`} name="source_url" defaultValue={review.source_url} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`rt-${review.id}`}>Текст</Label>
                    <Textarea id={`rt-${review.id}`} name="text" defaultValue={review.text} />
                  </div>
                  <label className="flex items-center gap-2.5 text-[0.8125rem]">
                    <input
                      type="checkbox"
                      name="consent_obtained"
                      defaultChecked={review.consent_obtained}
                      className="size-4 accent-[var(--color-glass)]"
                    />
                    Согласие автора получено
                  </label>
                  <label className="flex items-center gap-2.5 text-[0.8125rem]">
                    <input
                      type="checkbox"
                      name="published"
                      defaultChecked={review.published}
                      className="size-4 accent-[var(--color-glass)]"
                    />
                    Опубликовать на сайте
                  </label>
                </div>
              </ActionForm>

              <div className="mt-3">
                <InlineActionForm
                  action={reviewDeleteAction}
                  submitLabel="Удалить"
                  variant="ghost"
                  confirm="Удалить отзыв?"
                  hidden={{ id: review.id }}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-[0.875rem] text-[var(--color-ink-muted)]">
          Цитат пока нет. На странице отзывов показывается рейтинг 2ГИС и обобщение тем — этого
          достаточно, пока авторы не дали согласие на публикацию текстов.
        </p>
      )}
    </div>
  );
}
