const puppeteer = require('puppeteer');
const path = require('path');

const TEST_DATA = {
  state: {
    resumes: [
      {
        id: 'test-base-resume',
        name: 'Test Resume',
        version: 3,
        variationType: 'base',
        baseResumeId: null,
        domain: null,
        template: 'modern',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections: [
          { id: 's1', type: 'personal-info', order: 0, visible: true, content: { title: 'Personal Info', data: { fullName: 'John Doe', email: 'john@example.com' } } }
        ],
        metadata: {
          personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
          settings: { fontFamily: 'Inter', fontSize: 11, lineHeight: 1.5, colors: { primary: '#2563eb', text: '#1f2937', background: '#ffffff', accent: '#3b82f6' }, sectionSpacing: 'normal', showIcons: true, dateFormat: 'MMM YYYY', accentStyle: 'underline', pageSize: 'A4', margins: { top: 20, right: 20, bottom: 20, left: 20 } }
        },
        tags: [],
        isArchived: false
      },
      {
        id: 'test-variation-1',
        name: 'Software Engineer',
        version: 1,
        variationType: 'variation',
        baseResumeId: 'test-base-resume',
        domain: 'software',
        template: 'modern',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sections: [],
        metadata: {
          personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
          settings: { fontFamily: 'Inter', fontSize: 11, lineHeight: 1.5, colors: { primary: '#2563eb', text: '#1f2937', background: '#ffffff', accent: '#3b82f6' }, sectionSpacing: 'normal', showIcons: true, dateFormat: 'MMM YYYY', accentStyle: 'underline', pageSize: 'A4', margins: { top: 20, right: 20, bottom: 20, left: 20 } }
        },
        tags: ['software'],
        isArchived: false
      },
      {
        id: 'test-variation-2',
        name: 'Data Analyst',
        version: 1,
        variationType: 'variation',
        baseResumeId: 'test-base-resume',
        domain: 'data',
        template: 'modern',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        sections: [],
        metadata: {
          personalInfo: { fullName: 'John Doe', email: 'john@example.com' },
          settings: { fontFamily: 'Inter', fontSize: 11, lineHeight: 1.5, colors: { primary: '#2563eb', text: '#1f2937', background: '#ffffff', accent: '#3b82f6' }, sectionSpacing: 'normal', showIcons: true, dateFormat: 'MMM YYYY', accentStyle: 'underline', pageSize: 'A4', margins: { top: 20, right: 20, bottom: 20, left: 20 } }
        },
        tags: ['data'],
        isArchived: false
      }
    ],
    versions: [
      { id: 'v1', resumeId: 'test-base-resume', version: 1, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), changeDescription: 'Initial version', data: {} },
      { id: 'v2', resumeId: 'test-base-resume', version: 2, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), changeDescription: 'Added experience section', data: {} },
      { id: 'v3', resumeId: 'test-base-resume', version: 3, createdAt: new Date(Date.now() - 86400000).toISOString(), changeDescription: 'Updated skills', data: {} }
    ],
    activeResumeId: 'test-base-resume',
    activeResume: null,
    activityLog: []
  },
  version: 0
};

async function captureVersionTree() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  try {
    // First navigate to the domain to set localStorage
    console.log('Setting up localStorage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Set localStorage with correct key
    await page.evaluate((data) => {
      localStorage.setItem('better-resume-storage', JSON.stringify(data));
    }, TEST_DATA);
    
    // Hard reload to let zustand hydrate with new data
    console.log('Reloading to hydrate store...');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Now navigate to editor using client-side navigation (click a link)
    console.log('Navigating to editor...');
    await page.goto('http://localhost:3000/editor/test-base-resume', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Debug: check page content
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page text preview:', pageText.substring(0, 300));
    
    // Screenshot editor
    const editorPath = path.join(__dirname, '..', 'temp', 'editor.png');
    await page.screenshot({ path: editorPath });
    console.log('Editor screenshot saved');
    
    // Get available buttons
    const buttonTexts = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.map(btn => btn.textContent?.trim()).filter(Boolean);
    });
    console.log('Available buttons:', buttonTexts);
    
    // Click History button
    const historyClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.includes('History')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (historyClicked) {
      console.log('Clicked History button');
      await new Promise(r => setTimeout(r, 2000));
      
      // Get information about the tree dialog
      const dialogInfo = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { found: false };
        
        // Get all nodes in the ReactFlow container
        const nodes = Array.from(dialog.querySelectorAll('.react-flow__node'));
        const nodeData = nodes.map(node => {
          const rect = node.getBoundingClientRect();
          const text = node.innerText || '';
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            text: text.substring(0, 100)
          };
        });
        
        // Check controls styling
        const controls = dialog.querySelector('.react-flow__controls');
        const controlsStyle = controls ? window.getComputedStyle(controls) : null;
        const controlButtons = controls ? Array.from(controls.querySelectorAll('button')).map(btn => {
          const style = window.getComputedStyle(btn);
          return {
            bgColor: style.backgroundColor,
            visible: style.display !== 'none'
          };
        }) : [];
        
        return {
          found: true,
          nodeCount: nodes.length,
          nodes: nodeData,
          controls: {
            exists: !!controls,
            bgColor: controlsStyle?.backgroundColor,
            buttons: controlButtons
          }
        };
      });
      
      console.log('Dialog info:', JSON.stringify(dialogInfo, null, 2));
      
      // Final screenshot of the version tree dialog
      const treePath = path.join(__dirname, '..', 'temp', 'version-tree.png');
      await page.screenshot({ path: treePath });
      console.log('Version tree screenshot saved to:', treePath);
    } else {
      console.log('Could not find History button');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    const errorPath = path.join(__dirname, '..', 'temp', 'error.png');
    await page.screenshot({ path: errorPath });
  }
  
  await browser.close();
}

captureVersionTree();
