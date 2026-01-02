/**
 * Customer Account Page Tests
 * 
 * Tests for the customer account/profile page following TDD principles.
 * These tests should be written BEFORE implementing the component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import AccountPage from '../page';
import { GET_ACTIVE_CUSTOMER, CREATE_CUSTOMER_ADDRESS, UPDATE_CUSTOMER_ADDRESS, DELETE_CUSTOMER_ADDRESS } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

const mockCustomer = {
  id: 'customer-1',
  firstName: 'John',
  lastName: 'Doe',
  emailAddress: 'john.doe@example.com',
  phoneNumber: '123-456-7890',
  addresses: [
    {
      id: 'address-1',
      fullName: 'John Doe',
      streetLine1: '123 Main St',
      streetLine2: 'Apt 4B',
      city: 'New York',
      province: 'NY',
      postalCode: '10001',
      country: {
        code: 'US',
      },
      phoneNumber: '123-456-7890',
    },
  ],
};

describe('AccountPage', () => {
  describe('Page Rendering', () => {
    it('should redirect to login if customer is not authenticated', async () => {
      const pushMock = jest.fn();
      jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
        push: pushMock,
      });

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: null,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/login');
      });
    });

    it('should display customer account page when authenticated', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/My Account/i)).toBeInTheDocument();
      });
    });

    it('should display customer information', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        // Name is displayed as "John Doe" (firstName + lastName) in a paragraph
        // We can check for the full name by finding the text content
        const nameElement = screen.getByText(/Name:/i).closest('div');
        expect(nameElement).toHaveTextContent('John Doe');
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display customer addresses', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/123 Main St/i)).toBeInTheDocument();
        expect(screen.getByText(/New York/i)).toBeInTheDocument();
      });
    });

    it('should display link to order history', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const orderHistoryLink = screen.getByRole('link', { name: /View Order History/i });
        expect(orderHistoryLink).toBeInTheDocument();
        expect(orderHistoryLink).toHaveAttribute('href', '/orders');
      });
    });
  });

  describe('Edit Customer Details', () => {
    it('should allow editing customer details', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        // Check for Profile Information heading which indicates page loaded
        expect(screen.getByText('Profile Information')).toBeInTheDocument();
      }, { timeout: 3000 });

      // There may be multiple Edit buttons - get the first one which is for profile editing
      const editButton = screen.getAllByRole('button', { name: /^Edit$/i })[0];
      expect(editButton).toBeInTheDocument();
    });

    it('should show edit form when edit button is clicked', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        // Check for Profile Information heading which indicates page loaded
        expect(screen.getByText('Profile Information')).toBeInTheDocument();
      }, { timeout: 3000 });

      // There may be multiple Edit buttons - get the first one which is for profile editing
      const editButton = screen.getAllByRole('button', { name: /^Edit$/i })[0];
      await user.click(editButton);

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      // Email is shown as read-only text, not in a form field
      expect(screen.getByText(/john.doe@example.com/i)).toBeInTheDocument();
    });
  });

  describe('Address Management', () => {
    it('should display add address button', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Address/i })).toBeInTheDocument();
      });
    });

    it('should show add address form when Add Address button is clicked', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Address/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Address/i });
      await user.click(addButton);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    });

    it('should create a new address when form is submitted', async () => {
      const user = userEvent.setup();
      const newAddress = {
        id: 'address-2',
        fullName: 'Jane Doe',
        streetLine1: '456 Oak Ave',
        city: 'Los Angeles',
        province: 'CA',
        postalCode: '90001',
        country: {
          code: 'US',
        },
        phoneNumber: '555-1234',
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
        {
          request: {
            query: CREATE_CUSTOMER_ADDRESS,
            variables: {
              input: {
                fullName: 'Jane Doe',
                streetLine1: '456 Oak Ave',
                city: 'Los Angeles',
                province: 'CA',
                postalCode: '90001',
                countryCode: 'US',
                phoneNumber: '555-1234',
              },
            },
          },
          result: {
            data: {
              createCustomerAddress: newAddress,
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: {
                ...mockCustomer,
                addresses: [...mockCustomer.addresses, newAddress],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Address/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Address/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
      await user.type(screen.getByLabelText(/street address/i), '456 Oak Ave');
      await user.type(screen.getByLabelText(/city/i), 'Los Angeles');
      await user.type(screen.getByLabelText(/province|state/i), 'CA');
      await user.type(screen.getByLabelText(/postal|zip/i), '90001');
      await user.type(screen.getByLabelText(/phone/i), '555-1234');

      const submitButton = screen.getByRole('button', { name: /Add Address/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/456 Oak Ave/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show edit address form when Edit button is clicked', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/123 Main St/i)).toBeInTheDocument();
      });

      // Find the Edit button in the address section (there may be multiple Edit buttons)
      const addressSection = screen.getByText(/123 Main St/i).closest('div[class*="border"]');
      const editButton = addressSection?.querySelector('button') || screen.getAllByRole('button', { name: /^Edit$/i })[1];
      await user.click(editButton!);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    });

    it('should update an existing address when edit form is submitted', async () => {
      const user = userEvent.setup();
      const updatedAddress = {
        ...mockCustomer.addresses[0],
        streetLine1: '789 Pine St',
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
        {
          request: {
            query: UPDATE_CUSTOMER_ADDRESS,
            variables: {
              input: {
                id: 'address-1',
                streetLine1: '789 Pine St',
                fullName: 'John Doe',
                city: 'New York',
                province: 'NY',
                postalCode: '10001',
                countryCode: 'US',
                phoneNumber: '123-456-7890',
              },
            },
          },
          result: {
            data: {
              updateCustomerAddress: updatedAddress,
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: {
                ...mockCustomer,
                addresses: [updatedAddress],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/123 Main St/i)).toBeInTheDocument();
      });

      // Find the Edit button in the address section
      const addressSection = screen.getByText(/123 Main St/i).closest('div[class*="border"]');
      const editButton = addressSection?.querySelector('button') || screen.getAllByRole('button', { name: /^Edit$/i })[1];
      await user.click(editButton!);

      await waitFor(() => {
        expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
      });

      const streetInput = screen.getByLabelText(/street address/i) as HTMLInputElement;
      await user.clear(streetInput);
      await user.type(streetInput, '789 Pine St');

      const submitButton = screen.getByRole('button', { name: /Save Address/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/789 Pine St/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should delete an address when Delete button is clicked', async () => {
      const user = userEvent.setup();
      // Mock window.confirm to return true
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
        {
          request: {
            query: DELETE_CUSTOMER_ADDRESS,
            variables: {
              id: 'address-1',
            },
          },
          result: {
            data: {
              deleteCustomerAddress: {
                success: true,
              },
            },
          },
        },
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: {
                ...mockCustomer,
                addresses: [],
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/123 Main St/i)).toBeInTheDocument();
      });

      // Find the Delete button in the address section
      const addressSection = screen.getByText(/123 Main St/i).closest('div[class*="border"]');
      const deleteButton = addressSection?.querySelectorAll('button')[1] || screen.getByRole('button', { name: /^Delete$/i });
      await user.click(deleteButton!);

      await waitFor(() => {
        expect(screen.queryByText(/123 Main St/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      confirmSpy.mockRestore();
    });

    it('should cancel adding address and hide form', async () => {
      const user = userEvent.setup();
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Address/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Address/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Page Structure', () => {
    it('should render Header component', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_CUSTOMER,
          },
          result: {
            data: {
              activeCustomer: mockCustomer,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <AccountPage />
        </MockedProvider>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
    });
  });
});
