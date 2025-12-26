const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testPdfExport() {
  console.log('Starting PDF export test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  const page = await browser.newPage();
  
  // Load sample data
  const sampleDataPath = path.join(__dirname, '../public/sample-data/all-resumes-localStorage.json');
  const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf-8'));
  
  // Navigate to dashboard
  console.log('Loading dashboard...');
  await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Inject sample data into localStorage
  await page.evaluate((data) => {
    localStorage.setItem('better-resume-storage', JSON.stringify(data));
  }, sampleData);
  
  // Reload to apply data
  console.log('Reloading with data...');
  await page.reload({ waitUntil: 'networkidle0' });
  await delay(3000);
  
  // Take dashboard screenshot
  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: false });
  console.log('Dashboard screenshot saved');
  
  // Navigate directly to a resume editor using URL
  const resumeId = 'resume-product-manager-001';
  console.log(`Navigating to editor for ${resumeId}...`);
  await page.goto(`http://localhost:3001/editor/${resumeId}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await delay(3000);
  
  // Take editor screenshot
  await page.screenshot({ path: 'screenshots/editor.png', fullPage: false });
  console.log('Editor screenshot saved');
  
  // Look for the resume preview panel
  console.log('Looking for preview panel...');
  
  // Find and click the PDF export button (it should be a button with FileDown icon or text "PDF")
  console.log('Looking for PDF export button...');
  
  // Wait for page to be fully rendered
  await delay(2000);
  
  // Try to find and click export options
  const buttons = await page.$$('button');
  console.log(`Found ${buttons.length} buttons`);
  
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent || '');
    const ariaLabel = await btn.evaluate(el => el.getAttribute('aria-label') || '');
    if (text.toLowerCase().includes('pdf') || ariaLabel.toLowerCase().includes('pdf') ||
        text.toLowerCase().includes('export') || ariaLabel.toLowerCase().includes('export')) {
      console.log(`Found export-related button: "${text}" / "${ariaLabel}"`);
      try {
        await btn.click();
        await delay(3000);
        console.log('Clicked export button');
        break;
      } catch (e) {
        console.log('Could not click button:', e.message);
      }
    }
  }
  
  // Take screenshot after export attempt
  await page.screenshot({ path: 'screenshots/after-export.png', fullPage: false });
  console.log('Post-export screenshot saved');
  
  console.log('Test complete. Browser will stay open for 60 seconds for manual inspection.');
  await delay(60000);
  
  await browser.close();
}

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

testPdfExport().catch(console.error);

testPdfExport().catch(console.error);
