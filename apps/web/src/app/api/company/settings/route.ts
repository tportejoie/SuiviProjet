import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

const DEFAULT_COMPANY_ID = "default";
const DEFAULT_SETTINGS = {
  name: "JAMAE",
  legalForm: "EURL",
  headquarters: "250 rue Raymond Durand 38110 ST CLAIR DE LA TOUR",
  siren: "845021690",
  siret: "84502169000043",
  tvaNumber: "FR55845021690",
  capital: "1 500 EUR",
  rcs: "RCS Vienne 845 021 690 00043",
  phone: "+33 675 36 71 16",
  email: "tportejoie@myjamae.com",
  website: null
};

export async function GET() {
  const settings = await prisma.companySettings.findUnique({
    where: { id: DEFAULT_COMPANY_ID },
    include: { logoFile: true }
  });

  const data = settings ?? {
    id: DEFAULT_COMPANY_ID,
    ...DEFAULT_SETTINGS,
    logoFileId: null
  };

  return NextResponse.json({
    id: data.id,
    name: data.name,
    legalForm: data.legalForm,
    headquarters: data.headquarters,
    siren: data.siren,
    siret: data.siret,
    tvaNumber: data.tvaNumber,
    capital: data.capital,
    rcs: data.rcs,
    phone: data.phone,
    email: data.email,
    website: data.website,
    logoUrl: data.logoFileId ? "/api/company/logo" : null
  });
}

export async function PUT(request: Request) {
  const { response } = await requireAdmin();
  if (response) {
    return response;
  }

  const payload = await request.json();
  if (!payload.name) {
    return jsonError("Missing name", 400);
  }

  const updated = await prisma.companySettings.upsert({
    where: { id: DEFAULT_COMPANY_ID },
    create: {
      id: DEFAULT_COMPANY_ID,
      name: payload.name,
      legalForm: payload.legalForm || null,
      headquarters: payload.headquarters || null,
      siren: payload.siren || null,
      siret: payload.siret || null,
      tvaNumber: payload.tvaNumber || null,
      capital: payload.capital || null,
      rcs: payload.rcs || null,
      phone: payload.phone || null,
      email: payload.email || null,
      website: payload.website || null
    },
    update: {
      name: payload.name,
      legalForm: payload.legalForm || null,
      headquarters: payload.headquarters || null,
      siren: payload.siren || null,
      siret: payload.siret || null,
      tvaNumber: payload.tvaNumber || null,
      capital: payload.capital || null,
      rcs: payload.rcs || null,
      phone: payload.phone || null,
      email: payload.email || null,
      website: payload.website || null
    }
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    legalForm: updated.legalForm,
    headquarters: updated.headquarters,
    siren: updated.siren,
    siret: updated.siret,
    tvaNumber: updated.tvaNumber,
    capital: updated.capital,
    rcs: updated.rcs,
    phone: updated.phone,
    email: updated.email,
    website: updated.website,
    logoUrl: updated.logoFileId ? "/api/company/logo" : null
  });
}
