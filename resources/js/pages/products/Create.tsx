import { type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, Checkbox, Field, Input, LinkButton, PageHeader, Select, Textarea } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';

interface VariantInput {
    name: string;
    sku: string;
    barcode: string;
    unit_id: string;
    cost: string;
    selling_price: string;
    min_stock: string;
    stock: string;
    track_expiry: boolean;
}

interface ProductForm {
    name: string;
    category_id: string;
    unit_id: string;
    brand: string;
    barcode: string;
    description: string;
    status: string;
    variants: VariantInput[];
}

interface ProductsCreateProps {
    categories: { id: number; name: string }[];
    units: { id: number; name: string; short_name: string | null }[];
    settings: { currency_symbol: string };
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

const emptyVariant = (): VariantInput => ({
    name: '',
    sku: '',
    barcode: '',
    unit_id: '',
    cost: '',
    selling_price: '',
    min_stock: '',
    stock: '',
    track_expiry: false,
});

export default function ProductsCreate({ categories, units }: ProductsCreateProps) {
    const { t } = useTranslation();

    const { data, setData, post, processing, errors, transform } = useForm<ProductForm>({
        name: '',
        category_id: '',
        unit_id: '',
        brand: '',
        barcode: '',
        description: '',
        status: 'active',
        variants: [emptyVariant()],
    });

    const setVariant = (index: number, patch: Partial<VariantInput>) => {
        setData('variants', data.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
    };

    const addVariant = () => setData('variants', [...data.variants, emptyVariant()]);
    const removeVariant = (index: number) => setData('variants', data.variants.filter((_, i) => i !== index));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((d) => ({
            ...d,
            category_id: d.category_id ? Number(d.category_id) : null,
            unit_id: d.unit_id ? Number(d.unit_id) : null,
            brand: d.brand || null,
            barcode: d.barcode || null,
            description: d.description || null,
            variants: d.variants.map((v) => ({
                name: v.name,
                sku: v.sku || null,
                barcode: v.barcode || null,
                unit_id: v.unit_id ? Number(v.unit_id) : null,
                cost: v.cost === '' ? null : Number(v.cost),
                selling_price: Number(v.selling_price),
                min_stock: v.min_stock === '' ? null : Number(v.min_stock),
                stock: v.stock === '' ? null : Number(v.stock),
                track_expiry: v.track_expiry,
            })),
        }));
        post('/products');
    };

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageHeader
                title={t('products.new')}
                subtitle={t('products.title')}
                actions={<LinkButton href="/products" variant="outline">{t('common.back')}</LinkButton>}
            />

            <form onSubmit={submit} className="space-y-6">
                <Card className="animate-slide-up">
                    <CardHeader title={t('products.product')} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('common.name')} required error={fieldError(errors, 'name')} className="sm:col-span-2">
                            <Input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder={t('common.name')}
                                autoFocus
                            />
                        </Field>

