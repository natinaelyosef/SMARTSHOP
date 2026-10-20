import { useState, type FormEvent } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Banknote, Clock, LockKeyhole, Printer, Wallet } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, StatusBadge } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import { Money } from '@/components/ui';

interface CurrentShift {
    id: number;
    branch: string | null;
    branch_id: number;
    opened_at: string | null;
    opening_float: number;
    cash_sales: number;
    sales_count: number;
}

interface ShiftRow {
    id: number;
    user: string | null;
    branch: string | null;
    opened_at: string | null;
    closed_at: string | null;
    opening_float: number;
    cash_sales: number;
    expected_cash: number | null;
    counted_cash: number | null;
    variance: number | null;
    status: 'open' | 'closed';
}

interface ShiftsProps {
    current: CurrentShift | null;
    history: ShiftRow[];
    opening_float: number;
}

export default function ShiftsIndex({ current, history, opening_float }: ShiftsProps) {
    const { t } = useTranslation();
    const [openOpen, setOpenOpen] = useState(false);
    const [closing, setClosing] = useState<ShiftRow | null>(null);

    const openForm = useForm({ branch_id: '', opening_float: String(opening_float ?? 0) });
    const closeForm = useForm({ counted_cash: '', other_in: '', other_out: '', note: '' });

    const submitOpen = (e?: FormEvent) => {
        e?.preventDefault();

        router.post('/shifts', openForm.data as never, {
            preserveScroll: true,
            onSuccess: () => {
                setOpenOpen(false);
                openForm.clearErrors();
            },
        });
    };

    const openClose = (shift: ShiftRow) => {
        closeForm.clearErrors();
        closeForm.setData({
            counted_cash: String(shift.expected_cash ?? 0),
            other_in: '',
            other_out: '',
            note: '',
        });
        setClosing(shift);
    };

    const submitClose = (e?: FormEvent) => {
        e?.preventDefault();
        if (!closing) return;

        router.post(`/shifts/${closing.id}/close`, closeForm.data as never, {
            preserveScroll: true,
            onSuccess: () => {
                setClosing(null);
                closeForm.clearErrors();
            },
        });
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('shifts.title')}
                subtitle={t('shifts.subtitle')}
                actions={
                    current ? (
                        <Button icon={<LockKeyhole size={16} />} onClick={() => current && openClose(toRow(current))}>
                            {t('shifts.close_shift')}
                        </Button>
                    ) : (
                        <Button icon={<Wallet size={16} />} onClick={() => setOpenOpen(true)}>
                            {t('shifts.open_shift')}
                        </Button>
                    )
                }
            />

            {current ? (
                <Card className="animate-slide-up ring-2 ring-emerald-500/40">
                    <CardHeader
                        title={t('shifts.current')}
                        subtitle={current.branch ?? ''}
                        action={
                            <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                {t('shifts.open')}
                            </Badge>
                        }
                    />

                    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                <Clock size={12} />
                                {t('shifts.opened_at')}
                            </dt>
                            <dd className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                                {formatDateTime(current.opened_at)}
                            </dd>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                {t('shifts.opening_float')}
                            </dt>
                            <dd className="mt-1"><Money value={current.opening_float} className="text-lg font-bold" /></dd>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                <Banknote size={12} />
                                {t('shifts.cash_taken')}
                            </dt>
                            <dd className="mt-1"><Money value={current.cash_sales} className="text-lg font-bold" /></dd>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                {t('shifts.sales_count')}
                            </dt>
                            <dd className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{current.sales_count}</dd>
                        </div>
                    </dl>
                </Card>
            ) : (
                <Card className="animate-slide-up">
                    <EmptyState
                        title={t('shifts.no_shift')}
                        description={t('shifts.no_shift_hint')}
                        action={<Button onClick={() => setOpenOpen(true)}>{t('shifts.open_shift')}</Button>}
                    />
                </Card>
            )}

            <Card className="animate-slide-up">
                <CardHeader title={t('shifts.history')} subtitle={t('common.total_records', { count: history.length })} />
                {history.length === 0 ? (
                    <EmptyState title={t('common.no_results')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.opened_at')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('users.branch')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.opening_float')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.expected')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.counted')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('shifts.variance')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((shift) => (
                                    <tr key={shift.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <p className="font-semibold text-slate-800">{formatDateTime(shift.opened_at)}</p>
                                            <p className="text-xs text-slate-400">{formatDateTime(shift.closed_at)}</p>
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-600">{shift.branch ?? '—'}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{shift.opening_float}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">
                                            {shift.expected_cash === null ? '—' : shift.expected_cash}
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-600">
                                            {shift.counted_cash === null ? '—' : shift.counted_cash}
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            {shift.variance === null ? (
                                                <span className="text-slate-400">—</span>
                                            ) : (
                                                <Badge
                                                    tone={
                                                        shift.variance === 0
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                            : shift.variance < 0
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
                                            <div className="flex justify-end gap-1.5">
                                                <Link
                                                    href={`/shifts/${shift.id}/report`}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    <Printer size={13} />
                                                    {t('shifts.z_report')}
                                                </Link>
                                                {shift.status === 'open' && (
                                                    <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => openClose(shift)}>
                                                        {t('shifts.close')}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={openOpen}
                onClose={() => setOpenOpen(false)}
                title={t('shifts.open_shift')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setOpenOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={openForm.processing} onClick={() => submitOpen()}>
                            {t('shifts.open')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitOpen} className="space-y-4">
                    <Field label={t('shifts.opening_float')} hint={t('shifts.opening_float_hint')} error={openForm.errors.opening_float}>
                        <Input
                            type="number"
                            min="0"
                            step="any"
                            value={openForm.data.opening_float}
                            onChange={(e) => openForm.setData('opening_float', e.target.value)}
                        />
                    </Field>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>

            <Modal
                open={closing !== null}
                onClose={() => setClosing(null)}
                title={t('shifts.close_shift')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setClosing(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={closeForm.processing} onClick={() => submitClose()}>
                            {t('shifts.close')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitClose} className="space-y-4">
                    {closing && (
                        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {t('shifts.expected')}
                            </p>
                            <Money value={closing.expected_cash ?? 0} className="text-2xl font-bold" />
                            <p className="mt-2 text-xs text-slate-500">{t('shifts.count_prompt')}</p>
                        </div>
                    )}

                    <Field label={t('shifts.counted')} error={closeForm.errors.counted_cash} required>
                        <Input
                            type="number"
                            min="0"
                            step="any"
                            value={closeForm.data.counted_cash}
                            onChange={(e) => closeForm.setData('counted_cash', e.target.value)}
                            required
                            autoFocus
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('shifts.other_in')} error={closeForm.errors.other_in}>
                            <Input
                                type="number"
                                step="any"
                                value={closeForm.data.other_in}
                                onChange={(e) => closeForm.setData('other_in', e.target.value)}
                            />
                        </Field>
                        <Field label={t('shifts.other_out')} error={closeForm.errors.other_out}>
                            <Input
                                type="number"
                                min="0"
                                step="any"
                                value={closeForm.data.other_out}
                                onChange={(e) => closeForm.setData('other_out', e.target.value)}
                            />
                        </Field>
                    </div>

                    <Field label={t('common.notes')} error={closeForm.errors.note}>
                        <Input value={closeForm.data.note} onChange={(e) => closeForm.setData('note', e.target.value)} />
                    </Field>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>
        </div>
    );
}

/** The open-shift payload and a history row share the same fields we show. */
function toRow(current: CurrentShift): ShiftRow {
    return {
        id: current.id,
        user: null,
        branch: current.branch,
        opened_at: current.opened_at,
        closed_at: null,
        opening_float: current.opening_float,
        cash_sales: current.cash_sales,
        expected_cash: null,
        counted_cash: null,
        variance: null,
        status: 'open',
    };
}