

export type Language = 'zh' | 'en';

export interface User {
  id: string;
  name: string;
}

export enum InspectionStatus {
  COMPLETED = 'Completed'
}

export type RiskLikelihood = 'Rare' | 'Unlikely' | 'Possible' | 'Likely' | 'Almost Certain';
export type RiskSeverity = 'Negligible' | 'Minor' | 'Moderate' | 'Major' | 'Catastrophic';
export type ItemRiskLevel = 'Low' | 'Medium' | 'High' | 'Extreme';

export interface SafetyItem {
  id: string;
  category: string; // e.g., "Machinery Guarding", "Fire Safety", "PPE", "Electrical"
  description: string;
  status: 'Safe' | 'At Risk' | 'N/A';
  observation: string;
  remedialAction: string;
  photoUrl?: string;     // URL for existing/mock images
  photoData?: string;    // Base64 string for uploaded images
  
  // Risk Matrix
  riskLikelihood?: RiskLikelihood;
  riskSeverity?: RiskSeverity;
  riskLevel?: ItemRiskLevel;

  // Action Tracking
  actionStatus?: 'Pending' | 'Follow-up' | 'Completed';
  proposedCompletionDate?: string;
}

export interface InspectionRecord {
  id: string;
  date: string;
  location: string;
  inspectorId: string;
  inspectorName: string;
  // Endorsement fields removed as approval workflow is removed
  status: InspectionStatus;
  items: SafetyItem[];
  overallSummary: string; // AI Generated or Manual
  riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
}

export interface WeeklyReportRecord {
  id: string; // Format: WR-YYYYMMDD (based on week start)
  weekStartDate: string; // Monday
  weekEndDate: string;   // Saturday
  submittedDate: string;
  preparedBy: string;
  preparedByTitle?: string; // New field for editable position title
  endorsedBy: string;
  summary: string;
  status: 'Draft' | 'Submitted';
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalInspections: number;
  criticalHazards: number;
  summary: string;
  generatedDate: string;
}

declare global {
  interface Window {
    html2pdf: any;
  }
}