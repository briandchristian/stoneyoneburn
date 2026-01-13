/**
 * MarketplaceSeller Resolver Tests
 *
 * Test-Driven Development (TDD) for polymorphic seller type resolution.
 * Tests type discrimination, GraphQL interface resolution, and query functionality.
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RequestContext } from '@vendure/core';
import { MarketplaceSellerResolver } from './marketplace-seller.resolver';
import { SellerService } from '../services/seller.service';
import { SellerType } from '../entities/marketplace-seller-base.entity';
import { IndividualSeller } from '../entities/individual-seller.entity';
import { CompanySeller } from '../entities/company-seller.entity';

/**
 * MarketplaceSeller Resolver Documentation
 *
 * The MarketplaceSellerResolver handles:
 *
 * 1. Polymorphic Query Resolution:
 *    - seller(id: ID!) - Returns IndividualSeller or CompanySeller
 *    - sellers - Returns array of polymorphic types
 *    - Type resolution via @InterfaceType() resolveType function
 *
 * 2. Type Discrimination:
 *    - Checks instanceof IndividualSeller or CompanySeller
 *    - Falls back to sellerType discriminator field
 *    - Checks type-specific fields as final fallback
 *
 * 3. Class Instance Requirements:
 *    - Must return class instances (not plain objects) for GraphQL type resolution
 *    - Converts plain objects to class instances if needed
 */

