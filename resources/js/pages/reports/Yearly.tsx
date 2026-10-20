import { usePage } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { Card, CardHeader, EmptyState, PageHeader, Select, Tabs, cn } from '@/components/ui';
import { FilterBar, useFilters } from '@/components/filters';
import { ProfitTrendChart } from '@/components/Charts';
import { useTranslation } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import type { SharedProps } from '@/types';

interface YearRow {
    month: string;
    gross_sales: number;
    net_sales: number;
    cogs: number;
    gross_profit: number;
    other_expenses: number;
    profit_before_rent: number;
    rent: number;
    profit_after_rent: number;
    estimated_tax: number;
    net_profit: number;
}

interface YearTotals {
    gross_sales: number;
    net_sales: number;
    cogs: number;
    gross_profit: number;
    other_expenses: number;
    profit_before_rent: number;
    rent: number;
    profit_after_rent: number;
    estimated_tax: number;
    net_profit: number;
}

interface YearlyProps {
    type: 'yearly';
    year: number;
    rows: YearRow[];
    totals: YearTotals;
    filters: { type?: string; year?: string };
}

const EXPORTS = [
    { report: 'sales', key: 'reports.export_sales' },
    { report: 'purchases', key: 'reports.export_purchases' },
    { report: 'inventory', key: 'reports.export_inventory' },
    { report: 'profit', key: 'reports.export_profit' },
];

export default function ReportsYearly({ year, rows, totals, filters }: YearlyProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const { params, update } = useFilters();
    const symbol = shop.currency_symbol;

    const currentYear = new Date().getFullYear();
    const years = Array.from(new Set([year, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4])).sort(
        (a, b) => b - a,
    );

    const exportUrl = (report: string) => {
        const selected = filters.year ?? params.year ?? String(year);
        return `/reports/export?report=${report}&period=custom&from=${selected}-01-01&to=${selected}-12-31`;
    };

    const chartData = rows.map((row) => ({
        label: row.month.slice(0, 3),
        before_rent: row.profit_before_rent,
        after_rent: row.profit_after_rent,
    }));

    const columns: { key: keyof YearTotals; label: string }[] = [
        { key: 'gross_sales', label: t('finance.gross_sales') },
        { key: 'net_sales', label: t('finance.net_sales') },
        { key: 'cogs', label: t('finance.cogs') },
        { key: 'gross_profit', label: t('reports.gross_profit') },
        { key: 'other_expenses', label: t('finance.other_expenses') },
        { key: 'profit_before_rent', label: t('finance.profit_before_rent') },
        { key: 'rent', label: t('finance.rent') },
        { key: 'profit_after_rent', label: t('reports.profit_after_rent') },
        { key: 'estimated_tax', label: t('finance.estimated_tax') },
        { key: 'net_profit', label: t('finance.net_profit') },
    ];

    const moneyCell = (value: number, strong?: boolean) => (
        <span className={cn('tabular-nums', value < 0 ? 'text-rose-600' : strong ? 'text-emerald-600' : 'text-slate-700')}>
            {formatMoney(value, symbol)}
        </span>
    );

    return (
        <div className="space-y-5">
            <PageHeader title={t('reports.title')} subtitle={`${t('reports.year')} ${year}`} />

            <Tabs
                tabs={[
                    { key: 'daily', label: t('reports.daily') },
                    { key: 'monthly', label: t('reports.monthly') },
                    { key: 'yearly', label: t('reports.yearly') },
                ]}
                active={params.type ?? 'yearly'}
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
                <label className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide">{t('reports.year')}</span>
                    <Select
                        value={filters.year ?? params.year ?? String(year)}
                        onChange={(e) => update({ year: e.target.value })}
                        className="w-auto py-2"
                        aria-label={t('reports.year')}
                    >
                        {years.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </Select>
                </label>
            </FilterBar>

            <Card className="animate-slide-up">
                <CardHeader title={t('dash.profit_trend')} subtitle={`${t('reports.year')} ${year}`} />
                <ProfitTrendChart data={chartData} symbol={symbol} />
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('reports.months')} />
                {rows.length === 0 ? (
                    <EmptyState title={t('common.no_results')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('reports.month')}</th>
                                    {columns.map((column) => (
                                        <th key={column.key} className="pb-2 pr-3 text-right font-semibold">
                                            {column.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.month} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 font-medium text-slate-700">{row.month}</td>
                                        {columns.map((column) => (
                                            <td key={column.key} className="py-2.5 pr-3 text-right">
                                                {moneyCell(row[column.key], column.key === 'net_profit')}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-bold text-slate-900">
                                    <td className="py-3 pr-3">{t('reports.totals')}</td>
                                    {columns.map((column) => (
                                        <td key={column.key} className="py-3 pr-3 text-right tabular-nums">
                                            {formatMoney(totals[column.key], symbol)}
                                        </td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
