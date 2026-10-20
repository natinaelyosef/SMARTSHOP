import { type FormEvent, useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { History, Plus, Tag, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Field, Input, LinkButton, Modal, PageHeader, Pagination, Select, StatusBadge, cn } from '@/components/ui';
import { FilterBar, ResetButton, ResultCount, SearchField, SelectFilter } from '@/components/filters';
import { useTranslation } from '@/lib/i18n';
import { formatMoney, formatNumber } from '@/lib/utils';
import type { Paginated, SharedProps } from '@/types';

interface ProductRow {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    brand: string | null;
    image: string | null;
    status: string;
    category: string | null;
    unit: string | null;
    variants_count: number;
    stock: number;
    min_price: number | null;
    max_price: number | null;
    updated_at: string;
    variants: { id: number; name: string; status: string; selling_price: number }[];
}

interface ProductsIndexProps {
    products: Paginated<ProductRow>;
    categories: { id: number; name: string }[];
    filters: { q?: string; category?: string; status?: string };
}

function fieldError(source: unknown, key: string): string | undefined {
    const bag = (source ?? {}) as Record<string, string | undefined>;
    const value = bag[key];
    return typeof value === 'string' ? value : undefined;
}

export default function ProductsIndex({ products, categories }: ProductsIndexProps) {
    const { t } = useTranslation();
    const { shop, auth } = usePage<SharedProps>().props;
    const symbol = shop.currency_symbol;
    const permissions = auth.user?.permissions;
    const canManage = Boolean(permissions && (permissions.includes('*') || permissions.includes('products.manage')));
    const canPrice = Boolean(
        permissions &&
            (permissions.includes('*') || permissions.includes('products.manage') || permissions.includes('price.manage')),
    );

    const [priceProduct, setPriceProduct] = useState<ProductRow | null>(null);
    const priceForm = useForm({ variant_id: '', selling_price: '', reason: '' });

    const selectedVariant = priceProduct?.variants.find((v) => String(v.id) === priceForm.data.variant_id);

    const openPrice = (p: ProductRow) => {
        const first = p.variants[0];
        priceForm.setData({
            variant_id: first ? String(first.id) : '',
            selling_price: first ? String(first.selling_price) : '',
            reason: '',
        });
        priceForm.clearErrors();
        setPriceProduct(p);
    };

    const changeVariant = (id: string) => {
        const v = priceProduct?.variants.find((x) => String(x.id) === id);
        priceForm.setData('variant_id', id);
        priceForm.setData('selling_price', v ? String(v.selling_price) : '');
        priceForm.clearErrors('selling_price');
    };

    const submitPrice = (e: FormEvent) => {
        e.preventDefault();
        const variantId = priceForm.data.variant_id;
        if (!variantId) return;
        priceForm.transform((d) => ({
            selling_price: Number(d.selling_price),
            reason: d.reason || null,
        }));
        priceForm.post(`/variants/${variantId}/price`, {
            onSuccess: () => {
                priceForm.reset();
                setPriceProduct(null);
            },
        });
    };

    const remove = (p: ProductRow) => {
        if (confirm(t('products.remove_confirm'))) {
            router.delete(`/products/${p.id}`);
        }
    };

    const priceRange = (p: ProductRow): string => {
        if (p.min_price === null || p.max_price === null) return '—';
        if (p.min_price === p.max_price) return formatMoney(p.min_price, symbol);
        return `${formatMoney(p.min_price, symbol)} – ${formatMoney(p.max_price, symbol)}`;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('products.title')}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <LinkButton href="/categories" variant="outline" icon={<Tag size={16} />}>
                            {t('categories.title')}
                        </LinkButton>
                        {canManage && (
                            <LinkButton href="/products/create" icon={<Plus size={16} />}>
                                {t('products.new')}
                            </LinkButton>
                        )}
                    </div>
                }
            />

            <FilterBar
                right={
                    <>
                        <ResultCount total={products.total} />
                        <ResetButton />
                    </>
                }
            >
                <SearchField placeholder={t('products.search_ph')} />
                <SelectFilter
                    param="category"
                    label={t('products.category')}
                    options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                />
                <SelectFilter
                    param="status"
                    label={t('common.status')}
                    options={[
                        { value: 'active', label: t('status.active') },
                        { value: 'archived', label: t('status.archived') },
                    ]}
                />
            </FilterBar>

            {products.data.length === 0 ? (
                <EmptyState
                    title={t('products.empty')}
                    action={
                        canManage ? (
                            <LinkButton href="/products/create" icon={<Plus size={16} />}>
                                {t('products.add_first')}
                            </LinkButton>
                        ) : undefined
                    }
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {products.data.map((p) => (
                        <div
                            key={p.id}
                            className="card group p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-slide-up"
                        >
                            <Link href={`/products/${p.id}`} className="block">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="min-w-0 truncate text-sm font-semibold text-slate-800 transition group-hover:text-brand-700">
                                        {p.name}
                                    </h3>
                                    <StatusBadge status={p.status} label={t(`status.${p.status}`)} />
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {p.brand && <Badge>{p.brand}</Badge>}
                                    {p.category && <Badge tone="bg-brand-50 text-brand-700">{p.category}</Badge>}
                                </div>

                                <dl className="mt-3 space-y-1.5 text-xs text-slate-500">
                                    <div className="flex items-center justify-between gap-2">
                                        <dt>{t('products.sku')}</dt>
                                        <dd className="truncate font-medium text-slate-700">{p.sku || '—'}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <dt>{t('products.variants')}</dt>
                                        <dd className="font-medium text-slate-700">{formatNumber(p.variants_count)}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <dt>{t('common.stock')}</dt>
                                        <dd className={cn('font-medium', p.stock <= 0 ? 'text-rose-600' : 'text-slate-700')}>
                                            {formatNumber(p.stock)}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <dt>{t('common.price')}</dt>
                                        <dd className="min-w-0 truncate font-semibold tabular-nums text-slate-800">{priceRange(p)}</dd>
                                    </div>
                                </dl>

                                <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">{p.updated_at}</p>
                            </Link>

                            {(canManage || canPrice) && (
                                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                                    {canPrice && p.variants.length > 0 && (
                                        <Button
                                            variant="outline"
                                            className="px-3 py-1.5 text-xs"
                                            onClick={() => openPrice(p)}
                                            icon={<History size={13} />}
                                        >
                                            {t('products.change_price')}
                                        </Button>
                                    )}
                                    {canManage && (
                                        <Button
                                            variant="outline"
                                            className="px-3 py-1.5 text-xs"
                                            onClick={() => remove(p)}
                                            icon={<Trash2 size={13} />}
                                        >
                                            {t('common.remove')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Pagination links={products.links} />

            <Modal
                open={priceProduct !== null}
                onClose={() => setPriceProduct(null)}
                title={`${t('products.change_price')} — ${priceProduct?.name ?? ''}`}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setPriceProduct(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" form="product-price-form" loading={priceForm.processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            >
                <form id="product-price-form" onSubmit={submitPrice} className="space-y-4">
                    {priceProduct && priceProduct.variants.length > 1 && (
                        <Field label={t('products.variant')}>
                            <Select value={priceForm.data.variant_id} onChange={(e) => changeVariant(e.target.value)}>
                                {priceProduct.variants.map((v) => (
                                    <option key={v.id} value={String(v.id)}>
                                        {v.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    )}
                    <Field
                        label={t('products.selling_price')}
                        required
                        error={fieldError(priceForm.errors, 'selling_price')}
                        hint={
                            selectedVariant
                                ? `${t('products.current_price')}: ${formatMoney(selectedVariant.selling_price, symbol)}`
                                : undefined
                        }
                    >
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceForm.data.selling_price}
                            onChange={(e) => priceForm.setData('selling_price', e.target.value)}
                            autoFocus
                        />
                    </Field>
                    <Field label={t('common.reason')}>
                        <Input
                            value={priceForm.data.reason}
                            onChange={(e) => priceForm.setData('reason', e.target.value)}
                            placeholder={t('common.optional')}
                        />
                    </Field>
                </form>
            </Modal>
        </div>
    );
}
