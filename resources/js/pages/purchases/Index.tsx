import { Link, usePage } from '@inertiajs/react';
import { Plus, Truck } from 'lucide-react';
import { Badge, Card, EmptyState, LinkButton, PageHeader, Pagination, StatusBadge } from '@/components/ui';
import { DateField, FilterBar, ResetButton, ResultCount, SearchField, SelectFilter } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface PurchaseRow {
    id: number;
    purchase_number: string;
    supplier: string | null;
    purchased_at: string;
    total: number;
    paid_amount: number;
    remaining_amount: number;
    payment_status: string;
    user: string | null;
    items_count: number;
}

interface PurchasesIndexProps {
    purchases: Paginated<PurchaseRow>;
    filters: {
        q?: string;
        payment_status?: string;
        from?: string;
        to?: string;
    };
}

const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'];

export default function PurchasesIndex({ purchases }: PurchasesIndexProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;

    return (
        <div className="space-y-4">
            <PageHeader
                title={t('purchases.title')}
                subtitle={t('common.total_records', { count: purchases.total })}
                actions={
                    <LinkButton href="/purchases/create" icon={<Plus size={16} />}>
                        {t('purchases.new')}
                    </LinkButton>
                }
            />

            <Card className="animate-slide-up">
                <FilterBar right={<ResultCount total={purchases.total} />}>
                    <SearchField placeholder={t('filter.q_ph')} />
                    <SelectFilter
                        param="payment_status"
                        label={t('common.status')}
                        options={PAYMENT_STATUSES.map((status) => ({ value: status, label: t(`status.${status}`) }))}
                    />
                    <DateField param="from" />
                    <DateField param="to" />
                    <ResetButton />
                </FilterBar>

                {purchases.data.length === 0 ? (
                    <EmptyState
                        title={t('purchases.empty')}
                        action={
                            <LinkButton href="/purchases/create" variant="outline" icon={<Plus size={16} />}>
                                {t('purchases.new')}
                            </LinkButton>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-2 pb-2.5 font-semibold">{t('purchases.purchase_number')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.date')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('purchases.supplier')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.user')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('purchases.items')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.status')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('common.total')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('purchases.paid_amount')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('purchases.remaining')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.data.map((purchase) => (
                                    <tr key={purchase.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="px-2 py-3">
                                            <Link
                                                href={`/purchases/${purchase.id}`}
                                                className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:underline"
                                            >
                                                <Truck size={14} className="text-slate-400" />
                                                {purchase.purchase_number}
                                            </Link>
                                        </td>
                                        <td className="px-2 py-3 whitespace-nowrap text-slate-500">{purchase.purchased_at}</td>
                                        <td className="px-2 py-3 text-slate-600">{purchase.supplier ?? '—'}</td>
                                        <td className="px-2 py-3 text-slate-600">{purchase.user ?? '—'}</td>
                                        <td className="px-2 py-3 text-right tabular-nums text-slate-600">{purchase.items_count}</td>
                                        <td className="px-2 py-3">
                                            <StatusBadge status={purchase.payment_status} label={t(`status.${purchase.payment_status}`)} />
                                        </td>
                                        <td className="px-2 py-3 text-right font-bold tabular-nums text-slate-900">
                                            {formatMoney(purchase.total, symbol)}
                                        </td>
                                        <td className="px-2 py-3 text-right tabular-nums text-slate-600">
                                            {formatMoney(purchase.paid_amount, symbol)}
                                        </td>
                                        <td className="px-2 py-3 text-right tabular-nums">
                                            {purchase.remaining_amount > 0 ? (
                                                <span className="font-semibold text-rose-600">{formatMoney(purchase.remaining_amount, symbol)}</span>
                                            ) : (
                                                <Badge tone="bg-emerald-100 text-emerald-700">{t('common.paid')}</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4">
                    <Pagination links={purchases.links} />
                </div>
            </Card>
        </div>
    );
}
