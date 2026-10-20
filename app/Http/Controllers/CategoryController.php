<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('categories/Index', [
            'categories' => Category::withCount('products')->orderBy('name')->get()
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                    'status' => $c->status,
                    'products_count' => $c->products_count,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:categories,name'],
        ]);

        $category = Category::create([
            ...$data,
            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
            'status' => 'active',
        ]);

        AuditLogger::log('category.created', Category::class, $category->id, "Category {$category->name} created");

        return back()->with('success', 'Category created.');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:categories,name,'.$category->id],
            'status' => ['required', 'in:active,archived'],
        ]);

        $previous = $category->only(['name', 'status']);
        $category->update($data);

        AuditLogger::log('category.updated', Category::class, $category->id, 'Category updated', $previous, $data);

        return back()->with('success', 'Category updated.');
    }

    public function destroy(Category $category): RedirectResponse
    {
        $previous = $category->only(['name', 'slug', 'status']);

        $category->products()->update(['category_id' => null]);
        $category->children()->update(['parent_id' => null]);
        $category->delete();

        AuditLogger::log('category.deleted', Category::class, $category->id, "Category {$category->name} deleted", $previous, null);

        return back()->with('success', 'Category deleted. Products are now uncategorized.');
    }
}
