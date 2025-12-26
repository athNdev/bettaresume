// Script to populate version snapshots in sample data
const fs = require('fs');
const path = require('path');

const sampleDataPath = path.join(__dirname, '../public/sample-data/all-resumes-localStorage.json');
const data = JSON.parse(fs.readFileSync(sampleDataPath, 'utf-8'));

// Get resumes by ID for easy lookup
const resumesById = {};
data.state.resumes.forEach(r => {
  resumesById[r.id] = r;
});

// Helper to create a version snapshot with slight variations
function createVersionSnapshot(baseResume, versionNum, totalVersions) {
  // Deep clone the resume - keep ALL fields to match how createVersion works
  const snapshot = JSON.parse(JSON.stringify(baseResume));
  
  // Update version number to match this version
  snapshot.version = versionNum;
  
  // Progressively add/modify content based on version number
  // Earlier versions have less content
  const progressFactor = versionNum / totalVersions;
  
  // For early versions, remove some sections or reduce content
  if (versionNum < totalVersions * 0.3) {
    // Very early draft - maybe no projects or certifications yet
    snapshot.sections = snapshot.sections.filter(s => 
      !['projects', 'certifications', 'languages'].includes(s.type)
    );
    
    // Shorter summary
    const summarySection = snapshot.sections.find(s => s.type === 'summary');
    if (summarySection?.content?.html) {
      summarySection.content.html = '<p>Software Engineer with experience in web development and cloud technologies.</p>';
    }
  } else if (versionNum < totalVersions * 0.5) {
    // Mid-early draft - no certifications yet
    snapshot.sections = snapshot.sections.filter(s => 
      !['certifications', 'languages'].includes(s.type)
    );
    
    // Medium summary
    const summarySection = snapshot.sections.find(s => s.type === 'summary');
    if (summarySection?.content?.html) {
      summarySection.content.html = '<p>Experienced Software Engineer with 5+ years building scalable web applications. Expert in React and Node.js.</p>';
    }
  } else if (versionNum < totalVersions * 0.7) {
    // Getting better - no languages
    snapshot.sections = snapshot.sections.filter(s => 
      !['languages'].includes(s.type)
    );
  }
  // Later versions have full content (use as-is)
  
  // Vary the template for some versions
  const templates = ['modern', 'classic', 'professional', 'minimal'];
  snapshot.template = templates[versionNum % templates.length];
  
  return snapshot;
}

// Populate snapshots for all versions
data.state.versions = data.state.versions.map(version => {
  const baseResume = resumesById[version.resumeId];
  if (!baseResume) {
    console.warn(`Resume not found for version: ${version.id}`);
    return version;
  }
  
  // Find total versions for this resume
  const resumeVersions = data.state.versions.filter(v => v.resumeId === version.resumeId);
  const totalVersions = resumeVersions.length;
  
  // Create a snapshot based on version number
  const snapshot = createVersionSnapshot(baseResume, version.version, totalVersions);
  
  return {
    ...version,
    snapshot
  };
});

// Write back to file
fs.writeFileSync(sampleDataPath, JSON.stringify(data, null, 2), 'utf-8');
console.log('✅ Snapshots populated successfully!');
console.log(`   Updated ${data.state.versions.length} versions`);
