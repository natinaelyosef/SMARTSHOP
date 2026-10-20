import { Link } from '@inertiajs/react';
import { ArrowLeft, Award, Banknote, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { Money } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';

interface ShiftRow {
    id: number;
    branch: string | null;
    opened_at: string | null;
    closed_at: string | null;
    expected_cash: number | null;
    counted_cash: number | null;
    variance: number | null;
    status: 'open' | 'closed';
}

interface SeriesPoint {
    label: string;
    total: number;
}

interface StaffShowProps {
    employee: {
        id: number;
        name: string;
        email: string;
        role: string | null;
        branch: string | null;
        status: 'active' | 'inactive';
        last_login_at: string | null;
    };
    row: {
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
    } | null;
    series: SeriesPoint[];
    period: string;
    from: string;
    to: string;
    symbol: string;
    shifts: ShiftRow[];
}

export default function StaffShow({ employee, row, series, symbol, shifts }: StaffShowProps) {
    const { t } = useTranslation();

    const max = Math.max(...series.map((point) => point.total), 1);

    const stats = row
        ? [
              { label: t('staff.sales'), value: row.sales_count, plain: true, icon: <Receipt size={15} /> },
              { label: t('staff.revenue'), value: row.revenue, icon: <TrendingUp size={15} /> },
              { label: t('staff.profit'), value: row.profit, icon: <Award size={15} /> },
              { label: t('staff.margin'), value: `${row.margin}%`, plain: true, icon: <Wallet size={15} /> },
              { label: t('staff.avg_sale'), value: row.average_sale, icon: <Banknote size={15} /> },
              { label: t('staff.shifts_closed'), value: row.shifts, plain: true, icon: <Receipt size={15} /> },
          ]
        : [];

    return (
        <div className="space-y-5">
            <Link href="/staff" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800">
                <ArrowLeft size={15} />
                {t('common.back')}
            </Link>

            <PageHeader
                title={employee.name}
                subtitle={`${employee.role ?? '—'}${employee.branch ? ` · ${employee.branch}` : ''}`}
                actions={
                    employee.status === 'active' ? (
                        <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            {t('status.active')}
                        </Badge>
                    ) : (
                        <StatusBadge status="inactive" label={t('status.inactive')} />
                    )
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.label} className="animate-slide-up">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            <span>{stat.icon}</span>
                            {stat.label}
                        </p>
                        <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
                            {stat.plain ? stat.value : <Money value={stat.value as number} symbol={symbol} />}
                        </p>
                    </Card>
                ))}
            </div>

            <Card className="animate-slide-up">
                <CardHeader title={t('staff.daily')} subtitle={`${from} → ${to}`} />
                {series.length === 0 ? (
                    <EmptyState title={t('common.no_results')} />
                ) : (
                    <div className="flex h-40 items-end gap-0.5">
                        {series.map((point) => (
                            <div key={point.label} className="group relative flex-1" title={`${point.label}: ${point.total}`}>
                                <div
                                    className="w-full rounded-t bg-brand-500/80 transition group-hover:bg-brand-600"
                                    style={{ height: `${Math.max((point.total / max) * 100, 2)}%` }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('shifts.history')} subtitle={t('common.total_records', { count: shifts.length })} />
                {shifts.length === 0 ? (
                    <EmptyState title={t('common.no_results')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.opened_at')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('users.branch')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.expected')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.counted')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.variance')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.map((shift) => (
                                    <tr key={shift.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3 text-slate-600">{formatDateTime(shift.opened_at)}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{shift.branch ?? '—'}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{shift.expected_cash ?? '—'}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{shift.counted_cash ?? '—'}</td>
                                        <td className="py-2.5 pr-3">
                                            {shift.variance === null || shift.variance === 0 ? (
                                                <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                    {t('staff.balanced')}
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    tone={
                                                        shift.variance < 0
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                                    }
                                                >
                                                    {shift.variance > 0 ? '+' : ''}
                                                    {shift.variance}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="py-2.5">
                                            <StatusBadge
                                                status={shift.status === 'open' ? 'active' : 'inactive'}
                                                label={t(`shifts.${shift.status}`)}
                                            />
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <Link
                                                href={`/shifts/${shift.id}/report`}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                            >
                                                {t('shifts.z_report')}
                                            </Link>
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