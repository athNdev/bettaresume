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
const DEV_URL = 'http://localhost:3000';

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

async function loadSampleData() {
  console.log('🚀 Starting demo mode with sample data...\n');
  
  // Wait for dev server
  try {
    await waitForServer(DEV_URL);
    console.log('✅ Dev server is ready!\n');
  } catch (err) {
    console.error('❌ Could not connect to dev server at', DEV_URL);
    console.error('   Make sure "npm run dev" is running first.');
    process.exit(1);
  }
  
  // Read sample data
  const sampleData = JSON.parse(fs.readFileSync(SAMPLE_DATA_PATH, 'utf-8'));
  
  // Launch browser
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Navigate to localhost first (localStorage is domain-specific)
  await page.goto(DEV_URL, { waitUntil: 'domcontentloaded' });
  
  // Inject sample data into localStorage
  await page.evaluate((key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, STORAGE_KEY, sampleData);
  
  console.log('✅ Sample data loaded into localStorage');
  
  // Navigate to dashboard and reload
  await page.goto(`${DEV_URL}/dashboard`, { waitUntil: 'networkidle0' });
  
  console.log('\n📝 6 sample resumes loaded:');
  console.log('   • Alex Chen - Senior Software Engineer (modern)');
  console.log('   • Dr. Sarah Martinez - Data Scientist (professional)');
  console.log('   • Michael Thompson - Product Manager (executive)');
  console.log('   • Emma Rodriguez - UX Designer (creative)');
  console.log('   • James Wilson - DevOps Engineer (tech)');
  console.log('   • Lisa Chen - Marketing Manager (minimal, archived)');
  console.log('\n🌐 App ready at http://localhost:3000/dashboard');
  console.log('🔌 Close the browser window when done.\n');
}

loadSampleData().catch(console.error);
