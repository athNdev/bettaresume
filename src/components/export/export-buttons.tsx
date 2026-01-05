'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileText, FileJson, Loader2 } from 'lucide-react';
import { PDFDocument } from './pdf-document';
import type { Resume } from '@/types/resume';

interface ExportButtonsProps {
  resume: Resume;
  variant?: 'default' | 'dropdown';
}

export function ExportButtons({ resume, variant = 'default' }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const downloadFile = (content: string | Blob, filename: string, type: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = <PDFDocument resume={resume} />;
      const blob = await pdf(doc).toBlob();
      const filename = `${resume.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadFile(blob, filename, 'application/pdf');
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportJSON = () => {
    const json = JSON.stringify(resume, null, 2);
    const filename = `${resume.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(json, filename, 'application/json');
  };

  const exportText = () => {
    // Generate plain text version of resume
    const { metadata, sections } = resume;
    const { personalInfo } = metadata;
    
    let text = `${personalInfo.fullName}\n`;
    if (personalInfo.professionalTitle) text += `${personalInfo.professionalTitle}\n`;
    text += `\n`;
    
    if (personalInfo.email) text += `Email: ${personalInfo.email}\n`;
    if (personalInfo.phone) text += `Phone: ${personalInfo.phone}\n`;
    if (personalInfo.location) text += `Location: ${personalInfo.location}\n`;
    if (personalInfo.linkedin) text += `LinkedIn: ${personalInfo.linkedin}\n`;
    if (personalInfo.github) text += `GitHub: ${personalInfo.github}\n`;
    text += `\n`;

    sections
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order)
      .forEach((section) => {
        const title = section.content.title || section.type.replace(/-/g, ' ').toUpperCase();
        text += `${'='.repeat(50)}\n${title}\n${'='.repeat(50)}\n\n`;
        
        if (section.type === 'summary') {
          const html = section.content.html || '';
          text += html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') + '\n\n';
        } else if (Array.isArray(section.content.data)) {
          (section.content.data as Array<Record<string, unknown>>).forEach((item) => {
            Object.entries(item).forEach(([key, value]) => {
              if (key !== 'id' && value) {
                text += `${key}: ${value}\n`;
              }
            });
            text += '\n';
          });
        }
      });

    const filename = `${resume.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    downloadFile(text, filename, 'text/plain');
  };

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportJSON}>
            <FileJson className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportText}>
            <FileText className="h-4 w-4 mr-2" />
            Export as Text
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex gap-2">
      <Button onClick={exportPDF} disabled={isExporting}>
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        PDF
      </Button>
      <Button variant="outline" onClick={exportJSON}>
        <FileJson className="h-4 w-4 mr-2" />
        JSON
      </Button>
    </div>
  );
}
