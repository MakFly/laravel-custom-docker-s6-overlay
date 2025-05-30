<?php

return [
    /*
    |--------------------------------------------------------------------------
    | OpenAI API Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for OpenAI API integration
    |
    */

    'api_key' => env('OPENAI_API_KEY'),

    'model' => env('OPENAI_MODEL', 'gpt-4'),

    'max_tokens' => env('OPENAI_MAX_TOKENS', 2000),

    'temperature' => env('OPENAI_TEMPERATURE', 0.1),

    'timeout' => env('OPENAI_TIMEOUT', 60),

    'request_timeout' => env('OPENAI_REQUEST_TIMEOUT', 30),

    'retry_attempts' => env('OPENAI_RETRY_ATTEMPTS', 3),
]; 