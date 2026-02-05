/**
 * Shop Settings Page Component Tests
 *
 * Tests for the shop settings page at /seller/shop-settings, following TDD.
 * Phase 5.1: Shop Customization
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import ShopSettingsPage from '../page';
import { GET_ACTIVE_SELLER, UPDATE_SHOP_CUSTOMIZATION } from '@/graphql/queries';

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(''),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <header>Header</header>,
}));

// Mock data
const mockSeller = {
  __typename: 'MarketplaceSeller' as const,
  id: '1',
  shopName: 'Test Shop',
  shopSlug: 'test-shop',
  shopDescription: 'Current description',
  shopBannerAssetId: '100',
  shopLogoAssetId: '101',
};

describe('ShopSettingsPage', () => {
  describe('Loading State', () => {
    it('should show loading message when data is loading', () => {
      const mocks: any[] = [];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSettingsPage />
        </MockedProvider>
      );

      expect(screen.getByText(/loading shop settings/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when query fails', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_SELLER,
          },
          error: new Error('Network error'),
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSettingsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading shop settings/i)).toBeInTheDocument();
      });
    });

    it('should display message when user is not a seller', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_SELLER,
          },
          result: {
            data: {
              activeSeller: null,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSettingsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/you need to register as a seller/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Display', () => {
    it('should display shop settings form when seller exists', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_SELLER,
          },
          result: {
            data: {
              activeSeller: mockSeller,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSettingsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Shop Settings')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('Test Shop')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test-shop')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Current description')).toBeInTheDocument();
    });

    it('should display read-only shop name and slug', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_SELLER,
          },
          result: {
            data: {
              activeSeller: mockSeller,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSettingsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        const shopNameInput = screen.getByDisplayValue('Test Shop');
        expect(shopNameInput).toBeDisabled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call updateShopCustomization mutation when form is submitted', async () => {
      const user = userEvent.setup();
      const updateMutationMock = {
        request: {
          query: UPDATE_SHOP_CUSTOMIZATION,
          variables: {
            sellerId: '1',
            input: {
              shopDescription: 'New description',
              shopBannerAssetId: '200',
              shopLogoAssetId: '201',
            },
          },
        },
        result: {
          data: {
            updateShopCustomization: {
              ...mockSeller,
              shopDescription: 'New description',
              shopBannerAssetId: '200',
              shopLogoAssetId: '201',
            },
          },
        },
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_SELLER,
          },
          result: {
            data: {
              activeSeller: mockSeller,
            },
          },
        },
        updateMutationMock,
        {
          request: {
            query: GET_ACTIVE_SELLER,
          },
          result: {
            data: {
              activeSeller: {
                ...mockSeller,
                shopDescription: 'New description',
                shopBannerAssetId: '200',
                shopLogoAssetId: '201',
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSettingsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Shop Settings')).toBeInTheDocument();
      });

      const descriptionInput = screen.getByLabelText(/shop description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'New description');

      const bannerInput = screen.getByLabelText(/banner image asset id/i);
      await user.clear(bannerInput);
      await user.type(bannerInput, '200');

      const logoInput = screen.getByLabelText(/logo image asset id/i);
      await user.clear(logoInput);
      await user.type(logoInput, '201');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/shop settings saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should display error message when mutation fails', async () => {
      const user = userEvent.setup();
      const updateMutationMock = {
        request: {
          query: UPDATE_SHOP_CUSTOMIZATION,
          variables: {
            sellerId: '1',
            input: {
              shopDescription: 'New description',
              shopBannerAssetId: '100', // Retains initial value from mockSeller
              shopLogoAssetId: '101', // Retains initial value from mockSeller
            },
          },
        },
        error: new Error('Update failed'),
      };

      const mocks = [
        {
          request: {
            query: GET_ACTIVE_SELLER,
          },
          result: {
            data: {
              activeSeller: mockSeller,
            },
          },
        },
        updateMutationMock,
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSettingsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Shop Settings')).toBeInTheDocument();
      });

      const descriptionInput = screen.getByLabelText(/shop description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'New description');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/error:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Character Count', () => {
    it('should display character count for description', async () => {
      const mocks = [
        {
          request: {
            query: GET_ACTIVE_SELLER,
          },
          result: {
            data: {
              activeSeller: mockSeller,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks}>
          <ShopSettingsPage />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/\/1000 characters/i)).toBeInTheDocument();
      });
    });
  });
});
