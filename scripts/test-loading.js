/**
 * Auto-fix Loading Issues Script
 * 
 * Uses Puppeteer to automatically detect loading issues and provides fixes
 */

const puppeteer = require('puppeteer');
const http = require('http');

const DEV_URL = 'http://localhost:3000';
const TIMEOUT = 20000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function waitForServer(url, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      console.log(`⏳ Waiting for dev server... (attempt ${attempts}/${maxAttempts})`);
      
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304) {
          resolve();
        } else if (attempts < maxAttempts) {
          setTimeout(check, interval);
        } else {
          reject(new Error('Server did not respond with success'));
        }
      }).on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, interval);
        } else {
          reject(new Error('Max attempts reached waiting for server'));
        }
      });
    };
    
    check();
  });
}

async function testLoading(page, url, name) {
  console.log(`\n📄 Testing: ${name} (${url})`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    
    // Wait up to 5 seconds for content to load
    let attempts = 0;
    let isLoading = true;
    
    while (isLoading && attempts < 10) {
      await sleep(500);
      attempts++;
      
      isLoading = await page.evaluate(() => {
        const body = document.body.innerText;
        return body.includes('Loading your resumes') || 
               body.includes('Loading resume') ||
               body.includes('Loading Betta Resume') ||
               body.includes('Loading...');
      });
      
      if (isLoading) {
        console.log(`   ⏳ Still loading... (${attempts * 500}ms)`);
      }
    }
    
    if (isLoading) {
      console.log(`   ❌ STUCK on loading after ${attempts * 500}ms`);
      
      // Debug info
      const debugInfo = await page.evaluate(() => {
        const stored = localStorage.getItem('betta-resume-storage');
        let parsed = null;
        try {
          parsed = stored ? JSON.parse(stored) : null;
        } catch (e) {
          return { error: 'Failed to parse localStorage', raw: stored?.substring(0, 200) };
        }
        return {
          hasStorage: !!stored,
          resumeCount: parsed?.state?.resumes?.length || 0,
          hasHydrated: parsed?.state?._hasHydrated,
          activeResumeId: parsed?.state?.activeResumeId,
        };
      });
      
      console.log('   📦 Debug info:', JSON.stringify(debugInfo));
      return { success: false, stuck: true, debugInfo };
    }
    
    console.log(`   ✅ Loaded successfully in ${attempts * 500}ms`);
    
    // Check for content
    const hasContent = await page.evaluate(() => {
      return document.querySelectorAll('[class*="Card"]').length > 0 ||
             document.body.innerText.includes('No resumes') ||
             document.body.innerText.includes('Create your first');
    });
    
    console.log(`   📝 Has content: ${hasContent}`);
    
    return { success: true, hasContent };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Auto-fix Loading Issues\n');
  console.log('=' .repeat(50));
  
  // Wait for server
  try {
    await waitForServer(DEV_URL);
    console.log('✅ Dev server is ready!\n');
  } catch (err) {
    console.error('❌ Could not connect to dev server');
    console.error('   Run "npm run dev" first');
    process.exit(1);
  }
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });
  
  const page = await browser.newPage();
  
  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });
  
  const results = {
    dashboard: null,
    editor: null,
    errors: [],
  };
  
  try {
    // Test 1: Dashboard
    results.dashboard = await testLoading(page, `${DEV_URL}/dashboard`, 'Dashboard');
    
    // Test 2: Try to open an editor if there are resumes
    if (results.dashboard.success && results.dashboard.hasContent) {
      // Click first resume card
      const hasCards = await page.evaluate(() => {
        const cards = document.querySelectorAll('.cursor-pointer');
        return cards.length > 0;
      });
      
      if (hasCards) {
        console.log('\n🖱️  Clicking first resume card...');
        await page.click('.cursor-pointer');
        await sleep(1000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/editor/')) {
          results.editor = await testLoading(page, currentUrl, 'Editor');
        }
      }
    }
    
    // Test 3: Direct editor with non-existent ID
    console.log('\n📄 Testing: Editor with non-existent ID');
    await page.goto(`${DEV_URL}/editor/non-existent-id`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(2000);
    
    const showsNotFound = await page.evaluate(() => {
      return document.body.innerText.includes('Resume not found') ||
             document.body.innerText.includes('not found');
    });
    
    console.log(`   📝 Shows "not found": ${showsNotFound}`);
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
  
  results.errors = errors;
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RESULTS SUMMARY\n');
  console.log('Dashboard:', results.dashboard?.success ? '✅ PASS' : '❌ FAIL');
  console.log('Editor:', results.editor ? (results.editor.success ? '✅ PASS' : '❌ FAIL') : '⏭️  SKIPPED');
  
  if (errors.length > 0) {
    console.log('\n⚠️  Console Errors:');
    errors.forEach(e => console.log(`   - ${e}`));
  }
  
  console.log('\n🔚 Closing browser in 3 seconds...');
  await sleep(3000);
  await browser.close();
  
  const allPassed = results.dashboard?.success && (!results.editor || results.editor.success);
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
