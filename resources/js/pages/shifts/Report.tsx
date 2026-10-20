import { useTranslation } from '@/lib/i18n';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui';
import { Money } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';

interface Report {
    shift_id: number;
    user: string | null;
    branch: string | null;
    opened_at: string | null;
    closed_at: string | null;
    sales_count: number;
    gross_sales: number;
    discounts: number;
    profit: number;
    opening_float: number;
    cash_sales: number;
    other_in: number;
    other_out: number;
    expected_cash: number;
    counted_cash: number | null;
    variance: number | null;
    returns_count: number;
    returns_value: number;
    by_payment_method: { method: string; count: number; total: number; paid: number }[];
}

interface ShiftReportProps {
    shift: {
        id: number;
        user: string | null;
        branch: string | null;
        opened_at: string | null;
        closed_at: string | null;
        status: string;
    };
    report: Report;
}

export default function ShiftReport({ shift, report }: ShiftReportProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('shifts.z_report')}
                subtitle={`${report.user ?? '—'}${report.branch ? ` · ${report.branch}` : ''}`}
                actions={
                    <Button onClick={() => window.print()} icon={<span aria-hidden>⎙</span>}>
                        {t('common.print')}
                    </Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="animate-slide-up">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('staff.sales')}</p>
                    <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{report.sales_count}</p>
                </Card>
                <Card className="animate-slide-up">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('staff.gross')}</p>
                    <Money value={report.gross_sales} className="mt-1.5 block text-2xl font-bold" />
                </Card>
                <Card className="animate-slide-up">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('staff.profit')}</p>
                    <Money value={report.profit} className="mt-1.5 block text-2xl font-bold" />
                </Card>
                <Card className="animate-slide-up">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('staff.returns')}</p>
                    <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{report.returns_count}</p>
                </Card>
            </div>

            <Card className="animate-slide-up">
                <CardHeader title={t('shifts.drawer')} />
                <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                        { label: t('shifts.opening_float'), value: report.opening_float, plain: false },
                        { label: t('shifts.cash_taken'), value: report.cash_sales, plain: false },
                        { label: t('shifts.other_in'), value: report.other_in, plain: false },
                        { label: t('shifts.other_out'), value: report.other_out, plain: false },
                    ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between py-2.5">
                            <dt className="text-sm text-slate-500 dark:text-slate-400">{row.label}</dt>
                            <dd className="font-semibold text-slate-800 dark:text-slate-100">
                                <Money value={row.value} />
                            </dd>
                        </div>
                    ))}

                    <div className="flex items-center justify-between py-3">
                        <dt className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('shifts.expected')}</dt>
                        <dd className="text-lg font-bold text-slate-900 dark:text-white">
                            <Money value={report.expected_cash} />
                        </dd>
                    </div>

                    {report.counted_cash !== null && (
                        <>
                            <div className="flex items-center justify-between py-2.5">
                                <dt className="text-sm text-slate-500 dark:text-slate-400">{t('shifts.counted')}</dt>
                                <dd className="font-semibold text-slate-800 dark:text-slate-100">
                                    <Money value={report.counted_cash} />
                                </dd>
                            </div>

                            <div className="flex items-center justify-between py-2.5">
                                <dt className="text-sm text-slate-500 dark:text-slate-400">{t('shifts.variance')}</dt>
                                <dd>
                                    <Badge
                                        tone={
                                            report.variance === 0
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                : (report.variance ?? 0) < 0
                                                  ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                                        }
                                    >
                                        {report.variance! > 0 ? '+' : ''}
                                        {report.variance}
                                    </Badge>
                                </dd>
                            </div>
                        </>
                    )}
                </dl>
            </Card>

            <Card className="animate-slide-up">
                <CardHeader title={t('shifts.by_payment_method')} />
                {report.by_payment_method.length === 0 ? (
                    <EmptyState title={t('common.no_results')} />
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                <th className="pb-2 pr-3 font-semibold">{t('common.method')}</th>
                                <th className="pb-2 pr-3 font-semibold">{t('staff.sales')}</th>
                                <th className="pb-2 pr-3 font-semibold">{t('staff.total')}</th>
                                <th className="pb-2 font-semibold">{t('shifts.paid')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.by_payment_method.map((row) => (
                                <tr key={row.method} className="border-b border-slate-50">
                                    <td className="py-2.5 pr-3 font-semibold text-slate-700 capitalize dark:text-slate-200">
                                        {row.method}
                                    </td>
                                    <td className="py-2.5 pr-3 text-slate-600">{row.count}</td>
                                    <td className="py-2.5 pr-3 text-slate-600">
                                        <Money value={row.total} />
                                    </td>
                                    <td className="py-2.5 text-slate-600">
                                        <Money value={row.paid} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            <p className="text-center text-xs text-slate-400">
                {formatDateTime(report.opened_at)} — {formatDateTime(report.closed_at)}
            </p>
        </div>
    );
}