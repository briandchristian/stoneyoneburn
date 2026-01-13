/**
 * Check Products and Channel Assignments
 * 
 * Diagnoses why products might not be showing in the dashboard
 */

import pg from 'pg';
const { Client } = pg;

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 6543),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vendure',
};

const client = new Client(config);

try {
  await client.connect();
  console.log('Connected to database\n');

  // Get default channel
  const channelResult = await client.query(`
    SELECT id, code, token, "defaultLanguageCode", "defaultCurrencyCode"
    FROM channel
    ORDER BY "createdAt" ASC
    LIMIT 1
  `);
  
  if (channelResult.rows.length === 0) {
    console.log('❌ No channels found in database');
    await client.end();
    process.exit(1);
  }

  const defaultChannel = channelResult.rows[0];
  console.log(`📺 Default Channel: ${defaultChannel.code} (ID: ${defaultChannel.id})`);
  console.log(`   Token: ${defaultChannel.token}`);
  console.log(`   Language: ${defaultChannel.defaultLanguageCode}, Currency: ${defaultChannel.defaultCurrencyCode}\n`);

  // Get all products
  const productsResult = await client.query(`
    SELECT p.id, p.enabled, p."createdAt",
           (SELECT json_agg(json_build_object('id', pt.id, 'name', pt.name))
            FROM product_translation pt
            WHERE pt."baseId" = p.id AND pt."languageCode" = $1
            LIMIT 1) as name
    FROM product p
    ORDER BY p."createdAt" DESC
  `, [defaultChannel.defaultLanguageCode]);

  console.log(`📦 Total Products: ${productsResult.rows.length}\n`);

  // Check product-channel assignments
  const productChannelResult = await client.query(`
    SELECT pc."productId", COUNT(*) as channel_count
    FROM product_channels_channel pc
    GROUP BY pc."productId"
  `);

  const productChannelMap = new Map();
  productChannelResult.rows.forEach(row => {
    productChannelMap.set(row.productId.toString(), row.channel_count);
  });

  // Check product variants and their channel assignments
  const variantChannelResult = await client.query(`
    SELECT pv."productId", COUNT(DISTINCT pvc."channelId") as variant_channel_count,
           COUNT(DISTINCT pv.id) as total_variants,
           COUNT(DISTINCT CASE WHEN pv.enabled = true THEN pv.id END) as enabled_variants
    FROM product_variant pv
    LEFT JOIN product_variant_channels_channel pvc ON pvc."productVariantId" = pv.id
    GROUP BY pv."productId"
  `);

  const variantChannelMap = new Map();
  variantChannelResult.rows.forEach(row => {
    variantChannelMap.set(row.productId.toString(), {
      variantChannelCount: row.variant_channel_count,
      totalVariants: row.total_variants,
      enabledVariants: row.enabled_variants
    });
  });

  console.log('📊 Product Analysis:\n');
  console.log('ID'.padEnd(8), 'Name'.padEnd(40), 'Enabled'.padEnd(10), 'Channels'.padEnd(10), 'Variants'.padEnd(15), 'Status');
  console.log('-'.repeat(100));

  let problemsFound = 0;

  for (const product of productsResult.rows) {
    const productId = product.id.toString();
    const name = product.name?.[0]?.name || 'N/A';
    const enabled = product.enabled ? '✅ Yes' : '❌ No';
    const channelCount = productChannelMap.get(productId) || 0;
    const variantInfo = variantChannelMap.get(productId);
    
    const variantStatus = variantInfo 
      ? `${variantInfo.enabledVariants}/${variantInfo.totalVariants} enabled, ${variantInfo.variantChannelCount} channel(s)`
      : 'No variants';
    
    let status = '✅ OK';
    const issues = [];
    
    if (!product.enabled) {
      issues.push('Product disabled');
      status = '❌ Issues';
      problemsFound++;
    }
    if (channelCount === 0) {
      issues.push('Not assigned to any channel');
      status = '❌ Issues';
      problemsFound++;
    }
    if (!variantInfo || variantInfo.totalVariants === 0) {
      issues.push('No variants');
      status = '❌ Issues';
      problemsFound++;
    } else if (variantInfo.enabledVariants === 0) {
      issues.push('No enabled variants');
      status = '❌ Issues';
      problemsFound++;
    } else if (variantInfo.variantChannelCount === 0) {
      issues.push('Variants not assigned to channels');
      status = '❌ Issues';
      problemsFound++;
    }

    console.log(
      productId.padEnd(8),
      (name.length > 38 ? name.substring(0, 35) + '...' : name).padEnd(40),
      enabled.padEnd(10),
      channelCount.toString().padEnd(10),
      variantStatus.padEnd(15),
      status
    );

    if (issues.length > 0) {
      console.log('   Issues:', issues.join(', '));
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log(`\nSummary: ${problemsFound} product(s) with issues\n`);

  if (problemsFound > 0) {
    console.log('💡 Common fixes:');
    console.log('   1. Assign products to the default channel using: assignProductsToChannel mutation');
    console.log('   2. Enable products: updateProduct mutation with enabled: true');
    console.log('   3. Enable product variants: updateProductVariant mutation with enabled: true');
    console.log('   4. Assign variants to channels: assignProductVariantsToChannel mutation');
    console.log('\n   You can do this via GraphQL in the Vendure dashboard or using the Admin API.');
  } else {
    console.log('✅ All products appear to be configured correctly!');
    console.log('   If products still don\'t show, check:');
    console.log('   - You\'re viewing the correct channel in the dashboard');
    console.log('   - Product filters/search settings');
    console.log('   - Permissions on your admin user');
  }

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exitCode = 1;
} finally {
  if (client) {
    try {
      await client.end();
    } catch (closeError) {
      // Ignore close errors
    }
  }
  process.exit(process.exitCode || 0);
}