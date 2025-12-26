/**
 * Debug Loading Issues Script
 * 
 * Uses Puppeteer to automatically detect and report loading issues
 */

const puppeteer = require('puppeteer');

const DEV_URL = 'http://localhost:3000';
const TIMEOUT = 15000; // 15 seconds max wait

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function debugLoading() {
  console.log('🔍 Starting loading debug session...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error') {
      console.log('❌ Console Error:', msg.text());
    } else if (type === 'warn') {
      console.log('⚠️ Console Warning:', msg.text());
    } else if (msg.text().includes('hydrat') || msg.text().includes('Hydrat')) {
      console.log('💧 Hydration:', msg.text());
    }
  });

  // Check for page errors
  page.on('pageerror', error => {
    console.log('❌ Page Error:', error.message);
  });

  try {
    console.log('📄 Navigating to dashboard...');
    await page.goto(`${DEV_URL}/dashboard`, { waitUntil: 'networkidle0', timeout: TIMEOUT });
    
    // Wait a bit for React to hydrate
    await sleep(3000);
    
    // Check if we're stuck on loading
    const loadingText = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('Loading your resumes') || body.includes('Loading...');
    });
    
    if (loadingText) {
      console.log('⏳ STUCK ON LOADING SCREEN!');
      
      // Debug: Check Zustand store state
      const storeState = await page.evaluate(() => {
        // Try to access the store from window (if exposed) or localStorage
        const stored = localStorage.getItem('betta-resume-storage');
        return {
          localStorage: stored ? JSON.parse(stored) : null,
          localStorageRaw: stored?.substring(0, 500),
        };
      });
      
      console.log('\n📦 LocalStorage state:');
      console.log(JSON.stringify(storeState, null, 2));
      
      // Check what's in the DOM
      const bodyContent = await page.evaluate(() => document.body.innerHTML.substring(0, 1000));
      console.log('\n📄 Body content (first 1000 chars):');
      console.log(bodyContent);
      
      return { success: false, issue: 'stuck-on-loading', storeState };
    }
    
    console.log('✅ Dashboard loaded successfully!');
    
    // Check if resumes are visible
    const resumeCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="Card"]');
      return cards.length;
    });
    
    console.log(`📝 Found ${resumeCount} resume cards`);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    return { success: false, error: error.message };
  } finally {
    console.log('\n🔚 Debug session complete. Closing browser in 5 seconds...');
    await sleep(5000);
    await browser.close();
  }
}

debugLoading().then(result => {
  console.log('\n📊 Final Result:', result);
  process.exit(result.success ? 0 : 1);
});
