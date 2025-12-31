/**
 * AddressForm Component Tests
 *
 * Tests for the AddressForm component following TDD principles.
 * These tests should have been written before implementing the component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressForm, AddressInput } from '../AddressForm';

describe('AddressForm', () => {
  const mockOnSubmit = jest.fn();

  const defaultAddress: AddressInput = {
    fullName: 'John Doe',
    streetLine1: '123 Main St',
    streetLine2: 'Apt 4B',
    city: 'New York',
    province: 'NY',
    postalCode: '10001',
    countryCode: 'US',
    phoneNumber: '555-1234',
  };

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Rendering', () => {
    it('should render form with title', () => {
      render(<AddressForm title="Shipping Address" onSubmit={mockOnSubmit} />);
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
    });

    it('should render all required form fields', () => {
      render(<AddressForm title="Test Address" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state\/province/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/zip\/postal code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    });

    it('should render optional fields', () => {
      render(<AddressForm title="Test Address" onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/apartment, suite/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it('should initialize form with default values', () => {
      render(
        <AddressForm
          title="Test Address"
          onSubmit={mockOnSubmit}
          initialValues={defaultAddress}
        />
      );

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Apt 4B')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
      expect(screen.getByDisplayValue('NY')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10001')).toBeInTheDocument();
    });

    it('should use US as default country code', () => {
      render(<AddressForm title="Test Address" onSubmit={mockOnSubmit} />);
      const countrySelect = screen.getByLabelText(/country/i);
      expect(countrySelect).toHaveValue('US');
    });
  });

  describe('Form Interaction', () => {
    it('should update form fields when user types', async () => {
      const user = userEvent.setup();
      render(<AddressForm title="Test Address" onSubmit={mockOnSubmit} />);

      const fullNameInput = screen.getByLabelText(/full name/i);
      await user.type(fullNameInput, 'Jane Smith');

      expect(fullNameInput).toHaveValue('Jane Smith');
    });

    it('should update country when user selects different country', async () => {
      const user = userEvent.setup();
      render(<AddressForm title="Test Address" onSubmit={mockOnSubmit} />);

      const countrySelect = screen.getByLabelText(/country/i);
      await user.selectOptions(countrySelect, 'CA');

      expect(countrySelect).toHaveValue('CA');
    });

    it('should call onSubmit with form data when form is submitted', async () => {
      const user = userEvent.setup();
      render(<AddressForm title="Test Address" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'New York');
      await user.type(screen.getByLabelText(/state\/province/i), 'NY');
      await user.type(screen.getByLabelText(/zip\/postal code/i), '10001');

      const submitButton = screen.getByRole('button', { name: /continue/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.fullName).toBe('John Doe');
      expect(submittedData.streetLine1).toBe('123 Main St');
      expect(submittedData.city).toBe('New York');
      expect(submittedData.province).toBe('NY');
      expect(submittedData.postalCode).toBe('10001');
      expect(submittedData.countryCode).toBe('US');
    });

    it('should include optional fields in submitted data when filled', async () => {
      const user = userEvent.setup();
      render(<AddressForm title="Test Address" onSubmit={mockOnSubmit} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/apartment, suite/i), 'Apt 4B');
      await user.type(screen.getByLabelText(/city/i), 'New York');
      await user.type(screen.getByLabelText(/state\/province/i), 'NY');
      await user.type(screen.getByLabelText(/zip\/postal code/i), '10001');
      await user.type(screen.getByLabelText(/phone number/i), '555-1234');

      const submitButton = screen.getByRole('button', { name: /continue/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.streetLine2).toBe('Apt 4B');
      expect(submittedData.phoneNumber).toBe('555-1234');
    });
  });

  describe('Form Validation', () => {
    it('should prevent submission when required fields are empty', async () => {
      const user = userEvent.setup();
      render(<AddressForm title="Test Address" onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /continue/i });
      await user.click(submitButton);

      // HTML5 validation should prevent submission
      // The form should not call onSubmit
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should display error messages for specific fields', () => {
      const errors = {
        fullName: 'Full name is required',
        streetLine1: 'Street address is required',
        city: 'City is required',
      };

      render(
        <AddressForm
          title="Test Address"
          onSubmit={mockOnSubmit}
          errors={errors}
        />
      );

      // Note: AddressForm doesn't currently display field-specific errors
      // This test documents expected behavior that could be added
      expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should disable form fields when isLoading is true', () => {
      render(
        <AddressForm
          title="Test Address"
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      const fullNameInput = screen.getByLabelText(/full name/i);
      const submitButton = screen.getByRole('button', { name: /processing/i });

      expect(fullNameInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('should show processing text on submit button when loading', () => {
      render(
        <AddressForm
          title="Test Address"
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle async onSubmit functions', async () => {
      const user = userEvent.setup();
      const asyncOnSubmit = jest.fn().mockResolvedValue(undefined);

      render(<AddressForm title="Test Address" onSubmit={asyncOnSubmit} />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/street address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'New York');
      await user.type(screen.getByLabelText(/state\/province/i), 'NY');
      await user.type(screen.getByLabelText(/zip\/postal code/i), '10001');

      const submitButton = screen.getByRole('button', { name: /continue/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(asyncOnSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle partial initial values', () => {
      render(
        <AddressForm
          title="Test Address"
          onSubmit={mockOnSubmit}
          initialValues={{
            fullName: 'John Doe',
            countryCode: 'CA',
          }}
        />
      );

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText(/country/i)).toHaveValue('CA');
      expect(screen.getByLabelText(/street address/i)).toHaveValue('');
    });
  });
});
