<?php

namespace App\Http\Controllers;

use App\Services\AuditLogger;
use App\Services\ShopSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $shop = ShopSettings::shop();

        return Inertia::render('profile/Index', [
            'owner' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role?->name,
                'branch' => $user->branch?->name,
                'language' => $user->language,
                'last_login_at' => $user->last_login_at?->format('M d, Y H:i'),
            ],
            'shop' => [
                'name' => $shop->name,
                'address' => $shop->address,
                'phone' => $shop->phone,
                'currency' => $shop->currency,
                'currency_symbol' => $shop->currency_symbol,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'language' => ['required', 'in:en,am'],
        ]);

        $previous = $user->only(array_keys($data));
        $user->fill($data)->save();

        AuditLogger::log('profile.updated', get_class($user), $user->id, 'Owner profile updated', $previous, $data);

        return back()->with('success', 'Profile saved.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user->forceFill(['password' => Hash::make($data['password'])])->save();

        AuditLogger::log('profile.password_changed', get_class($user), $user->id, 'Owner password changed');

        return back()->with('success', 'Password changed.');
    }

    /**
     * Password change for an employee who was given a temporary
     * password by their owner. The old password is not known to them,
     * so it is confirmed from the session instead.
     */
    public function forcePassword(Request $request): RedirectResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'must_change_password' => false,
            'password_changed_at' => now(),
        ])->save();

        AuditLogger::log('profile.password_changed', get_class($user), $user->id, 'Temporary password replaced');

        return redirect()->route('pos')->with('success', 'Password updated. Welcome aboard!');
    }
}
