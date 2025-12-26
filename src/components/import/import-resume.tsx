'use client';

import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';

export function ImportResume() {
  const router = useRouter();
  const { importFromJSON, setActiveResume, resumes } = useResumeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const beforeCount = resumes.length;
      importFromJSON(text);
      
      // Get the newly imported resume
      const afterResumes = useResumeStore.getState().resumes;
      if (afterResumes.length > beforeCount) {
        const newResume = afterResumes[afterResumes.length - 1];
        setActiveResume(newResume.id);
        router.push(`/editor/${newResume.id}`);
      }
    } catch (error) {
      console.error('Failed to import resume:', error);
      alert('Failed to import resume. Please check the file format.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Resume</CardTitle>
        <CardDescription>
          Import a previously exported resume from JSON file
        </CardDescription>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
        >
          <Upload className="mr-2" />
          Choose JSON File
        </Button>
      </CardContent>
    </Card>
  );
}
