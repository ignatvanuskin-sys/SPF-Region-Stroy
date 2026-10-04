import { Card } from '@/components/ui/card';
import { Alert, Badge } from '@/components/ui/feedback';
import { Input, Label, Select } from '@/components/ui/form-controls';
import { ActionForm } from '@/components/admin/action-form';
import { claimUpdateAction } from '@/app/admin/actions';
import { getClaimChecklist } from '@/lib/domain/claims';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const AREA_LABELS: Record<string, string> = {
  company: 'О компании',
  services: 'Услуги и сроки',
  contacts: 'Контакты и график',
  pricing: 'Цены',
  marketing: 'Маркетинг и площадки',
};

/**
 * Чек-лист для владельца (§3.3).
 *
 * Превращает нехватку фактов в понятную задачу: вместо «сайт какой-то пустой»
 * владелец видит список конкретных вопросов. Ответил и нажал «Подтвердить» —
 * блок появился на сайте сразу, без деплоя и без программиста.
 */
export default async function ClaimsPage() {
  const user = await getCurrentUser();
  const claims = await getClaimChecklist();

  const confirmed = claims.filter((claim) => claim.confirmed);
  const pending = claims.filter((claim) => !claim.confirmed);

  const groups = new Map<string, typeof claims>();
  for (const claim of pending) {
    const list = groups.get(claim.area) ?? [];
    list.push(claim);
    groups.set(claim.area, list);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Чек-лист утверждений</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          Подтверждено {confirmed.length} из {claims.length}. На сайте показывается только подтверждённое.
        </p>
      </div>

      <Alert tone="info">
        Пока утверждение не подтверждено, на сайте либо стоит нейтральная формулировка, либо блок
        скрыт. Мы не придумываем сроки, гарантии, бренды и цены — их можете указать только вы.
      </Alert>

      {user?.role !== 'owner' ? (
        <Alert tone="warning">
          Подтверждать утверждения может только владелец: это факты, которые компания заявляет публично.
        </Alert>
      ) : null}

      {groups.size === 0 ? (
        <Alert tone="success">Все утверждения подтверждены. Спасибо — сайт заполнен полностью.</Alert>
      ) : null}

      {[...groups.entries()].map(([area, items]) => (
        <section key={area} className="space-y-3">
          <h2 className="text-[1.0625rem] font-bold tracking-tight">
            {AREA_LABELS[area] ?? area}
            <Badge tone="neutral" className="ml-2">
              {items.length}
            </Badge>
          </h2>

          {items.map((claim) => (
            <Card key={claim.key} className="p-5">
              <p className="font-semibold">{claim.noteForOwner}</p>
              <p className="mt-1 text-[0.75rem] text-[var(--color-ink-muted)]">
                Ключ: <code className="break-anywhere">{claim.key}</code>
              </p>

              <ActionForm
                action={claimUpdateAction}
                submitLabel="Подтвердить и опубликовать"
                variant="cta"
                className="mt-4"
                hidden={{ key: claim.key }}
              >
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`claim-text-${claim.key}`}>Как написать это на сайте</Label>
                    <Input
                      id={`claim-text-${claim.key}`}
                      name="text_ru"
                      defaultValue={claim.textRu || claim.fallbackRu || ''}
                      placeholder="Например: Гарантия 5 лет на конструкции и монтаж"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`claim-status-${claim.key}`}>Статус</Label>
                    <Select id={`claim-status-${claim.key}`} name="status" defaultValue="confirmed">
                      <option value="confirmed">Подтверждаю — показывать на сайте</option>
                      <option value="unconfirmed">Не подтверждаю — оставить нейтральную формулировку</option>
                    </Select>
                  </div>
                </div>
              </ActionForm>
            </Card>
          ))}
        </section>
      ))}

      {confirmed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[1.0625rem] font-bold tracking-tight">Уже подтверждено</h2>
          <Card className="divide-y divide-[var(--color-line)] p-0">
            {confirmed.map((claim) => (
              <div key={claim.key} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-semibold">{claim.textRu || claim.noteForOwner}</p>
                  <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                    {claim.key} · источник: {claim.source === '2gis' ? 'карточка 2ГИС' : 'владелец'}
                  </p>
                </div>
                <Badge tone="success">подтверждено</Badge>
              </div>
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
