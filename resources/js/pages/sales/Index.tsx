import { Link, usePage } from '@inertiajs/react';
import { ScanBarcode } from 'lucide-react';
import { Badge, Card, Checkbox, EmptyState, LinkButton, PageHeader, Pagination, StatusBadge, cn } from '@/components/ui';
import { DateField, FilterBar, PeriodSelect, ResetButton, ResultCount, SearchField, SelectFilter, useFilters } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface SaleRow {
    id: number;
    sale_number: string;
    sold_at: string;
    customer: string | null;
    cashier: string | null;
    total: number;
    profit: number;
    payment_method: string;
    payment_status: string;
    remaining_amount: number;
    items_count: number;
}

interface SalesIndexProps {
    sales: Paginated<SaleRow>;
    filters: {
        period?: string;
        from?: string;
        to?: string;
        payment_status?: string;
        q?: string;
        mine?: string;
    };
}

const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'];

export default function SalesIndex({ sales }: SalesIndexProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const { params, update } = useFilters();

    return (
        <div className="space-y-4">
            <PageHeader
                title={t('sales.title')}
                subtitle={t('common.total_records', { count: sales.total })}
                actions={
                    <LinkButton href="/pos" icon={<ScanBarcode size={16} />}>
                        {t('quick.new_sale')}
                    </LinkButton>
                }
            />

            <Card className="animate-slide-up">
                <FilterBar right={<ResultCount total={sales.total} />}>
                    <SearchField placeholder={t('search.placeholder')} />
                    <PeriodSelect allowAll />
                    <SelectFilter
                        param="payment_status"
                        label={t('common.status')}
                        options={PAYMENT_STATUSES.map((status) => ({ value: status, label: t(`status.${status}`) }))}
                    />
                    <Checkbox
                        label={t('filter.mine')}
                        checked={params.mine === '1' || params.mine === 'true'}
                        onChange={(e) => update({ mine: e.target.checked ? '1' : null })}
                    />
                    {params.period === 'custom' && (
                        <div className="flex flex-wrap items-center gap-3">
                            <DateField param="from" />
                            <DateField param="to" />
                        </div>
                    )}
                    <ResetButton />
                </FilterBar>

                {sales.data.length === 0 ? (
                    <EmptyState
                        title={t('sales.no_sales')}
                        action={
                            <LinkButton href="/pos" icon={<ScanBarcode size={16} />}>
                                {t('sales.create_first')}
                            </LinkButton>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-2 pb-2.5 font-semibold">{t('sales.sale_number')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.date')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('pos.customer')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('sales.cashier')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('sales.items')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.payment_method')}</th>
                                    <th className="px-2 pb-2.5 font-semibold">{t('common.status')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('common.total')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('common.profit')}</th>
                                    <th className="px-2 pb-2.5 text-right font-semibold">{t('sales.remaining')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.data.map((sale) => (
                                    <tr key={sale.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="px-2 py-3">
                                            <Link href={`/sales/${sale.id}`} className="font-semibold text-brand-600 hover:underline">
                                                {sale.sale_number}
                                            </Link>
                                        </td>
                                        <td className="px-2 py-3 whitespace-nowrap text-slate-500">{sale.sold_at}</td>
                                        <td className="px-2 py-3 text-slate-600">{sale.customer ?? t('pos.walk_in')}</td>
                                        <td className="px-2 py-3 text-slate-600">{sale.cashier ?? '—'}</td>
                                        <td className="px-2 py-3 text-right tabular-nums text-slate-600">{sale.items_count}</td>
                                        <td className="px-2 py-3">
                                            <Badge tone="bg-slate-100 text-slate-600">{t(`method.${sale.payment_method}`)}</Badge>
                                        </td>
                                        <td className="px-2 py-3">
                                            <StatusBadge status={sale.payment_status} label={t(`status.${sale.payment_status}`)} />
                                        </td>
                                        <td className="px-2 py-3 text-right font-bold tabular-nums text-slate-900">{formatMoney(sale.total, symbol)}</td>
                                        <td
                                            className={cn(
                                                'px-2 py-3 text-right tabular-nums',
                                                sale.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                                            )}
                                        >
                                            {formatMoney(sale.profit, symbol)}
                                        </td>
                                        <td className="px-2 py-3 text-right tabular-nums text-rose-600">
                                            {sale.remaining_amount > 0 ? formatMoney(sale.remaining_amount, symbol) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4">
                    <Pagination links={sales.links} />
                </div>
            </Card>
        </div>
    );
}
