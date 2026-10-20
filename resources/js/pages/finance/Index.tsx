import { usePage } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, PageHeader, cn } from '@/components/ui';
import { DateField, PeriodSelect } from '@/components/filters';
import { ProfitTrendChart } from '@/components/Charts';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { ProfitSummary, SharedProps } from '@/types';

interface CashFlowData {
    from: string;
    to: string;
    cash_from_sales: number;
    cash_from_purchases_booked: number;
    supplier_payments: number;
    expense_payments: number;
    rent_payments: number;
    tax_payments: number;
    total_inflow: number;
    total_outflow: number;
    net_cash_movement: number;
}

interface PreviousData {
    from: string;
    to: string;
    net_sales: number;
    profit_before_rent: number;
    profit_after_rent: number;
    other_expenses: number;
    rent: number;
    gross_sales: number;
    cogs: number;
}

interface TrendPoint {
    label: string;
    sales: number;
    profit_before_rent: number;
    profit_after_rent: number;
    expenses: number;
    rent: number;
}

interface FinanceProps {
    period: string;
    range: { from: string; to: string };
    summary: ProfitSummary;
    cash: CashFlowData;
    previous: PreviousData;
    trend: TrendPoint[];
}

interface LineRow {
    key: string;
    label: string;
    display: number;
    base: number;
    prev?: number;
    profit?: boolean;
    rule?: boolean;
}

