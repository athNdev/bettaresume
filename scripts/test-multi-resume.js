const puppeteer = require('puppeteer');

async function testMultipleResumes() {
  console.log('🧪 Testing Multiple Resume Navigation\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Let's see what's happening
    slowMo: 100 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  
  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Download the React DevTools') && !text.includes('[Fast Refresh]')) {
      console.log('  [PAGE]', text);
    }
  });
  
  try {
    // Clear localStorage first
    console.log('Clearing localStorage...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Reload to start fresh
    console.log('Starting fresh...\n');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), { timeout: 10000 });
    
    // Create 3 resumes
    for (let i = 1; i <= 3; i++) {
      console.log(`Creating resume ${i}...`);
      
      // Wait a moment for the page to be ready
      await new Promise(r => setTimeout(r, 500));
      
      // Find and click the Create Resume button
      const createClicked = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')];
        const createBtn = buttons.find(b => b.innerText.includes('Create Resume') || b.innerText.includes('Create'));
        if (createBtn) {
          createBtn.click();
          return true;
        }
        return false;
      });
      
      if (!createClicked) {
        console.log('⚠️ Could not find Create button');
        continue;
      }
      
      await page.waitForFunction(() => window.location.pathname.includes('/editor/'), { timeout: 5000 });
      await page.waitForFunction(() => !document.body.innerText.includes('Loading resume'), { timeout: 10000 });
      console.log(`✅ Resume ${i} created`);
      
      // Go back to dashboard
      await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.body.innerText.includes('Loading'), { timeout: 10000 });
      await new Promise(r => setTimeout(r, 500));
    }
    
    console.log('\n--- Testing navigation between resumes ---\n');
    
    // Now try clicking on resumes
    const resumeCount = await page.evaluate(() => {
      return document.querySelectorAll('div.group').length;
    });
    console.log(`Found ${resumeCount} resume cards`);
    
    for (let i = 0; i < resumeCount; i++) {
      console.log(`\nClicking resume card ${i + 1}...`);
      
      // Re-query the cards each time since DOM may have changed
      const cards = await page.$$('div.group');
      if (cards[i]) {
        await cards[i].click();
        
        // Wait for navigation
        try {
          await page.waitForFunction(() => window.location.pathname.includes('/editor/'), { timeout: 5000 });
          console.log(`✅ Navigated to editor: ${page.url()}`);
          
          // Check if editor loaded
          await page.waitForFunction(() => !document.body.innerText.includes('Loading resume'), { timeout: 10000 });
          console.log(`✅ Editor content loaded`);
        } catch (e) {
          console.log(`❌ STUCK! Error: ${e.message}`);
          console.log(`Current URL: ${page.url()}`);
          const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
          console.log('Page content:', bodyText);
          
          // Check for any spinners
          const spinnerInfo = await page.evaluate(() => {
            const spinners = document.querySelectorAll('.animate-spin');
            return spinners.length > 0 ? `${spinners.length} spinners found` : 'No spinners';
          });
          console.log('Spinners:', spinnerInfo);
          
          // Take screenshot
          await page.screenshot({ path: '../temp/stuck-screenshot.png' });
          console.log('Screenshot saved to temp/stuck-screenshot.png');
          
          break;
        }
        
        // Go back to dashboard
        await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), { timeout: 10000 });
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    console.log('\n✨ Test completed! Waiting before closing...');
    await new Promise(r => setTimeout(r, 3000));
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    await page.screenshot({ path: '../temp/error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

testMultipleResumes();
