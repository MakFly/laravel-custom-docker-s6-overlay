#!/bin/bash

echo "🧪 Running Laravel tests step by step..."

echo "1. Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

echo "2. Running a single test to check setup..."
php artisan test --filter "that true is true"

echo "3. Running auth tests..."
php artisan test tests/Feature/Auth/

echo "4. Running model tests..."
php artisan test tests/Unit/

echo "5. Running billing tests..."
php artisan test tests/Feature/BillingControllerTest.php

echo "6. Running all tests..."
php artisan test

echo "✅ Test run complete!" 