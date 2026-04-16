import fs from 'fs';
import path from 'path';

/**
 * Project Soft Copy Generator
 * Aggregates all source code and documentation into a single submission document.
 */

const OUTPUT_FILE = 'SUBMISSION_DOCUMENT.md';
const FILES_TO_INCLUDE = [
  'README.md',
  'CHANGELOG.md',
  'package.json',
  'server.ts',
  'shared/constants.ts',
  'src/App.tsx',
  'src/types.ts',
  'src/hooks/useFetch.ts',
  'src/components/StatCard.tsx',
  'src/index.css'
];

async function generateSoftCopy() {
  let content = `# PROJECT SUBMISSION: MedTrack Hospital Bed Capacity Management System\n\n`;
  content += `**Student Name:** [Your Name]\n`;
  content += `**Register Number:** [Your Register Number]\n`;
  content += `**Date of Submission:** ${new Date().toLocaleDateString()}\n\n`;
  content += `---\n\n`;

  content += `## 1. Project Overview\n`;
  content += `MedTrack is a full-stack hospital management system designed to monitor bed availability, manage patient admissions, and handle billing in real-time. It features a secure login system, a dynamic dashboard, and comprehensive patient history tracking.\n\n`;

  content += `## 2. Technology Stack\n`;
  content += `- **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons\n`;
  content += `- **Backend:** Node.js, Express, MongoDB (Mongoose)\n`;
  content += `- **State Management:** React Hooks (useState, useEffect, useCallback)\n`;
  content += `- **Icons & UI:** Lucide-React, Tailwind Utility Classes\n\n`;

  content += `## 3. System Features\n`;
  content += `- **Real-time Dashboard:** Live statistics on bed occupancy and ward-wise breakdown.\n`;
  content += `- **Bed Management:** Visual interface for monitoring and updating bed status.\n`;
  content += `- **Patient Admission:** Streamlined form for admitting patients with auto-calculation of rates.\n`;
  content += `- **Discharge & Billing:** Automated billing system with payment tracking and QR code generation.\n`;
  content += `- **History Tracking:** Persistent storage of all patient admissions and discharges.\n`;
  content += `- **Secure Access:** Master password protection for administrative actions.\n\n`;

  content += `---\n\n`;
  content += `## 4. Source Code Listing\n\n`;

  for (const file of FILES_TO_INCLUDE) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(file).slice(1);
      const lang = ext === 'tsx' || ext === 'ts' ? 'typescript' : ext === 'css' ? 'css' : ext === 'json' ? 'json' : 'markdown';
      
      content += `### File: \`${file}\`\n\n`;
      content += `\`\`\`${lang}\n${fileContent}\n\`\`\`\n\n`;
      content += `---\n\n`;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, content);
  console.log(`Successfully generated ${OUTPUT_FILE}`);
}

generateSoftCopy();
