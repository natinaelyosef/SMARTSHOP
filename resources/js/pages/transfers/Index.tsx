import { useMemo, useState, type FormEvent } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ArrowLeftRight, Plus, Undo2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select, StatusBadge } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatDateTime } from '@/lib/utils';
import type { BranchOption } from '@/types';

interface TransferRow {
    id: number;
    transfer_number: string;
    from: string | null;
    to: string | null;
    user: string | null;
    status: 'completed' | 'cancelled';
    lines: number;
    notes: string | null;
    transferred_at: string | null;
}

interface SourceVariant {
    product_variant_id: number;
    label: string;
    sku: string | null;
    stock: number;
    cost: number;
}

interface TransferLine {
    product_variant_id: number;
    label: string;
    sku: string | null;
    available: number;
    quantity: string;
}

interface TransfersProps {
    transfers: TransferRow[];
    branches: BranchOption[];
    active_branch_id: number | null;
}

const STATUS_TONE: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export default function TransfersIndex({ transfers, branches, active_branch_id }: TransfersProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const form = useForm({
        from_branch_id: active_branch_id ? String(active_branch_id) : '',
        to_branch_id: '',
        notes: '',
        items: [] as TransferLine[],
    });

    const [source, setSource] = useState<SourceVariant[]>([]);
    const [loadingSource, setLoadingSource] = useState(false);

    const fromBranchId = Number(form.data.from_branch_id) || null;
    const toBranchId = Number(form.data.to_branch_id) || null;

    const sameBranch = fromBranchId !== null && fromBranchId === toBranchId;

    /**
     * Load what the source branch actually holds, so a transfer can never
     * promise stock it does not have.
     */
    const loadSource = async (branchId: number | null) => {
        if (!branchId) {
            setSource([]);
            form.setData('items', []);
            return;
        }

        setLoadingSource(true);

        try {
            const response = await fetch(`/transfers/source?branch_id=${branchId}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });

            if (response.ok) {
                const data = await response.json();
                setSource(data.variants ?? []);
                form.setData('items', []);
            }
        } finally {
            setLoadingSource(false);
        }
    };

    const addLine = (variant: SourceVariant) => {
        if (form.data.items.some((line) => line.product_variant_id === variant.product_variant_id)) return;

        form.setData('items', [
            ...form.data.items,
            {
                product_variant_id: variant.product_variant_id,
                label: variant.label,
                sku: variant.sku,
                available: variant.stock,
                quantity: '',
            },
        ]);
    };

    const removeLine = (variantId: number) => {
        form.setData('items', form.data.items.filter((line) => line.product_variant_id !== variantId));
    };

    const setQuantity = (variantId: number, quantity: string) => {
        form.setData(
            'items',
            form.data.items.map((line) => (line.product_variant_id === variantId ? { ...line, quantity } : line)),
        );
    };

    const totalUnits = useMemo(
        () => form.data.items.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
        [form.data.items],
    );

    const oversold = form.data.items.some((line) => Number(line.quantity) > line.available);

    const submit = (e?: FormEvent) => {
        e?.preventDefault();

        if (oversold || totalUnits <= 0) return;

        router.post(
            '/transfers',
            {
                from_branch_id: fromBranchId,
                to_branch_id: toBranchId,
                notes: form.data.notes,
                items: form.data.items.map((line) => ({
                    product_variant_id: line.product_variant_id,
                    quantity: Number(line.quantity),
                })),
            },
            {
                onSuccess: () => {
                    setOpen(false);
                    form.reset();
                    form.clearErrors();
                    setSource([]);
                },
            },
        );
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('transfers.title')}
                subtitle={t('transfers.subtitle')}
                actions={
                    <Button
                        icon={<Plus size={16} />}
                        onClick={() => {
                            form.setData('from_branch_id', active_branch_id ? String(active_branch_id) : '');
                            setOpen(true);
                        }}
                    >
                        {t('transfers.new')}
                    </Button>
                }
            />

            <Card className="animate-slide-up">
                <CardHeader title={t('transfers.history')} subtitle={t('common.total_records', { count: transfers.length })} />
                {transfers.length === 0 ? (
                    <EmptyState title={t('common.no_results')} description={t('transfers.empty')} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 pr-3 font-semibold">{t('transfers.number')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('transfers.route')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('transfers.lines')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('transfers.by')}</th>
                                    <th className="pb-2 pr-3 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.map((transfer) => (
                                    <tr key={transfer.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <p className="font-semibold text-slate-800">{transfer.transfer_number}</p>
                                            <p className="text-xs text-slate-400">{formatDateTime(transfer.transferred_at)}</p>
                                        </td>
                                        <td className="py-2.5 pr-3">
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <span className="truncate">{transfer.from ?? '—'}</span>
                                                <ArrowLeftRight size={13} className="shrink-0 text-slate-400" />
                                                <span className="truncate">{transfer.to ?? '—'}</span>
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-600">{transfer.lines}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{transfer.user ?? '—'}</td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge
                                                status={transfer.status === 'completed' ? 'active' : 'inactive'}
                                                label={t(`transfers.status_${transfer.status}`)}
                                            />
                                        </td>
                                        <td className="py-2.5 text-right">
                                            {transfer.status === 'completed' && (
                                                <Button
                                                    variant="outline"
                                                    className="px-3 py-1.5 text-xs"
                                                    icon={<Undo2 size={13} />}
                                                    onClick={() => router.delete(`/transfers/${transfer.id}`, { preserveScroll: true })}
                                                >
                                                    {t('transfers.reverse')}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={t('transfers.new')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={form.processing} disabled={oversold || totalUnits <= 0 || sameBranch} onClick={() => submit()}>
                            {t('transfers.confirm')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('transfers.from')} required>
                            <Select
                                value={form.data.from_branch_id}
                                onChange={(e) => {
                                    form.setData('from_branch_id', e.target.value);
                                    loadSource(Number(e.target.value) || null);
                                }}
                                required
                            >
                                <option value="">{t('common.select')}</option>
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field
                            label={t('transfers.to')}
                            required
                            error={sameBranch ? t('transfers.error_same_branch') : form.errors.to_branch_id}
                        >
                            <Select
                                value={form.data.to_branch_id}
                                onChange={(e) => form.setData('to_branch_id', e.target.value)}
                                required
                            >
                                <option value="">{t('common.select')}</option>
                                {branches
                                    .filter((branch) => String(branch.id) !== form.data.from_branch_id)
                                    .map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </option>
                                    ))}
                            </Select>
                        </Field>
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t('transfers.items')}
                        </p>

                        {form.data.items.length === 0 ? (
                            <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                                {loadingSource ? t('common.loading') : t('transfers.pick_items')}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {form.data.items.map((line) => {
                                    const over = Number(line.quantity) > line.available;

                                    return (
                                        <div
                                            key={line.product_variant_id}
                                            className={
                                                'flex items-center gap-3 rounded-xl border p-3 ' +
                                                (over ? 'border-red-300 bg-red-50/50 dark:border-red-500/40' : 'border-slate-200 dark:border-slate-700')
                                            }
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                    {line.label}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {t('transfers.available', { count: line.available })}
                                                    {line.sku ? ` · ${line.sku}` : ''}
                                                </p>
                                            </div>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={line.quantity}
                                                onChange={(e) => setQuantity(line.product_variant_id, e.target.value)}
                                                className="w-24"
                                                aria-label={t('transfers.quantity')}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeLine(line.product_variant_id)}
                                                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                                aria-label={t('common.remove')}
                                            >
                                                <Undo2 size={15} className="rotate-180" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {oversold && (
                            <p className="mt-2 text-xs font-semibold text-red-600">{t('transfers.error_insufficient')}</p>
                        )}
                    </div>

                    {form.data.items.length > 0 && source.length > form.data.items.length && (
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {t('transfers.available_items')}
                            </p>
                            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                                {source
                                    .filter((variant) => !form.data.items.some((line) => line.product_variant_id === variant.product_variant_id))
                                    .map((variant) => (
                                        <button
                                            key={variant.product_variant_id}
                                            type="button"
                                            onClick={() => addLine(variant)}
                                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300"
                                        >
                                            + {variant.label} <span className="text-slate-400">({variant.stock})</span>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    <Field label={t('common.notes')} error={form.errors.notes}>
                        <Input value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
                    </Field>

                    {totalUnits > 0 && (
                        <Badge tone="bg-brand-100 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300">
                            {t('transfers.total_units', { count: totalUnits })}
                        </Badge>
                    )}

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>
        </div>
    );
}