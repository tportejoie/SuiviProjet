import { PrismaClient, ProjectStatus, ProjectType, DeliverableStatus, TimeEntryType } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.bordereauVersion.deleteMany(),
    prisma.adobeAgreement.deleteMany(),
    prisma.bordereau.deleteMany(),
    prisma.projectSituationSnapshot.deleteMany(),
    prisma.timeEntry.deleteMany(),
    prisma.deliverable.deleteMany(),
    prisma.periodLock.deleteMany(),
    prisma.project.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.client.deleteMany(),
    prisma.fileObject.deleteMany()
  ]);

  const client1 = await prisma.client.create({
    data: {
      name: "TotalEnergies",
      address: "2 Place Jean Millier\n92400 Courbevoie",
      siren: "542051180",
      siret: "54205118000066",
      tvaIntra: "FR 84 542051180"
    }
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Airbus",
      address: "1 Rond-point Maurice Bellonte\n31700 Blagnac",
      siren: "383474814",
      siret: "38347481400010"
    }
  });

  const contact1 = await prisma.contact.create({
    data: {
      clientId: client1.id,
      name: "Jean Dupont",
      email: "j.dupont@total.com",
      role: "Responsable Maintenance",
      phone: "01 40 00 00 01",
      active: true
    }
  });

  const contact2 = await prisma.contact.create({
    data: {
      clientId: client2.id,
      name: "Marie Curie",
      email: "m.curie@airbus.com",
      role: "Chef de Projet Innovation",
      phone: "05 61 00 00 02",
      active: true
    }
  });

  const atProject1 = await prisma.project.create({
    data: {
      projectNumber: "PRJ-2024-001",
      orderNumber: "CMD-12345",
      orderDate: new Date("2024-01-15"),
      quoteNumber: "DEV-2023-99",
      quoteDate: new Date("2023-12-01"),
      clientId: client1.id,
      contactId: contact1.id,
      designation: "Audit securite Site Lacq",
      projectManager: "Thomas Wagner",
      projectManagerEmail: "thomas.wagner@myjamae.com",
      type: ProjectType.AT,
      status: ProjectStatus.EN_COURS,
      atDaysSoldBO: 20,
      atDaysSoldSite: 10,
      atDailyRateBO: 850,
      atDailyRateSite: 950
    }
  });

  const atProject2 = await prisma.project.create({
    data: {
      projectNumber: "PRJ-2024-002",
      orderNumber: "CMD-67890",
      orderDate: new Date("2024-02-10"),
      quoteNumber: "DEV-2024-05",
      quoteDate: new Date("2024-01-20"),
      clientId: client2.id,
      contactId: contact2.id,
      designation: "Maintenance operationnelle",
      projectManager: "Sara Bernard",
      projectManagerEmail: "sara.bernard@myjamae.com",
      type: ProjectType.AT,
      status: ProjectStatus.EN_COURS,
      atDaysSoldBO: 15,
      atDaysSoldSite: 5,
      atDailyRateBO: 820,
      atDailyRateSite: 980
    }
  });

  const atProject3 = await prisma.project.create({
    data: {
      projectNumber: "PRJ-2024-003",
      orderNumber: "CMD-33333",
      orderDate: new Date("2024-03-05"),
      quoteNumber: "DEV-2024-08",
      quoteDate: new Date("2024-02-15"),
      clientId: client1.id,
      contactId: contact1.id,
      designation: "Assistance technique HSE",
      projectManager: "Nora Gallet",
      projectManagerEmail: "nora.gallet@myjamae.com",
      type: ProjectType.AT,
      status: ProjectStatus.PREVU,
      atDaysSoldBO: 12,
      atDaysSoldSite: 8,
      atDailyRateBO: 780,
      atDailyRateSite: 920
    }
  });

  const forfaitProject1 = await prisma.project.create({
    data: {
      projectNumber: "PRJ-2024-004",
      orderNumber: "CMD-88888",
      orderDate: new Date("2024-02-12"),
      orderAmount: 42000,
      quoteNumber: "DEV-2024-06",
      quoteDate: new Date("2024-01-28"),
      clientId: client1.id,
      contactId: contact1.id,
      designation: "Mise en conformite procedure",
      projectManager: "Julien Perrot",
      projectManagerEmail: "julien.perrot@myjamae.com",
      type: ProjectType.FORFAIT,
      status: ProjectStatus.EN_COURS
    }
  });

  const forfaitProject2 = await prisma.project.create({
    data: {
      projectNumber: "PRJ-2024-005",
      orderNumber: "CMD-99999",
      orderDate: new Date("2024-03-15"),
      orderAmount: 65000,
      quoteNumber: "DEV-2024-10",
      quoteDate: new Date("2024-02-25"),
      clientId: client2.id,
      contactId: contact2.id,
      designation: "Refonte outillage qualite",
      projectManager: "Camille Noel",
      projectManagerEmail: "camille.noel@myjamae.com",
      type: ProjectType.FORFAIT,
      status: ProjectStatus.EN_COURS
    }
  });

  await prisma.deliverable.createMany({
    data: [
      {
        projectId: forfaitProject1.id,
        label: "Diagnostic initial",
        percentage: 30,
        targetDate: new Date("2024-04-10"),
        status: DeliverableStatus.REMIS
      },
      {
        projectId: forfaitProject1.id,
        label: "Plan d'action",
        percentage: 40,
        targetDate: new Date("2024-05-20"),
        status: DeliverableStatus.NON_REMIS
      },
      {
        projectId: forfaitProject1.id,
        label: "Cloture et transfert",
        percentage: 30,
        targetDate: new Date("2024-06-15"),
        status: DeliverableStatus.NON_REMIS
      },
      {
        projectId: forfaitProject2.id,
        label: "Analyse fonctionnelle",
        percentage: 25,
        targetDate: new Date("2024-04-05"),
        status: DeliverableStatus.VALIDE
      },
      {
        projectId: forfaitProject2.id,
        label: "Prototype",
        percentage: 35,
        targetDate: new Date("2024-05-05"),
        status: DeliverableStatus.REMIS
      },
      {
        projectId: forfaitProject2.id,
        label: "Deploiement",
        percentage: 40,
        targetDate: new Date("2024-06-30"),
        status: DeliverableStatus.NON_REMIS
      }
    ]
  });

  const timeEntries = [
    { projectId: atProject1.id, year: 2024, month: 2, day: 1, type: TimeEntryType.BO, hours: 4 },
    { projectId: atProject1.id, year: 2024, month: 2, day: 2, type: TimeEntryType.BO, hours: 6 },
    { projectId: atProject1.id, year: 2024, month: 2, day: 2, type: TimeEntryType.SITE, hours: 2 },
    { projectId: atProject1.id, year: 2024, month: 2, day: 3, type: TimeEntryType.SITE, hours: 8 },
    { projectId: atProject2.id, year: 2024, month: 2, day: 4, type: TimeEntryType.BO, hours: 8 },
    { projectId: atProject2.id, year: 2024, month: 2, day: 5, type: TimeEntryType.SITE, hours: 6 },
    { projectId: atProject2.id, year: 2024, month: 2, day: 6, type: TimeEntryType.SITE, hours: 4 },
    { projectId: atProject3.id, year: 2024, month: 3, day: 2, type: TimeEntryType.BO, hours: 8 }
  ];

  for (const entry of timeEntries) {
    await prisma.timeEntry.create({
      data: {
        ...entry,
        hourSlot: 0,
        comment: ""
      }
    });
  }
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
