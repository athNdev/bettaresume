'use client';

import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Download, FileJson, Loader2 } from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { ResumeRenderer } from '@/components/resume/resume-renderer';

interface ExportButtonsProps {
  resumeId: string;
}

export function ExportButtons({ resumeId }: ExportButtonsProps) {
  const { exportToJSON, resumes } = useResumeStore();
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  const resume = resumes.find((r) => r.id === resumeId);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleExportJSON = () => {
    const json = exportToJSON(resumeId);
    
    if (!json || !resume) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resume.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = useCallback(async () => {
    if (!resume || !printRef.current) return;
    
    setIsExporting(true);
    try {
      // Get the rendered HTML from the hidden div
      const html = printRef.current.innerHTML;
      const filename = resume.name.replace(/\s+/g, '-').toLowerCase();
      const fontFamily = resume.metadata?.settings?.fontFamily || 'Inter';

      // Call the API route to generate PDF with Puppeteer
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html, filename, fontFamily }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [resume]);

  if (!resume) return null;

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleExportJSON}>
          <FileJson className="mr-2 w-4 h-4" />
          JSON
        </Button>
        <Button onClick={handleExportPDF} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          ) : (
            <Download className="mr-2 w-4 h-4" />
          )}
          PDF
        </Button>
      </div>
      
      {/* Hidden render container for PDF export - same ResumeRenderer */}
      {isClient && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
          <div 
            ref={printRef}
            style={{ 
              width: '8.5in',
              minHeight: '11in',
              background: 'white',
            }}
          >
            <ResumeRenderer resume={resume} darkMode={false} />
          </div>
        </div>
      )}
    </>
  );
}
