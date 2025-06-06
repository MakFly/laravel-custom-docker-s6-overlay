import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContractHeader } from '@/components/contracts/ContractHeader';
import { Contract } from '@/types/api';

// Mock contract data
const mockContract: Contract = {
  id: 1,
  org_id: 1,
  user_id: 1,
  title: 'Test Contract',
  type: 'pro',
  category: 'assurance',
  file_path: '/path/to/file',
  file_original_name: 'contract.pdf',
  amount_cents: 10000,
  currency: 'EUR',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  notice_period_days: 30,
  is_tacit_renewal: true,
  next_renewal_date: '2024-11-01',
  status: 'active',
  ocr_status: 'completed',
  ai_status: 'completed',
  ocr_raw_text: 'Sample text',
  ai_analysis: null,
  ai_analysis_cached: null,
  ai_analysis_cached_at: null,
  processing_mode: 'enhanced',
  pattern_analysis_result: null,
  tacit_renewal_detected_by_pattern: false,
  pattern_confidence_score: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ContractHeader', () => {
  it('renders contract title correctly', () => {
    render(<ContractHeader contract={mockContract} />);
    
    expect(screen.getByText('Test Contract')).toBeInTheDocument();
  });

  it('displays correct badges for contract type and status', () => {
    render(<ContractHeader contract={mockContract} />);
    
    expect(screen.getByText('Professionnel')).toBeInTheDocument();
    expect(screen.getByText('Assurance')).toBeInTheDocument();
  });

  it('shows tacit renewal warning when applicable', () => {
    render(<ContractHeader contract={mockContract} />);
    
    expect(screen.getByText('Reconduction tacite')).toBeInTheDocument();
    expect(screen.getByTestId('AlertTriangle-icon')).toBeInTheDocument();
  });

  it('displays formatted currency amount', () => {
    render(<ContractHeader contract={mockContract} />);
    
    expect(screen.getByText('100,00 €')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <ContractHeader 
        contract={mockContract} 
        onEdit={onEdit}
        isOwner={true}
      />
    );
    
    const editButton = screen.getByText('Modifier');
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <ContractHeader 
        contract={mockContract} 
        onDelete={onDelete}
        isOwner={true}
      />
    );
    
    const deleteButton = screen.getByText('Supprimer');
    fireEvent.click(deleteButton);
    
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not show edit/delete buttons when user is not owner', () => {
    render(
      <ContractHeader 
        contract={mockContract} 
        isOwner={false}
      />
    );
    
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument();
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<ContractHeader contract={mockContract} />);
    
    // Should display French date format
    expect(screen.getByText('01/01/2024')).toBeInTheDocument(); // start_date
    expect(screen.getByText('31/12/2024')).toBeInTheDocument(); // end_date
    expect(screen.getByText('01/11/2024')).toBeInTheDocument(); // next_renewal_date
  });

  it('displays notice period correctly', () => {
    render(<ContractHeader contract={mockContract} />);
    
    expect(screen.getByText('30 jours')).toBeInTheDocument();
  });

  it('handles contract without amount gracefully', () => {
    const contractWithoutAmount = {
      ...mockContract,
      amount_cents: null,
    };
    
    render(<ContractHeader contract={contractWithoutAmount} />);
    
    // Should not crash and not display amount
    expect(screen.queryByText('€')).not.toBeInTheDocument();
  });

  it('applies correct status color variants', () => {
    const activeContract = { ...mockContract, status: 'active' as const };
    const expiredContract = { ...mockContract, status: 'expired' as const };
    
    const { rerender } = render(<ContractHeader contract={activeContract} />);
    expect(screen.getByText('active')).toBeInTheDocument();
    
    rerender(<ContractHeader contract={expiredContract} />);
    expect(screen.getByText('expired')).toBeInTheDocument();
  });

  it('is accessible with proper ARIA attributes', () => {
    render(<ContractHeader contract={mockContract} />);
    
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Test Contract');
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Each button should have accessible text
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });
  });
});

// Performance test
describe('ContractHeader Performance', () => {
  it('does not re-render unnecessarily with React.memo', () => {
    const renderSpy = vi.fn();
    
    const TestComponent = React.memo(() => {
      renderSpy();
      return <ContractHeader contract={mockContract} />;
    });
    
    const { rerender } = render(<TestComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    
    // Re-render with same props - should not trigger re-render
    rerender(<TestComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});