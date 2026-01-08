'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SaveStatusIndicator } from '@/components/ui/save-status-indicator';
import { useAutoSave, useBeforeUnload } from '@/hooks';
import type { PersonalInfo } from '@/types/resume';
import { User, Mail, Phone, MapPin, Linkedin, Github, Globe, Briefcase } from 'lucide-react';

interface PersonalInfoFormProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => Promise<void>;
  title?: string;
}

export function PersonalInfoForm({ data, onChange, title }: PersonalInfoFormProps) {
  // Auto-save hook handles local state, debouncing, and status tracking
  const {
    localData,
    setLocalData,
    status,
    error,
    retrySave,
    isDirty,
  } = useAutoSave({
    data,
    onSave: onChange,
  });

  // Warn user before leaving with unsaved changes
  useBeforeUnload(isDirty);

  const updateField = useCallback(<K extends keyof PersonalInfo>(field: K, value: PersonalInfo[K]) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  }, [setLocalData]);

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 -mx-4 -mt-4 mb-4 flex items-center justify-between min-h-10">
        <div className="flex items-center gap-3">
          {title && <h3 className="font-semibold">{title}</h3>}
          <SaveStatusIndicator status={status} error={error} onRetry={retrySave} />
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <User className="h-4 w-4" /> Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input 
                id="fullName" 
                value={localData.fullName || ''} 
                onChange={(e) => updateField('fullName', e.target.value)} 
                placeholder="John Doe" 
                className="mt-1" 
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="professionalTitle">Professional Title</Label>
              <Input 
                id="professionalTitle" 
                value={localData.professionalTitle || ''} 
                onChange={(e) => updateField('professionalTitle', e.target.value)} 
                placeholder="Senior Software Engineer" 
                className="mt-1" 
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4" /> Contact Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  value={localData.email || ''} 
                  onChange={(e) => updateField('email', e.target.value)} 
                  placeholder="john@example.com" 
                  className="pl-9" 
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="phone" 
                  value={localData.phone || ''} 
                  onChange={(e) => updateField('phone', e.target.value)} 
                  placeholder="+1 (555) 123-4567" 
                  className="pl-9" 
                />
              </div>
            </div>
            <div className="col-span-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="location" 
                  value={localData.location || ''} 
                  onChange={(e) => updateField('location', e.target.value)} 
                  placeholder="San Francisco, CA" 
                  className="pl-9" 
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4" /> Online Presence
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <div className="relative mt-1">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="linkedin" 
                  value={localData.linkedin || ''} 
                  onChange={(e) => updateField('linkedin', e.target.value)} 
                  placeholder="linkedin.com/in/johndoe" 
                  className="pl-9" 
                />
              </div>
            </div>
            <div>
              <Label htmlFor="github">GitHub</Label>
              <div className="relative mt-1">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="github" 
                  value={localData.github || ''} 
                  onChange={(e) => updateField('github', e.target.value)} 
                  placeholder="github.com/johndoe" 
                  className="pl-9" 
                />
              </div>
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <div className="relative mt-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="website" 
                  value={localData.website || ''} 
                  onChange={(e) => updateField('website', e.target.value)} 
                  placeholder="johndoe.com" 
                  className="pl-9" 
                />
              </div>
            </div>
            <div>
              <Label htmlFor="portfolio">Portfolio</Label>
              <div className="relative mt-1">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="portfolio" 
                  value={localData.portfolio || ''} 
                  onChange={(e) => updateField('portfolio', e.target.value)} 
                  placeholder="portfolio.johndoe.com" 
                  className="pl-9" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
