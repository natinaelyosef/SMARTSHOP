import { useEffect, useRef, useState, type FormEvent } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Check, PackagePlus, Plus, Truck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field, Input, LinkButton, PageHeader, Select, cn } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';

interface OnboardingShop {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    currency: string;
    currency_symbol: string;
    language: string;
    costing_method: string;
    low_stock_threshold: number;
    default_payment_method: string;
    allow_negative_stock: boolean;
    onboarding_completed: boolean;
}

interface NamedOption {
    id: number;
    name: string;
}

interface UnitOption extends NamedOption {
    short_name: string | null;
}

interface RoleOption {
    id: number;
    name: string;
    slug: string;
}

interface OnboardingProps {
    shop: OnboardingShop;
    categories: NamedOption[];
    units: UnitOption[];
    roles: RoleOption[];
    settings: { currency_symbol: string };
}

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'am', label: 'አማርኛ' },
] as const;

const TOTAL_STEPS = 9;
const STEP_KEY = 'smartshop.onboarding.step';

function clampStep(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(Math.max(value, 0), TOTAL_STEPS);
}

function storedProgress(): { step: number; maxStep: number } {
    if (typeof window === 'undefined') return { step: 0, maxStep: 0 };
    const raw = window.sessionStorage.getItem(STEP_KEY);
    if (!raw) return { step: 0, maxStep: 0 };
    const [stepRaw, maxRaw] = raw.split(':');
    const step = clampStep(Number.parseInt(stepRaw, 10));
    return { step, maxStep: Math.max(step, clampStep(Number.parseInt(maxRaw, 10))) };
}

