/**
 * Full Navigation Test Script
 * 
 * Tests all navigation paths and loading states
 */

const puppeteer = require('puppeteer');
const http = require('http');

const PORTS_TO_TRY = [3000, 3001];
const TIMEOUT = 20000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function findActivePort() {
  for (const port of PORTS_TO_TRY) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 307) {
            resolve(port);
          } else {
            reject();
          }
        });
        req.on('error', reject);
        req.setTimeout(2000, () => reject());
      });
      return port;
    } catch {
      continue;
    }
  }
  return null;
}

async function waitForNoLoading(page, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const isLoading = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('Loading your resumes') || 
             body.includes('Loading resume') ||
             body.includes('Loading Betta Resume') ||
             (body.includes('Loading...') && !body.includes('Resume not found'));
    });
    
    if (!isLoading) return true;
    await sleep(250);
  }
  
  return false;
}

async function main() {
  console.log('🧪 Full Navigation Test\n');
  console.log('='.repeat(50));
  
  // Find active port
  const port = await findActivePort();
  if (!port) {
    console.error('❌ No dev server running on ports 3000 or 3001');
    console.error('   Run "npm run dev" first');
    process.exit(1);
  }
  
  const DEV_URL = `http://localhost:${port}`;
  console.log(`✅ Dev server found at ${DEV_URL}\n`);
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
  });
  
  const page = await browser.newPage();
  const results = [];
  
  // Collect errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('404')) {
      errors.push(msg.text());
    }
  });
  
  try {
    // TEST 1: Dashboard loads
    console.log('📋 TEST 1: Dashboard loads');
    await page.goto(`${DEV_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    const dashLoaded = await waitForNoLoading(page);
    results.push({ test: 'Dashboard loads', passed: dashLoaded });
    console.log(`   ${dashLoaded ? '✅' : '❌'} Dashboard ${dashLoaded ? 'loaded' : 'STUCK ON LOADING'}\n`);
    
    if (!dashLoaded) {
      // Debug info
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 200));
      console.log(`   Body text: ${bodyText}`);
      throw new Error('Dashboard stuck on loading');
    }
    
    // TEST 2: Create new resume
    console.log('📋 TEST 2: Create new resume');
    const createBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('New') || b.textContent.includes('+'));
    });
    
    if (createBtn && await createBtn.asElement()) {
      await createBtn.click();
      await sleep(1500);
      const isOnEditor = page.url().includes('/editor/');
      results.push({ test: 'Create resume', passed: isOnEditor });
      console.log(`   ${isOnEditor ? '✅' : '❌'} ${isOnEditor ? 'Navigated to editor' : 'Failed to navigate'}\n`);
      
      if (isOnEditor) {
        // TEST 3: Editor loads
        console.log('📋 TEST 3: Editor loads');
        const editorLoaded = await waitForNoLoading(page);
        results.push({ test: 'Editor loads', passed: editorLoaded });
        console.log(`   ${editorLoaded ? '✅' : '❌'} Editor ${editorLoaded ? 'loaded' : 'STUCK'}\n`);
        
        // Go back to dashboard
        await page.goto(`${DEV_URL}/dashboard`, { waitUntil: 'networkidle2' });
        await waitForNoLoading(page);
      }
    } else {
      console.log('   ⚠️ Create button not found, checking for existing resumes\n');
    }
    
    // TEST 4: Click existing resume
    console.log('📋 TEST 4: Open existing resume');
    const cards = await page.$$('[class*="Card"].cursor-pointer, .group.cursor-pointer');
    if (cards.length > 0) {
      await cards[0].click();
      await sleep(1500);
      
      const isOnEditor = page.url().includes('/editor/');
      results.push({ test: 'Open existing resume', passed: isOnEditor });
      console.log(`   ${isOnEditor ? '✅' : '❌'} ${isOnEditor ? 'Navigated to editor' : 'Failed to navigate'}`);
      
      if (isOnEditor) {
        const editorLoaded = await waitForNoLoading(page);
        results.push({ test: 'Resume editor loads', passed: editorLoaded });
        console.log(`   ${editorLoaded ? '✅' : '❌'} Resume ${editorLoaded ? 'loaded' : 'STUCK'}\n`);
        
        // TEST 5: Navigate back to dashboard
        console.log('📋 TEST 5: Navigate back to dashboard');
        await page.goto(`${DEV_URL}/dashboard`, { waitUntil: 'networkidle2' });
        const backLoaded = await waitForNoLoading(page);
        results.push({ test: 'Back to dashboard', passed: backLoaded });
        console.log(`   ${backLoaded ? '✅' : '❌'} Dashboard ${backLoaded ? 'reloaded' : 'STUCK'}\n`);
      }
    } else {
      console.log('   ⚠️ No resume cards found\n');
      results.push({ test: 'Open existing resume', passed: true, skipped: true });
    }
    
    // TEST 6: Non-existent resume shows error
    console.log('📋 TEST 6: Non-existent resume shows error');
    await page.goto(`${DEV_URL}/editor/non-existent-id`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    const showsNotFound = await page.evaluate(() => {
      return document.body.innerText.includes('Resume not found') ||
             document.body.innerText.includes('not found');
    });
    results.push({ test: 'Shows not found', passed: showsNotFound });
    console.log(`   ${showsNotFound ? '✅' : '❌'} ${showsNotFound ? 'Shows error message' : 'Missing error message'}\n`);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log('📊 RESULTS\n');
  
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  
  results.forEach(r => {
    const icon = r.skipped ? '⏭️' : (r.passed ? '✅' : '❌');
    console.log(`${icon} ${r.test}`);
  });
  
  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Console errors:');
    errors.slice(0, 5).forEach(e => console.log(`   - ${e.substring(0, 100)}`));
  }
  
  console.log('\n🔚 Closing in 3 seconds...');
  await sleep(3000);
  await browser.close();
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
