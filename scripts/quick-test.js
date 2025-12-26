const puppeteer = require('puppeteer');

async function quickTest() {
  console.log('🧪 Quick Navigation Test\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test 1: Dashboard loads
    console.log('Test 1: Dashboard loads...');
    await page.goto('http://localhost:3000/dashboard', { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    await new Promise(r => setTimeout(r, 3000)); // Wait for hydration
    
    const dashText = await page.evaluate(() => document.body.innerText);
    
    if (dashText.includes('Loading Betta Resume')) {
      console.log('❌ Dashboard STUCK on "Loading Betta Resume..."');
      console.log('   Content:', dashText.substring(0, 200));
      return;
    }
    
    if (dashText.includes('Betta Resume')) {
      console.log('✅ Dashboard loads correctly');
    } else {
      console.log('❌ Dashboard failed - unexpected content');
      console.log('   Content:', dashText.substring(0, 200));
      return;
    }
    
    // Test 2: Create resume and navigate to editor
    console.log('\nTest 2: Creating a resume...');
    const buttons = await page.$$('button');
    let clicked = false;
    for (const btn of buttons) {
      const text = await btn.evaluate(e => e.innerText);
      if (text.includes('Create')) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    
    if (!clicked) {
      console.log('⚠️ Could not find Create button');
    } else {
      await new Promise(r => setTimeout(r, 2000));
      const url = page.url();
      if (url.includes('/editor/')) {
        console.log('✅ Editor page navigated: ' + url);
      } else {
        console.log('⚠️ URL after create: ' + url);
      }
      
      // Test 3: Editor loads without stuck loading
      console.log('\nTest 3: Editor loads...');
      await new Promise(r => setTimeout(r, 3000));
      const editorText = await page.evaluate(() => document.body.innerText);
      
      if (editorText.includes('Loading resume') || editorText.includes('Loading Betta')) {
        console.log('❌ Editor STUCK on loading');
        console.log('   Content:', editorText.substring(0, 200));
      } else if (editorText.includes('Personal Info') || editorText.includes('Resume')) {
        console.log('✅ Editor loads correctly');
      } else {
        console.log('⚠️ Editor content:', editorText.substring(0, 300));
      }
    }
    
    console.log('\n✨ All tests completed!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickTest();
