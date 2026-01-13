/**
 * Diagnose Dashboard Product Visibility Issue
 * 
 * Checks why products aren't showing in the dashboard
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

  // Check if server is running
  console.log('🔍 Checking if Vendure server is running...');
  try {
    const response = await fetch('http://localhost:3000/admin-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ __typename }'
      })
    });
    if (response.ok) {
      console.log('✅ Vendure server is running on port 3000\n');
    } else {
      console.log('⚠️  Vendure server responded with status:', response.status, '\n');
    }
  } catch (error) {
    console.log('❌ Vendure server is NOT running or not accessible');
    console.log('   Error:', error.message);
    console.log('   Make sure to start the server with: npm run dev\n');
  }

  // Get all channels
  const channelsResult = await client.query(`
    SELECT id, code, token, "defaultLanguageCode", "defaultCurrencyCode"
    FROM channel
    ORDER BY "createdAt" ASC
  `);
  
  console.log(`📺 Channels (${channelsResult.rows.length}):`);
  channelsResult.rows.forEach(ch => {
    console.log(`   - ${ch.code} (ID: ${ch.id}, Token: ${ch.token})`);
  });
  console.log('');

  // Count products by channel assignment
  for (const channel of channelsResult.rows) {
    const productCountResult = await client.query(`
      SELECT COUNT(DISTINCT pc."productId") as product_count
      FROM product_channels_channel pc
      WHERE pc."channelId" = $1
    `, [channel.id]);

    const variantCountResult = await client.query(`
      SELECT COUNT(DISTINCT pvc."productVariantId") as variant_count
      FROM product_variant_channels_channel pvc
      WHERE pvc."channelId" = $1
    `, [channel.id]);

    console.log(`   Channel "${channel.code}":`);
    console.log(`      - Products assigned: ${productCountResult.rows[0].product_count}`);
    console.log(`      - Variants assigned: ${variantCountResult.rows[0].variant_count}`);
  }
  console.log('');

  // Detailed product-channel analysis
  const defaultChannel = channelsResult.rows[0];
  console.log(`📊 Detailed Analysis for Channel: ${defaultChannel.code}\n`);

  // Get products with their channel assignments
  const productsAnalysis = await client.query(`
    SELECT 
      p.id,
      p.enabled as product_enabled,
      (SELECT COUNT(*) FROM product_channels_channel pc WHERE pc."productId" = p.id) as channel_count,
      (SELECT COUNT(*) FROM product_variant pv WHERE pv."productId" = p.id) as total_variants,
      (SELECT COUNT(*) FROM product_variant pv 
       WHERE pv."productId" = p.id AND pv.enabled = true) as enabled_variants,
      (SELECT COUNT(DISTINCT pvc."channelId") 
       FROM product_variant pv
       JOIN product_variant_channels_channel pvc ON pvc."productVariantId" = pv.id
       WHERE pv."productId" = p.id AND pv.enabled = true) as variant_channels
    FROM product p
    ORDER BY p.id DESC
    LIMIT 10
  `);

  console.log('Recent Products Analysis:');
  console.log('ID'.padEnd(8), 'Prod Enabled'.padEnd(14), 'Channels'.padEnd(10), 'Variants'.padEnd(15), 'Variant Channels'.padEnd(18), 'Status');
  console.log('-'.repeat(90));

  for (const prod of productsAnalysis.rows) {
    const issues = [];
    let status = '✅ OK';
    
    if (!prod.product_enabled) issues.push('Product disabled');
    if (prod.channel_count === 0) issues.push('No channels');
    if (prod.total_variants === 0) issues.push('No variants');
    if (prod.enabled_variants === 0) issues.push('No enabled variants');
    if (prod.enabled_variants > 0 && prod.variant_channels === 0) issues.push('Variants not in channels');
    
    if (issues.length > 0) status = '❌ ' + issues.join(', ');

    console.log(
      prod.id.toString().padEnd(8),
      (prod.product_enabled ? '✅' : '❌').padEnd(14),
      prod.channel_count.toString().padEnd(10),
      `${prod.enabled_variants}/${prod.total_variants}`.padEnd(15),
      prod.variant_channels.toString().padEnd(18),
      status
    );
  }

  console.log('\n' + '='.repeat(90));
  console.log('\n💡 Troubleshooting Steps:\n');
  console.log('1. Make sure Vendure server is running: npm run dev');
  console.log('2. Access dashboard at: http://localhost:3000/dashboard');
  console.log('3. Check you\'re logged in as an admin user');
  console.log('4. Verify you\'re viewing the correct channel in the dashboard');
  console.log('5. Check dashboard filters/search - they might be hiding products');
  console.log('6. Try refreshing the dashboard (Ctrl+F5 or Cmd+Shift+R)');
  console.log('7. Check browser console for any JavaScript errors');
  console.log('\n📝 If products still don\'t show:');
  console.log('   - Check Vendure server logs for errors');
  console.log('   - Verify admin user has proper permissions');
  console.log('   - Try querying products directly via GraphQL at http://localhost:3000/admin-api');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
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