import { usePage } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { Card, CardHeader, EmptyState, PageHeader, StatusBadge, Tabs, cn } from '@/components/ui';
import { DateField, FilterBar, PeriodSelect, useFilters } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { ProfitSummary, SharedProps } from '@/types';

interface DailyCash {
    from?: string;
    to?: string;
    cash_from_sales: number;
    cash_from_purchases_booked?: number;
    supplier_payments: number;
    expense_payments: number;
    rent_payments: number;
    tax_payments: number;
    total_inflow: number;
    total_outflow: number;
    net_cash_movement: number;
}

interface PurchaseRow {
    ref: string;
    date: string;
    party: string | null;
    total: number;
    paid: number;
    remaining: number;
}

interface DailyProps {
    type: 'daily';
    range: { from: string; to: string };
    summary: ProfitSummary;
    cash: DailyCash;
    filters: { type?: string; period?: string; from?: string; to?: string };
    purchases: PurchaseRow[];
}

const EXPORTS = [
    { report: 'sales', key: 'reports.export_sales' },
    { report: 'purchases', key: 'reports.export_purchases' },
    { report: 'inventory', key: 'reports.export_inventory' },
    { report: 'profit', key: 'reports.export_profit' },
];

function Stat({ label, value, money, symbol }: { label: string; value: number; money?: boolean; symbol?: string }) {
    return (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-brand-200 hover:shadow-sm sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 break-words text-sm font-bold tabular-nums text-slate-900 sm:text-base xl:text-lg">
                {money ? formatMoney(value, symbol) : formatNumber(value)}
            </p>
        </div>
    );
}

export default function ReportsDaily({ range, summary, cash, filters, purchases }: DailyProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const { params, update } = useFilters();
    const symbol = shop.currency_symbol;
    const isCustom = (filters.period ?? params.period) === 'custom';

    const exportUrl = (report: string) => {
        const period = filters.period ?? params.period ?? '';
        const from = filters.from ?? params.from ?? '';
        const to = filters.to ?? params.to ?? '';
        return `/reports/export?report=${report}&period=${encodeURIComponent(period)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    };

    const purchaseStatus = (row: PurchaseRow) => (row.remaining <= 0 ? 'paid' : row.paid > 0 ? 'partial' : 'unpaid');

    return (
        <div className="space-y-5">
            <PageHeader title={t('reports.title')} subtitle={`${range.from} – ${range.to}`} />

            <Tabs
                tabs={[
                    { key: 'daily', label: t('reports.daily') },
                    { key: 'monthly', label: t('reports.monthly') },
                    { key: 'yearly', label: t('reports.yearly') },
                ]}
                active={params.type ?? 'daily'}
                onChange={(key) => update({ type: key })}
            />

            <FilterBar
                right={
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('reports.export_csv')}</span>
                        {EXPORTS.map((item) => (
                            <a
                                key={item.report}
                                href={exportUrl(item.report)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                            >
                                <Download size={12} />
                                {t(item.key)}
                            </a>
                        ))}
                    </div>
                }
            >
                <PeriodSelect />
                {isCustom && (
                    <>
                        <DateField param="from" />
                        <DateField param="to" />
                    </>
                )}
            </FilterBar>

            <Card className="animate-slide-up">
                <CardHeader title={t('common.summary')} subtitle={`${summary.from} – ${summary.to}`} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
                    <Stat label={t('finance.net_sales')} value={summary.net_sales} money symbol={symbol} />
                    <Stat label={t('reports.gross_profit')} value={summary.gross_profit} money symbol={symbol} />
                    <Stat label={t('reports.profit_after_rent')} value={summary.profit_after_rent} money symbol={symbol} />
                    <Stat label={t('finance.estimated_tax')} value={summary.estimated_tax} money symbol={symbol} />
                    <Stat label={t('finance.net_profit')} value={summary.net_profit} money symbol={symbol} />
                    <Stat label={t('finance.sales_count')} value={summary.sales_count} />
                    <Stat label={t('finance.purchases_total')} value={summary.purchases} money symbol={symbol} />
                </div>
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('finance.cash_flow')} subtitle={`${cash.from ?? ''} ${cash.to ? `– ${cash.to}` : ''}`.trim()} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <Stat label={t('reports.cash_received')} value={cash.cash_from_sales} money symbol={symbol} />
                    <Stat label={t('reports.supplier_payments')} value={cash.supplier_payments} money symbol={symbol} />
                    <Stat label={t('finance.rent_payments')} value={cash.rent_payments} money symbol={symbol} />
                    <Stat label={t('finance.tax_payments')} value={cash.tax_payments} money symbol={symbol} />
                    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('finance.net_cash')}</p>
                        <p className={cn('mt-2 break-words text-sm font-bold tabular-nums sm:text-base xl:text-lg', cash.net_cash_movement >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            <span className="mr-1 text-sm font-semibold text-slate-400">{symbol}</span>
                            {formatNumber(cash.net_cash_movement)}
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('purchases.title')} subtitle={t('common.total_records', { count: purchases.length })} />
                {purchases.length === 0 ? (
                    <EmptyState title={t('purchases.empty')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('purchases.purchase_number')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('common.date')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('purchases.supplier')}</th>
                                    <th className="pb-2 pr-3 text-right font-semibold">{t('common.total')}</th>
                                    <th className="pb-2 pr-3 text-right font-semibold">{t('purchases.paid_amount')}</th>
                                    <th className="pb-2 pr-3 text-right font-semibold">{t('purchases.remaining')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map((row, index) => (
                                    <tr key={`${row.ref}-${index}`} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 font-semibold text-slate-800">{row.ref}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{row.date}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{row.party ?? '—'}</td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-800">{formatMoney(row.total, symbol)}</td>
                                        <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600">{formatMoney(row.paid, symbol)}</td>
                                        <td className={cn('py-2.5 pr-3 text-right tabular-nums', row.remaining > 0 ? 'text-rose-600' : 'text-slate-400')}>
                                            {formatMoney(row.remaining, symbol)}
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <StatusBadge status={purchaseStatus(row)} label={t(`status.${purchaseStatus(row)}`)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
