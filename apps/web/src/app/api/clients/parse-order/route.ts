import { NextResponse } from "next/server";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const parseOrderWithOpenAIImage = async (file: File) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    return { error: "Missing OPENAI_API_KEY" } as const;
  }

  if (!file.type.startsWith("image/")) {
    return { error: "PDF not supported yet. Upload an image." } as const;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const prompt = `Tu es un agent d'extraction. A partir d'une commande client, extrais STRICTEMENT le JSON suivant:
{
  "name": string,
  "address": string,
  "siren": string | null,
  "siret": string | null,
  "tvaIntra": string | null,
  "notes": string | null,
  "confidence": number,
  "warnings": string[]
}
Regles:
- Pas de texte hors JSON.
- confidence entre 0 et 1.
- warnings liste des champs incertains ou absents.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl }
          ]
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const text = await response.text();
    return { error: `OpenAI error: ${text}` } as const;
  }

  const data = await response.json();
  const outputText = data?.output?.[0]?.content?.[0]?.text;
  if (!outputText) {
    return { error: "Empty response" } as const;
  }

  const parsed = extractJson(outputText);
  if (!parsed) {
    return { error: "Invalid JSON response" } as const;
  }

  return { data: parsed } as const;
};

const parseOrderWithOpenAIText = async (text: string) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    return { error: "Missing OPENAI_API_KEY" } as const;
  }

  const prompt = `Tu es un agent d'extraction. A partir du texte d'une commande client, extrais STRICTEMENT le JSON suivant:
{
  "name": string,
  "address": string,
  "siren": string | null,
  "siret": string | null,
  "tvaIntra": string | null,
  "notes": string | null,
  "confidence": number,
  "warnings": string[]
}
Regles:
- Pas de texte hors JSON.
- confidence entre 0 et 1.
- warnings liste des champs incertains ou absents.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `${prompt}\n\nTEXTE:\n${text}` }
          ]
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const respText = await response.text();
    return { error: `OpenAI error: ${respText}` } as const;
  }

  const data = await response.json();
  const outputText = data?.output?.[0]?.content?.[0]?.text;
  if (!outputText) {
    return { error: "Empty response" } as const;
  }

  const parsed = extractJson(outputText);
  if (!parsed) {
    return { error: "Invalid JSON response" } as const;
  }

  return { data: parsed } as const;
};

const extractJson = (text: string) => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  const jsonText = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
};

const parseOrderWithAzureOcr = async (file: File) => {
  const endpoint = process.env.AZURE_DOCINT_ENDPOINT;
  const apiKey = process.env.AZURE_DOCINT_KEY;
  const model = process.env.AZURE_DOCINT_MODEL || "prebuilt-document";
  const apiVersion = process.env.AZURE_DOCINT_API_VERSION || "2024-07-31";

  if (!endpoint || !apiKey) {
    return { error: "Missing Azure OCR settings" } as const;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base = endpoint.replace(/\/$/, "");
  const analyzeUrl = `${base}/documentintelligence/documentModels/${model}:analyze?api-version=${apiVersion}`;
  const fallbackUrl = `${base}/formrecognizer/documentModels/${model}:analyze?api-version=${apiVersion}`;

  const runAnalyze = async (url: string) => {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/pdf",
        "Ocp-Apim-Subscription-Key": apiKey
      },
      body: buffer
    });
  };

  let analyzeResp = await runAnalyze(analyzeUrl);
  if (analyzeResp.status === 404) {
    analyzeResp = await runAnalyze(fallbackUrl);
  }

  if (analyzeResp.status !== 202) {
    const text = await analyzeResp.text();
    return { error: `Azure OCR error: ${text}` } as const;
  }

  const operationUrl = analyzeResp.headers.get("operation-location");
  if (!operationUrl) {
    return { error: "Missing operation-location" } as const;
  }

  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const statusResp = await fetch(operationUrl, {
      headers: { "Ocp-Apim-Subscription-Key": apiKey }
    });
    if (!statusResp.ok) {
      const text = await statusResp.text();
      return { error: `Azure OCR status error: ${text}` } as const;
    }
    const statusData = await statusResp.json();
    if (statusData.status === "succeeded") {
      const content = statusData.analyzeResult?.content || "";
      return { data: content } as const;
    }
    if (statusData.status === "failed") {
      return { error: "Azure OCR failed" } as const;
    }
  }

  return { error: "Azure OCR timeout" } as const;
};

export async function POST(request: Request) {
  const { response } = await requireUser();
  if (response) {
    return response;
  }

  if (process.env.OCR_LLM_ENABLED !== "true") {
    return jsonError("OCR/LLM disabled", 400);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return jsonError("Missing file", 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError("File too large", 400);
  }

  const provider = process.env.OCR_LLM_PROVIDER || "openai";

  if (provider === "openai") {
    const result = await parseOrderWithOpenAIImage(file);
    if ("error" in result) {
      return jsonError(result.error ?? "Unknown error", 400);
    }
    return NextResponse.json(result.data);
  }

  if (provider === "azure") {
    const ocrResult = await parseOrderWithAzureOcr(file);
    if ("error" in ocrResult) {
      return jsonError(ocrResult.error ?? "Unknown OCR error", 400);
    }
    const llmResult = await parseOrderWithOpenAIText(ocrResult.data);
    if ("error" in llmResult) {
      return jsonError(llmResult.error ?? "Unknown LLM error", 400);
    }
    return NextResponse.json(llmResult.data);
  }

  return jsonError("Unsupported OCR/LLM provider", 400);
}