                        <Field label={t('products.category')} error={fieldError(errors, 'category_id')}>
                            <Select value={data.category_id} onChange={(e) => setData('category_id', e.target.value)}>
                                <option value="">{t('common.select')}</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label={t('products.unit')} error={fieldError(errors, 'unit_id')}>
                            <Select value={data.unit_id} onChange={(e) => setData('unit_id', e.target.value)}>
                                <option value="">{t('common.select')}</option>
                                {units.map((u) => (
                                    <option key={u.id} value={String(u.id)}>
                                        {u.short_name ? `${u.name} (${u.short_name})` : u.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <Field label={t('products.brand')} error={fieldError(errors, 'brand')}>
                            <Input value={data.brand} onChange={(e) => setData('brand', e.target.value)} />
                        </Field>

                        <Field label={t('products.barcode')} error={fieldError(errors, 'barcode')}>
                            <Input value={data.barcode} onChange={(e) => setData('barcode', e.target.value)} />
                        </Field>

                        <Field label={t('common.status')} required error={fieldError(errors, 'status')}>
                            <Select value={data.status} onChange={(e) => setData('status', e.target.value)}>
                                <option value="active">{t('status.active')}</option>
                                <option value="archived">{t('status.archived')}</option>
                            </Select>
                        </Field>

                        <Field label={t('products.description')} error={fieldError(errors, 'description')} className="sm:col-span-2">
                            <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <Card className="animate-slide-up">
                    <CardHeader
                        title={t('products.variants')}
                        action={
                            <Button type="button" variant="outline" onClick={addVariant} icon={<Plus size={15} />}>
                                {t('common.add')} {t('products.variant')}
                            </Button>
                        }
                    />

                    <div className="space-y-4">
                        {data.variants.map((variant, index) => {
                            const cost = Number(variant.cost);
                            const price = Number(variant.selling_price);
                            const losing =
                                variant.cost !== '' &&
                                variant.selling_price !== '' &&
                                Number.isFinite(cost) &&
                                Number.isFinite(price) &&
                                price < cost;

                            return (
                                <div key={index} className="rounded-2xl border border-slate-200 p-4">
                                    <div className="mb-4 flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            {t('products.variant')} {index + 1}
                                        </span>
                                        {data.variants.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="px-2.5 py-1.5 text-xs"
                                                onClick={() => removeVariant(index)}
                                                icon={<Trash2 size={14} />}
                                            >
                                                {t('common.remove')}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <Field
                                            label={t('common.name')}
                                            required
                                            error={fieldError(errors, `variants.${index}.name`)}
                                        >
                                            <Input
                                                value={variant.name}
                                                onChange={(e) => setVariant(index, { name: e.target.value })}
                                            />
                                        </Field>

                                        <Field label={t('products.sku')} error={fieldError(errors, `variants.${index}.sku`)}>
                                            <Input
                                                value={variant.sku}
                                                onChange={(e) => setVariant(index, { sku: e.target.value })}
                                            />
                                        </Field>

                                        <Field
                                            label={t('products.barcode')}
                                            error={fieldError(errors, `variants.${index}.barcode`)}
                                        >
                                            <Input
                                                value={variant.barcode}
                                                onChange={(e) => setVariant(index, { barcode: e.target.value })}
                                            />
                                        </Field>

                                        <Field label={t('products.unit')} error={fieldError(errors, `variants.${index}.unit_id`)}>
                                            <Select
                                                value={variant.unit_id}
                                                onChange={(e) => setVariant(index, { unit_id: e.target.value })}
                                            >
                                                <option value="">{t('common.select')}</option>
                                                {units.map((u) => (
                                                    <option key={u.id} value={String(u.id)}>
                                                        {u.short_name ? `${u.name} (${u.short_name})` : u.name}
                                                    </option>
                                                ))}
                                            </Select>
                                        </Field>

                                        <Field label={t('common.cost')} error={fieldError(errors, `variants.${index}.cost`)}>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={variant.cost}
                                                onChange={(e) => setVariant(index, { cost: e.target.value })}
                                            />
                                        </Field>

                                        <Field
                                            label={t('products.selling_price')}
                                            required
                                            error={fieldError(errors, `variants.${index}.selling_price`)}
                                        >
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={variant.selling_price}
                                                onChange={(e) => setVariant(index, { selling_price: e.target.value })}
                                            />
                                        </Field>

                                        <Field
                                            label={t('products.min_stock')}
                                            error={fieldError(errors, `variants.${index}.min_stock`)}
                                        >
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={variant.min_stock}
                                                onChange={(e) => setVariant(index, { min_stock: e.target.value })}
                                            />
                                        </Field>

                                        <Field label={t('common.stock')} error={fieldError(errors, `variants.${index}.stock`)}>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={variant.stock}
                                                onChange={(e) => setVariant(index, { stock: e.target.value })}
                                            />
                                        </Field>

                                        <div className="flex items-end pb-2.5">
                                            <Checkbox
                                                label={t('products.track_expiry')}
                                                checked={variant.track_expiry}
                                                onChange={(e) => setVariant(index, { track_expiry: e.target.checked })}
                                            />
                                        </div>
                                    </div>

                                    {losing && (
                                        <p className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600 animate-fade-in">
                                            <AlertTriangle size={15} className="shrink-0" />
                                            {t('products.loss_warning')}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <div className="flex items-center justify-end gap-2">
                    <LinkButton href="/products" variant="outline">
                        {t('common.cancel')}
                    </LinkButton>
                    <Button type="submit" loading={processing}>
                        {t('common.create')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
