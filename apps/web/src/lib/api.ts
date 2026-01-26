import { BordereauComment, Client, CompanySettings, Contact, Deliverable, PeriodLock, Project, ProjectSituationSnapshot, TimeEntry, User } from "@/types";

type BordereauGenerateResponse = {
  bordereau?: unknown;
  version?: {
    fileId?: string;
  };
};

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const getClients = () => fetchJson<Client[]>("/api/clients");

export const createClient = (payload: {
  name: string;
  address: string;
  siren?: string;
  siret: string;
  tvaIntra?: string;
  notes?: string;
}) =>
  fetchJson<Client>("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateClient = (clientId: string, payload: {
  name: string;
  address: string;
  siren?: string;
  siret: string;
  tvaIntra?: string;
  notes?: string;
}) =>
  fetchJson<Client>(`/api/clients/${clientId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteClient = (clientId: string, options?: { force?: boolean }) => {
  const forceParam = options?.force ? "?force=1" : "";
  return fetchJson(`/api/clients/${clientId}${forceParam}`, {
    method: "DELETE"
  });
};

export const parseClientOrder = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return fetch("/api/clients/parse-order", {
    method: "POST",
    body: formData
  });
};

export const getContacts = () => fetchJson<Contact[]>("/api/contacts");

export const createContact = (payload: {
  clientId: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}) =>
  fetchJson<Contact>("/api/contacts", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateContact = (contactId: string, payload: {
  active?: boolean;
}) =>
  fetchJson<Contact>(`/api/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const getProjects = () => fetchJson<Project[]>("/api/projects");

export const getNextProjectNumber = (year: number) =>
  fetchJson<{ next: string }>(`/api/projects/next-number?year=${year}`);

export const createProject = (payload: {
  projectNumber?: string;
  orderNumber: string;
  orderDate: string;
  orderAmount?: number;
  quoteNumber: string;
  quoteDate: string;
  clientId: string;
  contactId: string;
  designation: string;
  projectManager: string;
  projectManagerEmail?: string;
  type: "AT" | "FORFAIT";
  status: "PREVU" | "EN_COURS" | "CLOS" | "ARCHIVE";
  atMetrics?: {
    daysSoldBO: number;
    daysSoldSite: number;
    dailyRateBO: number;
    dailyRateSite: number;
  };
  deliverables?: {
    label: string;
    percentage?: number;
    amount?: number;
    targetDate: string;
  }[];
}) =>
  fetchJson<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateProject = (projectId: string, payload: {
  projectNumber: string;
  orderNumber: string;
  orderDate: string;
  orderAmount?: number;
  quoteNumber: string;
  quoteDate: string;
  clientId: string;
  contactId: string;
  designation: string;
  projectManager: string;
  projectManagerEmail?: string;
  type: "AT" | "FORFAIT";
  status: "PREVU" | "EN_COURS" | "CLOS" | "ARCHIVE";
  atMetrics?: {
    daysSoldBO: number;
    daysSoldSite: number;
    dailyRateBO: number;
    dailyRateSite: number;
  };
}) =>
  fetchJson<Project>(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteProject = (projectId: string, options?: { force?: boolean }) => {
  const forceParam = options?.force ? "?force=1" : "";
  return fetchJson(`/api/projects/${projectId}${forceParam}`, {
    method: "DELETE"
  });
};

export const getSnapshots = (projectId?: string) => {
  const url = projectId ? `/api/snapshots?projectId=${projectId}` : "/api/snapshots";
  return fetchJson<ProjectSituationSnapshot[]>(url);
};

export const getBordereaux = (projectId: string) =>
  fetchJson<any[]>(`/api/bordereaux?projectId=${projectId}`);

export const remindBordereau = (bordereauId: string) =>
  fetchJson(`/api/bordereaux/${bordereauId}/remind`, {
    method: "POST"
  });

export const getDeliverables = (projectId: string) =>
  fetchJson<Deliverable[]>(`/api/deliverables?projectId=${projectId}`);

export const updateDeliverableStatus = (deliverableId: string, status: string) =>
  fetchJson<Deliverable>(`/api/deliverables/${deliverableId}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

export const updateProjectManager = (projectId: string, projectManager: string) =>
  fetchJson<Project>(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ projectManager })
  });

export const getTimeEntries = (projectId: string, year: number, month: number) =>
  fetchJson<TimeEntry[]>(`/api/time-entries?projectId=${projectId}&year=${year}&month=${month}`);

export const getAllTimeEntries = (projectId: string) =>
  fetchJson<TimeEntry[]>(`/api/time-entries?projectId=${projectId}`);

export const upsertTimeEntry = (payload: {
  projectId: string;
  year: number;
  month: number;
  day: number;
  type: "BO" | "SITE";
  hours: number;
  hourSlot?: number;
  comment?: string;
  actorName: string;
}) =>
  fetchJson<TimeEntry>("/api/time-entries", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const closeMonth = (payload: {
  projectId: string;
  year: number;
  month: number;
  actorName: string;
}) =>
  fetchJson<ProjectSituationSnapshot>("/api/close-month", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const generateBordereau = (payload: {
  projectId: string;
  type: "BA" | "BL" | "RECTIFICATIF";
  periodYear?: number;
  periodMonth?: number;
  actorName: string;
  sendForSignature?: boolean;
}) =>
  fetchJson<BordereauGenerateResponse>("/api/bordereaux/generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getPeriodLock = (projectId: string, year: number, month: number) =>
  fetchJson<PeriodLock | null>(`/api/locks?projectId=${projectId}&year=${year}&month=${month}`);

export const unlockPeriod = (payload: {
  projectId: string;
  year: number;
  month: number;
  actorName: string;
}) =>
  fetchJson("/api/locks/unlock", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getSession = () => fetchJson<User>("/api/auth/session");

export const login = (payload: { email: string; password: string }) =>
  fetchJson<User>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const registerUser = (payload: { name?: string; email: string; password: string }) =>
  fetchJson<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const logout = () =>
  fetchJson("/api/auth/logout", {
    method: "POST"
  });

export const getUsers = () => fetchJson<User[]>("/api/users");

export const createUser = (payload: {
  name?: string;
  email: string;
  password: string;
  role: "ADMIN" | "USER";
  active: boolean;
}) =>
  fetchJson<User>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateUser = (userId: string, payload: {
  name?: string;
  email?: string;
  password?: string;
  role?: "ADMIN" | "USER";
  active?: boolean;
}) =>
  fetchJson<User>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteUser = (userId: string) =>
  fetchJson(`/api/users/${userId}`, {
    method: "DELETE"
  });

export const getCompanySettings = () =>
  fetchJson<CompanySettings>("/api/company/settings");

export const updateCompanySettings = (payload: Omit<CompanySettings, "id" | "logoUrl">) =>
  fetchJson<CompanySettings>("/api/company/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const uploadCompanyLogo = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return fetch("/api/company/logo", {
    method: "POST",
    body: formData
  });
};

export const getProductionData = (year: number) =>
  fetchJson<{ year: number; data: { at: number; forfait: number }[] }>(`/api/dashboard/production?year=${year}`);

export const getBordereauComments = (projectId: string, year: number, month: number) =>
  fetchJson<BordereauComment[]>(`/api/bordereaux/comments?projectId=${projectId}&year=${year}&month=${month}`);

export const upsertBordereauComment = (payload: {
  projectId: string;
  year: number;
  month: number;
  day: number;
  type: "BO" | "SITE";
  comment: string;
}) =>
  fetchJson<BordereauComment>("/api/bordereaux/comments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
