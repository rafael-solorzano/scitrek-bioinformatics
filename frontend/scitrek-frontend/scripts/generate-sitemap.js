const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

// Define your base URL - use production URL
const BASE_URL = 'https://sci-trek.org';

// Define all routes from your App.js
// These are the public and accessible routes
const routes = [
  // Public routes
  { url: '/login', changefreq: 'monthly', priority: 0.8 },
  
  // Main authenticated routes
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/student_profile', changefreq: 'weekly', priority: 0.9 },
  { url: '/student_profile/pre_module', changefreq: 'monthly', priority: 0.7 },
  { url: '/student_profile/post_module', changefreq: 'monthly', priority: 0.7 },
  { url: '/inbox', changefreq: 'daily', priority: 0.8 },
  { url: '/workbooks', changefreq: 'weekly', priority: 0.9 },
  
  // Section routes
  { url: '/sections/welcome', changefreq: 'monthly', priority: 0.8 },
  { url: '/sections/what-youll-learn', changefreq: 'monthly', priority: 0.8 },
  { url: '/sections/vocabulary', changefreq: 'monthly', priority: 0.8 },
  { url: '/sections/day-1', changefreq: 'monthly', priority: 0.8 },
  { url: '/sections/day-2', changefreq: 'monthly', priority: 0.8 },
  { url: '/sections/day-3', changefreq: 'monthly', priority: 0.8 },
  { url: '/sections/day-4', changefreq: 'monthly', priority: 0.8 },
  { url: '/sections/day-5', changefreq: 'monthly', priority: 0.8 },
];

async function generateSitemap() {
  try {
    // Create a stream to write to
    const stream = new SitemapStream({ hostname: BASE_URL });

    // Generate sitemap
    const data = await streamToPromise(
      Readable.from(routes).pipe(stream)
    );

    // Write sitemap to public folder
    const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(sitemapPath, data.toString());

    console.log('Sitemap generated successfully!');
    console.log(`Location: ${sitemapPath}`);
    console.log(`Total URLs indexed: ${routes.length}`);
    console.log('\nIndexed pages:');
    routes.forEach((route, index) => {
      console.log(`  ${index + 1}. ${BASE_URL}${route.url} (priority: ${route.priority})`);
    });
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();