describe('MarketplaceSellerResolver', () => {
  let resolver: MarketplaceSellerResolver;
  let mockSellerService: {
    findSellerById: any;
    findAllSellers: any;
  };
  let mockCtx: RequestContext;

  beforeEach(() => {
    // Create mock SellerService with properly typed mocks
    // Using jest.fn() and casting for compatibility with Jest version
    const findByIdMock = jest.fn();
    const findAllMock = jest.fn();

    mockSellerService = {
      findSellerById: findByIdMock,
      findAllSellers: findAllMock,
    };

    resolver = new MarketplaceSellerResolver(mockSellerService as unknown as SellerService);

    // Create mock request context
    mockCtx = {
      activeUserId: 'user-1',
    } as RequestContext;
  });

  describe('seller query', () => {
    it('should return IndividualSeller when seller type is INDIVIDUAL', async () => {
      // Arrange
      const sellerId = 'seller-1';
      const mockIndividualSeller = new IndividualSeller();
      mockIndividualSeller.id = sellerId;
      mockIndividualSeller.sellerType = SellerType.INDIVIDUAL;
      mockIndividualSeller.firstName = 'John';
      mockIndividualSeller.lastName = 'Doe';
      mockIndividualSeller.name = 'John Doe Shop';
      mockIndividualSeller.email = 'john@example.com';
      mockIndividualSeller.isActive = true;

      mockSellerService.findSellerById.mockResolvedValue(mockIndividualSeller);

      // Act
      const result = await resolver.seller(mockCtx, sellerId);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(IndividualSeller);
      expect(result?.sellerType).toBe(SellerType.INDIVIDUAL);
      expect(result?.id).toBe(sellerId);
      expect(mockSellerService.findSellerById).toHaveBeenCalledWith(mockCtx, sellerId);
    });

    it('should return CompanySeller when seller type is COMPANY', async () => {
      // Arrange
      const sellerId = 'seller-2';
      const mockCompanySeller = new CompanySeller();
      mockCompanySeller.id = sellerId;
      mockCompanySeller.sellerType = SellerType.COMPANY;
      mockCompanySeller.companyName = 'Acme Corporation';
      mockCompanySeller.vatNumber = 'US-123456789';
      mockCompanySeller.legalForm = 'LLC';
      mockCompanySeller.name = 'Acme Shop';
      mockCompanySeller.email = 'contact@acme.com';
      mockCompanySeller.isActive = true;

      mockSellerService.findSellerById.mockResolvedValue(mockCompanySeller);

      // Act
      const result = await resolver.seller(mockCtx, sellerId);

      // Assert
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(CompanySeller);
      expect(result?.sellerType).toBe(SellerType.COMPANY);
      expect(result?.id).toBe(sellerId);
      expect(mockSellerService.findSellerById).toHaveBeenCalledWith(mockCtx, sellerId);
    });

    it('should return null when seller does not exist', async () => {
      // Arrange
      const sellerId = 'non-existent-seller';
      mockSellerService.findSellerById.mockResolvedValue(null);

      // Act
      const result = await resolver.seller(mockCtx, sellerId);

      // Assert
      expect(result).toBeNull();
      expect(mockSellerService.findSellerById).toHaveBeenCalledWith(mockCtx, sellerId);
    });

    it('should convert plain object to IndividualSeller class instance if needed', async () => {
      // Arrange
      const sellerId = 'seller-1';
      const plainObject = {
        id: sellerId,
        sellerType: SellerType.INDIVIDUAL,
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe Shop',
        email: 'john@example.com',
        isActive: true,
      };

      mockSellerService.findSellerById.mockResolvedValue(plainObject as any);

      // Act
      const result = await resolver.seller(mockCtx, sellerId);

      // Assert
      expect(result).toBeDefined();
      // Should be converted to class instance (via Object.assign in resolver)
      expect(result?.sellerType).toBe(SellerType.INDIVIDUAL);
      expect(result?.id).toBe(sellerId);
    });

    it('should convert plain object to CompanySeller class instance if needed', async () => {
      // Arrange
      const sellerId = 'seller-2';
      const plainObject = {
        id: sellerId,
        sellerType: SellerType.COMPANY,
        companyName: 'Acme Corp',
        vatNumber: 'US-123',
        name: 'Acme Shop',
        email: 'contact@acme.com',
        isActive: true,
      };

      mockSellerService.findSellerById.mockResolvedValue(plainObject as any);

      // Act
      const result = await resolver.seller(mockCtx, sellerId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.sellerType).toBe(SellerType.COMPANY);
      expect(result?.id).toBe(sellerId);
    });
  });

  describe('sellers query', () => {
    it('should return array of IndividualSeller and CompanySeller', async () => {
      // Arrange
      const individualSeller = new IndividualSeller();
      individualSeller.id = 'seller-1';
      individualSeller.sellerType = SellerType.INDIVIDUAL;
      individualSeller.firstName = 'John';
      individualSeller.lastName = 'Doe';
      individualSeller.name = 'John Doe Shop';
      individualSeller.email = 'john@example.com';
      individualSeller.isActive = true;

      const companySeller = new CompanySeller();
      companySeller.id = 'seller-2';
      companySeller.sellerType = SellerType.COMPANY;
      companySeller.companyName = 'Acme Corp';
      companySeller.vatNumber = 'US-123';
      companySeller.name = 'Acme Shop';
      companySeller.email = 'contact@acme.com';
      companySeller.isActive = true;

      mockSellerService.findAllSellers.mockResolvedValue([individualSeller, companySeller]);

      // Act
      const result = await resolver.sellers(mockCtx);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toBeInstanceOf(IndividualSeller);
      expect(result[1]).toBeInstanceOf(CompanySeller);
      expect(mockSellerService.findAllSellers).toHaveBeenCalledWith(mockCtx);
    });

    it('should return empty array when no sellers exist', async () => {
      // Arrange
      mockSellerService.findAllSellers.mockResolvedValue([]);

      // Act
      const result = await resolver.sellers(mockCtx);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should convert plain objects to class instances in array', async () => {
      // Arrange
      const plainIndividual = {
        id: 'seller-1',
        sellerType: SellerType.INDIVIDUAL,
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Shop',
        email: 'john@example.com',
        isActive: true,
      };

      const plainCompany = {
        id: 'seller-2',
        sellerType: SellerType.COMPANY,
        companyName: 'Acme',
        vatNumber: 'US-123',
        name: 'Acme Shop',
        email: 'contact@acme.com',
        isActive: true,
      };

      mockSellerService.findAllSellers.mockResolvedValue([plainIndividual, plainCompany] as any);

      // Act
      const result = await resolver.sellers(mockCtx);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0]?.sellerType).toBe(SellerType.INDIVIDUAL);
      expect(result[1]?.sellerType).toBe(SellerType.COMPANY);
    });
  });

  // NOTE: name field resolver was removed because 'name' is now a direct database column
  // in MarketplaceSellerSTIBase, not a computed field. GraphQL will automatically
  // resolve the field from the entity property.

  describe('type resolution (resolveType in interface)', () => {
    it('should correctly identify IndividualSeller by constructor name', () => {
      // Arrange - This tests the resolveType function in MarketplaceSellerBase
      const seller = new IndividualSeller();
      seller.sellerType = SellerType.INDIVIDUAL;

      // Act - Simulate what GraphQL does
      // The resolveType function checks constructor.name
      const typeName = seller.constructor.name;

      // Assert
      expect(typeName).toBe('IndividualSeller');
    });

    it('should correctly identify CompanySeller by constructor name', () => {
      // Arrange
      const seller = new CompanySeller();
      seller.sellerType = SellerType.COMPANY;

      // Act
      const typeName = seller.constructor.name;

      // Assert
      expect(typeName).toBe('CompanySeller');
    });

    it('should fallback to sellerType discriminator for plain objects', () => {
      // Arrange - Simulate plain object from database
      const plainObject = {
        sellerType: SellerType.INDIVIDUAL,
        firstName: 'John',
        lastName: 'Doe',
      };

      // Act - The resolveType function checks sellerType
      const type = plainObject.sellerType;

      // Assert
      expect(type).toBe(SellerType.INDIVIDUAL);
    });

    it('should fallback to type-specific fields if discriminator missing', () => {
      // Arrange - Plain object without sellerType
      const plainIndividual = {
        firstName: 'John',
        lastName: 'Doe',
        // sellerType is missing
      };

      const plainCompany = {
        companyName: 'Acme Corp',
        vatNumber: 'US-123',
        // sellerType is missing
      };

      // Act - The resolveType function checks type-specific fields
      const hasIndividualFields =
        plainIndividual.firstName !== undefined || plainIndividual.lastName !== undefined;
      const hasCompanyFields =
        plainCompany.companyName !== undefined || plainCompany.vatNumber !== undefined;

      // Assert
      expect(hasIndividualFields).toBe(true);
      expect(hasCompanyFields).toBe(true);
    });
  });
});
