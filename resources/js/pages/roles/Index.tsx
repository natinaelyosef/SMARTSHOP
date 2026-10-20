import { useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, PageHeader, Spinner, cn } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
import type { SharedProps } from '@/types';

interface RoleRow {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_system: boolean;
    /** Owners (and platform admins) always hold every permission. */
    locked: boolean;
    users_count: number;
    permissions: string[];
}

interface PermissionRecord {
    id: number;
    name: string;
    slug: string;
}

interface RolesProps {
    roles: RoleRow[];
    permissions: Record<string, PermissionRecord[]>;
}

function buildSlugMap(permissions: Record<string, PermissionRecord[]>): Map<string, number> {
    const map = new Map<string, number>();
    Object.values(permissions).forEach((group) => group.forEach((permission) => map.set(permission.slug, permission.id)));
    return map;
}

function idsFor(role: RoleRow | undefined, slugMap: Map<string, number>): number[] {
    if (!role) return [];
    return role.permissions.map((slug) => slugMap.get(slug)).filter((id): id is number => typeof id === 'number');
}

function prettifyModule(module: string): string {
    return module
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function RolesIndex({ roles, permissions }: RolesProps) {
    const { t } = useTranslation();
    const { props } = usePage<SharedProps>();
    const slugMap = useMemo(() => buildSlugMap(permissions), [permissions]);

    const [selectedId, setSelectedId] = useState<number | null>(roles[0]?.id ?? null);
    const [checked, setChecked] = useState<number[]>(() => idsFor(roles[0], slugMap));
    const [saving, setSaving] = useState(false);

    const serverErrors = props.errors as Record<string, string> | undefined;
    const selected = roles.find((role) => role.id === selectedId) ?? null;
    const readonly = selected?.locked ?? false;

    const selectRole = (role: RoleRow) => {
        setSelectedId(role.id);
        setChecked(idsFor(role, slugMap));
    };

    const toggle = (id: number) => {
        setChecked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const toggleModule = (group: PermissionRecord[]) => {
        const groupIds = group.map((permission) => permission.id);
        const allChecked = groupIds.every((id) => checked.includes(id));
        setChecked((prev) => {
            if (allChecked) return prev.filter((id) => !groupIds.includes(id));
            return Array.from(new Set([...prev, ...groupIds]));
        });
    };

    const save = () => {
        if (!selected) return;
        setSaving(true);
        router.put(
            `/roles/${selected.id}`,
            { permissions: checked },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    return (
        <div className="space-y-5">
            <PageHeader title={t('roles.title')} subtitle={t('common.total_records', { count: roles.length })} />

            {serverErrors?.permissions && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 animate-fade-in">
                    {serverErrors.permissions}
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {roles.map((role) => {
                    const active = role.id === selectedId;
                    return (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => selectRole(role)}
                            className={cn(
                                'card block p-4 text-left transition-all duration-200 hover:-translate-y-0.5',
                                active ? 'border-brand-400 ring-2 ring-brand-500/25' : 'hover:shadow-md',
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-sm font-semibold text-slate-800">{role.name}</p>
                                        {role.is_system && <Badge tone="bg-slate-200 text-slate-700">{t('roles.system_role')}</Badge>}
                                        {role.slug === 'super_admin' && <Badge tone="bg-brand-600 text-white">{t('roles.full_access')}</Badge>}
                                    </div>
                                    {role.description && <p className="mt-1 text-xs text-slate-400">{role.description}</p>}
                                </div>
                                <ChevronRight size={16} className={cn('shrink-0', active ? 'text-brand-500' : 'text-slate-300')} />
                            </div>
                            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                                <span>
                                    <span className="font-semibold text-slate-700">{role.users_count}</span> {t('roles.users_count')}
                                </span>
                                <span>
                                    <span className="font-semibold text-slate-700">{role.permissions.length}</span> {t('roles.permissions')}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selected && (
                <Card className="animate-slide-up">
                    <CardHeader
                        title={
                            <span className="flex items-center gap-2">
                                <ShieldCheck size={16} className="text-brand-500" />
                                {selected.name}
                            </span>
                        }
                        subtitle={`${checked.length} / ${Object.values(permissions).reduce((sum, group) => sum + group.length, 0)} ${t('roles.permissions')}`}
                        action={
                            readonly ? (
                                <Badge tone="bg-brand-100 text-brand-700">{t('roles.full_access')}</Badge>
                            ) : (
                                <Button loading={saving} onClick={save}>
                                    {t('roles.save_permissions')}
                                </Button>
                            )
                        }
                    />

                    <div className="space-y-3">
                        {Object.entries(permissions).map(([module, group]) => {
                            const groupIds = group.map((permission) => permission.id);
                            const selectedInGroup = groupIds.filter((id) => checked.includes(id)).length;
                            const allChecked = selectedInGroup === groupIds.length && groupIds.length > 0;

                            return (
                                <div key={module} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{prettifyModule(module)}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium text-slate-400">
                                                {selectedInGroup}/{groupIds.length}
                                            </span>
                                            <Checkbox
                                                checked={allChecked}
                                                disabled={readonly}
                                                onChange={() => toggleModule(group)}
                                                label={t('common.all')}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {group.map((permission) => (
                                            <label
                                                key={permission.id}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2 text-sm transition',
                                                    readonly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-brand-200 hover:bg-white',
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked.includes(permission.id)}
                                                    disabled={readonly}
                                                    onChange={() => toggle(permission.id)}
                                                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                />
                                                <span className="truncate text-slate-700">{permission.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {!readonly && (
                        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                            {saving && <Spinner size="sm" className="text-slate-400" />}
                            <Button loading={saving} onClick={save}>
                                {t('roles.save_permissions')}
                            </Button>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
