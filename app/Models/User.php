<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'org_id',
        'role',
        'phone',
        'notification_preferences',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_preferences' => 'array',
        ];
    }

    // Relations
    public function org(): BelongsTo
    {
        return $this->belongsTo(Org::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    // Helper methods
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }

    public function isViewer(): bool
    {
        return $this->role === 'viewer';
    }

    public function canManageUsers(): bool
    {
        return $this->role === 'admin';
    }

    public function canCreateContracts(): bool
    {
        return in_array($this->role, ['admin', 'user']);
    }

    public function canDeleteContracts(): bool
    {
        return $this->role === 'admin';
    }
}
