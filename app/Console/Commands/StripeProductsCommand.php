<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Stripe\Stripe;
use Stripe\Product;
use Stripe\Price;
use Stripe\Exception\ApiErrorException;

class StripeProductsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'stripe:products 
                            {action : Action to perform (list, create, sync)}
                            {--product= : Product name for create action}
                            {--price= : Price in cents for create action}
                            {--currency=eur : Currency (default: eur)}
                            {--interval=month : Billing interval (month, year)}
                            {--description= : Product description}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage Stripe products and prices for Préavis subscriptions';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Initialize Stripe
        Stripe::setApiKey(config('cashier.secret'));

        $action = $this->argument('action');

        switch ($action) {
            case 'list':
                $this->listProducts();
                break;
            case 'create':
                $this->createProduct();
                break;
            case 'sync':
                $this->syncProducts();
                break;
            case 'setup':
                $this->setupDefaultProducts();
                break;
            default:
                $this->error("Invalid action. Use: list, create, sync, or setup");
                return 1;
        }

        return 0;
    }

    /**
     * List all Stripe products and their prices
     */
    private function listProducts()
    {
        $this->info('🔍 Listing Stripe products and prices...');
        $this->newLine();

        try {
            $products = Product::all(['limit' => 100]);
            
            if (empty($products->data)) {
                $this->warn('No products found in Stripe.');
                return;
            }

            foreach ($products->data as $product) {
                $this->displayProduct($product);
                $this->newLine();
            }

        } catch (ApiErrorException $e) {
            $this->error('Stripe API Error: ' . $e->getMessage());
        }
    }

    /**
     * Create a new product with price
     */
    private function createProduct()
    {
        $productName = $this->option('product');
        $price = $this->option('price');

        if (!$productName) {
            $productName = $this->ask('Product name');
        }

        if (!$price) {
            $price = $this->ask('Price in cents (e.g., 990 for 9.90€)');
        }

        $description = $this->option('description') ?: $this->ask('Product description (optional)', '');
        $currency = $this->option('currency');
        $interval = $this->option('interval');

        $this->info("📦 Creating product: {$productName}");

        try {
            // Create product
            $product = Product::create([
                'name' => $productName,
                'description' => $description,
                'type' => 'service',
            ]);

            $this->info("✅ Product created: {$product->id}");

            // Create price
            $priceObj = Price::create([
                'product' => $product->id,
                'unit_amount' => (int) $price,
                'currency' => $currency,
                'recurring' => [
                    'interval' => $interval,
                ],
            ]);

            $this->info("💰 Price created: {$priceObj->id}");
            $this->newLine();

            $this->displayProduct($product);

        } catch (ApiErrorException $e) {
            $this->error('Stripe API Error: ' . $e->getMessage());
        }
    }

    /**
     * Setup default Préavis products
     */
    private function setupDefaultProducts()
    {
        $this->info('🚀 Setting up default Préavis products...');
        $this->newLine();

        $products = [
            [
                'name' => 'Préavis Starter',
                'description' => 'Plan Starter - Jusqu\'à 10 contrats surveillés',
                'price' => 990, // 9.90€
                'features' => [
                    'Jusqu\'à 10 contrats',
                    'Alertes email',
                    'OCR basique',
                    'Support email',
                ]
            ],
            [
                'name' => 'Préavis Pro',
                'description' => 'Plan Pro - Contrats illimités avec toutes les fonctionnalités',
                'price' => 1990, // 19.90€
                'features' => [
                    'Contrats illimités',
                    'Alertes email + Discord',
                    'OCR avancé + IA',
                    'Rapports personnalisés',
                    'Support prioritaire',
                    'API access',
                ]
            ],
        ];

        foreach ($products as $productData) {
            try {
                // Check if product already exists
                $existingProducts = Product::search([
                    'query' => $productData['name'],
                ]);

                if (!empty($existingProducts->data)) {
                    $this->warn("⚠️  Product '{$productData['name']}' already exists, skipping...");
                    continue;
                }

                // Create product
                $product = Product::create([
                    'name' => $productData['name'],
                    'description' => $productData['description'],
                    'type' => 'service',
                    'metadata' => [
                        'features' => implode(',', $productData['features']),
                        'created_by' => 'preavis_setup',
                    ],
                ]);

                $this->info("✅ Created product: {$productData['name']} ({$product->id})");

                // Create monthly price
                $monthlyPrice = Price::create([
                    'product' => $product->id,
                    'unit_amount' => $productData['price'],
                    'currency' => 'eur',
                    'recurring' => [
                        'interval' => 'month',
                    ],
                    'metadata' => [
                        'plan_type' => 'monthly',
                    ],
                ]);

                // Create yearly price (with discount)
                $yearlyPrice = Price::create([
                    'product' => $product->id,
                    'unit_amount' => $productData['price'] * 10, // 2 months free
                    'currency' => 'eur',
                    'recurring' => [
                        'interval' => 'year',
                    ],
                    'metadata' => [
                        'plan_type' => 'yearly',
                        'discount' => '2 months free',
                    ],
                ]);

                $this->info("💰 Monthly price: {$monthlyPrice->id} ({$productData['price']}¢)");
                $this->info("💰 Yearly price: {$yearlyPrice->id} (" . ($productData['price'] * 10) . "¢)");
                $this->newLine();

            } catch (ApiErrorException $e) {
                $this->error("Error creating {$productData['name']}: " . $e->getMessage());
            }
        }

        $this->info('🎉 Setup complete! Update your .env with these price IDs:');
        $this->newLine();
        $this->listProducts();
    }

    /**
     * Sync products with local configuration
     */
    private function syncProducts()
    {
        $this->info('🔄 Syncing Stripe products...');
        $this->newLine();

        try {
            $products = Product::all(['limit' => 100]);
            
            $config = [];
            
            foreach ($products->data as $product) {
                $prices = Price::all([
                    'product' => $product->id,
                    'limit' => 10,
                ]);

                foreach ($prices->data as $price) {
                    $planName = strtolower(str_replace(['Préavis ', ' '], ['', '_'], $product->name));
                    $interval = $price->recurring->interval ?? 'one_time';
                    
                    $key = $planName . '_' . $interval;
                    $config[$key] = $price->id;
                }
            }

            // Generate configuration for .env
            $this->info('📝 Add these to your .env file:');
            $this->newLine();
            
            foreach ($config as $key => $priceId) {
                $envKey = 'STRIPE_PRICE_' . strtoupper($key);
                $this->line("{$envKey}={$priceId}");
            }

            $this->newLine();
            $this->info('💡 Then update BillingController with:');
            $this->newLine();
            
            $this->line('$priceIds = [');
            foreach ($config as $key => $priceId) {
                $envKey = 'STRIPE_PRICE_' . strtoupper($key);
                $this->line("    '{$key}' => env('{$envKey}'),");
            }
            $this->line('];');

        } catch (ApiErrorException $e) {
            $this->error('Stripe API Error: ' . $e->getMessage());
        }
    }

    /**
     * Display product information
     */
    private function displayProduct(Product $product)
    {
        $this->line("📦 <fg=cyan>{$product->name}</> ({$product->id})");
        
        if ($product->description) {
            $this->line("   📝 {$product->description}");
        }

        try {
            $prices = Price::all([
                'product' => $product->id,
                'limit' => 10,
            ]);

            foreach ($prices->data as $price) {
                $amount = $price->unit_amount / 100;
                $currency = strtoupper($price->currency);
                $interval = $price->recurring->interval ?? 'one_time';
                
                $this->line("   💰 <fg=green>{$amount} {$currency}</> per {$interval} ({$price->id})");
            }
        } catch (ApiErrorException $e) {
            $this->line("   ❌ Error fetching prices: " . $e->getMessage());
        }

        if (!empty($product->metadata)) {
            $this->line("   🏷️  Metadata:");
            foreach ($product->metadata as $key => $value) {
                $this->line("      • {$key}: {$value}");
            }
        }
    }
}
