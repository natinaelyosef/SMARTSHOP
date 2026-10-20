import { usePage } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { Card, CardHeader, EmptyState, PageHeader, Tabs, cn } from '@/components/ui';
import { DateField, FilterBar, PeriodSelect, useFilters } from '@/components/filters';
import { HorizontalBarChart } from '@/components/Charts';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { ProfitSummary, SharedProps } from '@/types';

interface ProductRow {
    name: string;
    qty: number | string;
    revenue: number | string;
    profit: number | string;
}

interface MonthlyProps {
    type: 'monthly';
    range: { from: string; to: string };
    summary: ProfitSummary;
    bestProducts: ProductRow[];
    worstProducts: ProductRow[];
    filters: { type?: string; period?: string; from?: string; to?: string };
}

const EXPORTS = [
    { report: 'sales', key: 'reports.export_sales' },
    { report: 'purchases', key: 'reports.export_purchases' },
    { report: 'inventory', key: 'reports.export_inventory' },
    { report: 'profit', key: 'reports.export_profit' },
];

function Stat({ label, value, symbol }: { label: string; value: number; symbol: string }) {
    return (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 break-words text-sm font-bold tabular-nums text-slate-900 sm:text-base xl:text-lg">{formatMoney(value, symbol)}</p>
        </div>
    );
}

function ProductPanel({
    title,
    rows,
    symbol,
    rose,
}: {
    title: string;
    rows: ProductRow[];
    symbol: string;
    rose?: boolean;
}) {
    const { t } = useTranslation();

    if (rows.length === 0) {
        return (
            <Card className="animate-slide-up">
                <CardHeader title={title} />
                <EmptyState title={t('common.no_results')} />
            </Card>
        );
    }

    const chartData = rows.map((row) => ({ label: row.name, value: Number(row.profit) }));

    return (
        <Card className="animate-slide-up">
            <CardHeader title={title} />
            <HorizontalBarChart data={chartData} symbol={symbol} color={rose ? '#f43f5e' : '#10b981'} height={260} yAxisWidth={104} />
            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                            <th className="pb-2 pr-3 font-semibold">{t('common.name')}</th>
                            <th className="pb-2 pr-3 text-right font-semibold">{t('reports.qty')}</th>
                            <th className="pb-2 pr-3 text-right font-semibold">{t('reports.revenue')}</th>
                            <th className="pb-2 text-right font-semibold">{t('common.profit')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const profit = Number(row.profit);
                            return (
                                <tr key={`${row.name}-${index}`} className="border-b border-slate-50">
                                    <td className="py-2 pr-3 text-slate-700">{row.name}</td>
                                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{formatNumber(row.qty)}</td>
                                    <td className="py-2 pr-3 text-right tabular-nums text-slate-800">{formatMoney(row.revenue, symbol)}</td>
                                    <td className={cn('py-2 text-right font-semibold tabular-nums', profit < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                                        {formatMoney(profit, symbol)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

export default function ReportsMonthly({ range, summary, bestProducts, worstProducts, filters }: MonthlyProps) {
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

    return (
        <div className="space-y-5">
            <PageHeader title={t('reports.title')} subtitle={`${range.from} – ${range.to}`} />

            <Tabs
                tabs={[
                    { key: 'daily', label: t('reports.daily') },
                    { key: 'monthly', label: t('reports.monthly') },
                    { key: 'yearly', label: t('reports.yearly') },
                ]}
                active={params.type ?? 'monthly'}
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <Stat label={t('finance.net_sales')} value={summary.net_sales} symbol={symbol} />
                    <Stat label={t('reports.gross_profit')} value={summary.gross_profit} symbol={symbol} />
                    <Stat label={t('reports.profit_after_rent')} value={summary.profit_after_rent} symbol={symbol} />
                    <Stat label={t('finance.net_profit')} value={summary.net_profit} symbol={symbol} />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('finance.sales_count')}</p>
                        <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{formatNumber(summary.sales_count)}</p>
                    </div>
                </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <ProductPanel title={t('reports.best_products')} rows={bestProducts} symbol={symbol} />
                <ProductPanel title={t('reports.worst_products')} rows={worstProducts} symbol={symbol} rose />
            </div>
        </div>
    );
}
