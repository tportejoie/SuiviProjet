import BordereauDocument from "@/components/BordereauDocument";
import { prisma } from "@/lib/prisma";
import { DeliverableStatus, ProjectType } from "@/types";

interface BordereauPrintPageProps {
  searchParams?: {
    projectId?: string;
    year?: string;
    month?: string;
  };
}

export default async function BordereauPrintPage({ searchParams }: BordereauPrintPageProps) {
  const projectId = searchParams?.projectId;
  if (!projectId) {
    return <div className="p-8 text-sm text-slate-500">Missing projectId</div>;
  }

  const periodYear = Number(searchParams?.year) || new Date().getFullYear();
  const periodMonth = Number(searchParams?.month) || new Date().getMonth();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true, contact: true, deliverables: true }
  });

  if (!project) {
    return <div className="p-8 text-sm text-slate-500">Project not found</div>;
  }

  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      projectId,
      year: periodYear,
      month: periodMonth
    }
  });

  const bordereauComments = await prisma.bordereauComment.findMany({
    where: {
      projectId,
      year: periodYear,
      month: periodMonth
    },
    orderBy: [{ day: "asc" }, { type: "asc" }]
  });

  const company = await prisma.companySettings.findUnique({
    where: { id: "default" },
    include: { logoFile: true }
  });

  return (
    <div className="bg-white">
      <BordereauDocument
        project={{
          projectNumber: project.projectNumber,
          designation: project.designation,
          orderNumber: project.orderNumber,
          quoteNumber: project.quoteNumber,
          projectManager: project.projectManager,
          type: project.type as ProjectType,
          atDaysSoldBO: project.atDaysSoldBO,
          atDaysSoldSite: project.atDaysSoldSite
        }}
        client={{
          name: project.client.name,
          address: project.client.address
        }}
        contact={{
          name: project.contact.name,
          email: project.contact.email
        }}
        timeEntries={timeEntries.map(entry => ({ day: entry.day, type: entry.type, hours: entry.hours }))}
        deliverables={project.deliverables.map(deliverable => ({
          id: deliverable.id,
          label: deliverable.label,
          percentage: deliverable.percentage,
          status: deliverable.status as DeliverableStatus,
          submissionDate: deliverable.submissionDate
        }))}
        periodYear={periodYear}
        periodMonth={periodMonth}
        bordereauComments={bordereauComments.map(comment => ({
          id: comment.id,
          projectId: comment.projectId,
          year: comment.year,
          month: comment.month,
          day: comment.day,
          type: comment.type,
          comment: comment.comment
        }))}
        company={company ? {
          id: company.id,
          name: company.name,
          legalForm: company.legalForm,
          headquarters: company.headquarters,
          siren: company.siren,
          siret: company.siret,
          tvaNumber: company.tvaNumber,
          capital: company.capital,
          rcs: company.rcs,
          phone: company.phone,
          email: company.email,
          website: company.website,
          logoUrl: company.logoFileId ? "/api/company/logo" : null
        } : null}
      />
    </div>
  );
}
