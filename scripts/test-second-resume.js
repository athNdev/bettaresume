const puppeteer = require('puppeteer');

async function testSecondResumeNavigation() {
  console.log('🧪 Testing Second Resume Navigation Issue\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enable console logging from page
  page.on('console', msg => console.log('  [PAGE]', msg.text()));
  
  try {
    // Step 1: Go to dashboard
    console.log('Step 1: Loading dashboard...');
    await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading Betta Resume'), { timeout: 10000 });
    console.log('✅ Dashboard loaded\n');
    
    // Step 2: Create first resume
    console.log('Step 2: Creating first resume...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.evaluate(e => e.innerText);
      if (text.includes('Create')) {
        await btn.click();
        break;
      }
    }
    
    await page.waitForFunction(() => window.location.pathname.includes('/editor/'), { timeout: 5000 });
    const firstEditorUrl = page.url();
    console.log('✅ First editor loaded:', firstEditorUrl);
    
    // Wait for editor to fully load
    await page.waitForFunction(() => !document.body.innerText.includes('Loading resume'), { timeout: 10000 });
    console.log('✅ First editor content ready\n');
    
    // Step 3: Go back to dashboard
    console.log('Step 3: Going back to dashboard...');
    await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading Betta Resume'), { timeout: 10000 });
    console.log('✅ Dashboard loaded again\n');
    
    // Step 4: Click on the first resume we created
    console.log('Step 4: Clicking on first resume card...');
    await new Promise(r => setTimeout(r, 500));
    
    // Find resume cards (they have 'group' class)
    const resumeCards = await page.$$('div.group');
    console.log('Found', resumeCards.length, 'resume cards');
    
    if (resumeCards.length === 0) {
      console.log('❌ No resume cards found!');
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Page content:', bodyText.substring(0, 500));
      return;
    }
    
    // Click the first resume card
    await resumeCards[0].click();
    console.log('Clicked resume card, waiting for navigation...');
    
    await page.waitForFunction(() => window.location.pathname.includes('/editor/'), { timeout: 10000 });
    const secondEditorUrl = page.url();
    console.log('✅ Second editor loaded:', secondEditorUrl);
    
    await page.waitForFunction(() => !document.body.innerText.includes('Loading resume'), { timeout: 10000 });
    console.log('✅ Second editor content ready\n');
    
    // Step 5: Go back to dashboard
    console.log('Step 5: Going back to dashboard...');
    await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading Betta Resume'), { timeout: 10000 });
    
    // Check how many resumes are listed
    await new Promise(r => setTimeout(r, 1000));
    const resumeCount = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/(\d+)\s*resumes?/);
      return match ? parseInt(match[1]) : 0;
    });
    console.log('✅ Dashboard shows', resumeCount, 'resume(s)\n');
    
    // Step 6: Click on an existing resume (not create new)
    console.log('Step 6: Clicking on first resume card...');
    const cards = await page.$$('div[class*="cursor-pointer"]');
    if (cards.length > 0) {
      console.log('Found', cards.length, 'clickable elements');
      
      // Find a resume card (not the create button)
      let clicked = false;
      for (const card of cards) {
        const classList = await card.evaluate(e => e.className);
        const hasGroup = classList.includes('group');
        if (hasGroup) {
          console.log('Clicking resume card...');
          await card.click();
          clicked = true;
          break;
        }
      }
      
      if (clicked) {
        // Wait for navigation or timeout
        console.log('Waiting for navigation...');
        try {
          await page.waitForFunction(() => window.location.pathname.includes('/editor/'), { timeout: 10000 });
          console.log('✅ Successfully navigated to editor:', page.url());
          
          // Check if editor loads
          await page.waitForFunction(() => !document.body.innerText.includes('Loading resume'), { timeout: 10000 });
          console.log('✅ Editor content loaded\n');
        } catch (e) {
          console.log('❌ TIMEOUT - stuck loading!');
          console.log('Current URL:', page.url());
          const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
          console.log('Page content:', bodyText);
          
          // Check for spinner
          const hasSpinner = await page.evaluate(() => {
            return document.querySelector('.animate-spin') !== null;
          });
          console.log('Spinner visible:', hasSpinner);
        }
      } else {
        console.log('⚠️ Could not find resume card to click');
      }
    } else {
      console.log('⚠️ No resume cards found');
    }
    
    console.log('\n✨ Test completed!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testSecondResumeNavigation();
