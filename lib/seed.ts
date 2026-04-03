import { prisma } from "./prisma";

const SEED_TREE_ID = "demo-seed-yildiz-ailesi";
const SEED_USER_ID = "demo-seed-user";

export async function seedDatabase() {
  const existing = await prisma.familyTree.findUnique({
    where: { id: SEED_TREE_ID },
  });
  if (existing) return;

  console.log("[seed] Creating demo family tree...");

  await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    update: {},
    create: {
      id: SEED_USER_ID,
      name: "Demo Kullanıcı",
      email: "demo@familytree.local",
    },
  });

  await prisma.familyTree.create({
    data: {
      id: SEED_TREE_ID,
      name: "Yıldız Ailesi",
      description: "Örnek aile ağacı",
      ownerId: SEED_USER_ID,
      isPublic: true,
    },
  });

  await Promise.all([
    // Kuşak 1 – Yıldız tarafı
    prisma.familyMember.create({
      data: {
        id: "seed-mehmet",
        treeId: SEED_TREE_ID,
        firstName: "Mehmet",
        lastName: "Yıldız",
        gender: "MALE",
        birthDate: new Date("1940-03-15"),
        deathDate: new Date("2015-11-20"),
        birthPlace: "Konya",
        occupation: "Öğretmen",
        bio: "Emekli ilkokul öğretmeni. Üç torun sahibi olarak hayata gözlerini yumdu.",
      },
    }),
    prisma.familyMember.create({
      data: {
        id: "seed-fatma",
        treeId: SEED_TREE_ID,
        firstName: "Fatma",
        lastName: "Yıldız",
        gender: "FEMALE",
        birthDate: new Date("1943-07-08"),
        birthPlace: "Ankara",
        occupation: "Ev Hanımı",
        bio: "Ailesini bir arada tutan güçlü bir kadın. Mutfağı ve bahçesiyle tanınırdı.",
      },
    }),
    // Kuşak 1 – Demir tarafı
    prisma.familyMember.create({
      data: {
        id: "seed-ali",
        treeId: SEED_TREE_ID,
        firstName: "Ali",
        lastName: "Demir",
        gender: "MALE",
        birthDate: new Date("1938-05-22"),
        deathDate: new Date("2010-04-03"),
        birthPlace: "Bursa",
        occupation: "Mühendis",
        bio: "İnşaat mühendisi olarak pek çok önemli projede görev aldı.",
      },
    }),
    prisma.familyMember.create({
      data: {
        id: "seed-ayse",
        treeId: SEED_TREE_ID,
        firstName: "Ayşe",
        lastName: "Demir",
        gender: "FEMALE",
        birthDate: new Date("1941-12-01"),
        birthPlace: "İzmir",
        occupation: "Hemşire",
        bio: "Yıllarca devlet hastanesinde hemşire olarak çalıştı.",
      },
    }),
    // Kuşak 2
    prisma.familyMember.create({
      data: {
        id: "seed-hasan",
        treeId: SEED_TREE_ID,
        firstName: "Hasan",
        lastName: "Yıldız",
        gender: "MALE",
        birthDate: new Date("1965-09-14"),
        birthPlace: "İstanbul",
        occupation: "Doktor",
        bio: "Kardiyoloji uzmanı. İstanbul'da özel muayenehanesi var.",
      },
    }),
    prisma.familyMember.create({
      data: {
        id: "seed-leyla",
        treeId: SEED_TREE_ID,
        firstName: "Leyla",
        lastName: "Arslan",
        gender: "FEMALE",
        birthDate: new Date("1968-02-28"),
        birthPlace: "İstanbul",
        occupation: "Avukat",
        bio: "Aile hukuku alanında uzman avukat. Hasan'ın kız kardeşi.",
      },
    }),
    prisma.familyMember.create({
      data: {
        id: "seed-zeynep",
        treeId: SEED_TREE_ID,
        firstName: "Zeynep",
        lastName: "Yıldız",
        gender: "FEMALE",
        birthDate: new Date("1967-06-19"),
        birthPlace: "Ankara",
        occupation: "Öğretmen",
        bio: "Ortaokul matematik öğretmeni. Hasan ile 1991'de evlendi.",
      },
    }),
    // Kuşak 3
    prisma.familyMember.create({
      data: {
        id: "seed-emre",
        treeId: SEED_TREE_ID,
        firstName: "Emre",
        lastName: "Yıldız",
        gender: "MALE",
        birthDate: new Date("1992-04-11"),
        birthPlace: "İstanbul",
        occupation: "Yazılım Mühendisi",
        bio: "Bir teknoloji şirketinde kıdemli yazılım mühendisi olarak çalışıyor.",
      },
    }),
    prisma.familyMember.create({
      data: {
        id: "seed-selin",
        treeId: SEED_TREE_ID,
        firstName: "Selin",
        lastName: "Yıldız",
        gender: "FEMALE",
        birthDate: new Date("1995-08-30"),
        birthPlace: "İstanbul",
        occupation: "Mimar",
        bio: "Mimarlık bürolarında proje mimarı olarak görev yapıyor.",
      },
    }),
    prisma.familyMember.create({
      data: {
        id: "seed-burak",
        treeId: SEED_TREE_ID,
        firstName: "Burak",
        lastName: "Yıldız",
        gender: "MALE",
        birthDate: new Date("1999-01-25"),
        birthPlace: "İstanbul",
        occupation: "Üniversite Öğrencisi",
        bio: "İstanbul Teknik Üniversitesi Bilgisayar Mühendisliği bölümünde öğrenci.",
      },
    }),
  ]);

  await Promise.all([
    // Eşler
    prisma.relationship.create({
      data: {
        id: "seed-rel-01",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-mehmet",
        toMemberId: "seed-fatma",
        type: "SPOUSE",
        marriageDate: new Date("1962-06-15"),
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-02",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-ali",
        toMemberId: "seed-ayse",
        type: "SPOUSE",
        marriageDate: new Date("1960-09-10"),
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-03",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-hasan",
        toMemberId: "seed-zeynep",
        type: "SPOUSE",
        marriageDate: new Date("1991-05-20"),
      },
    }),
    // Ebeveyn–çocuk (Yıldız)
    prisma.relationship.create({
      data: {
        id: "seed-rel-04",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-mehmet",
        toMemberId: "seed-hasan",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-05",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-fatma",
        toMemberId: "seed-hasan",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-06",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-mehmet",
        toMemberId: "seed-leyla",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-07",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-fatma",
        toMemberId: "seed-leyla",
        type: "PARENT_CHILD",
      },
    }),
    // Ebeveyn–çocuk (Demir)
    prisma.relationship.create({
      data: {
        id: "seed-rel-08",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-ali",
        toMemberId: "seed-zeynep",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-09",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-ayse",
        toMemberId: "seed-zeynep",
        type: "PARENT_CHILD",
      },
    }),
    // Ebeveyn–çocuk (Kuşak 2 → Kuşak 3)
    prisma.relationship.create({
      data: {
        id: "seed-rel-10",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-hasan",
        toMemberId: "seed-emre",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-11",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-zeynep",
        toMemberId: "seed-emre",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-12",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-hasan",
        toMemberId: "seed-selin",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-13",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-zeynep",
        toMemberId: "seed-selin",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-14",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-hasan",
        toMemberId: "seed-burak",
        type: "PARENT_CHILD",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-15",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-zeynep",
        toMemberId: "seed-burak",
        type: "PARENT_CHILD",
      },
    }),
    // Kardeşler
    prisma.relationship.create({
      data: {
        id: "seed-rel-16",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-hasan",
        toMemberId: "seed-leyla",
        type: "SIBLING",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-17",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-emre",
        toMemberId: "seed-selin",
        type: "SIBLING",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-18",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-emre",
        toMemberId: "seed-burak",
        type: "SIBLING",
      },
    }),
    prisma.relationship.create({
      data: {
        id: "seed-rel-19",
        treeId: SEED_TREE_ID,
        fromMemberId: "seed-selin",
        toMemberId: "seed-burak",
        type: "SIBLING",
      },
    }),
  ]);

  await prisma.treeMembership.create({
    data: {
      id: "seed-membership-01",
      treeId: SEED_TREE_ID,
      userId: SEED_USER_ID,
      role: "OWNER",
    },
  });

  console.log("[seed] Demo family tree created successfully.");
}
