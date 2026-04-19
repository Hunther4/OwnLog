import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render title and description', () => {
    const { getByText } = render(
      <EmptyState
        title="No transactions"
        description="Add your first transaction to get started"
      />
    );

    expect(getByText('No transactions')).toBeTruthy();
    expect(getByText('Add your first transaction to get started')).toBeTruthy();
  });

  it('should render icon when provided', () => {
    const { getByTestId } = render(
      <EmptyState
        title="No transactions"
        description="Add your first transaction to get started"
        icon={<React.Fragment testID="test-icon" />}
      />
    );

    expect(getByTestId('test-icon')).toBeTruthy();
  });

  it('should render CTA button when provided', () => {
    const { getByText, getByRole } = render(
      <EmptyState
        title="No transactions"
        description="Add your first transaction to get started"
        ctaButton={{
          label: 'Add Transaction',
          onPress: mockOnPress,
        }}
      />
    );

    const button = getByText('Add Transaction');
    expect(button).toBeTruthy();
    
    // Check accessibility role
    expect(getByRole('button')).toBeTruthy();
  });

  it('should call onPress when CTA button is pressed', () => {
    const { getByText } = render(
      <EmptyState
        title="No transactions"
        description="Add your first transaction to get started"
        ctaButton={{
          label: 'Add Transaction',
          onPress: mockOnPress,
        }}
      />
    );

    const button = getByText('Add Transaction');
    fireEvent.press(button);
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should not render CTA button when not provided', () => {
    const { queryByRole } = render(
      <EmptyState
        title="No transactions"
        description="Add your first transaction to get started"
      />
    );

    expect(queryByRole('button')).toBeNull();
  });

  it('should have proper accessibility attributes', () => {
    const { getByRole, getByText } = render(
      <EmptyState
        title="No transactions"
        description="Add your first transaction to get started"
        ctaButton={{
          label: 'Add Transaction',
          onPress: mockOnPress,
        }}
      />
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();
    
    // Check text has allowFontScaling
    const title = getByText('No transactions');
    expect(title.props.allowFontScaling).toBe(true);
    
    const description = getByText('Add your first transaction to get started');
    expect(description.props.allowFontScaling).toBe(true);
  });

  it('should have minimum touch target size for CTA button', () => {
    const { getByRole } = render(
      <EmptyState
        title="No transactions"
        description="Add your first transaction to get started"
        ctaButton={{
          label: 'Add Transaction',
          onPress: mockOnPress,
        }}
      />
    );

    const button = getByRole('button');
    expect(button.props.hitSlop).toBeDefined();
    expect(button.props.hitSlop).toEqual({
      top: 8,
      bottom: 8,
      left: 16,
      right: 16,
    });
  });
});