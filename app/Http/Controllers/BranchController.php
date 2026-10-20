<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BranchStock;
use App\Services\AuditLogger;
use App\Services\BranchContext;
use App\Services\BranchStockService;
use App\Services\ShopProvisioner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BranchController extends Controller
{
    public function __construct(private BranchStockService $branchStock) {}

    public function index(): Response
    {
        $threshold = \App\Services\ShopSettings::lowStockThreshold();

        $branches = Branch::orderByDesc('is_primary')->orderBy('name')->get()
            ->map(function (Branch $branch) use ($threshold) {
                $totals = BranchStock::where('branch_id', $branch->id)
                    ->selectRaw('COALESCE(SUM(stock*cost),0) as value, COUNT(*) as lines')
                    ->first();

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                    'address' => $branch->address,
                    'phone' => $branch->phone,
                    'is_active' => $branch->is_active,
                    'is_primary' => $branch->is_primary,
                    'opening_float' => $branch->opening_float,
                    'product_lines' => (int) ($totals->lines ?? 0),
                    'stock_value' => round((float) ($totals->value ?? 0), 2),
                    'low_stock_count' => $this->branchStock
                        ->lowStockQuery($branch->id, $threshold)
                        ->count(),
                    'employees' => $branch->users()->where('status', 'active')->count(),
                ];
            });

        return Inertia::render('branches/Index', [
            'branches' => $branches,
            'active_branch_id' => BranchContext::id(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'code' => ['nullable', 'string', 'max:20', 'alpha_dash'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'opening_float' => ['nullable', 'numeric', 'min:0'],
            'copy_stock_from' => ['nullable', 'integer'],
        ]);

        $shop = \App\Services\ShopSettings::shop();

        $branch = ShopProvisioner::addBranch($shop, [
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'opening_float' => $data['opening_float'] ?? 0,
        ]);

        // Give the new branch a stock row for every existing product so
        // it starts at zero rather than "missing".
        $this->branchStock->seedBranch($branch->id, $data['copy_stock_from'] ?? null);

        AuditLogger::log('branch.created', Branch::class, $branch->id, "Branch {$branch->name} created");

        return back()->with('success', 'Branch created.');
    }

    public function update(Request $request, Branch $branch): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'code' => ['nullable', 'string', 'max:20', 'alpha_dash', Rule::unique('branches', 'code')->where('shop_id', $branch->shop_id)->ignore($branch->id)],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'opening_float' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        $previous = $branch->only(['name', 'code', 'address', 'phone', 'is_active', 'is_primary', 'opening_float']);

        if (! empty($data['is_primary'])) {
            Branch::where('shop_id', $branch->shop_id)->update(['is_primary' => false]);
        }

        $branch->fill($data);
        $branch->save();

        AuditLogger::log('branch.updated', Branch::class, $branch->id, "Branch {$branch->name} updated", $previous, $data);

        return back()->with('success', 'Branch updated.');
    }

    /**
     * Switch the session to a different branch.
     */
    public function switch(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->where('shop_id', \App\Services\ActiveShop::idOrFail())],
        ]);

        $branchId = (int) $data['branch_id'];

        abort_unless(in_array($branchId, BranchContext::switchable(), true), 403, 'You cannot switch to that branch.');

        BranchContext::set($branchId);

        return back()->with('success', 'Working branch changed.');
    }

    public function destroy(Branch $branch): RedirectResponse
    {
        if ($branch->is_primary) {
            return back()->withErrors(['error' => 'The primary branch cannot be deleted. Set another branch as primary first.']);
        }

        if ($branch->users()->exists()) {
            return back()->withErrors(['error' => 'Move this branch\'s employees to another branch before deleting it.']);
        }

        $stockValue = (float) BranchStock::where('branch_id', $branch->id)->sum(\DB::raw('stock * cost'));

        if ($stockValue > 0) {
            return back()->withErrors(['error' => 'This branch still holds stock worth '.$stockValue.'. Transfer it out first.']);
        }

        $name = $branch->name;
        $branch->delete();

        AuditLogger::log('branch.deleted', Branch::class, $branch->id, "Branch {$name} deleted");

        return back()->with('success', 'Branch deleted.');
    }
}