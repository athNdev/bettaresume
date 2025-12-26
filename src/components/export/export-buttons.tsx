'use client';

import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Download, FileJson } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef, useCallback } from 'react';
import { ResumeRenderer } from '@/components/resume/resume-renderer';

interface ExportButtonsProps {
  resumeId: string;
}

export function ExportButtons({ resumeId }: ExportButtonsProps) {
  const { exportToJSON, resumes } = useResumeStore();
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportJSON = () => {
    const json = exportToJSON(resumeId);
    const resume = resumes.find((r) => r.id === resumeId);
    
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
    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume || !printRef.current) return;

    try {
      // Clone the print element and append to body for rendering
      const clone = printRef.current.cloneNode(true) as HTMLDivElement;
      clone.style.display = 'block';
      clone.style.position = 'fixed';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.zIndex = '-9999';
      clone.style.width = '794px';
      clone.style.backgroundColor = '#ffffff';
      // Force consistent font rendering
      clone.style.fontKerning = 'normal';
      clone.style.textRendering = 'optimizeLegibility';
      // Use setAttribute for vendor-prefixed properties
      clone.style.setProperty('-webkit-font-smoothing', 'antialiased');
      document.body.appendChild(clone);
      
      // Wait for fonts and render to complete
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));

      // Convert HTML to canvas with high quality
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794, // A4 width at 96 DPI
        windowWidth: 794,
      });

      // Remove the clone
      document.body.removeChild(clone);

      // A4 dimensions in mm
      const a4Width = 210;
      const a4Height = 297;
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      const imgWidth = a4Width;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Handle multi-page
      if (imgHeight > a4Height) {
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= a4Height;
        
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= a4Height;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }
      
      pdf.save(`${resume.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  }, [resumeId, resumes]);

  const resume = resumes.find((r) => r.id === resumeId);
  if (!resume) return null;

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleExportJSON}>
          <FileJson className="mr-2 w-4 h-4" />
          JSON
        </Button>
        <Button onClick={handleExportPDF}>
          <Download className="mr-2 w-4 h-4" />
          PDF
        </Button>
      </div>

      {/* Hidden print-ready resume */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <ResumeRenderer resume={resume} forExport={true} />
        </div>
      </div>
    </>
  );
}
