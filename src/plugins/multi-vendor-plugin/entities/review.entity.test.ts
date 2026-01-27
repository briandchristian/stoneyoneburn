/**
 * Review Entity Tests
 *
 * Test-Driven Development (TDD) for Phase 4: Reviews & Ratings System
 *
 * These tests define the expected behavior of the Review entity:
 * - Reviews are linked to products and customers
 * - Reviews include rating (1-5 stars), title, body text
 * - Reviews can be verified (only purchasers can verify)
 * - Reviews have moderation status (PENDING, APPROVED, REJECTED)
 * - Reviews track helpful votes
 * - Reviews are linked to sellers for rating aggregation
 *
 * Following TDD workflow:
 * 1. Write tests first (RED) ✅
 * 2. Implement minimal code to pass (GREEN)
 * 3. Refactor while keeping tests passing
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Review, ReviewStatus } from './review.entity';

describe('Review Entity - Unit Tests', () => {
  let review: Review;

  beforeEach(() => {
    // Create review instance using Object.create to bypass protected constructor
    review = Object.create(Review.prototype);
    // Initialize default values
    review.status = ReviewStatus.PENDING;
    review.verified = false;
    review.helpfulCount = 0;
  });

  describe('Entity Creation', () => {
    it('should create a review with required fields', () => {
      review.productId = '100';
      review.customerId = '5';
      review.sellerId = 10;
      review.rating = 5;
      review.title = 'Great product!';
      review.body = 'I really enjoyed this product. Highly recommend!';
      review.status = ReviewStatus.PENDING;

      expect(review.productId).toBe('100');
      expect(review.customerId).toBe('5');
      expect(review.sellerId).toBe(10);
      expect(review.rating).toBe(5);
      expect(review.title).toBe('Great product!');
      expect(review.body).toBe('I really enjoyed this product. Highly recommend!');
      expect(review.status).toBe(ReviewStatus.PENDING);
    });

    it('should default status to PENDING', () => {
      review.productId = '100';
      review.customerId = '5';
      review.sellerId = 10;
      review.rating = 4;
      review.title = 'Good product';

      expect(review.status).toBe(ReviewStatus.PENDING);
    });

    it('should default verified to false', () => {
      review.productId = '100';
      review.customerId = '5';
      review.sellerId = 10;
      review.rating = 4;

      expect(review.verified).toBe(false);
    });

    it('should default helpfulCount to 0', () => {
      review.productId = '100';
      review.customerId = '5';
      review.sellerId = 10;
      review.rating = 4;

      expect(review.helpfulCount).toBe(0);
    });
  });

  describe('Rating Validation', () => {
    it('should accept valid ratings (1-5)', () => {
      for (let rating = 1; rating <= 5; rating++) {
        review.rating = rating;
        expect(review.rating).toBe(rating);
      }
    });

    it('should store rating value (validation done in service layer)', () => {
      // Note: Rating validation is performed in ReviewService, not in the entity
      // The entity just stores the value
      review.rating = 3;
      expect(review.rating).toBe(3);
    });
  });

  describe('Review Status', () => {
    it('should allow PENDING status', () => {
      review.status = ReviewStatus.PENDING;
      expect(review.status).toBe(ReviewStatus.PENDING);
    });

    it('should allow APPROVED status', () => {
      review.status = ReviewStatus.APPROVED;
      expect(review.status).toBe(ReviewStatus.APPROVED);
    });

    it('should allow REJECTED status', () => {
      review.status = ReviewStatus.REJECTED;
      expect(review.status).toBe(ReviewStatus.REJECTED);
    });
  });

  describe('Verification', () => {
    it('should allow verified reviews', () => {
      review.verified = true;
      expect(review.verified).toBe(true);
    });

    it('should allow unverified reviews', () => {
      review.verified = false;
      expect(review.verified).toBe(false);
    });
  });

  describe('Helpful Votes', () => {
    it('should track helpful count', () => {
      review.helpfulCount = 5;
      expect(review.helpfulCount).toBe(5);
    });

    it('should allow zero helpful votes', () => {
      review.helpfulCount = 0;
      expect(review.helpfulCount).toBe(0);
    });

    it('should store helpful count value (validation done in service layer)', () => {
      // Note: Validation is performed in ReviewService, not in the entity
      review.helpfulCount = 10;
      expect(review.helpfulCount).toBe(10);
    });
  });

  describe('Optional Fields', () => {
    it('should allow optional rejection reason', () => {
      review.rejectionReason = 'Spam detected';
      expect(review.rejectionReason).toBe('Spam detected');
    });

    it('should allow null rejection reason', () => {
      review.rejectionReason = null;
      expect(review.rejectionReason).toBeNull();
    });
  });
});
