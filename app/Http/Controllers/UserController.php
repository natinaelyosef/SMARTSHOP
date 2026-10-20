<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\BranchContext;
use App\Services\ShopProvisioner;
use App\Services\ShopSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $shopId = ShopSettings::id();

        $users = User::with(['role:id,name,slug', 'branch:id,name'])
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->when($request->filled('role_id'), fn ($q) => $q->where('role_id', $request->integer('role_id')))
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'role' => $u->role?->name,
                'role_id' => $u->role_id,
                'branch' => $u->branch?->name,
                'branch_id' => $u->branch_id,
                'data_scope' => $u->data_scope,
                'is_owner' => $u->is_owner,
                'status' => $u->status,
                'must_change_password' => $u->must_change_password,
                'last_login_at' => $u->last_login_at?->format('M d, Y H:i'),
            ]);

        return Inertia::render('users/Index', [
            'users' => $users,
            'roles' => Role::withCount('permissions')->orderBy('name')->get()
                ->map(fn (Role $r) => [
                    'id' => $r->id,
                    'name' => $r->name,
                    'slug' => $r->slug,
                    'description' => $r->description,
                    'permissions_count' => $r->permissions_count,
                ]),
            'branches' => Branch::where('is_active', true)->orderByDesc('is_primary')->orderBy('name')
                ->get(['id', 'name', 'code'])->all(),
            'scopes' => [
                ['value' => User::SCOPE_ALL, 'label' => 'All branches'],
                ['value' => User::SCOPE_BRANCH, 'label' => 'Own branch only'],
                ['value' => User::SCOPE_OWN, 'label' => 'Own records only'],
            ],
            'team_mode' => ShopSettings::teamMode(),
            'current_user_id' => $request->user()->id,
            'active_branch_id' => BranchContext::id(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $shopId = ShopSettings::id();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'role_id' => ['required', Rule::exists('roles', 'id')->where('shop_id', $shopId)],
            'branch_id' => ['nullable', Rule::exists('branches', 'id')->where('shop_id', $shopId)],
            'data_scope' => ['required', Rule::in([User::SCOPE_ALL, User::SCOPE_BRANCH, User::SCOPE_OWN])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        // Generated password means the employee is forced to change it
        // on first login instead of the owner knowing a shared secret.
        $generated = null;

        if (blank($data['password'] ?? null)) {
            $generated = Str::password(12);
            $data['password'] = $generated;
        }

        $user = User::create([
            'shop_id' => $shopId,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'role_id' => $data['role_id'],
            'branch_id' => $data['branch_id'] ?? null,
            'data_scope' => $data['data_scope'],
            'status' => $data['status'],
            'must_change_password' => $generated !== null,
            'password_changed_at' => now(),
        ]);

        AuditLogger::log(
            'user.created',
            User::class,
            $user->id,
            "Employee {$user->name} created",
            null,
            [
                'email' => $user->email,
                'role_id' => $user->role_id,
                'branch_id' => $user->branch_id,
                'data_scope' => $user->data_scope,
            ]
        );

        return back()->with(
            'success',
            $generated
                ? "Employee created. Temporary password: {$generated} — share it privately, they must change it on first login."
                : 'Employee created.'
        );
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $shopId = ShopSettings::id();

        abort_unless((int) $user->shop_id === (int) $shopId, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'role_id' => ['required', Rule::exists('roles', 'id')->where('shop_id', $shopId)],
            'branch_id' => ['nullable', Rule::exists('branches', 'id')->where('shop_id', $shopId)],
            'data_scope' => ['required', Rule::in([User::SCOPE_ALL, User::SCOPE_BRANCH, User::SCOPE_OWN])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if ($user->is($request->user())) {
            if ($data['status'] !== 'active') {
                return back()->withErrors(['status' => 'You cannot deactivate your own account.']);
            }

            if ((int) $data['role_id'] !== (int) $user->role_id) {
                return back()->withErrors(['role_id' => 'You cannot change your own role. Ask another owner to do it.']);
            }
        }

        if ($user->is_owner && ($data['status'] !== 'active' || $data['role_id'] !== $user->role_id)) {
            return back()->withErrors(['status' => 'The shop owner cannot be demoted or deactivated.']);
        }

        $previous = $user->only(['name', 'email', 'role_id', 'branch_id', 'data_scope', 'status']);

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->phone = $data['phone'] ?? $user->phone;
        $user->role_id = $data['role_id'];
        $user->branch_id = $data['branch_id'] ?? null;
        $user->data_scope = $data['data_scope'];
        $user->status = $data['status'];

        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
            $user->must_change_password = true;
            $user->password_changed_at = now();
        }

        $user->save();

        AuditLogger::log(
            'user.updated',
            User::class,
            $user->id,
            "Employee {$user->name} updated",
            $previous,
            [
                'role_id' => $user->role_id,
                'branch_id' => $user->branch_id,
                'data_scope' => $user->data_scope,
                'status' => $user->status,
            ]
        );

        return back()->with('success', 'Employee updated.');
    }
}