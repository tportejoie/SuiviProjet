import { ProjectType } from "@/types";

const DEFAULT_BASE_URI = "https://api.echosign.com";
const FALLBACK_BASE_URIS = [
  "https://api.adobesign.com",
  "https://api.eu1.echosign.com",
  "https://api.na1.echosign.com"
];

type AccessPointResponse = {
  api_access_point: string;
  web_access_point: string;
};

type TransientDocumentResponse = {
  transientDocumentId: string;
};

type AgreementResponse = {
  id: string;
  status: string;
};

let cachedApiBaseUri: string | null = null;

const getAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

const fetchBaseUri = async (token: string, host: string) => {
  const response = await fetch(`${host}/api/rest/v6/base_uris`, {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Adobe Sign base_uris failed: ${response.status} ${text}`);
  }
  const data = (await response.json()) as AccessPointResponse;
  return data.api_access_point.replace(/\/$/, "");
};

const getApiAccessPoint = async (token: string) => {
  if (process.env.ADOBE_SIGN_BASE_URI) {
    return process.env.ADOBE_SIGN_BASE_URI.replace(/\/$/, "");
  }
  if (cachedApiBaseUri) {
    return cachedApiBaseUri;
  }
  const hosts = [DEFAULT_BASE_URI, ...FALLBACK_BASE_URIS];
  let lastError: Error | null = null;
  for (const host of hosts) {
    try {
      cachedApiBaseUri = await fetchBaseUri(token, host);
      return cachedApiBaseUri;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error("Adobe Sign base_uris failed: no hosts available");
};

const callAdobe = async (token: string, path: string, init: RequestInit) => {
  const baseUri = await getApiAccessPoint(token);
  const url = `${baseUri}${path}`;
  const response = await fetch(url, init);
  if (response.ok) {
    return response;
  }
  const text = await response.text();
  if (text.includes("INVALID_API_ACCESS_POINT")) {
    cachedApiBaseUri = null;
    const refreshedBaseUri = await getApiAccessPoint(token);
    const retryUrl = `${refreshedBaseUri}${path}`;
    const retry = await fetch(retryUrl, init);
    if (retry.ok) {
      return retry;
    }
    const retryText = await retry.text();
    throw new Error(`Adobe Sign error: ${retry.status} ${retryText}`);
  }
  throw new Error(`Adobe Sign error: ${response.status} ${text}`);
};

export const createTransientDocument = async (token: string, fileName: string, buffer: Buffer) => {
  const formData = new FormData();
  const bytes = new Uint8Array(buffer);
  formData.append("File", new Blob([bytes]), fileName);

  const response = await callAdobe(token, "/api/rest/v6/transientDocuments", {
    method: "POST",
    headers: getAuthHeaders(token),
    body: formData
  });
  return (await response.json()) as TransientDocumentResponse;
};

export const createAgreement = async (token: string, payload: any) => {
  const response = await callAdobe(token, "/api/rest/v6/agreements", {
    method: "POST",
    headers: {
      ...getAuthHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  return (await response.json()) as AgreementResponse;
};

export const downloadAgreementPdf = async (token: string, agreementId: string) => {
  const response = await callAdobe(token, `/api/rest/v6/agreements/${agreementId}/combinedDocument`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(token),
      Accept: "application/pdf"
    }
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const downloadAgreementAuditTrail = async (token: string, agreementId: string) => {
  const response = await callAdobe(token, `/api/rest/v6/agreements/${agreementId}/auditTrail`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(token),
      Accept: "application/pdf"
    }
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const getAgreementMemberIds = async (token: string, agreementId: string) => {
  const response = await callAdobe(token, `/api/rest/v6/agreements/${agreementId}/members`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(token),
      "Content-Type": "application/json"
    }
  });
  const data = await response.json();
  const ids = new Set<string>();
  const memberInfos = data?.agreementMemberInfos || data?.participantSetInfos || data?.participantSets;
  if (Array.isArray(memberInfos)) {
    for (const item of memberInfos) {
      const candidates =
        item?.memberInfos || item?.participantSetMemberInfos || item?.members || item?.participantSetInfos;
      if (Array.isArray(candidates)) {
        for (const member of candidates) {
          const id = member?.id || member?.memberId || member?.participantId;
          if (id) ids.add(id);
        }
      } else {
        const id = item?.id || item?.memberId || item?.participantId;
        if (id) ids.add(id);
      }
    }
  }
  if (ids.size === 0 && Array.isArray(data?.agreementMemberInfoList)) {
    data.agreementMemberInfoList.forEach((member: any) => {
      const id = member?.id || member?.memberId || member?.participantId;
      if (id) ids.add(id);
    });
  }
  return Array.from(ids);
};

export const sendAgreementReminder = async (token: string, agreementId: string, participantIds: string[]) => {
  const response = await callAdobe(token, `/api/rest/v6/agreements/${agreementId}/reminders`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      recipientParticipantIds: participantIds,
      status: "ACTIVE"
    })
  });
  if (response.status === 204) {
    return { ok: true };
  }
  return response.json();
};

export const buildAgreementMessage = (input: {
  type: ProjectType;
  projectNumber: string;
  designation: string;
  periodLabel: string;
}) => {
  if (input.type === ProjectType.AT) {
    return {
      subject: `Bordereau d’avancement – ${input.projectNumber} (${input.periodLabel})`,
      message: `Bonjour,\n\nVeuillez trouver ci-joint le bordereau d’avancement pour la période ${input.periodLabel}.\nProjet : ${input.projectNumber} – ${input.designation}\n\nMerci de signer ce document.\n\nCordialement,`
    };
  }
  return {
    subject: `Bordereau de livraison – ${input.projectNumber}`,
    message: `Bonjour,\n\nVeuillez trouver ci-joint le bordereau de livraison.\nProjet : ${input.projectNumber} – ${input.designation}\n\nMerci de signer ce document.\n\nCordialement,`
  };
};
