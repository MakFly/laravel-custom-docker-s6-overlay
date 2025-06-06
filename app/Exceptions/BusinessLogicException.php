<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BusinessLogicException extends Exception
{
    protected array $context;
    protected string $userMessage;
    protected bool $reportable;

    public function __construct(
        string $message,
        string $userMessage = null,
        array $context = [],
        bool $reportable = false,
        int $code = 0,
        \Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        
        $this->userMessage = $userMessage ?? $message;
        $this->context = $context;
        $this->reportable = $reportable;
    }

    /**
     * Get user-friendly message
     */
    public function getUserMessage(): string
    {
        return $this->userMessage;
    }

    /**
     * Get additional context
     */
    public function getContext(): array
    {
        return $this->context;
    }

    /**
     * Check if exception should be reported
     */
    public function shouldReport(): bool
    {
        return $this->reportable;
    }

    /**
     * Render the exception as an HTTP response
     */
    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'error' => 'business_logic_error',
            'message' => $this->getUserMessage(),
            'context' => $this->getContext(),
        ], 422);
    }
}

/**
 * Exception for file-related errors
 */
class FileProcessingException extends BusinessLogicException
{
    public function __construct(
        string $message,
        string $filename = null,
        array $context = [],
        \Throwable $previous = null
    ) {
        $userMessage = "Erreur lors du traitement du fichier" . ($filename ? " : {$filename}" : "");
        
        parent::__construct(
            $message,
            $userMessage,
            array_merge(['filename' => $filename], $context),
            true,
            0,
            $previous
        );
    }
}

/**
 * Exception for OCR processing errors
 */
class OcrProcessingException extends BusinessLogicException
{
    public function __construct(
        string $message,
        array $context = [],
        \Throwable $previous = null
    ) {
        parent::__construct(
            $message,
            "Erreur lors de la reconnaissance de texte. Veuillez réessayer ou utiliser un fichier de meilleure qualité.",
            $context,
            true,
            0,
            $previous
        );
    }
}

/**
 * Exception for AI analysis errors
 */
class AiAnalysisException extends BusinessLogicException
{
    public function __construct(
        string $message,
        array $context = [],
        \Throwable $previous = null
    ) {
        parent::__construct(
            $message,
            "L'analyse IA est temporairement indisponible. Nous utilisons une analyse de base en attendant.",
            $context,
            true,
            0,
            $previous
        );
    }
}

/**
 * Exception for credit-related errors
 */
class InsufficientCreditsException extends BusinessLogicException
{
    public function __construct(
        int $required,
        int $available,
        array $context = [],
        \Throwable $previous = null
    ) {
        $message = "Insufficient credits: required {$required}, available {$available}";
        $userMessage = "Crédits insuffisants pour cette analyse. Vous avez {$available} crédits, {$required} requis.";
        
        parent::__construct(
            $message,
            $userMessage,
            array_merge(['required' => $required, 'available' => $available], $context),
            false,
            0,
            $previous
        );
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'error' => 'insufficient_credits',
            'message' => $this->getUserMessage(),
            'required_credits' => $this->context['required'],
            'available_credits' => $this->context['available'],
            'upgrade_url' => route('billing.index'),
        ], 402); // 402 Payment Required
    }
}

/**
 * Exception for organization access errors
 */
class OrganizationAccessException extends BusinessLogicException
{
    public function __construct(
        string $message = "Access denied to organization resource",
        array $context = [],
        \Throwable $previous = null
    ) {
        parent::__construct(
            $message,
            "Accès refusé. Vous n'avez pas les permissions nécessaires pour cette ressource.",
            $context,
            true,
            0,
            $previous
        );
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'error' => 'access_denied',
            'message' => $this->getUserMessage(),
        ], 403);
    }
}