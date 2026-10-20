<?php

namespace App\Http\Controllers;

use App\Services\ActiveShop;
use App\Services\ShopProvisioner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Signing up creates a brand new, fully independent business: its own
 * shop record, primary branch, roles and owner account. Nothing is
 * shared with any other business on the install.
 */
class RegisterController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('auth/Register', [
            'hasAccounts' => DB::table('users')->exists(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'shop_name' => ['required', 'string', 'max:255'],
            'shop_phone' => ['nullable', 'string', 'max:50'],
            'shop_address' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'max:10'],
            'currency_symbol' => ['nullable', 'string', 'max:10'],
            'language' => ['nullable', 'string', 'max:5'],
            'team_mode' => ['nullable', 'in:single,team'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $shop = ShopProvisioner::provision(
            [
                'name' => $data['shop_name'],
                'phone' => $data['shop_phone'] ?? null,
                'address' => $data['shop_address'] ?? null,
                'currency' => $data['currency'] ?? 'ETB',
                'currency_symbol' => $data['currency_symbol'] ?? 'Br',
                'language' => $data['language'] ?? 'en',
                'team_mode' => $data['team_mode'] ?? 'single',
            ],
            [
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
            ]
        );

        ActiveShop::flush();

        return redirect()->route('login')->with('success', 'registered');
    }
}