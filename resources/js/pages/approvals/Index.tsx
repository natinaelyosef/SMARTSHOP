import { useState, type FormEvent } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Check, ClipboardCheck, X } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import type { BranchOption } from '@/types';

interface ApprovalRow {
    id: number;
    type: string;
    status: 'pending' | 'approved' | 'rejected';
    requester: string | null;
    reviewer: string | null;
    branch: string | null;
    reason: string | null;
    review_note: string | null;
    payload: Record<string, unknown> | null;
    requested_at: string | null;
    reviewed_at: string | null;
}

interface ApprovalsProps {
    requests: ApprovalRow[];
    status: string;
    pending_count: number;
    can_review: boolean;
    branches: BranchOption[];
}

const STATUS_TONE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

const TYPES = ['price_change', 'stock_adjustment', 'discount', 'sale'];

export default function ApprovalsIndex({ requests, status, pending_count, can_review, branches }: ApprovalsProps) {
    const { t } = useTranslation();
    const [requestOpen, setRequestOpen] = useState(false);
    const [reviewing, setReviewing] = useState<ApprovalRow | null>(null);

    const form = useForm({ type: 'price_change', branch_id: '', reason: '', product_variant_id: '', new_price: '', quantity: '' });
    const reviewForm = useForm({ approve: true, note: '' });

    const setStatus = (next: string) => router.get('/approvals', { status: next }, { preserveScroll: true });

    const submitRequest = (e?: FormEvent) => {
        e?.preventDefault();

        const payload: Record<string, string | number> = {};

        if (form.data.type === 'price_change') {
            payload.product_variant_id = Number(form.data.product_variant_id);
            payload.new_price = Number(form.data.new_price);
        }

        if (form.data.type === 'stock_adjustment') {
            payload.product_variant_id = Number(form.data.product_variant_id);
            payload.quantity = Number(form.data.quantity);
        }

        router.post(
            '/approvals',
            {
                type: form.data.type,
                branch_id: form.data.branch_id || null,
                reason: form.data.reason,
                payload,
            },
            {
                onSuccess: () => {
                    setRequestOpen(false);
                    form.reset();
                    form.clearErrors();
                },
            },
        );
    };

    const openReview = (row: ApprovalRow, approve: boolean) => {
        reviewForm.clearErrors();
        reviewForm.setData({ approve, note: '' });
        setReviewing(row);
    };

    const submitReview = (e?: FormEvent) => {
        e?.preventDefault();
        if (!reviewing) return;

        router.post(
            `/approvals/${reviewing.id}/review`,
            { approve: reviewForm.data.approve, note: reviewForm.data.note },
            {
                onSuccess: () => {
                    setReviewing(null);
                    reviewForm.clearErrors();
                },
            },
        );
    };

    const payloadSummary = (row: ApprovalRow): string => {
        const payload = row.payload ?? {};

        if (row.type === 'price_change') {
            return `${t('approvals.new_price')}: ${payload.new_price ?? '—'}`;
        }

        if (row.type === 'stock_adjustment') {
            return `${t('approvals.quantity')}: ${payload.quantity ?? '—'}`;
        }

        if (row.type === 'sale') {
            return `${t('approvals.sale_number')} ${payload.sale_number ?? ''} — ${payload.total ?? '—'}`;
        }

        return `${payload.sale_number ?? ''} — ${payload.percent ?? 0}%`;
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('approvals.title')}
                subtitle={pending_count > 0 ? t('approvals.pending_count', { count: pending_count }) : t('approvals.subtitle')}
                actions={
                    <Button icon={<ClipboardCheck size={16} />} onClick={() => setRequestOpen(true)}>
                        {t('approvals.new')}
                    </Button>
                }
            />

            <div className="flex gap-1.5">
                {['pending', 'approved', 'rejected', 'all'].map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setStatus(option)}
                        className={
                            'rounded-full px-3.5 py-1.5 text-xs font-semibold transition ' +
                            (status === option
                                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')
                        }
                    >
                        {option === 'all' ? t('common.all') : t(`approvals.status_${option}`)}
                    </button>
                ))}
            </div>

            <Card className="animate-slide-up">
                <CardHeader title={t('approvals.list')} subtitle={t('common.total_records', { count: requests.length })} />
                {requests.length === 0 ? (
                    <EmptyState title={t('common.no_results')} description={t('approvals.empty')} />
                ) : (
                    <div className="space-y-3">
                        {requests.map((row) => (
                            <div
                                key={row.id}
                                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-brand-300 dark:border-slate-700"
                            >
                                <div className="flex flex-wrap items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <ClipboardCheck size={18} className="text-slate-500" />
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                                            {t(`approvals.type_${row.type}`)}
                                            <Badge tone={STATUS_TONE[row.status]}>{t(`approvals.status_${row.status}`)}</Badge>
                                            {row.branch && <span className="text-xs font-normal text-slate-400">{row.branch}</span>}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                            {t('approvals.requester')}: {row.requester ?? '—'}
                                            {' · '}
                                            {row.requested_at}
                                            {row.reviewer ? ` · ${t('approvals.reviewer')}: ${row.reviewer}` : ''}
                                        </p>
                                    </div>

                                    <Badge tone="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                        {payloadSummary(row)}
                                    </Badge>
                                </div>

                                {row.reason && (
                                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                                        {row.reason}
                                    </p>
                                )}

                                {row.review_note && (
                                    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                                        {row.review_note}
                                    </p>
                                )}

                                {can_review && row.status === 'pending' && (
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            className="px-3 py-1.5 text-xs"
                                            icon={<X size={13} />}
                                            onClick={() => openReview(row, false)}
                                        >
                                            {t('approvals.reject')}
                                        </Button>
                                        <Button
                                            className="px-3 py-1.5 text-xs"
                                            icon={<Check size={13} />}
                                            onClick={() => openReview(row, true)}
                                        >
                                            {t('approvals.approve')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal
                open={requestOpen}
                onClose={() => setRequestOpen(false)}
                title={t('approvals.new')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setRequestOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={form.processing} onClick={() => submitRequest()}>
                            {t('approvals.send')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitRequest} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('approvals.type')} error={form.errors.type} required>
                            <Select value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} required>
                                {TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {t(`approvals.type_${type}`)}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label={t('users.branch')} error={form.errors.branch_id}>
                            <Select value={form.data.branch_id} onChange={(e) => form.setData('branch_id', e.target.value)}>
                                <option value="">{t('users.no_branch')}</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>

                    {(form.data.type === 'price_change' || form.data.type === 'stock_adjustment') && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('approvals.variant_id')} required>
                                <Input
                                    type="number"
                                    min="1"
                                    value={form.data.product_variant_id}
                                    onChange={(e) => form.setData('product_variant_id', e.target.value)}
                                    required
                                />
                            </Field>

                            {form.data.type === 'price_change' ? (
                                <Field label={t('approvals.new_price')} required>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={form.data.new_price}
                                        onChange={(e) => form.setData('new_price', e.target.value)}
                                        required
                                    />
                                </Field>
                            ) : (
                                <Field label={t('approvals.quantity')} hint={t('approvals.quantity_hint')} required>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={form.data.quantity}
                                        onChange={(e) => form.setData('quantity', e.target.value)}
                                        required
                                    />
                                </Field>
                            )}
                        </div>
                    )}

                    <Field label={t('common.reason')} error={form.errors.reason} required>
                        <Textarea rows={3} value={form.data.reason} onChange={(e) => form.setData('reason', e.target.value)} required />
                    </Field>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>

            <Modal
                open={reviewing !== null}
                onClose={() => setReviewing(null)}
                title={reviewForm.data.approve ? t('approvals.approve') : t('approvals.reject')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setReviewing(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={reviewForm.processing} onClick={() => submitReview()}>
                            {t('common.confirm')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitReview} className="space-y-4">
                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                        {reviewing?.reason}
                    </p>

                    <Field label={t('common.note')} error={reviewForm.errors.note}>
                        <Textarea rows={3} value={reviewForm.data.note} onChange={(e) => reviewForm.setData('note', e.target.value)} />
                    </Field>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>
        </div>
    );
}