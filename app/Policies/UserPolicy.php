<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Determine whether the user can view any users.
     */
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Determine whether the user can view the user.
     */
    public function view(User $user, User $model): bool
    {
        return $user->org_id === $model->org_id;
    }

    /**
     * Determine whether the user can create users.
     */
    public function create(User $user): bool
    {
        return $user->role === 'admin';
    }

    /**
     * Determine whether the user can update the user.
     */
    public function update(User $user, User $model): bool
    {
        return $user->org_id === $model->org_id && $user->role === 'admin';
    }

    /**
     * Determine whether the user can delete the user.
     */
    public function delete(User $user, User $model): bool
    {
        return $user->org_id === $model->org_id 
            && $user->role === 'admin' 
            && $user->id !== $model->id; // Ne peut pas se supprimer soi-même
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        return false;
    }
}
