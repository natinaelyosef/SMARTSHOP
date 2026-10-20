import { useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { Plus, UsersRound } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, LinkButton, Modal, PageHeader, Select, StatusBadge, Tabs } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';

interface ShopSettings {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    currency: string;
    currency_symbol: string;
    language: 'en' | 'am';
    costing_method: 'weighted_average' | 'fifo';
    low_stock_threshold: number;
    default_payment_method: 'cash' | 'bank' | 'mobile';
    allow_negative_stock: boolean;
    onboarding_completed: boolean;
    team_mode: 'single' | 'team';
    receipt_settings: Record<string, unknown> | null;
}

interface ExpenseCategoryRow {
    id: number;
    name: string;
    slug: string;
    is_system: boolean;
    status: string;
}

interface UnitRow {
    id: number;
    name: string;
    short_name: string | null;
    is_system: boolean;
    status: string;
}

interface SettingsProps {
    shop: ShopSettings;
    expenseCategories: ExpenseCategoryRow[];
    units: UnitRow[];
}

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'am', label: 'አማርኛ' },
] as const;

export default function SettingsIndex({ shop, expenseCategories, units }: SettingsProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState('business');
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [unitOpen, setUnitOpen] = useState(false);

    const form = useForm({
        name: shop.name,
        address: shop.address ?? '',
        phone: shop.phone ?? '',
        email: shop.email ?? '',
        currency: shop.currency,
        currency_symbol: shop.currency_symbol,
        language: shop.language,
        costing_method: shop.costing_method,
        low_stock_threshold: String(shop.low_stock_threshold),
        default_payment_method: shop.default_payment_method,
        allow_negative_stock: shop.allow_negative_stock,
        team_mode: shop.team_mode,
    });

    const categoryForm = useForm({ name: '' });
    const unitForm = useForm({ name: '', short_name: '' });

    const costingOptions: { value: ShopSettings['costing_method']; label: string }[] = [
        { value: 'weighted_average', label: t('settings.weighted_average') },
        { value: 'fifo', label: t('settings.fifo') },
    ];

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put('/settings', { preserveScroll: true });
    };

    const submitCategory = () => {
        categoryForm.post('/settings/expense-categories', {
            preserveScroll: true,
            onSuccess: () => {
                setCategoryOpen(false);
                categoryForm.reset();
            },
        });
    };

    const submitUnit = () => {
        unitForm.post('/settings/units', {
            preserveScroll: true,
            onSuccess: () => {
                setUnitOpen(false);
                unitForm.reset();
            },
        });
    };

    return (
        <div className="space-y-5">
            <PageHeader
                title={t('settings.title')}
                subtitle={shop.name}
                actions={
                    <LinkButton href="/settings/backup" variant="outline">
                        {t('settings.backup')}
                    </LinkButton>
                }
            />

            <Tabs
                tabs={[
                    { key: 'business', label: t('settings.business') },
                    { key: 'inventory', label: t('settings.inventory') },
                    { key: 'sales', label: t('settings.sales') },
                ]}
                active={tab}
                onChange={setTab}
            />

            <form onSubmit={submit} className="space-y-4">
                {tab === 'business' && (
                    <div className="space-y-4 animate-slide-up">
                        <Card>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t('settings.shop_name')} error={form.errors.name} required>
                                    <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                                </Field>
                                <Field label={t('settings.address')} error={form.errors.address}>
                                    <Input value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                                </Field>
                                <Field label={t('settings.phone')} error={form.errors.phone}>
                                    <Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                                </Field>
                                <Field label={t('settings.email')} error={form.errors.email}>
                                    <Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                                </Field>
                                <Field label={t('settings.currency')} error={form.errors.currency} required>
                                    <Input value={form.data.currency} onChange={(e) => form.setData('currency', e.target.value)} required maxLength={10} />
                                </Field>
                                <Field label={t('settings.currency_symbol')} error={form.errors.currency_symbol} required>
                                    <Input
                                        value={form.data.currency_symbol}
                                        onChange={(e) => form.setData('currency_symbol', e.target.value)}
                                        required
                                        maxLength={10}
                                    />
                                </Field>
                            </div>
                        </Card>

                        <Card>
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('settings.language')}</p>
                                <div className="flex flex-wrap gap-4">
                                    {LANGUAGES.map((language) => (
                                        <label key={language.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                            <input
                                                type="radio"
                                                name="language"
                                                checked={form.data.language === language.value}
                                                onChange={() => form.setData('language', language.value)}
                                                className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            {language.label}
                                        </label>
                                    ))}
                                </div>
                                {form.errors.language && <p className="mt-2 text-xs font-medium text-rose-600">{form.errors.language}</p>}
                            </div>
                        </Card>

                        <Card>
                            <CardHeader title={t('team.title')} subtitle={t('team.subtitle')} />
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {(
                                    [
                                        { value: 'single', title: t('team.single_t'), desc: t('team.single_d') },
                                        { value: 'team', title: t('team.team_t'), desc: t('team.team_d') },
                                    ] as const
                                ).map((opt) => (
                                    <label
                                        key={opt.value}
                                        className={
                                            'cursor-pointer rounded-2xl border p-4 transition-all active:scale-[0.99] ' +
                                            (form.data.team_mode === opt.value
                                                ? 'border-brand-500 bg-brand-50 shadow-sm dark:border-brand-400 dark:bg-brand-600/10'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700')
                                        }
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <input
                                                type="radio"
                                                name="team_mode"
                                                checked={form.data.team_mode === opt.value}
                                                onChange={() => form.setData('team_mode', opt.value)}
                                                className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{opt.title}</span>
                                        </span>
                                        <span className="mt-1.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{opt.desc}</span>
                                    </label>
                                ))}
                            </div>
                            {form.errors.team_mode && <p className="mt-2 text-xs font-medium text-rose-600">{form.errors.team_mode}</p>}
                            {form.data.team_mode === 'team' && (
                                <div className="mt-3 animate-fade-in">
                                    <LinkButton href="/users" variant="outline" icon={<UsersRound size={15} />}>
                                        {t('team.manage_staff')}
                                    </LinkButton>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {tab === 'inventory' && (
                    <div className="space-y-4 animate-slide-up">
                        <Card>
                            <div className="space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('settings.costing_method')}</p>
                                <div className="flex flex-wrap gap-4">
                                    {costingOptions.map((method) => (
                                        <label key={method.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                            <input
                                                type="radio"
                                                name="costing_method"
                                                checked={form.data.costing_method === method.value}
                                                onChange={() => form.setData('costing_method', method.value)}
                                                className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            {method.label}
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400">{t('settings.costing_note')}</p>
                                {form.errors.costing_method && <p className="text-xs font-medium text-rose-600">{form.errors.costing_method}</p>}

                                <div className="max-w-xs">
                                    <Field label={t('settings.low_stock_threshold')} error={form.errors.low_stock_threshold} required>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={form.data.low_stock_threshold}
                                            onChange={(e) => form.setData('low_stock_threshold', e.target.value)}
                                            required
                                        />
                                    </Field>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <CardHeader
                                title={t('settings.units')}
                                subtitle={t('common.total_records', { count: units.length })}
                                action={
                                    <Button variant="outline" icon={<Plus size={15} />} onClick={() => setUnitOpen(true)}>
                                        {t('settings.add_unit')}
                                    </Button>
                                }
                            />
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {units.map((unit) => (
                                    <div key={unit.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-700">{unit.name}</p>
                                            {unit.short_name && <p className="text-xs text-slate-400">{unit.short_name}</p>}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {unit.is_system && (
                                                <span className="hidden sm:inline-flex">
                                                    <Badge tone="bg-slate-100 text-slate-500">{t('settings.is_system')}</Badge>
                                                </span>
                                            )}
                                            <StatusBadge status={unit.status} label={t(`status.${unit.status}`)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                {tab === 'sales' && (
                    <div className="space-y-4 animate-slide-up">
                        <Card>
                            <div className="space-y-4">
                                <div className="max-w-xs">
                                    <Field label={t('settings.default_payment')} error={form.errors.default_payment_method} required>
                                        <Select
                                            value={form.data.default_payment_method}
                                            onChange={(e) => form.setData('default_payment_method', e.target.value as ShopSettings['default_payment_method'])}
                                            required
                                        >
                                            <option value="cash">{t('method.cash')}</option>
                                            <option value="bank">{t('method.bank')}</option>
                                            <option value="mobile">{t('method.mobile')}</option>
                                        </Select>
                                    </Field>
                                </div>
                                <Checkbox
                                    checked={form.data.allow_negative_stock}
                                    onChange={(e) => form.setData('allow_negative_stock', e.target.checked)}
                                    label={t('settings.allow_negative')}
                                />
                                {form.errors.allow_negative_stock && <p className="text-xs font-medium text-rose-600">{form.errors.allow_negative_stock}</p>}
                            </div>
                        </Card>

                        <Card>
                            <CardHeader
                                title={t('settings.expense_categories')}
                                subtitle={t('common.total_records', { count: expenseCategories.length })}
                                action={
                                    <Button variant="outline" icon={<Plus size={15} />} onClick={() => setCategoryOpen(true)}>
                                        {t('settings.add_category')}
                                    </Button>
                                }
                            />
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {expenseCategories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                                    >
                                        <p className="truncate text-sm font-medium text-slate-700">{category.name}</p>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {category.is_system && (
                                                <span className="hidden sm:inline-flex">
                                                    <Badge tone="bg-slate-100 text-slate-500">{t('settings.is_system')}</Badge>
                                                </span>
                                            )}
                                            <StatusBadge status={category.status} label={t(`status.${category.status}`)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button type="submit" loading={form.processing}>
                        {t('settings.save')}
                    </Button>
                </div>
            </form>

            <Card className="animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">{t('settings.backup')}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t('settings.backup_create_hint')}</p>
                    </div>
                    <LinkButton href="/settings/backup" variant="outline">
                        {t('common.view')}
                    </LinkButton>
                </div>
            </Card>

            <Modal
                open={categoryOpen}
                onClose={() => setCategoryOpen(false)}
                title={t('settings.add_category')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setCategoryOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={categoryForm.processing} onClick={submitCategory}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={(e: FormEvent) => { e.preventDefault(); submitCategory(); }} className="space-y-4">
                    <Field label={t('common.name')} error={categoryForm.errors.name} required>
                        <Input value={categoryForm.data.name} onChange={(e) => categoryForm.setData('name', e.target.value)} required />
                    </Field>
                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>

            <Modal
                open={unitOpen}
                onClose={() => setUnitOpen(false)}
                title={t('settings.add_unit')}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setUnitOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={unitForm.processing} onClick={submitUnit}>
                            {t('common.create')}
                        </Button>
                    </>
                }
            >
                <form onSubmit={(e: FormEvent) => { e.preventDefault(); submitUnit(); }} className="space-y-4">
                    <Field label={t('common.name')} error={unitForm.errors.name} required>
                        <Input value={unitForm.data.name} onChange={(e) => unitForm.setData('name', e.target.value)} required />
                    </Field>
                    <Field label={t('settings.short_name')} error={unitForm.errors.short_name}>
                        <Input value={unitForm.data.short_name} onChange={(e) => unitForm.setData('short_name', e.target.value)} maxLength={20} />
                    </Field>
                    <button type="submit" className="hidden" aria-hidden />
                </form>
            </Modal>
        </div>
  );
}
