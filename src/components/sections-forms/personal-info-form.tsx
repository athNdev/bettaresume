'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { PersonalInfo } from '@/types/resume';
import { User, Mail, Phone, MapPin, Linkedin, Github, Globe, Briefcase } from 'lucide-react';

interface PersonalInfoFormProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
}

export function PersonalInfoForm({ data, onChange }: PersonalInfoFormProps) {
  const updateField = <K extends keyof PersonalInfo>(field: K, value: PersonalInfo[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <User className="h-4 w-4" /> Basic Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" value={data.fullName || ''} onChange={(e) => updateField('fullName', e.target.value)} placeholder="John Doe" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="professionalTitle">Professional Title</Label>
            <Input id="professionalTitle" value={data.professionalTitle || ''} onChange={(e) => updateField('professionalTitle', e.target.value)} placeholder="Senior Software Engineer" className="mt-1" />
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
            <Label htmlFor="email">Email *</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={data.email || ''} onChange={(e) => updateField('email', e.target.value)} placeholder="john@example.com" className="pl-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="phone" value={data.phone || ''} onChange={(e) => updateField('phone', e.target.value)} placeholder="+1 (555) 123-4567" className="pl-9" />
            </div>
          </div>
          <div className="col-span-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="location" value={data.location || ''} onChange={(e) => updateField('location', e.target.value)} placeholder="San Francisco, CA" className="pl-9" />
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
              <Input id="linkedin" value={data.linkedin || ''} onChange={(e) => updateField('linkedin', e.target.value)} placeholder="linkedin.com/in/johndoe" className="pl-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="github">GitHub</Label>
            <div className="relative mt-1">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="github" value={data.github || ''} onChange={(e) => updateField('github', e.target.value)} placeholder="github.com/johndoe" className="pl-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <div className="relative mt-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="website" value={data.website || ''} onChange={(e) => updateField('website', e.target.value)} placeholder="johndoe.com" className="pl-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="portfolio">Portfolio</Label>
            <div className="relative mt-1">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="portfolio" value={data.portfolio || ''} onChange={(e) => updateField('portfolio', e.target.value)} placeholder="portfolio.johndoe.com" className="pl-9" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
