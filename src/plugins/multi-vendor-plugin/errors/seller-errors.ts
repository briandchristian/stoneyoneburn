/**
 * Seller Error Types
 *
 * GraphQL error result types for seller operations.
 * Following Vendure's ErrorResult pattern.
 */

import { ObjectType, Field } from '@nestjs/graphql';

/**
 * Error codes for seller registration
 */
export enum SellerErrorCode {
  CUSTOMER_NOT_AUTHENTICATED = 'CUSTOMER_NOT_AUTHENTICATED',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  SELLER_ALREADY_EXISTS = 'SELLER_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_SHOP_NAME = 'INVALID_SHOP_NAME',
  SHOP_SLUG_TAKEN = 'SHOP_SLUG_TAKEN',
  SHOP_SLUG_GENERATION_FAILED = 'SHOP_SLUG_GENERATION_FAILED',
  SELLER_NOT_FOUND = 'SELLER_NOT_FOUND',
  NOT_SELLER_OWNER = 'NOT_SELLER_OWNER',
}

/**
 * Seller Registration Error
 *
 * Returned when seller registration fails
 */
@ObjectType()
export class SellerRegistrationError {
  @Field(() => String)
  errorCode!: string;

  @Field()
  message!: string;

  constructor(errorCode: SellerErrorCode, message: string) {
    this.errorCode = errorCode;
    this.message = message;
  }
}

/**
 * Seller Update Error
 *
 * Returned when seller profile update fails
 */
@ObjectType()
export class SellerUpdateError {
  @Field(() => String)
  errorCode!: string;

  @Field()
  message!: string;

  constructor(errorCode: SellerErrorCode, message: string) {
    this.errorCode = errorCode;
    this.message = message;
  }
}
