import { Link } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Award, Banknote, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { Money } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { FilterBar, PeriodSelect, ResetButton } from '@/components/filters';
import { usePage } from '@inertiajs/react';
import type { BranchOption } from '@/types';

interface StaffRow {
    user_id: number;
    name: string;
    role: string | null;
    branch: string | null;
    status: 'active' | 'inactive';
    last_login_at: string | null;
    sales_count: number;
    revenue: number;
    profit: number;
    discounts: number;
    margin: number;
    average_sale: number;
    returns_count: number;
    refunded: number;
    shifts: number;
    cash_shortages: number;
    cash_overages: number;
}

interface StaffTotals {
    employees: number;
    revenue: number;
    profit: number;
    sales_count: number;
    refunded: number;
    cash_shortages: number;
    cash_overages: number;
}

interface StaffProps {
    period: string;
    from: string;
    to: string;
    branch_id: number | null;
    rows: StaffRow[];
    totals: StaffTotals;
    symbol: string;
    branches: BranchOption[];
}

export default function StaffIndex({ rows, totals, symbol, branches, from, to }: StaffProps) {
    const { t } = useTranslation();

    const cards = [
        { key: 'revenue', label: t('staff.total_revenue'), value: totals.revenue, icon: <TrendingUp size={15} /> },
        { key: 'profit', label: t('staff.total_profit'), value: totals.profit, icon: <Award size={15} /> },
        { key: 'sales_count', label: t('staff.total_sales'), value: totals.sales_count, icon: <Receipt size={15} />, plain: true },
        { key: 'employees', label: t('staff.active_staff'), value: totals.employees, icon: <Wallet size={15} />, plain: true },
    ];

    return (
        <div className="space-y-5">
            <PageHeader title={t('staff.title')} subtitle={t('staff.subtitle')} />

            <FilterBar>
                <PeriodSelect param="period" />
                {branches.length > 1 && (
                    <select
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                window.location.href = `/staff?period=month&branch_id=${e.target.value}`;
                            }
                        }}
                        aria-label={t('users.branch')}
                        className="w-auto min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <option value="">{t('users.no_branch')}</option>
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                )}
                <ResetButton />
            </FilterBar>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <Card key={card.key} className="animate-slide-up">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            <span>{card.icon}</span>
                            {card.label}
                        </p>
                        <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
                            {card.plain ? card.value : <Money value={card.value} symbol={symbol} />}
                        </p>
                    </Card>
                ))}
            </div>

            <Card className="animate-slide-up">
                <CardHeader title={t('staff.leaderboard')} subtitle={t('common.total_records', { count: rows.length })} />

                {rows.length === 0 ? (
                    <EmptyState title={t('common.no_results')} description={t('staff.empty')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('staff.rank')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('common.name')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('staff.sales')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('staff.revenue')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('staff.profit')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('staff.margin')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('staff.avg_sale')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('staff.returns')}</th>
                                    <th className="pb-2 font-semibold">{t('staff.drawer')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => {
                                    const drawer = row.cash_shortages !== 0 ? row.cash_shortages : row.cash_overages;

                                    return (
                                        <tr key={row.user_id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                            <td className="py-2.5 pr-3">
                                                <span
                                                    className={
                                                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ' +
                                                        (index === 0
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                                            : index === 1
                                                              ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800')
                                                    }
                                                >
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="py-2.5 pr-3">
                                                <p className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                                                    {row.name}
                                                    {row.status === 'inactive' && (
                                                        <StatusBadge status="inactive" label={t('status.inactive')} />
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {row.role ?? '—'}
                                                    {row.branch ? ` · ${row.branch}` : ''}
                                                </p>
                                            </td>
                                            <td className="py-2.5 pr-3 font-semibold text-slate-700 dark:text-slate-200">
                                                {row.sales_count}
                                            </td>
                                            <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-200">
                                                <Money value={row.revenue} symbol={symbol} />
                                            </td>
                                            <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-200">
                                                <Money value={row.profit} symbol={symbol} />
                                            </td>
                                            <td className="py-2.5 pr-3">
                                                <Badge
                                                    tone={
                                                        row.margin >= 20
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                            : row.margin >= 10
                                                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                                              : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                                    }
                                                >
                                                    {row.margin}%
                                                </Badge>
                                            </td>
                                            <td className="py-2.5 pr-3 text-slate-600">
                                                <Money value={row.average_sale} symbol={symbol} />
                                            </td>
                                            <td className="py-2.5 pr-3">
                                                {row.returns_count > 0 ? (
                                                    <span className="flex items-center gap-1 text-amber-600">
                                                        <AlertTriangle size={13} />
                                                        {row.returns_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-2.5">
                                                {drawer !== 0 ? (
                                                    <Badge
                                                        tone={
                                                            drawer < 0
                                                                ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                                        }
                                                    >
                                                        <Banknote size={12} />
                                                        {drawer > 0 ? '+' : ''}
                                                        {drawer}
                                                    </Badge>
                                                ) : (
                                                    <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                        {t('staff.balanced')}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-2.5 text-right">
                                                <Link
                                                    href={`/staff/${row.user_id}`}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    {t('staff.view')}
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}