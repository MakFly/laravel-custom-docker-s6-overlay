<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class TodoController extends Controller
{
    public function index()
    {
        // Récupération des todos depuis JSONPlaceholder
        $response = Http::get('https://jsonplaceholder.typicode.com/todos');

        if ($response->successful()) {
            $todos = $response->json();
        } else {
            $todos = [];
        }

        return Inertia::render('todos', [
            'todos' => $todos
        ]);
    }
}
