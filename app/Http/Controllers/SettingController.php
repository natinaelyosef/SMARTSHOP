<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use App\Models\Setting;
use App\Models\Shop;
use App\Models\Unit;
use App\Services\AuditLogger;
use App\Services\ShopSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function index(): Response
    {
        $shop = ShopSettings::shop();

        return Inertia::render('settings/Index', [
            'shop' => [
                'name' => $shop->name,
                'address' => $shop->address,
                'phone' => $shop->phone,
                'email' => $shop->email,
                'currency' => $shop->currency,
                'currency_symbol' => $shop->currency_symbol,
                'language' => $shop->language,
                'costing_method' => $shop->costing_method,
                'low_stock_threshold' => $shop->low_stock_threshold,
                'default_payment_method' => $shop->default_payment_method,
                'allow_negative_stock' => $shop->allow_negative_stock,
                'onboarding_completed' => $shop->onboarding_completed,
                'team_mode' => ShopSettings::teamMode(),
                'discount_approval_threshold' => $shop->discount_approval_threshold,
                'sale_approval_threshold' => $shop->sale_approval_threshold,
                'receipt_settings' => $shop->receipt_settings,
            ],
            'expenseCategories' => ExpenseCategory::orderBy('name')->get(['id', 'name', 'slug', 'is_system', 'status']),
            'units' => Unit::orderBy('name')->get(['id', 'name', 'short_name', 'is_system', 'status']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'currency' => ['required', 'string', 'max:10'],
            'currency_symbol' => ['required', 'string', 'max:10'],
            'language' => ['required', 'in:en,am'],
            'costing_method' => ['required', 'in:weighted_average,fifo'],
            'low_stock_threshold' => ['required', 'numeric', 'min:0'],
            'default_payment_method' => ['required', 'in:cash,bank,mobile'],
            'allow_negative_stock' => ['required', 'boolean'],
            'team_mode' => ['sometimes', 'in:single,team'],
            'discount_approval_threshold' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'sale_approval_threshold' => ['nullable', 'numeric', 'min:0'],
        ]);

        $shop = ShopSettings::shop();
        $previous = $shop->only(array_keys($data));
        $shop->fill($data)->save();
        ShopSettings::flush();

        AuditLogger::log('settings.updated', Shop::class, $shop->id, 'Business settings updated', $previous, $data);

        return back()->with('success', 'Settings saved.');
    }

    public function teamMode(Request $request): RedirectResponse
    {
        $data = $request->validate(['team_mode' => ['required', 'in:single,team']]);

        $shop = ShopSettings::shop();
        $previous = $shop->only(['team_mode']);
        $shop->fill(['team_mode' => $data['team_mode']])->save();
        ShopSettings::flush();

        AuditLogger::log('settings.team_mode', Shop::class, $shop->id, 'Team mode set to '.$data['team_mode'], $previous, ['team_mode' => $data['team_mode']]);

        return back()->with('success', 'Team mode updated.');
    }

    public function language(Request $request): RedirectResponse
    {
        $data = $request->validate(['language' => ['required', 'in:en,am']]);

        if ($request->user()) {
            $request->user()->update(['language' => $data['language']]);
        }

        session(['locale' => $data['language']]);
        app()->setLocale($data['language']);

        return back()->with('success', 'Language updated.');
    }

    public function completeOnboarding(): RedirectResponse
    {
        $shop = ShopSettings::shop();
        $shop->onboarding_completed = true;
        $shop->save();
        ShopSettings::flush();

        return redirect()->route('pos')->with('success', 'Setup complete. Welcome to SmartShop Manager!');
    }

    public function storeExpenseCategory(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100', 'unique:expense_categories,name,shop_id']]);

        ExpenseCategory::create([
            ...$data,
            'slug' => Str::slug($data['name']),
            'status' => 'active',
        ]);

        return back()->with('success', 'Expense category created.');
    }

    public function storeUnit(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60', 'unique:units,name'],
            'short_name' => ['nullable', 'string', 'max:20'],
        ]);

        Unit::create([
            ...$data,
            'slug' => Str::slug($data['name']),
            'status' => 'active',
        ]);

        return back()->with('success', 'Unit created.');
    }

    public function setOption(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:100'],
            'value' => ['nullable', 'string'],
            'group' => ['nullable', 'string', 'max:50'],
        ]);

        Setting::setValue($data['key'], $data['value'], $data['group'] ?? 'general');

        return back()->with('success', 'Setting saved.');
    }
}