export default function FinanceIndex({ period, range, summary, cash, previous, trend }: FinanceProps) {
    const { t } = useTranslation();
    const { shop } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;

    const rows: LineRow[] = [
        { key: 'gross', label: t('finance.gross_sales'), display: summary.gross_sales, base: summary.gross_sales, prev: previous.gross_sales },
        { key: 'returns', label: t('finance.returns'), display: -summary.returns_total, base: summary.returns_total },
        { key: 'net', label: t('finance.net_sales'), display: summary.net_sales, base: summary.net_sales, prev: previous.net_sales, rule: true },
        { key: 'discounts', label: t('common.discount'), display: -summary.discounts, base: summary.discounts },
        { key: 'cogs', label: t('finance.cogs'), display: -summary.cogs, base: summary.cogs, prev: previous.cogs },
        { key: 'gross_profit', label: t('finance.gross_profit'), display: summary.gross_profit, base: summary.gross_profit, profit: true, rule: true },
        { key: 'other', label: t('finance.other_expenses'), display: -summary.other_expenses, base: summary.other_expenses, prev: previous.other_expenses },
        {
            key: 'before_rent',
            label: t('finance.profit_before_rent'),
            display: summary.profit_before_rent,
            base: summary.profit_before_rent,
            prev: previous.profit_before_rent,
            profit: true,
            rule: true,
        },
        { key: 'rent', label: t('finance.rent'), display: -summary.rent, base: summary.rent, prev: previous.rent },
        {
            key: 'after_rent',
            label: t('finance.profit_after_rent'),
            display: summary.profit_after_rent,
            base: summary.profit_after_rent,
            prev: previous.profit_after_rent,
            profit: true,
            rule: true,
        },
        { key: 'tax', label: t('finance.estimated_tax'), display: -summary.estimated_tax, base: summary.estimated_tax },
        { key: 'net_profit', label: t('finance.net_profit'), display: summary.net_profit, base: summary.net_profit, profit: true, rule: true },
    ];

    const cashRows = [
        { key: 'in_sales', label: t('finance.cash_from_sales'), value: cash.cash_from_sales },
        { key: 'suppliers', label: t('finance.supplier_payments'), value: cash.supplier_payments },
        { key: 'expenses', label: t('finance.expense_payments'), value: cash.expense_payments },
        { key: 'rent', label: t('finance.rent_payments'), value: cash.rent_payments },
        { key: 'tax', label: t('finance.tax_payments'), value: cash.tax_payments },
        { key: 'total_in', label: t('finance.cash_in'), value: cash.total_inflow, tone: 'in' as const },
        { key: 'total_out', label: t('finance.cash_out'), value: cash.total_outflow, tone: 'out' as const },
        { key: 'net', label: t('finance.net_cash'), value: cash.net_cash_movement, tone: 'net' as const },
    ];

    const delta = (current: number, prev?: number): number | null => {
        if (prev === undefined || prev === 0) return null;
        return ((current - prev) / Math.abs(prev)) * 100;
    };

    const chartData = trend.map((point) => ({
        label: point.label,
        before_rent: point.profit_before_rent,
        after_rent: point.profit_after_rent,
    }));

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('finance.title')}
                subtitle={`${range.from} – ${range.to}`}
                actions={
                    <>
                        <PeriodSelect allowAll />
                        {period === 'custom' && (
                            <>
                                <DateField param="from" />
                                <DateField param="to" />
                            </>
                        )}
                    </>
                }
            />

            <p className="-mt-4 mb-2 text-xs text-slate-400">{t('finance.accrual_note')}</p>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="animate-slide-up lg:col-span-2">
                    <CardHeader
                        title={t('finance.profit_loss')}
                        subtitle={`${summary.from} – ${summary.to}`}
                        action={<span className="text-xs font-medium text-slate-400">{t('finance.compare_prev')}</span>}
                    />
                    <div>
                        {rows.map((row) => {
                            const change = delta(row.base, row.prev);
                            return (
                                <div
                                    key={row.key}
                                    className={cn(
                                        'flex items-center justify-between gap-3 py-2.5',
                                        row.rule && 'mt-1 border-t-2 border-slate-200 pt-3',
                                    )}
                                >
                                    <span className={cn('text-sm', row.rule || row.profit ? 'font-semibold text-slate-800' : 'text-slate-500')}>
                                        {row.label}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-2.5">
                                        {change !== null && (
                                            <span
                                                title={t('finance.compare_prev')}
                                                className={cn(
                                                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                                                    change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
                                                )}
                                            >
                                                {change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                                {Math.abs(change).toFixed(1)}%
                                            </span>
                                        )}
                                        <span
                                            className={cn(
                                                'min-w-[90px] text-right text-sm tabular-nums sm:min-w-[120px]',
                                                row.display < 0 && 'text-rose-600',
                                                row.display >= 0 && row.profit && 'text-emerald-600',
                                                row.display >= 0 && !row.profit && 'text-slate-800',
                                                row.rule && 'font-bold',
                                            )}
                                        >
                                            {formatMoney(row.display, symbol)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('finance.cash_flow')} subtitle={`${cash.from} – ${cash.to}`} />
                    <div className="space-y-1">
                        {cashRows.map((row) => (
                            <div
                                key={row.key}
                                className={cn(
                                    'flex items-center justify-between gap-3 rounded-lg px-2 py-2',
                                    row.tone && 'mt-1 border-t border-slate-200 pt-3',
                                )}
                            >
                                <span className={cn('text-sm', row.tone ? 'font-semibold text-slate-700' : 'text-slate-500')}>{row.label}</span>
                                <span
                                    className={cn(
                                        'text-sm font-semibold tabular-nums',
                                        row.tone === 'in' && 'text-emerald-600',
                                        row.tone === 'out' && 'text-rose-600',
                                        row.tone === 'net' && (row.value >= 0 ? 'text-emerald-600' : 'text-rose-600'),
                                        !row.tone && 'text-slate-800',
                                    )}
                                >
                                    {formatMoney(row.value, symbol)}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="animate-slide-up lg:col-span-2">
                    <CardHeader title={t('finance.trend')} />
                    <ProfitTrendChart data={chartData} symbol={symbol} />
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader title={t('finance.period_summary')} />
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('finance.sales_count')}</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatNumber(summary.sales_count)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('finance.purchases_total')}</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                                <span className="mr-1 text-base font-semibold text-slate-400">{symbol}</span>
                                {formatNumber(summary.purchases)}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('common.discount')}</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                                <span className="mr-1 text-base font-semibold text-slate-400">{symbol}</span>
                                {formatNumber(summary.discounts)}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
