import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  try {
    const { html, filename, fontFamily } = await request.json();

    if (!html) {
      return NextResponse.json({ error: 'HTML content required' }, { status: 400 });
    }

    // Map font families to Google Fonts
    const fontMap: Record<string, string> = {
      'Inter': 'Inter:wght@400;500;600;700',
      'Roboto': 'Roboto:wght@400;500;700',
      'Open Sans': 'Open+Sans:wght@400;600;700',
      'Lato': 'Lato:wght@400;700',
      'Montserrat': 'Montserrat:wght@400;500;600;700',
      'Playfair Display': 'Playfair+Display:wght@400;600;700',
      'Georgia': 'Georgia', // System font, no Google Font needed
      'Times New Roman': 'Times+New+Roman', // System font
      'Arial': 'Arial', // System font
    };

    // Build Google Fonts URL
    const fontsToLoad = ['Inter:wght@400;500;600;700']; // Always load Inter as default
    if (fontFamily && fontMap[fontFamily] && !fontMap[fontFamily].includes('System')) {
      fontsToLoad.push(fontMap[fontFamily]);
    }
    const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontsToLoad.join('&family=')}&display=swap`;

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });

    const page = await browser.newPage();

    // Set content with proper styling and fonts
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="${googleFontsUrl}" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 8.5in;
              min-height: 11in;
              font-family: '${fontFamily || 'Inter'}', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            body > div {
              min-height: 11in;
            }
            @page {
              size: letter;
              margin: 0;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Generate PDF with vector text
    const pdfBuffer = await page.pdf({
      format: 'letter',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'resume'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
