import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const projects = await prisma.project.findMany({
    where: user.role === "ADMIN" ? undefined : { projectManagerEmail: user.email },
    include: {
      client: true,
    },
    orderBy: { projectNumber: "asc" },
  });

  const hoursByProject = await prisma.timeEntry.groupBy({
    by: ["projectId", "type"],
    _sum: { hours: true },
  });

  const deliverablesTotal = await prisma.deliverable.groupBy({
    by: ["projectId"],
    _sum: { percentage: true },
  });

  const deliverablesCompleted = await prisma.deliverable.groupBy({
    by: ["projectId"],
    _sum: { percentage: true },
    where: { status: { in: ["REMIS", "VALIDE"] } },
  });

  const hoursMap = new Map(
    hoursByProject.map(item => [`${item.projectId}:${item.type}`, item._sum.hours ?? 0])
  );
  const totalMap = new Map(deliverablesTotal.map(item => [item.projectId, item._sum.percentage ?? 0]));
  const completedMap = new Map(deliverablesCompleted.map(item => [item.projectId, item._sum.percentage ?? 0]));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Projets");

  sheet.columns = [
    { header: "N° projet", key: "projectNumber", width: 16 },
    { header: "Designation", key: "designation", width: 38 },
    { header: "Client", key: "client", width: 30 },
    { header: "Type", key: "type", width: 10 },
    { header: "Statut", key: "status", width: 12 },
    { header: "N° commande", key: "orderNumber", width: 16 },
    { header: "Date commande", key: "orderDate", width: 14 },
    { header: "Montant commande", key: "orderAmount", width: 18 },
    { header: "N° devis", key: "quoteNumber", width: 16 },
    { header: "Date devis", key: "quoteDate", width: 14 },
    { header: "Chef de projet", key: "projectManager", width: 20 },
    { header: "Avancement (%)", key: "progress", width: 16 },
    { header: "Restant BO (jours)", key: "remainingBo", width: 18 },
    { header: "Restant SITE (jours)", key: "remainingSite", width: 20 },
    { header: "Restant (%) Forfait", key: "remainingForfait", width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  projects.forEach(project => {
    const hoursBo = hoursMap.get(`${project.id}:BO`) ?? 0;
    const hoursSite = hoursMap.get(`${project.id}:SITE`) ?? 0;
    const soldDaysBo = project.atDaysSoldBO ?? 0;
    const soldDaysSite = project.atDaysSoldSite ?? 0;
    const soldDays = soldDaysBo + soldDaysSite;
    const consumedDaysBo = hoursBo / 8;
    const consumedDaysSite = hoursSite / 8;
    const consumedDays = consumedDaysBo + consumedDaysSite;
    const totalPercentage = totalMap.get(project.id) ?? 0;
    const completedPercentage = completedMap.get(project.id) ?? 0;

    let progress = 0;
    if (project.type === "AT") {
      progress = soldDays > 0 ? Math.min(1, consumedDays / soldDays) : 0;
    } else {
      progress = totalPercentage > 0 ? Math.min(1, completedPercentage / totalPercentage) : 0;
    }

    const remainingBo = project.type === "AT"
      ? Number(Math.max(0, soldDaysBo - consumedDaysBo).toFixed(3))
      : null;
    const remainingSite = project.type === "AT"
      ? Number(Math.max(0, soldDaysSite - consumedDaysSite).toFixed(3))
      : null;
    const remainingForfait = project.type !== "AT"
      ? Number((Math.max(0, 1 - progress) * 100).toFixed(2))
      : null;

    sheet.addRow({
      projectNumber: project.projectNumber,
      designation: project.designation,
      client: project.client.name,
      type: project.type,
      status: project.status,
      orderNumber: project.orderNumber,
      orderDate: project.orderDate,
      orderAmount: project.orderAmount ?? null,
      quoteNumber: project.quoteNumber,
      quoteDate: project.quoteDate,
      projectManager: project.projectManager,
      progress: Number((progress * 100).toFixed(2)),
      remainingBo,
      remainingSite,
      remainingForfait,
    });
  });

  sheet.getColumn("orderAmount").numFmt = "#,##0.00";
  sheet.getColumn("orderDate").numFmt = "dd/mm/yyyy";
  sheet.getColumn("quoteDate").numFmt = "dd/mm/yyyy";
  sheet.getColumn("progress").numFmt = "0.00";
  sheet.getColumn("remainingBo").numFmt = "0.00";
  sheet.getColumn("remainingSite").numFmt = "0.00";
  sheet.getColumn("remainingForfait").numFmt = "0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `projets-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

