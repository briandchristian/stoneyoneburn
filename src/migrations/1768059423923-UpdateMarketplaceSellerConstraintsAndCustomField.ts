import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMarketplaceSellerConstraintsAndCustomField1768059423923 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT IF EXISTS "FK_marketplace_seller_customerId"`,
      undefined
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_marketplace_seller_customerId"`,
      undefined
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_marketplace_seller_shopSlug"`,
      undefined
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_marketplace_seller_verificationStatus"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT IF EXISTS "CHK_marketplace_seller_shopName"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT IF EXISTS "CHK_marketplace_seller_shopSlug"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT IF EXISTS "CHK_marketplace_seller_commissionRate"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "customer" ADD "customFieldsMarketplacesellerid" integer`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "customer" ADD "customFields__fix_relational_custom_fields__" boolean`,
      undefined
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "customer"."customFields__fix_relational_custom_fields__" IS 'A work-around needed when only relational custom fields are defined on an entity'`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ALTER COLUMN "createdAt" SET DEFAULT now()`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ALTER COLUMN "updatedAt" SET DEFAULT now()`,
      undefined
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_5e06fa43653e9524f8c9de1b33" ON "marketplace_seller" ("customerId") `,
      undefined
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_855fbc7105b759f0087634ebfb" ON "marketplace_seller" ("verificationStatus") `,
      undefined
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_d8e96b21ee8dea3dfb9468ef2b" ON "marketplace_seller" ("shopSlug") `,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ADD CONSTRAINT "CHK_0d45663e2984a508fdbaa20a87" CHECK ("commissionRate" >= 0 AND "commissionRate" <= 100)`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ADD CONSTRAINT "CHK_4311cc672d903cae363e197281" CHECK ("shopSlug" IS NOT NULL AND LENGTH("shopSlug") >= 3 AND LENGTH("shopSlug") <= 100)`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ADD CONSTRAINT "CHK_d7bac27ed3c4838e5391686876" CHECK ("shopName" IS NOT NULL AND LENGTH("shopName") >= 3 AND LENGTH("shopName") <= 100)`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "customer" ADD CONSTRAINT "FK_c6520b3800a16f5d39d3c196f91" FOREIGN KEY ("customFieldsMarketplacesellerid") REFERENCES "marketplace_seller"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ADD CONSTRAINT "FK_5e06fa43653e9524f8c9de1b331" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      undefined
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT "FK_5e06fa43653e9524f8c9de1b331"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "customer" DROP CONSTRAINT "FK_c6520b3800a16f5d39d3c196f91"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT "CHK_d7bac27ed3c4838e5391686876"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT "CHK_4311cc672d903cae363e197281"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" DROP CONSTRAINT "CHK_0d45663e2984a508fdbaa20a87"`,
      undefined
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_5e06fa43653e9524f8c9de1b33"`, undefined);
    await queryRunner.query(`DROP INDEX "public"."IDX_d8e96b21ee8dea3dfb9468ef2b"`, undefined);
    await queryRunner.query(`DROP INDEX "public"."IDX_855fbc7105b759f0087634ebfb"`, undefined);
    await queryRunner.query(`DROP INDEX "public"."IDX_5e06fa43653e9524f8c9de1b33"`, undefined);
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`,
      undefined
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "customer"."customFields__fix_relational_custom_fields__" IS 'A work-around needed when only relational custom fields are defined on an entity'`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "customer" DROP COLUMN "customFields__fix_relational_custom_fields__"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "customer" DROP COLUMN "customFieldsMarketplacesellerid"`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ADD CONSTRAINT "CHK_marketplace_seller_commissionRate" CHECK ((("commissionRate" >= (0)::numeric) AND ("commissionRate" <= (100)::numeric)))`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ADD CONSTRAINT "CHK_marketplace_seller_shopSlug" CHECK ((("shopSlug" IS NOT NULL) AND (length(("shopSlug")::text) >= 3) AND (length(("shopSlug")::text) <= 100)))`,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ADD CONSTRAINT "CHK_marketplace_seller_shopName" CHECK ((("shopName" IS NOT NULL) AND (length(("shopName")::text) >= 3) AND (length(("shopName")::text) <= 100)))`,
      undefined
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_marketplace_seller_verificationStatus" ON "marketplace_seller" ("verificationStatus") `,
      undefined
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_marketplace_seller_shopSlug" ON "marketplace_seller" ("shopSlug") `,
      undefined
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_marketplace_seller_customerId" ON "marketplace_seller" ("customerId") `,
      undefined
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace_seller" ADD CONSTRAINT "FK_marketplace_seller_customerId" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      undefined
    );
  }
}
