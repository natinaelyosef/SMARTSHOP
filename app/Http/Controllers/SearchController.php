<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Purchase;
use App\Models\RentPayment;
use App\Models\Sale;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim($request->string('q')->toString());

        $results = [
            'products' => [],
            'variants' => [],
            'sales' => [],
            'purchases' => [],
            'customers' => [],
            'suppliers' => [],
            'expenses' => [],
            'rents' => [],
        ];

        if (strlen($q) >= 2) {
            $like = "%{$q}%";

            $results['products'] = Product::with('category:id,name')
                ->where('status', '!=', 'deleted')
                ->where(fn ($x) => $x->where('name', 'like', $like)
                    ->orWhere('sku', 'like', $like)
                    ->orWhere('barcode', 'like', $like)
                    ->orWhere('brand', 'like', $like))
                ->limit(8)->get()
                ->map(fn ($p) => ['id' => $p->id, 'title' => $p->name, 'subtitle' => $p->sku.' · '.($p->category?->name ?? 'No category'), 'url' => '/products/'.$p->id]);

            $results['variants'] = ProductVariant::with('product:id,name')
                ->whereHas('product', fn ($p) => $p->where('status', '!=', 'deleted'))
                ->where(fn ($x) => $x->where('sku', 'like', $like)
                    ->orWhere('barcode', 'like', $like)
                    ->orWhere('name', 'like', $like))
                ->limit(8)->get()
                ->map(fn ($v) => ['id' => $v->id, 'title' => $v->product?->name.' — '.$v->name, 'subtitle' => 'Stock: '.$v->stock.' · '.$v->selling_price, 'url' => '/inventory/variants/'.$v->id]);

            $results['sales'] = Sale::with('customer:id,name')
                ->where(fn ($x) => $x->where('sale_number', 'like', $like)
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', $like)))
                ->limit(6)->get()
                ->map(fn ($s) => ['id' => $s->id, 'title' => $s->sale_number, 'subtitle' => $s->sold_at->format('M d, Y').' · '.$s->total, 'url' => '/sales/'.$s->id]);

            $results['purchases'] = Purchase::with('supplier:id,name')
                ->where(fn ($x) => $x->where('purchase_number', 'like', $like)
                    ->orWhere('invoice_number', 'like', $like)
                    ->orWhereHas('supplier', fn ($s) => $s->where('name', 'like', $like)))
                ->limit(6)->get()
                ->map(fn ($p) => ['id' => $p->id, 'title' => $p->purchase_number, 'subtitle' => ($p->supplier?->name ?? '').' · '.$p->total, 'url' => '/purchases/'.$p->id]);

            $results['customers'] = Customer::where(fn ($x) => $x->where('name', 'like', $like)->orWhere('phone', 'like', $like))
                ->limit(6)->get()
                ->map(fn ($c) => ['id' => $c->id, 'title' => $c->name, 'subtitle' => $c->phone.' · balance '.$c->balance, 'url' => '/customers/'.$c->id]);

            $results['suppliers'] = Supplier::where(fn ($x) => $x->where('name', 'like', $like)->orWhere('company', 'like', $like)->orWhere('phone', 'like', $like))
                ->limit(6)->get()
                ->map(fn ($s) => ['id' => $s->id, 'title' => $s->name, 'subtitle' => ($s->company ?? $s->phone ?? '').' · balance '.$s->balance, 'url' => '/suppliers/'.$s->id]);

            $results['expenses'] = Expense::with('category:id,name')
                ->where('description', 'like', $like)
                ->limit(5)->get()
                ->map(fn ($e) => ['id' => $e->id, 'title' => $e->description ?? 'Expense', 'subtitle' => $e->category?->name.' · '.$e->amount, 'url' => '/expenses']);

            $results['rents'] = RentPayment::with('rent:id,shop_name')
                ->whereHas('rent', fn ($r) => $r->where('shop_name', 'like', $like))
                ->limit(5)->get()
                ->map(fn ($r) => ['id' => $r->id, 'title' => $r->rent?->shop_name.' — '.$r->period_start->format('F Y'), 'subtitle' => $r->amount_due.' · '.$r->status, 'url' => '/rent']);
        }

        return Inertia::render('search/Index', [
            'query' => $q,
            'results' => array_map(fn ($r) => $r?->values()?->all() ?? [], $results),
        ]);
    }
}
