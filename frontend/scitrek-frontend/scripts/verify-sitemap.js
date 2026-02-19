const fs = require('fs');
const path = require('path');

// Define all routes from App.js
const appRoutes = [
  '/login',
  '/',
  '/student_profile',
  '/student_profile/pre_module',
  '/student_profile/post_module',
  '/inbox',
  '/workbooks',
  '/workbooks/:id', // Dynamic route
  '/sections/welcome',
  '/sections/what-youll-learn',
  '/sections/vocabulary',
  '/sections/day-1',
  '/sections/day-2',
  '/sections/day-3',
  '/sections/day-4',
  '/sections/day-5',
];

// Routes in the sitemap
const sitemapRoutes = [
  '/login',
  '/',
  '/student_profile',
  '/student_profile/pre_module',
  '/student_profile/post_module',
  '/inbox',
  '/workbooks',
  '/sections/welcome',
  '/sections/what-youll-learn',
  '/sections/vocabulary',
  '/sections/day-1',
  '/sections/day-2',
  '/sections/day-3',
  '/sections/day-4',
  '/sections/day-5',
];

function verifySitemap() {
  console.log('🔍 Verifying Sitemap Coverage...\n');
  
  // Read the sitemap file
  const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
  let sitemapExists = false;
  
  try {
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    sitemapExists = true;
    console.log('✅ Sitemap file exists at:', sitemapPath);
  } catch (error) {
    console.error('❌ Sitemap file not found!');
    process.exit(1);
  }
  
  // Check robots.txt
  const robotsPath = path.join(__dirname, '../public/robots.txt');
  try {
    const robotsContent = fs.readFileSync(robotsPath, 'utf8');
    if (robotsContent.includes('sitemap.xml')) {
      console.log('✅ Sitemap is referenced in robots.txt');
    } else {
      console.log('⚠️  Warning: Sitemap not referenced in robots.txt');
    }
  } catch (error) {
    console.log('⚠️  Warning: robots.txt not found');
  }
  
  console.log('\n📊 Route Coverage Analysis:\n');
  
  // Static routes that should be in sitemap
  const staticRoutes = appRoutes.filter(route => !route.includes(':'));
  const dynamicRoutes = appRoutes.filter(route => route.includes(':'));
  
  console.log(`Total routes in App.js: ${appRoutes.length}`);
  console.log(`  - Static routes: ${staticRoutes.length}`);
  console.log(`  - Dynamic routes: ${dynamicRoutes.length}`);
  console.log(`\nRoutes in sitemap: ${sitemapRoutes.length}\n`);
  
  // Check for missing static routes
  const missingRoutes = staticRoutes.filter(route => !sitemapRoutes.includes(route));
  
  if (missingRoutes.length === 0) {
    console.log('✅ All static routes are indexed in the sitemap!');
  } else {
    console.log('❌ Missing routes in sitemap:');
    missingRoutes.forEach(route => {
      console.log(`   - ${route}`);
    });
  }
  
  // Check for extra routes in sitemap
  const extraRoutes = sitemapRoutes.filter(route => !appRoutes.includes(route));
  if (extraRoutes.length > 0) {
    console.log('\n⚠️  Extra routes in sitemap (not in App.js):');
    extraRoutes.forEach(route => {
      console.log(`   - ${route}`);
    });
  }
  
  // Dynamic routes info
  if (dynamicRoutes.length > 0) {
    console.log('\n📝 Note: Dynamic routes are not included in sitemap:');
    dynamicRoutes.forEach(route => {
      console.log(`   - ${route} (requires specific IDs to be indexed)`);
    });
    console.log('\n   Dynamic routes like /workbooks/:id need specific IDs to be indexed.');
    console.log('   Consider adding specific workbook URLs if you want them indexed.');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Sitemap verification complete!');
  console.log('='.repeat(60));
  
  // Summary
  console.log('\nSummary:');
  console.log(`  ✓ Static routes indexed: ${sitemapRoutes.length}/${staticRoutes.length}`);
  console.log(`  ✓ Coverage: ${Math.round((sitemapRoutes.length / staticRoutes.length) * 100)}%`);
  
  if (missingRoutes.length === 0 && extraRoutes.length === 0) {
    console.log('\n✅ Perfect! All pages are properly indexed.');
    return true;
  } else {
    return false;
  }
}

verifySitemap();
