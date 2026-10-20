import { type FormEvent, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, StatusBadge } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import { formatDate } from '@/lib/utils';

interface UnitRow {
    id: number;
    name: string;
    slug: string;
    short_name: string | null;
    base_unit: string | null;
    is_system: boolean;
    status: string;
    created_at: string;
    updated_at: string;
}

interface UnitsIndexProps {
    units: UnitRow[];
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

export default function UnitsIndex({ units }: UnitsIndexProps) {
    const { t, locale } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState<UnitRow | null>(null);

    const createForm = useForm({ name: '', short_name: '' });
    const editForm = useForm({ name: '', short_name: '', status: 'active' });

    const openCreate = () => {
        createForm.reset();
        setCreateOpen(true);
    };

    const submitCreate = (e: FormEvent) => {
        e.preventDefault();
        createForm.post('/units', {
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const openEdit = (unit: UnitRow) => {
        editForm.setData('name', unit.name);
        editForm.setData('short_name', unit.short_name ?? '');
        editForm.setData('status', unit.status);
        editForm.clearErrors();
        setEditing(unit);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        editForm.transform((d) => ({
            name: d.name,
            short_name: d.short_name || null,
            status: d.status,
        }));
        editForm.put(`/units/${editing.id}`, {
            onSuccess: () => {
                editForm.reset();
                setEditing(null);
            },
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('units.title')}
                actions={
                    <Button onClick={openCreate} icon={<Plus size={16} />}>
                        {t('units.new')}
                    </Button>
                }
            />

            <Card className="animate-slide-up">
                {units.length === 0 ? (
                    <EmptyState
                        title={t('units.empty')}
                        action={
                            <Button onClick={openCreate} icon={<Plus size={16} />}>
                                {t('units.new')}
                            </Button>
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="pb-2 font-semibold">{t('common.name')}</th>
                                    <th className="pb-2 font-semibold">{t('units.short_name')}</th>
                                    <th className="pb-2 font-semibold">{t('units.base_unit')}</th>
                                    <th className="pb-2 font-semibold">{t('common.status')}</th>
                                    <th className="pb-2 font-semibold">{t('common.updated')}</th>
                                    <th className="pb-2 text-right font-semibold">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map((unit) => (
                                    <tr key={unit.id} className="border-b border-slate-50 transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-3">
                                            <span className="font-semibold text-slate-800">{unit.name}</span>
                                            {unit.is_system && (
                                                <Badge tone="bg-sky-100 text-sky-700" className="ml-2">
                                                    {t('settings.is_system')}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{unit.short_name || '—'}</td>
                                        <td className="py-2.5 pr-3 text-slate-500">{unit.base_unit || '—'}</td>
                                        <td className="py-2.5 pr-3">
                                            <StatusBadge status={unit.status} label={t(`status.${unit.status}`)} />
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-500">{formatDate(unit.updated_at, locale)}</td>
                                        <td className="py-2.5 text-right">
                                            <Button
                                                variant="outline"
                                                className="px-3 py-1.5 text-xs"
                                                onClick={() => openEdit(unit)}
                                                icon={<Pencil size={13} />}
                                            >
                                                {t('common.edit')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title={t('units.new')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="unit-create-form" type="submit" loading={createForm.processing}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form id="unit-create-form" onSubmit={submitCreate} className="space-y-4">
                    <Field label={t('common.name')} required error={fieldError(createForm.errors, 'name')}>
                        <Input
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            autoFocus
                        />
                    </Field>
                    <Field label={t('units.short_name')} error={fieldError(createForm.errors, 'short_name')}>
                        <Input
                            value={createForm.data.short_name}
                            onChange={(e) => createForm.setData('short_name', e.target.value)}
                        />
                    </Field>
                </form>
            </Modal>

            <Modal
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={t('common.edit')}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setEditing(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button form="unit-edit-form" type="submit" loading={editForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="unit-edit-form" onSubmit={submitEdit} className="space-y-4">
                    <Field
                        label={t('common.name')}
                        required
                        error={fieldError(editForm.errors, 'name')}
                        hint={editing?.is_system ? t('settings.is_system') : undefined}
                    >
                        <Input
                            value={editForm.data.name}
                            onChange={(e) => editForm.setData('name', e.target.value)}
                            autoFocus
                        />
                    </Field>
                    <Field label={t('units.short_name')} error={fieldError(editForm.errors, 'short_name')}>
                        <Input
                            value={editForm.data.short_name}
                            onChange={(e) => editForm.setData('short_name', e.target.value)}
                        />
                    </Field>
                    <Field label={t('common.status')} required error={fieldError(editForm.errors, 'status')}>
                        <Select
                            value={editForm.data.status}
                            onChange={(e) => editForm.setData('status', e.target.value)}
                        >
                            <option value="active">{t('status.active')}</option>
                            <option value="archived">{t('status.archived')}</option>
                        </Select>
                    </Field>
                </form>
            </Modal>
        </div>
    );
}
