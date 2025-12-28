/**
 * Load Sample Data Script
 * 
 * Waits for the dev server to be ready, then opens a browser with sample data
 * pre-loaded into localStorage.
 * 
 * Run with: npm run dev:demo
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

const STORAGE_KEY = 'betta-resume-storage';
const SAMPLE_DATA_PATH = path.join(__dirname, '../public/sample-data/all-resumes-localStorage.json');
const DEV_URLS = ['http://localhost:3000', 'http://localhost:3001'];

function waitForServer(urls, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      console.log(`⏳ Waiting for dev server... (attempt ${attempts}/${maxAttempts})`);
      
      // Try all URLs in parallel
      const checks = urls.map(url => 
        new Promise((res) => {
          http.get(url, (response) => {
            if (response.statusCode === 200 || response.statusCode === 304) {
              res(url);
            } else {
              res(null);
            }
          }).on('error', () => res(null));
        })
      );
      
      Promise.all(checks).then(results => {
        const foundUrl = results.find(r => r !== null);
        if (foundUrl) {
          resolve(foundUrl);
        } else if (attempts < maxAttempts) {
          setTimeout(check, interval);
        } else {
          reject(new Error('Max attempts reached waiting for server'));
        }
      });
    };
    
    check();
  });
}

async function loadSampleData() {
  console.log('🚀 Starting demo mode with sample data...\n');
  
  // Wait for dev server
  let devUrl;
  try {
    devUrl = await waitForServer(DEV_URLS);
    console.log(`✅ Dev server is ready at ${devUrl}!\n`);
  } catch (err) {
    console.error('❌ Could not connect to dev server at', DEV_URLS.join(' or '));
    console.error('   Make sure "npm run dev" is running first.');
    process.exit(1);
  }
  
  // Read sample data
  const sampleData = JSON.parse(fs.readFileSync(SAMPLE_DATA_PATH, 'utf-8'));
  
  // Launch a VISIBLE browser so user can interact with it
  // The browser will stay open for the user to use
  console.log('🌐 Opening browser with sample data...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Open visible browser
    defaultViewport: null,  // Use full window size
    args: [
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  
  const page = await browser.newPage();
  
  // Navigate to the app root first to set up localStorage
  await page.goto(devUrl, { waitUntil: 'domcontentloaded' });
  
  // Inject sample data into localStorage
  await page.evaluate((key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, STORAGE_KEY, sampleData);
  
  console.log('✅ Sample data loaded into localStorage');
  
  // Navigate to dashboard with the data loaded
  await page.goto(`${devUrl}/dashboard`, { waitUntil: 'networkidle0' });
  
  console.log('\n📝 6 sample resumes loaded:');
  console.log('   • Alex Chen - Senior Software Engineer (modern)');
  console.log('   • Dr. Sarah Martinez - Data Scientist (professional)');
  console.log('   • Michael Thompson - Product Manager (executive)');
  console.log('   • Emma Rodriguez - UX Designer (creative)');
  console.log('   • James Wilson - DevOps Engineer (tech)');
  console.log('   • Lisa Chen - Marketing Manager (minimal, archived)');
  console.log('\n✨ Browser is open with sample data! You can use it now.');
  console.log('   Close the browser or press Ctrl+C to stop the dev server.\n');
  
  // Keep the script running while browser is open
  // The browser will stay open until user closes it or Ctrl+C
  browser.on('disconnected', () => {
    console.log('\n👋 Browser closed. Stopping demo mode...');
    process.exit(0);
  });
  
  // Keep process alive
  await new Promise(() => {});
}

loadSampleData().catch(console.error);
