import { useState, type FormEvent } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Plus, Store, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { Money } from '@/components/ui';
import type { BranchOption } from '@/types';

interface BranchRow {
    id: number;
    name: string;
    code: string | null;
    address: string | null;
    phone: string | null;
    is_active: boolean;
    is_primary: boolean;
    opening_float: number;
    product_lines: number;
    stock_value: number;
    low_stock_count: number;
    employees: number;
}

interface BranchesProps {
    branches: BranchRow[];
    active_branch_id: number | null;
}

const EMPTY_FORM = {
    name: '',
    code: '',
    address: '',
    phone: '',
    opening_float: '',
    copy_stock_from: '',
    is_active: true,
    is_primary: false,
};

export default function BranchesIndex({ branches, active_branch_id }: BranchesProps) {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<BranchRow | null>(null);

    const createForm = useForm({ ...EMPTY_FORM });
    const editForm = useForm({ ...EMPTY_FORM });

    const branchOptions: BranchOption[] = branches.map((b) => ({ id: b.id, name: b.name, code: b.code, is_primary: b.is_primary }));

    const submitCreate = (e?: FormEvent) => {
        e?.preventDefault();

        router.post('/branches', createForm.data as never, {
            preserveScroll: true,
            onSuccess: () => {
                setCreateOpen(false);
                createForm.reset();
                createForm.clearErrors();
            },
        });
    };

    const submitEdit = (e?: FormEvent) => {
        e?.preventDefault();
        if (!editing) return;

        router.put(`/branches/${editing.id}`, editForm.data as never, {
            preserveScroll: true,
            onSuccess: () => {
                setEditing(null);
                editForm.clearErrors();
            },
        });
    };

    const openEdit = (branch: BranchRow) => {
        editForm.clearErrors();
        editForm.setData({
            name: branch.name,
            code: branch.code ?? '',
            address: branch.address ?? '',
            phone: branch.phone ?? '',
            opening_float: String(branch.opening_float ?? 0),
            copy_stock_from: '',
            is_active: branch.is_active,
            is_primary: branch.is_primary,
        });
        setEditing(branch);
    };

    const remove = (branch: BranchRow) => {
        if (!confirm(t('branches.confirm_delete', { name: branch.name }))) return;

        router.delete(`/branches/${branch.id}`, { preserveScroll: true });
    };

    const switchTo = (branchId: number) => {
        if (branchId === active_branch_id) return;

        router.post('/branches/switch', { branch_id: branchId }, { preserveScroll: false });
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('branches.title')}
                subtitle={t('branches.subtitle')}
                actions={
                    <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
                        {t('branches.new')}
                    </Button>
                }
            />

            {branches.length === 0 ? (
                <Card className="animate-slide-up">
                    <EmptyState
                        title={t('branches.empty')}
                        action={<Button onClick={() => setCreateOpen(true)}>{t('branches.new')}</Button>}
                    />
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {branches.map((branch) => {
                        const active = branch.id === active_branch_id;

                        return (
                            <Card
                                key={branch.id}
                                className={'animate-slide-up ' + (active ? 'ring-2 ring-brand-500' : '')}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
                                        <Store size={20} />
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                                            <span className="truncate">{branch.name}</span>
                                            {branch.is_primary && (
                                                <Badge tone="bg-brand-100 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300">
                                                    {t('branches.primary')}
                                                </Badge>
                                            )}
                                            {!branch.is_active && (
                                                <Badge tone="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                                    {t('status.inactive')}
                                                </Badge>
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-slate-400">
                                            {branch.code ? `${branch.code} · ` : ''}
                                            {branch.address ?? t('branches.no_address')}
                                        </p>
                                    </div>
                                </div>

                                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            {t('branches.stock_value')}
                                        </dt>
                                        <dd><Money value={branch.stock_value} /></dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            {t('branches.employees')}
                                        </dt>
                                        <dd className="font-semibold text-slate-700 dark:text-slate-200">{branch.employees}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            {t('branches.product_lines')}
                                        </dt>
                                        <dd className="font-semibold text-slate-700 dark:text-slate-200">{branch.product_lines}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                            {t('branches.low_stock')}
                                        </dt>
                                        <dd className={'font-semibold ' + (branch.low_stock_count > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-200')}>
                                            {branch.low_stock_count}
                                        </dd>
                                    </div>
                                </dl>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {active ? (
                                        <Badge tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                            {t('branches.working_here')}
                                        </Badge>
                                    ) : (
                                        branch.is_active && (
                                            <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => switchTo(branch.id)}>
                                                {t('branches.switch_here')}
                                            </Button>
                                        )
                                    )}

                                    <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => openEdit(branch)}>
                                        {t('common.edit')}
                                    </Button>

                                    {!branch.is_primary && (
                                        <Button
                                            variant="ghost"
                                            className="px-3 py-1.5 text-xs text-red-600"
                                            onClick={() => remove(branch)}
                                        >
                                            <Trash2 size={13} />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title={t('branches.new')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={createForm.processing} onClick={() => submitCreate()}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitCreate} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('common.name')} error={createForm.errors.name} required>
                            <Input value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} required />
                        </Field>
                        <Field label={t('branches.code')} error={createForm.errors.code}>
                            <Input value={createForm.data.code} onChange={(e) => createForm.setData('code', e.target.value)} placeholder="ADD" />
                        </Field>
                    </div>

                    <Field label={t('common.address')} error={createForm.errors.address}>
                        <Input value={createForm.data.address} onChange={(e) => createForm.setData('address', e.target.value)} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('common.phone')} error={createForm.errors.phone}>
                            <Input value={createForm.data.phone} onChange={(e) => createForm.setData('phone', e.target.value)} />
                        </Field>
                        <Field label={t('branches.opening_float')} error={createForm.errors.opening_float}>
                            <Input
                                type="number"
                                min="0"
                                step="any"
                                value={createForm.data.opening_float}
                                onChange={(e) => createForm.setData('opening_float', e.target.value)}
                            />
                        </Field>
                    </div>

                    <Field label={t('branches.copy_stock')} hint={t('branches.copy_stock_hint')} error={createForm.errors.copy_stock_from}>
                        <Select
                            value={createForm.data.copy_stock_from}
                            onChange={(e) => createForm.setData('copy_stock_from', e.target.value)}
                        >
                            <option value="">{t('branches.no_copy')}</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={t('branches.edit')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setEditing(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={editForm.processing} onClick={() => submitEdit()}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={submitEdit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('common.name')} error={editForm.errors.name} required>
                            <Input value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} required />
                        </Field>
                        <Field label={t('branches.code')} error={editForm.errors.code}>
                            <Input value={editForm.data.code} onChange={(e) => editForm.setData('code', e.target.value)} />
                        </Field>
                    </div>

                    <Field label={t('common.address')} error={editForm.errors.address}>
                        <Input value={editForm.data.address} onChange={(e) => editForm.setData('address', e.target.value)} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('common.phone')} error={editForm.errors.phone}>
                            <Input value={editForm.data.phone} onChange={(e) => editForm.setData('phone', e.target.value)} />
                        </Field>
                        <Field label={t('branches.opening_float')} error={editForm.errors.opening_float}>
                            <Input
                                type="number"
                                min="0"
                                step="any"
                                value={editForm.data.opening_float}
                                onChange={(e) => editForm.setData('opening_float', e.target.value)}
                            />
                        </Field>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={editForm.data.is_active}
                            onChange={(e) => editForm.setData('is_active', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        {t('status.active')}
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={editForm.data.is_primary}
                            onChange={(e) => editForm.setData('is_primary', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        {t('branches.primary')}
                    </label>

                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>
        </div>
    );
}