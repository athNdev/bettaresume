const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 15000;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  console.log('🧪 Comprehensive Navigation Test\n');
  console.log('='.repeat(50));
  
  let browser;
  let passed = 0;
  let failed = 0;
  
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Collect console errors
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
        pageErrors.push(msg.text());
      }
    });
    
    // Clear localStorage first
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.evaluate(() => localStorage.clear());
    
    // TEST 1: Dashboard loads
    console.log('\n📋 TEST 1: Dashboard loads');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(4000); // Wait for hydration and auth
    
    let text = await page.evaluate(() => document.body.innerText);
    
    if (text.includes('Loading Betta Resume') || text.includes('Loading your resumes')) {
      console.log('   ❌ STUCK on loading spinner');
      console.log('   Content:', text.substring(0, 200));
      failed++;
    } else if (text.includes('Betta Resume')) {
      console.log('   ✅ Dashboard loaded successfully');
      passed++;
    } else {
      console.log('   ❌ Unexpected content:', text.substring(0, 200));
      failed++;
    }
    
    // TEST 2: Create a resume
    console.log('\n📋 TEST 2: Create a resume');
    const createClicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => 
        b.innerText.includes('Create Resume') || b.innerText.includes('Create')
      );
      if (btn) { btn.click(); return true; }
      return false;
    });
    
    if (!createClicked) {
      console.log('   ❌ Could not find Create button');
      failed++;
    } else {
      await sleep(3000);
      const url = page.url();
      if (url.includes('/editor/')) {
        console.log('   ✅ Navigated to editor:', url);
        passed++;
      } else {
        console.log('   ❌ Did not navigate to editor, URL:', url);
        failed++;
      }
    }
    
    // TEST 3: Editor page loads without errors
    console.log('\n📋 TEST 3: Editor page loads');
    await sleep(3000);
    text = await page.evaluate(() => document.body.innerText);
    
    if (text.includes('Loading resume')) {
      console.log('   ❌ STUCK on "Loading resume..."');
      failed++;
    } else if (text.includes('Cannot find module') || text.includes('Runtime Error')) {
      console.log('   ❌ RUNTIME ERROR detected');
      console.log('   Content:', text.substring(0, 300));
      failed++;
    } else if (text.includes('Personal Info') || text.includes('Resume')) {
      console.log('   ✅ Editor loaded successfully');
      passed++;
    } else {
      console.log('   ⚠️ Unexpected content:', text.substring(0, 200));
      // Check if there's any error visible
      const hasError = await page.evaluate(() => {
        return document.body.innerHTML.includes('error') || 
               document.body.innerHTML.includes('Error') ||
               document.body.innerHTML.includes('ENOENT');
      });
      if (hasError) {
        console.log('   ❌ Error detected in page');
        failed++;
      } else {
        passed++;
      }
    }
    
    // TEST 4: Navigate back to dashboard
    console.log('\n📋 TEST 4: Navigate back to dashboard');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await sleep(3000);
    
    text = await page.evaluate(() => document.body.innerText);
    if (text.includes('Loading Betta Resume') || text.includes('Loading your resumes')) {
      console.log('   ❌ STUCK on loading');
      failed++;
    } else if (text.includes('1 resume') || text.includes('Betta Resume')) {
      console.log('   ✅ Dashboard shows resume');
      passed++;
    } else {
      console.log('   ❌ Unexpected:', text.substring(0, 200));
      failed++;
    }
    
    // TEST 5: Click on existing resume to open it
    console.log('\n📋 TEST 5: Open existing resume');
    const cardClicked = await page.evaluate(() => {
      const card = document.querySelector('div.group');
      if (card) { card.click(); return true; }
      return false;
    });
    
    if (!cardClicked) {
      console.log('   ❌ Could not find resume card');
      failed++;
    } else {
      await sleep(3000);
      const url = page.url();
      text = await page.evaluate(() => document.body.innerText);
      
      if (text.includes('Cannot find module') || text.includes('Runtime Error') || text.includes('ENOENT')) {
        console.log('   ❌ RUNTIME ERROR when opening resume!');
        console.log('   Error:', text.substring(0, 400));
        failed++;
      } else if (text.includes('Loading resume')) {
        console.log('   ❌ STUCK on loading');
        failed++;
      } else if (url.includes('/editor/') && (text.includes('Personal Info') || text.includes('Resume'))) {
        console.log('   ✅ Resume opened successfully');
        passed++;
      } else {
        console.log('   ⚠️ URL:', url);
        console.log('   Content:', text.substring(0, 200));
        failed++;
      }
    }
    
    // Check for any page errors collected
    if (pageErrors.length > 0) {
      console.log('\n⚠️ Page errors detected:');
      pageErrors.slice(0, 5).forEach(e => console.log('   -', e.substring(0, 100)));
    }
    
  } catch (error) {
    console.log('\n❌ Test crashed:', error.message);
    failed++;
  } finally {
    if (browser) await browser.close();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
