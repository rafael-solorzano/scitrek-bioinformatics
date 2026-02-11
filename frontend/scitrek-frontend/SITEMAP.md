# Sitemap Documentation

## Overview

This project uses an automated sitemap generation system to help search engines discover and index all pages of the SciTrek website.

## Files

- **`public/sitemap.xml`** - The generated sitemap file (served at https://sci-trek.org/sitemap.xml)
- **`public/robots.txt`** - Robot exclusion file that references the sitemap
- **`scripts/generate-sitemap.js`** - Script that generates the sitemap
- **`scripts/verify-sitemap.js`** - Script that verifies sitemap coverage

## Available Commands

### Generate Sitemap
```bash
npm run generate-sitemap
```
Generates a fresh sitemap based on all routes defined in the application.

### Verify Sitemap
```bash
npm run verify-sitemap
```
Checks that all pages from `App.js` are properly indexed in the sitemap.

### Automatic Generation
The sitemap is automatically regenerated before each production build via the `prebuild` script.

## Current Sitemap Coverage

✅ **15 static routes indexed** (100% coverage)

### Indexed Pages:

1. `/login` - Login page
2. `/` - Home page (authenticated)
3. `/student_profile` - Student profile page
4. `/student_profile/pre_module` - Pre-module quiz
5. `/student_profile/post_module` - Post-module quiz
6. `/inbox` - Student inbox
7. `/workbooks` - Workbook list
8. `/sections/welcome` - Welcome section
9. `/sections/what-youll-learn` - What You'll Learn section
10. `/sections/vocabulary` - Important Vocabulary section
11. `/sections/day-1` - Day 1 content
12. `/sections/day-2` - Day 2 content
13. `/sections/day-3` - Day 3 content
14. `/sections/day-4` - Day 4 content
15. `/sections/day-5` - Day 5 content

### Dynamic Routes (Not Indexed)

The following dynamic routes require specific IDs and are not included in the static sitemap:
- `/workbooks/:id` - Individual workbook pages

**Note:** If you want specific workbook pages indexed, you'll need to add them manually to `scripts/generate-sitemap.js` with actual workbook IDs.

## SEO Configuration

### Priority Levels
- `1.0` - Home page (highest priority)
- `0.9` - Core features (student profile, workbooks)
- `0.8` - Important pages (login, sections, inbox)
- `0.7` - Secondary pages (quizzes)

### Change Frequency
- `daily` - Home page, inbox
- `weekly` - Student profile, workbooks
- `monthly` - Static content, sections, quizzes

## Adding New Routes

When you add new routes to `App.js`, update `scripts/generate-sitemap.js`:

```javascript
const routes = [
  // ... existing routes ...
  { url: '/new-page', changefreq: 'weekly', priority: 0.8 },
];
```

Then regenerate and verify:
```bash
npm run generate-sitemap
npm run verify-sitemap
```

## Deployment

The sitemap is automatically generated during the build process (`npm run build`), so you don't need to manually generate it before deploying.

### Production URL
- Base URL: https://sci-trek.org
- Sitemap URL: https://sci-trek.org/sitemap.xml

## Verification Checklist

After adding new routes:
1. ✅ Update `scripts/generate-sitemap.js` with new routes
2. ✅ Run `npm run generate-sitemap`
3. ✅ Run `npm run verify-sitemap` to check coverage
4. ✅ Commit the updated `sitemap.xml` to version control
5. ✅ Deploy to production
6. ✅ Test sitemap is accessible at https://sci-trek.org/sitemap.xml
7. ✅ Submit sitemap to Google Search Console

## Search Engine Submission

### Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property for https://sci-trek.org
3. Go to Sitemaps section
4. Submit: `https://sci-trek.org/sitemap.xml`

### Bing Webmaster Tools
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add your site
3. Submit sitemap: `https://sci-trek.org/sitemap.xml`

## Troubleshooting

### Sitemap not generating
```bash
# Check if the scripts directory exists
ls scripts/

# Ensure sitemap package is installed
npm list sitemap

# Reinstall if needed
npm install --save-dev sitemap
```

### Routes missing from sitemap
Run the verification script to see which routes are missing:
```bash
npm run verify-sitemap
```

### Sitemap not accessible in production
- Ensure `sitemap.xml` is in the `public/` folder
- Verify it's not in `.gitignore`
- Check that it's deployed to the production server
- Test accessibility: `curl https://sci-trek.org/sitemap.xml`

## Best Practices

1. **Keep sitemap updated** - Regenerate after adding/removing routes
2. **Verify coverage** - Always run `npm run verify-sitemap` after changes
3. **Monitor indexing** - Check Google Search Console regularly
4. **Update priorities** - Adjust priority values based on page importance
5. **Consider dynamic content** - If you have many dynamic pages (e.g., workbooks), consider implementing a dynamic sitemap generator or adding specific URLs

## Additional Resources

- [Sitemaps.org](https://www.sitemaps.org/)
- [Google Search Central - Sitemaps](https://developers.google.com/search/docs/advanced/sitemaps/overview)
- [sitemap npm package](https://www.npmjs.com/package/sitemap)
