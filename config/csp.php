<?php

use Spatie\Csp\Directive;
use Spatie\Csp\Keyword;

return [

    /*
     * Presets will determine which CSP headers will be set. A valid CSP preset is
     * any class that extends `Spatie\Csp\Preset`
     */
    'presets' => [
        // Spatie\Csp\Presets\Basic::class, // Désactivé pour plus de flexibilité
    ],

    /**
     * Register additional global CSP directives here.
     */
    'directives' => [
        // Scripts: permettre self, unsafe-inline et unsafe-eval pour React/Vite
        [Directive::SCRIPT, [Keyword::SELF, Keyword::UNSAFE_INLINE, Keyword::UNSAFE_EVAL, 'http://127.0.0.1:5173', 'http://localhost:5173', 'https://unpkg.com']],
        
        // Styles: permettre self, unsafe-inline et fonts externes
        [Directive::STYLE, [Keyword::SELF, Keyword::UNSAFE_INLINE, 'fonts.bunny.net', 'fonts.googleapis.com']],
        
        // Images: permettre self, data et blob pour images upload
        [Directive::IMG, [Keyword::SELF, 'data:', 'blob:']],
        
        // Fonts: permettre self, data et fonts externes
        [Directive::FONT, [Keyword::SELF, 'data:', 'fonts.bunny.net', 'fonts.gstatic.com']],
        
        // Connexions: permettre self et serveur de dev Vite
        [Directive::CONNECT, [Keyword::SELF, 'http://127.0.0.1:5173', 'http://localhost:5173', 'ws://127.0.0.1:5173', 'ws://localhost:5173']],
        
        // Objects: permettre self pour les PDFs
        [Directive::OBJECT, [Keyword::SELF]],
        
        // Frames: permettre self pour les iframes PDF
        [Directive::FRAME, [Keyword::SELF]],
        
        // Base URI: restreindre à self
        [Directive::BASE, [Keyword::SELF]],
        
        // Form actions: restreindre à self
        [Directive::FORM_ACTION, [Keyword::SELF]],
    ],

    /*
     * These presets which will be put in a report-only policy. This is great for testing out
     * a new policy or changes to existing CSP policy without breaking anything.
     */
    'report_only_presets' => [
        //
    ],

    /**
     * Register additional global report-only CSP directives here.
     */
    'report_only_directives' => [
        // [Directive::SCRIPT, [Keyword::UNSAFE_EVAL, Keyword::UNSAFE_INLINE]],
    ],

    /*
     * All violations against a policy will be reported to this url.
     * A great service you could use for this is https://report-uri.com/
     */
    'report_uri' => env('CSP_REPORT_URI', ''),

    /*
     * Headers will only be added if this setting is set to true.
     */
    'enabled' => env('CSP_ENABLED', true),

    /**
     * Headers will be added when Vite is hot reloading.
     */
    'enabled_while_hot_reloading' => env('CSP_ENABLED_WHILE_HOT_RELOADING', true),

    /*
     * The class responsible for generating the nonces used in inline tags and headers.
     */
    'nonce_generator' => Spatie\Csp\Nonce\RandomString::class,

    /*
     * Set false to disable automatic nonce generation and handling.
     * This is useful when you want to use 'unsafe-inline' for scripts/styles
     * and cannot add inline nonces.
     * Note that this will make your CSP policy less secure.
     */
    'nonce_enabled' => env('CSP_NONCE_ENABLED', false), // Désactivé pour simplifier le dev
];
