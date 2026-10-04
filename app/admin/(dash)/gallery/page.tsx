import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Input, Label, Select } from '@/components/ui/form-controls';
import { ActionForm, InlineActionForm } from '@/components/admin/action-form';
import { galleryDeleteAction, galleryUpdateAction, galleryUploadAction } from '@/app/admin/actions';
import { getStore } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { SERVICES } from '@/content/services';
import { storageDriver } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Галерея работ (§9.5).
 *
 * Фото загружаются только через админку — владелец сам решает, что публиковать.
 * Мы не парсим 2ГИС и Instagram: чужой контент имеет свои условия использования
 * (§0.7). Пока фото нет, блок «Наши работы» на сайте просто не отображается.
 */
export default async function GalleryPage() {
  const store = getStore();
  const user = await getCurrentUser();
  const items = await store.listGallery();
  const driver = storageDriver();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Галерея работ</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          Фото работ показываются на главной и на страницах услуг. Форматы: JPG, PNG, WebP, AVIF — до 10 МБ.
        </p>
      </div>

      {driver === 'local' ? (
        <div className="rounded-[var(--radius-md)] border border-[#f3d9ae] bg-[#fef7ec] p-4 text-[0.8125rem] leading-relaxed text-[#7c3e0a]">
          Файлы сохраняются на диск сервера. Для продакшна с несколькими репликами подключите
          S3-совместимое хранилище (S3_BUCKET или BLOB_READ_WRITE_TOKEN) — иначе фото будут доступны
          только на одной реплике.
        </div>
      ) : null}

      {/* Загрузка */}
      {user?.role === 'owner' || user?.role === 'manager' ? (
        <Card className="p-5">
          <p className="font-bold">Добавить фото</p>
          <ActionForm
            action={galleryUploadAction}
            submitLabel="Загрузить фото"
            pendingLabel="Обрабатываем…"
            variant="primary"
            className="mt-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="gallery-file" required>
                  Файл изображения
                </Label>
                <input
                  id="gallery-file"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  required
                  className="block w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-2.5 text-[0.875rem] file:mr-3 file:cursor-pointer file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--color-ink)] file:px-3 file:py-2 file:text-[0.8125rem] file:font-semibold file:text-[var(--color-bg)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gallery-title" required>
                  Подпись
                </Label>
                <Input
                  id="gallery-title"
                  name="title"
                  required
                  placeholder="Остекление балкона, Сарыарка район"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gallery-category" required>
                  Категория
                </Label>
                <Select id="gallery-category" name="category" required defaultValue="">
                  <option value="">Выберите категорию</option>
                  {SERVICES.map((service) => (
                    <option key={service.slug} value={service.slug}>
                      {service.shortName}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gallery-district">Район</Label>
                <Input id="gallery-district" name="district" placeholder="Есиль район" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gallery-sort">Порядок</Label>
                <Input id="gallery-sort" name="sort" type="number" defaultValue={0} />
                <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                  Меньше число — выше в списке.
                </p>
              </div>

              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.875rem]">
                <input type="checkbox" name="published" defaultChecked className="size-4 accent-[var(--color-glass)]" />
                Опубликовать сразу
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[0.875rem]">
                <input type="checkbox" name="featured" className="size-4 accent-[var(--color-glass)]" />
                Показывать на главной
              </label>
            </div>
          </ActionForm>
        </Card>
      ) : null}

      {/* Список */}
      {items.length === 0 ? (
        <EmptyState
          title="Фото пока нет"
          description="Пока вы не загрузите фотографии, блок «Наши работы» на сайте не отображается — мы не заполняем его чужими снимками."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/files/${item.storage_key}`}
                alt={item.title}
                loading="lazy"
                className="aspect-4/3 w-full object-cover"
              />
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.published ? 'success' : 'neutral'}>
                    {item.published ? 'опубликовано' : 'черновик'}
                  </Badge>
                  {item.featured ? <Badge tone="cta">на главной</Badge> : null}
                  <Badge tone="info">
                    {SERVICES.find((service) => service.slug === item.category)?.shortName ?? item.category}
                  </Badge>
                </div>

                <ActionForm
                  action={galleryUpdateAction}
                  submitLabel="Сохранить"
                  variant="outline"
                  size="sm"
                  hidden={{ id: item.id }}
                >
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`title-${item.id}`}>Подпись</Label>
                      <Input id={`title-${item.id}`} name="title" defaultValue={item.title} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`sort-${item.id}`}>Порядок</Label>
                      <Input id={`sort-${item.id}`} name="sort" type="number" defaultValue={item.sort} />
                    </div>
                    <input type="hidden" name="category" value={item.category} />
                    <label className="flex items-center gap-2.5 text-[0.8125rem]">
                      <input
                        type="checkbox"
                        name="published"
                        defaultChecked={item.published}
                        className="size-4 accent-[var(--color-glass)]"
                      />
                      Опубликовано
                    </label>
                    <label className="flex items-center gap-2.5 text-[0.8125rem]">
                      <input
                        type="checkbox"
                        name="featured"
                        defaultChecked={item.featured}
                        className="size-4 accent-[var(--color-glass)]"
                      />
                      Показывать на главной
                    </label>
                  </div>
                </ActionForm>

                <InlineActionForm
                  action={galleryDeleteAction}
                  submitLabel="Удалить"
                  variant="ghost"
                  confirm="Удалить фото безвозвратно?"
                  hidden={{ id: item.id }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
