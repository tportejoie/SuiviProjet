export enum ProjectType {
  AT = 'AT', // Assistance Technique
  FORFAIT = 'FORFAIT' // Fixed Price
}

export enum ProjectStatus {
  PREVU = 'PREVU',
  EN_COURS = 'EN_COURS',
  CLOS = 'CLOS',
  ARCHIVE = 'ARCHIVE'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum SnapshotType {
  MONTH_END = 'MONTH_END',
  BORDEREAU_GENERATED = 'BORDEREAU_GENERATED',
  BORDEREAU_SIGNED = 'BORDEREAU_SIGNED',
  RECTIFICATIF = 'RECTIFICATIF',
  MANUAL = 'MANUAL'
}

export enum DeliverableStatus {
  NON_REMIS = 'NON_REMIS',
  REMIS = 'REMIS',
  VALIDE = 'VALIDE'
}

export interface Client {
  id: string;
  name: string;
  address: string;
  siren?: string;
  siret: string;
  tvaIntra?: string;
  notes?: string;
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  active: boolean;
}

export interface Project {
  id: string;
  projectNumber: string;
  orderNumber: string;
  orderDate: string;
  orderAmount?: number | null;
  quoteNumber: string;
  quoteDate: string;
  clientId: string;
  contactId: string;
  designation: string;
  projectManager: string;
  projectManagerEmail?: string | null;
  type: ProjectType;
  status: ProjectStatus;
  atMetrics?: {
    daysSoldBO: number;
    daysSoldSite: number;
    dailyRateBO: number;
    dailyRateSite: number;
  };
}

export interface TimeEntry {
  id: string;
  projectId: string;
  year: number;
  month: number;
  day: number;
  type: 'BO' | 'SITE';
  hours: number;
  comment: string;
}

export interface BordereauComment {
  id: string;
  projectId: string;
  year: number;
  month: number;
  day: number;
  type: 'BO' | 'SITE';
  comment: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  label: string;
  percentage: number;
  amount?: number;
  targetDate: string;
  status: DeliverableStatus;
  submissionDate?: string;
  comment?: string;
}

export interface ProjectSituationSnapshot {
  id: string;
  projectId: string;
  type: SnapshotType;
  year?: number;
  month?: number;
  computedAt: string;
  computedBy: string;
  sourceRef?: string;
  dataJson: Record<string, unknown>;
  supersedesSnapshotId?: string;
}

export interface PeriodLock {
  projectId: string;
  year: number;
  month: number;
  locked: boolean;
  lockedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  active: boolean;
}

export interface CompanySettings {
  id: string;
  name: string;
  legalForm?: string | null;
  headquarters?: string | null;
  siren?: string | null;
  siret?: string | null;
  tvaNumber?: string | null;
  capital?: string | null;
  rcs?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
}