export default function OnboardingIndex({ shop, categories, units, roles }: OnboardingProps) {
    const { t } = useTranslation();
    const [{ step, maxStep }, setProgress] = useState(storedProgress);
    const [finishing, setFinishing] = useState(false);
    const [createdCategories, setCreatedCategories] = useState<string[]>([]);
    const [createdUnits, setCreatedUnits] = useState<{ name: string; short_name: string }[]>([]);
    const [createdSuppliers, setCreatedSuppliers] = useState<string[]>([]);
    const [createdRules, setCreatedRules] = useState<string[]>([]);
    const [createdRent, setCreatedRent] = useState<string | null>(null);
    const [createdUsers, setCreatedUsers] = useState<string[]>([]);
    const initialCounts = useRef({ categories: categories.length, units: units.length });
    const today = new Date().toISOString().slice(0, 10);

    const settingsForm = useForm({
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
    });
    const categoryForm = useForm({ name: '' });
    const unitForm = useForm({ name: '', short_name: '' });
    const supplierForm = useForm({ name: '', company: '', phone: '' });
    const taxForm = useForm({
        name: '',
        type: 'sales',
        rate: '',
        effective_from: today,
        notes: '',
        is_estimate: true,
    });
    const rentForm = useForm({
        shop_name: shop.name,
        monthly_amount: '',
        due_day: '1',
        start_date: today,
        landlord_name: null as string | null,
        landlord_phone: null as string | null,
        notes: null as string | null,
    });
    const userForm = useForm({
        name: '',
        email: '',
        phone: '',
        role_id: '',
        password: '',
        password_confirmation: '',
        status: 'active',
    });

    useEffect(() => {
        window.sessionStorage.setItem(STEP_KEY, `${step}:${maxStep}`);
    }, [step, maxStep]);

    const stepLabels = Array.from({ length: TOTAL_STEPS }, (_, index) => t(`onboarding.step${index + 1}`));

    const goTo = (next: number) => {
        const target = clampStep(next);
        setProgress((current) => ({ step: target, maxStep: Math.max(current.maxStep, target) }));
    };

    const jumpTo = (index: number) => {
        if (index <= maxStep) goTo(index);
    };

    const saveSettings = (advance: boolean) => {
        settingsForm.put('/settings', {
            preserveScroll: true,
            onSuccess: () => {
                if (advance) goTo(step + 1);
            },
        });
    };

    const submitSettingsForm = (event: FormEvent) => {
        event.preventDefault();
        saveSettings(true);
    };

    const submitCategory = (event: FormEvent) => {
        event.preventDefault();
        const name = categoryForm.data.name.trim();
        if (!name) return;
        categoryForm.post('/categories', {
            preserveScroll: true,
            onSuccess: () => {
                setCreatedCategories((current) => [...current, name]);
                categoryForm.reset();
            },
        });
    };

    const submitUnit = (event: FormEvent) => {
        event.preventDefault();
        const name = unitForm.data.name.trim();
        if (!name) return;
        const shortName = unitForm.data.short_name.trim();
        unitForm.post('/units', {
            preserveScroll: true,
            onSuccess: () => {
                setCreatedUnits((current) => [...current, { name, short_name: shortName }]);
                unitForm.reset();
            },
        });
    };

    const submitSupplier = (event: FormEvent) => {
        event.preventDefault();
        const name = supplierForm.data.name.trim();
        if (!name) return;
        supplierForm.post('/suppliers', {
            preserveScroll: true,
            onSuccess: () => {
                setCreatedSuppliers((current) => [...current, name]);
                supplierForm.reset();
            },
        });
    };

    const submitTaxRule = (event: FormEvent) => {
        event.preventDefault();
        const name = taxForm.data.name.trim();
        if (!name) return;
        taxForm.post('/tax/rules', {
            preserveScroll: true,
            onSuccess: () => {
                setCreatedRules((current) => [...current, name]);
                taxForm.reset();
            },
        });
    };

    const submitRent = (event: FormEvent) => {
        event.preventDefault();
        const shopName = rentForm.data.shop_name.trim();
        if (!shopName) return;
        rentForm.post('/rent', {
            preserveScroll: true,
            onSuccess: () => {
                setCreatedRent(shopName);
                rentForm.reset();
            },
        });
    };

    const submitUser = (event: FormEvent) => {
        event.preventDefault();
        const name = userForm.data.name.trim();
        if (!name) return;
        userForm.post('/users', {
            preserveScroll: true,
            onSuccess: () => {
                setCreatedUsers((current) => [...current, name]);
                userForm.reset();
            },
        });
    };

    const finish = () => {
        setFinishing(true);
        router.post('/settings/onboarding/complete', {}, {
            onSuccess: () => {
                window.sessionStorage.removeItem(STEP_KEY);
            },
            onFinish: () => setFinishing(false),
        });
    };

    const chipList = (items: string[]) => (
        <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('onboarding.created')}</p>
            <div className="flex flex-wrap gap-1.5">
                {items.map((label, index) => (
                    <Badge key={`${index}-${label}`} tone="bg-brand-100 text-brand-700">
                        {label}
                    </Badge>
                ))}
            </div>
        </div>
    );

    const tipBox = (text: string, tone: 'amber' | 'sky' | 'slate') => (
        <div
            className={cn(
                'flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm',
                tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-800',
                tone === 'sky' && 'border-sky-200 bg-sky-50 text-sky-800',
                tone === 'slate' && 'border-slate-200 bg-slate-50 text-slate-600',
            )}
        >
            <Badge tone={tone === 'amber' ? 'bg-amber-500 text-white' : tone === 'sky' ? 'bg-sky-500 text-white' : 'bg-slate-700 text-white'}>
                {t('onboarding.tip')}
            </Badge>
            <p className="flex-1">{text}</p>
        </div>
    );

    const summaryRows: [string, string][] = [
        [t('settings.shop_name'), shop.name],
        [t('settings.currency'), `${shop.currency} ${shop.currency_symbol}`],
        [t('settings.language'), LANGUAGES.find((language) => language.value === shop.language)?.label ?? shop.language],
        [t('categories.title'), String(initialCounts.current.categories + createdCategories.length)],
        [t('units.title'), String(initialCounts.current.units + createdUnits.length)],
        [t('users.title'), createdUsers.length > 0 ? createdUsers.join(', ') : t('common.none')],
    ];

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <form onSubmit={submitSettingsForm} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('settings.shop_name')} error={settingsForm.errors.name} required>
                                <Input
                                    value={settingsForm.data.name}
                                    onChange={(e) => settingsForm.setData('name', e.target.value)}
                                    required
                                    autoComplete="organization"
                                />
                            </Field>
                            <Field label={t('settings.address')} error={settingsForm.errors.address}>
                                <Input value={settingsForm.data.address} onChange={(e) => settingsForm.setData('address', e.target.value)} />
                            </Field>
                            <Field label={t('settings.phone')} error={settingsForm.errors.phone}>
                                <Input value={settingsForm.data.phone} onChange={(e) => settingsForm.setData('phone', e.target.value)} />
                            </Field>
                            <Field label={t('settings.email')} error={settingsForm.errors.email}>
                                <Input type="email" value={settingsForm.data.email} onChange={(e) => settingsForm.setData('email', e.target.value)} />
                            </Field>
                        </div>
                        <p className="text-xs text-slate-400">{t('onboarding.later_hint')}</p>
                    </form>
                );

            case 1:
                return (
                    <form onSubmit={submitSettingsForm} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={t('settings.currency')} error={settingsForm.errors.currency} required>
                                <Input
                                    value={settingsForm.data.currency}
                                    onChange={(e) => settingsForm.setData('currency', e.target.value)}
                                    placeholder="ETB"
                                    maxLength={10}
                                    required
                                />
                            </Field>
                            <Field label={t('settings.currency_symbol')} error={settingsForm.errors.currency_symbol} required>
                                <Input
                                    value={settingsForm.data.currency_symbol}
                                    onChange={(e) => settingsForm.setData('currency_symbol', e.target.value)}
                                    placeholder="Br"
                                    maxLength={10}
                                    required
                                />
                            </Field>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-medium text-slate-700">{t('settings.language')}</p>
                            <div className="flex flex-wrap gap-4">
                                {LANGUAGES.map((language) => (
                                    <label key={language.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="radio"
                                            name="language"
                                            checked={settingsForm.data.language === language.value}
                                            onChange={() => settingsForm.setData('language', language.value)}
                                            className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-600"
                                        />
                                        {language.label}
                                    </label>
                                ))}
                            </div>
                            {settingsForm.errors.language && (
                                <p className="mt-2 text-xs font-medium text-rose-600">{settingsForm.errors.language}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
                            <span className="font-semibold text-slate-800">{settingsForm.data.currency_symbol}</span>
                            <span>{settingsForm.data.currency}</span>
                            <span className="text-slate-300">·</span>
                            <span className="truncate">{settingsForm.data.name}</span>
                        </div>
                    </form>
                );

            case 2:
                return (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader title={t('categories.title')} subtitle={t('common.total_records', { count: categories.length })} />
                            <form onSubmit={submitCategory} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
                                <Field label={t('common.name')} error={categoryForm.errors.name} className="flex-1" required>
                                    <Input value={categoryForm.data.name} onChange={(e) => categoryForm.setData('name', e.target.value)} required />
                                </Field>
                                <Button type="submit" icon={<Plus size={15} />} loading={categoryForm.processing} className="shrink-0 sm:w-auto">
                                    {t('common.create')}
                                </Button>
                            </form>
                            {createdCategories.length > 0 && chipList(createdCategories)}
                        </Card>

                        <Card>
                            <CardHeader title={t('units.title')} subtitle={t('common.total_records', { count: units.length })} />
                            <form onSubmit={submitUnit} className="space-y-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
                                    <Field label={t('common.name')} error={unitForm.errors.name} className="flex-1" required>
                                        <Input value={unitForm.data.name} onChange={(e) => unitForm.setData('name', e.target.value)} required />
                                    </Field>
                                    <Field label={t('units.short_name')} error={unitForm.errors.short_name} className="w-full sm:w-36">
                                        <Input value={unitForm.data.short_name} onChange={(e) => unitForm.setData('short_name', e.target.value)} />
                                    </Field>
                                    <Button type="submit" icon={<Plus size={15} />} loading={unitForm.processing} className="shrink-0 sm:w-auto">
                                        {t('common.create')}
                                    </Button>
                                </div>
                            </form>
                            {createdUnits.length > 0 &&
                                chipList(createdUnits.map((unit) => (unit.short_name ? `${unit.name} (${unit.short_name})` : unit.name)))}
                        </Card>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4">
                        {tipBox(t('onboarding.product_tip'), 'amber')}
                        <div className="flex flex-wrap gap-2">
                            <LinkButton href="/products/create" icon={<PackagePlus size={16} />}>
                                {t('quick.add_product')}
                            </LinkButton>
                            <LinkButton href="/products" variant="outline">
                                {t('nav.products')}
                            </LinkButton>
                        </div>
                        <p className="text-xs text-slate-400">{t('onboarding.later_hint')}</p>
                    </div>
                );

            case 4:
                return (
                    <Card>
                        <CardHeader title={t('suppliers.title')} subtitle={t('suppliers.new')} />
                        <form onSubmit={submitSupplier} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Field label={t('common.name')} error={supplierForm.errors.name} required>
                                    <Input value={supplierForm.data.name} onChange={(e) => supplierForm.setData('name', e.target.value)} required />
                                </Field>
                                <Field label={t('suppliers.company')} error={supplierForm.errors.company} hint={t('onboarding.optional')}>
                                    <Input value={supplierForm.data.company} onChange={(e) => supplierForm.setData('company', e.target.value)} />
                                </Field>
                                <Field label={t('common.phone')} error={supplierForm.errors.phone} hint={t('onboarding.optional')}>
                                    <Input value={supplierForm.data.phone} onChange={(e) => supplierForm.setData('phone', e.target.value)} />
                                </Field>
                            </div>
                            <Button type="submit" icon={<Plus size={15} />} loading={supplierForm.processing}>
                                {t('suppliers.new')}
                            </Button>
                        </form>
                        {createdSuppliers.length > 0 && chipList(createdSuppliers)}
                    </Card>
                );

            case 5:
                return (
                    <div className="space-y-4">
                        {tipBox(t('onboarding.stock_tip'), 'slate')}
                        <div className="flex flex-wrap gap-2">
                            <LinkButton href="/purchases/create" icon={<Truck size={16} />}>
                                {t('quick.new_purchase')}
                            </LinkButton>
                            <LinkButton href="/products/create" variant="outline" icon={<PackagePlus size={16} />}>
                                {t('quick.add_product')}
                            </LinkButton>
                        </div>
                        <p className="text-xs text-slate-400">{t('onboarding.later_hint')}</p>
                    </div>
                );

            case 6:
                return (
                    <Card>
                        <CardHeader title={t('tax.new_rule')} subtitle={t('onboarding.tax_tip')} />
                        <form onSubmit={submitTaxRule} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t('tax.name')} error={taxForm.errors.name} required>
                                    <Input value={taxForm.data.name} onChange={(e) => taxForm.setData('name', e.target.value)} required />
                                </Field>
                                <Field label={t('tax.rate')} error={taxForm.errors.rate} required>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={taxForm.data.rate}
                                        onChange={(e) => taxForm.setData('rate', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field label={t('tax.effective_from')} error={taxForm.errors.effective_from} required>
                                    <Input
                                        type="date"
                                        value={taxForm.data.effective_from}
                                        onChange={(e) => taxForm.setData('effective_from', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field label={t('common.notes')} error={taxForm.errors.notes} hint={t('onboarding.optional')}>
                                    <Input value={taxForm.data.notes} onChange={(e) => taxForm.setData('notes', e.target.value)} />
                                </Field>
                            </div>
                            {taxForm.errors.is_estimate && <p className="text-xs font-medium text-rose-600">{taxForm.errors.is_estimate}</p>}
                            <Button type="submit" loading={taxForm.processing}>
                                {t('common.create')}
                            </Button>
                        </form>
                        {createdRules.length > 0 && chipList(createdRules)}
                    </Card>
                );

            case 7:
                return (
                    <Card>
                        <CardHeader title={t('rent.new')} subtitle={t('onboarding.optional')} />
                        <form onSubmit={submitRent} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t('settings.shop_name')} error={rentForm.errors.shop_name} required>
                                    <Input
                                        value={rentForm.data.shop_name}
                                        onChange={(e) => rentForm.setData('shop_name', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field label={t('rent.monthly_amount')} error={rentForm.errors.monthly_amount} required>
                                    <div className="flex items-center gap-2">
                                        <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-2 text-sm font-semibold text-slate-600">
                                            {shop.currency_symbol}
                                        </span>
                                        <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            className="flex-1"
                                            value={rentForm.data.monthly_amount}
                                            onChange={(e) => rentForm.setData('monthly_amount', e.target.value)}
                                            required
                                        />
                                    </div>
                                </Field>
                                <Field label={t('onboarding.due_day')} error={rentForm.errors.due_day} required>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="28"
                                        value={rentForm.data.due_day}
                                        onChange={(e) => rentForm.setData('due_day', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field label={t('tax.start_date')} error={rentForm.errors.start_date} required>
                                    <Input
                                        type="date"
                                        value={rentForm.data.start_date}
                                        onChange={(e) => rentForm.setData('start_date', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field label={t('rent.landlord')} error={rentForm.errors.landlord_name} hint={t('onboarding.optional')}>
                                    <Input
                                        value={rentForm.data.landlord_name ?? ''}
                                        onChange={(e) => rentForm.setData('landlord_name', e.target.value || null)}
                                    />
                                </Field>
                                <Field label={t('common.phone')} error={rentForm.errors.landlord_phone} hint={t('onboarding.optional')}>
                                    <Input
                                        value={rentForm.data.landlord_phone ?? ''}
                                        onChange={(e) => rentForm.setData('landlord_phone', e.target.value || null)}
                                    />
                                </Field>
                            </div>
                            <Button type="submit" icon={<Plus size={15} />} loading={rentForm.processing}>
                                {t('rent.new')}
                            </Button>
                        </form>
                        {createdRent && chipList([createdRent])}
                    </Card>
                );

            case 8:
                return (
                    <Card>
                        <CardHeader title={t('users.new')} subtitle={t('onboarding.step9_desc')} />
                        <form onSubmit={submitUser} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label={t('common.name')} error={userForm.errors.name} required>
                                    <Input
                                        value={userForm.data.name}
                                        onChange={(e) => userForm.setData('name', e.target.value)}
                                        required
                                        autoComplete="name"
                                    />
                                </Field>
                                <Field label={t('users.email')} error={userForm.errors.email} required>
                                    <Input
                                        type="email"
                                        value={userForm.data.email}
                                        onChange={(e) => userForm.setData('email', e.target.value)}
                                        required
                                        autoComplete="username"
                                    />
                                </Field>
                                <Field label={t('common.phone')} error={userForm.errors.phone}>
                                    <Input value={userForm.data.phone} onChange={(e) => userForm.setData('phone', e.target.value)} />
                                </Field>
                                <Field label={t('users.role')} error={userForm.errors.role_id} required>
                                    <Select value={userForm.data.role_id} onChange={(e) => userForm.setData('role_id', e.target.value)} required>
                                        <option value="">{t('common.select')}</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field label={t('users.password')} error={userForm.errors.password} required>
                                    <Input
                                        type="password"
                                        value={userForm.data.password}
                                        onChange={(e) => userForm.setData('password', e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </Field>
                                <Field label={t('users.confirm_password')} error={userForm.errors.password_confirmation} required>
                                    <Input
                                        type="password"
                                        value={userForm.data.password_confirmation}
                                        onChange={(e) => userForm.setData('password_confirmation', e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </Field>
                            </div>
                            <Button type="submit" loading={userForm.processing}>
                                {t('common.create')}
                            </Button>
                        </form>
                        {createdUsers.length > 0 && chipList(createdUsers)}
                    </Card>
                );

            default:
                return (
                    <div className="flex flex-col items-center rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white px-5 py-8 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
                            <Check size={28} />
                        </span>
                        <h3 className="mt-4 text-lg font-bold text-slate-900">{t('onboarding.finish')}</h3>
                        <p className="mt-1 max-w-md text-sm text-slate-500">{t('onboarding.all_set')}</p>
                        <dl className="mt-5 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                            {(summaryRows).map(([label, value]) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left"
                                >
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                                    <dd className="truncate text-sm font-semibold text-slate-800">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <Button onClick={finish} loading={finishing} className="mt-6 px-8 py-3 text-base">
                            {t('onboarding.finish')}
                        </Button>
                    </div>
                );
        }
    };

    const heading = step < TOTAL_STEPS ? stepLabels[step] : t('onboarding.summary');
    const description = step < TOTAL_STEPS ? t(`onboarding.step${step + 1}_desc`) : t('onboarding.all_set');

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            <PageHeader
                title={t('onboarding.title')}
                subtitle={t('onboarding.subtitle')}
                actions={
                    step < TOTAL_STEPS ? (
                        <Button variant="ghost" onClick={() => goTo(TOTAL_STEPS)}>
                            {t('onboarding.skip')}
                        </Button>
                    ) : undefined
                }
            />

            <Card className="animate-fade-in">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('onboarding.progress', { current: Math.min(step + 1, TOTAL_STEPS), total: TOTAL_STEPS })}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {stepLabels.map((label, index) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => jumpTo(index)}
                                disabled={index > maxStep}
                                aria-label={label}
                                aria-current={index === step ? 'step' : undefined}
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition',
                                    index < step
                                        ? 'bg-brand-100 text-brand-700'
                                        : index === step
                                          ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                                          : index <= maxStep
                                            ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            : 'bg-slate-50 text-slate-300',
                                )}
                            >
                                {index < step ? <Check size={14} /> : index + 1}
                            </button>
                        ))}
                    </div>
                </div>

                <div key={step} className="animate-slide-up">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold tracking-tight text-slate-900">{heading}</h2>
                        <p className="mt-1 text-sm text-slate-500">{description}</p>
                    </div>
                    {renderStep()}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <Button variant="outline" onClick={() => goTo(step - 1)} disabled={step === 0}>
                        {t('common.back')}
                    </Button>
                    {step >= TOTAL_STEPS - 1 ? (
                        <Button onClick={finish} loading={finishing} className="px-6">
                            {t('onboarding.finish')}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => (step <= 1 ? saveSettings(true) : goTo(step + 1))}
                            loading={settingsForm.processing && step <= 1}
                        >
                            {t('common.next')}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
