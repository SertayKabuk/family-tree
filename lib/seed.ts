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
        bio: "Konya'nın Karatay ilçesinde doğan Mehmet Yıldız, Ankara Yüksek Öğretmen Okulu'ndan 1963 yılında mezun oldu. Otuz iki yıl boyunca İstanbul'un çeşitli ilkokullarında öğretmenlik yaptı; öğrencileri arasında en çok 'sabır öğretmeni' olarak anılırdı. Emekliliğinden sonra Konya'ya yerleşerek ahşap oymacılığıyla ilgilendi. Satranç kulübünün kurucu üyesiydi ve her pazar sabahı komşularıyla oynardı. 2015 yılında kalp yetmezliği nedeniyle Konya'da hayatını kaybetti; geride eşi Fatma, oğlu Hasan, kızı Leyla ve üç torunu kaldı.",
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
        bio: "Ankara'da dünyaya gelen Fatma Yıldız, 1962'de Mehmet ile evlenerek İstanbul'a taşındı. İki çocuk yetiştirirken mahalle muhtarlığında gönüllü kâtiplik yaptı, okuma-yazma bilmeyen kadınlara ders verdi. Elinden çıkan gözlemeler ve mantıları semtin en meşhuruydu; her yıl Ramazan ayında komşulara büyük tencereler dolusu yemek götürürdü. Kocasının vefatından sonra oğlu Hasan'ın yanına İstanbul'a döndü. Torunlarına masal anlatmayı ve balkon bahçesinde domates yetiştirmeyi sürdürüyor.",
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
        bio: "Bursa'da çarşı esnafının oğlu olarak dünyaya gelen Ali Demir, İTÜ İnşaat Mühendisliği'nden 1962'de mezun oldu. Devlet Su İşleri bünyesinde barajlar ve köprüler üzerinde çalıştı; kariyerinin zirvesinde Doğu Anadolu'daki birkaç büyük barajın saha şefliğini üstlendi. Mesleğine duyduğu gururu çocuklarına her fırsatta anlatır, mühendislik çizimlerini yıllarca saklardı. Güreşe tutkuyla bağlıydı; hafta sonları spor salonuna gitmeyi 70'li yaşlarına kadar sürdürdü. 2010 yılında kronik böbrek yetmezliği nedeniyle Bursa'da hayatını kaybetti.",
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
        bio: "İzmir Bornova'da büyüyen Ayşe Demir, Ege Üniversitesi Hemşirelik Yüksekokulu'ndan 1963'te mezun olarak mesleğe adım attı. Bursa Şevket Yılmaz Devlet Hastanesi'nde yirmi beş yıl boyunca dahiliye servisinde çalıştı; meslektaşları arasında sakin ve güvenilir duruşuyla öne çıkardı. Kızı Zeynep'in İstanbul'a taşınmasından sonra emekliliğini Bursa'da geçiriyor; pazar sabahları komşularıyla birlikte yürüyüş yapıyor ve Kur'an kursu gönüllüsü olarak hizmet veriyor.",
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
        bio: "İstanbul'da büyüyen Hasan Yıldız, İstanbul Tıp Fakültesi'nden 1991'de mezun oldu ve Cerrahpaşa'da kardiyoloji ihtisasını tamamladı. On beş yıl boyunca İstanbul Eğitim ve Araştırma Hastanesi'nde uzman hekim olarak görev yaptıktan sonra 2010'da Kadıköy'de kendi muayenehanesini açtı. Kalp ritim bozuklukları üzerine iki akademik makale yayımladı. Hafta sonları ailesiyle Büyükada'ya feribot gezintileri yapmaktan büyük keyif alır; genç doktorlara ücretsiz mentorluk veriyor.",
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
        bio: "Marmara Üniversitesi Hukuk Fakültesi'nden 1992'de mezun olan Leyla Arslan, kariyerinin ilk yıllarını bir büyük İstanbul hukuk bürosunda boşanma ve velayet davalarına odaklanarak geçirdi. 2003'te Şişli'de kendi hukuk bürosunu kurdu; bugün ağırlıklı olarak kadın hakları ve çocuk velayeti alanında davalar üstleniyor. Barosu aracılığıyla engelli ailelere ücretsiz hukuki danışmanlık veriyor. Soyadını evlilik yoluyla alan Leyla, 1998'de eşi Murat Arslan ile evlendi; iki çocuğu var. Ağabeyi Hasan'la her Cuma akşamı ailece yemek yeme geleneğini sürdürüyorlar.",
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
        bio: "Ankara'da büyüyen Zeynep Yıldız, Hacettepe Üniversitesi Matematik Bölümü'nden 1989'da mezun oldu ve ardından öğretmenlik sertifikası aldı. Boğaziçi'nde yüksek lisansını tamamlarken Hasan ile tanışıp 1991'de evlendi. Kadıköy'de bir ortaokulda yirmi yılı aşkın süredir 7. ve 8. sınıf matematik dersleri veriyor. Öğrencilerin matematiği somut örneklerle kavraması için hazırladığı el yapımı materyaller meslektaşları arasında çok tutuldu. Satranç kulübünü okulda o kurdu; her yıl düzenlediği matematik olimpiyatlarında öğrencileri bölge derecesi alıyor.",
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
        bio: "İTÜ Bilgisayar Mühendisliği'nden 2015'te onur derecesiyle mezun olan Emre Yıldız, önce bir startup'ta backend geliştirici olarak çalıştı, ardından 2019'da Türkiye'nin önde gelen e-ticaret platformlarından birinde kıdemli mühendis kadrosuna geçti. Dağıtık sistemler ve mikroservis mimarisi konularında uzmanlaşmış; GitHub'daki açık kaynak katkılarıyla Türkiye yazılım topluluğunda tanınan bir isim. Boş zamanlarında rock tırmanma yapıyor ve amatör fotoğrafçılıkla ilgileniyor. Beşiktaş'ta yalnız yaşıyor, büyükannesi Fatma'yı her hafta ziyaret ediyor.",
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
        bio: "İstanbul Teknik Üniversitesi Mimarlık Fakültesi'nden 2018'de mezun olan Selin Yıldız, mezuniyet projesinde sürdürülebilir kentsel dönüşüm önerisiyle fakülte ödülü aldı. Karaköy'deki butik bir mimarlık bürosunda proje mimarı olarak çalışıyor; ofis binaları ve karma kullanım projeleri tasarımında uzmanlaşmış. 2023'te katıldığı uluslararası eko-mimari yarışmasında Türkiye'den seçilen üç finalisten biri oldu. Annesinden devraldığı satranç sevgisini sürdürüyor; Cihangir'deki küçük dairesini kendi çizimleriyle dekore etti.",
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
        bio: "İTÜ Bilgisayar Mühendisliği 3. sınıf öğrencisi olan Burak Yıldız, ağabeyi Emre'nin izinden giderek yazılıma ilgi duydu; ancak yapay zeka ve makine öğrenmesi alanına yönelerek kendine özgü bir patika çizdi. Üniversitenin yapay zeka kulübü başkanlığını yürütüyor; geçen yaz İTÜ-Tübitak ortak projesi kapsamında doğal dil işleme araştırmasında stajyer olarak görev yaptı. Uzun mesafe koşucusu; 2025'te katıldığı İstanbul Maratonu'nda yarım marat kategorisini tamamladı. Annesi Zeynep gibi matematiğe tutkuyla bağlı, tatillerde liseli yeğenlerine ücretsiz özel ders veriyor.",
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

  await Promise.all([
    // Mehmet Yıldız
    prisma.fact.create({ data: { id: "seed-fact-01", memberId: "seed-mehmet", title: "Öğretmenlik Diploması", content: "Ankara Yüksek Öğretmen Okulu'ndan mezun olarak öğretmenlik kariyerine başladı.", date: new Date("1963-06-20"), source: "Aile belgeleri" } }),
    prisma.fact.create({ data: { id: "seed-fact-02", memberId: "seed-mehmet", title: "Evlilik", content: "Fatma Hanım ile Konya'da kıyılan nikahla evlendi.", date: new Date("1962-06-15"), source: "Nüfus cüzdanı" } }),
    prisma.fact.create({ data: { id: "seed-fact-03", memberId: "seed-mehmet", title: "Müdür Yardımcılığı", content: "Görev yaptığı Kadıköy ilkokulunda müdür yardımcısı olarak atandı.", date: new Date("1975-09-01"), source: "Özlük dosyası" } }),
    prisma.fact.create({ data: { id: "seed-fact-04", memberId: "seed-mehmet", title: "Emeklilik", content: "Otuz iki yıllık öğretmenlik kariyerinin ardından Milli Eğitim Bakanlığı'ndan emekliye ayrıldı.", date: new Date("1995-08-31"), source: "Emeklilik belgesi" } }),

    // Fatma Yıldız
    prisma.fact.create({ data: { id: "seed-fact-05", memberId: "seed-fatma", title: "Evlilik", content: "Mehmet Yıldız ile Konya'da evlenerek İstanbul'a taşındı.", date: new Date("1962-06-15"), source: "Nüfus cüzdanı" } }),
    prisma.fact.create({ data: { id: "seed-fact-06", memberId: "seed-fatma", title: "Okuma-Yazma Kursu", content: "Mahalle muhtarlığı bünyesinde okuma-yazma bilmeyen kadınlar için gönüllü kurs başlattı; ilk iki yılda 34 kadın sertifika aldı.", date: new Date("1985-03-08"), source: "Muhtarlık kayıtları" } }),
    prisma.fact.create({ data: { id: "seed-fact-07", memberId: "seed-fatma", title: "İstanbul'a Dönüş", content: "Eşi Mehmet'in vefatının ardından oğlu Hasan'ın yanına İstanbul'a yerleşti.", date: new Date("2016-02-01"), source: "Aile anlatısı" } }),

    // Ali Demir
    prisma.fact.create({ data: { id: "seed-fact-08", memberId: "seed-ali", title: "Mühendislik Diploması", content: "İstanbul Teknik Üniversitesi İnşaat Mühendisliği bölümünden mezun oldu.", date: new Date("1962-07-10"), source: "Diploma fotokopisi" } }),
    prisma.fact.create({ data: { id: "seed-fact-09", memberId: "seed-ali", title: "Baraj Proje Şefliği", content: "Devlet Su İşleri adına Doğu Anadolu'daki büyük baraj projesinin saha şefi olarak atandı.", date: new Date("1978-04-15"), source: "DSİ personel dosyası" } }),
    prisma.fact.create({ data: { id: "seed-fact-10", memberId: "seed-ali", title: "Devlet Üstün Hizmet Madalyası", content: "Köy Hizmetleri kanalıyla tamamladığı köprü inşaatları nedeniyle Devlet Üstün Hizmet Madalyası ile ödüllendirildi.", date: new Date("1990-10-29"), source: "Resmi Gazete ilanı" } }),

    // Ayşe Demir
    prisma.fact.create({ data: { id: "seed-fact-11", memberId: "seed-ayse", title: "Hemşirelik Mezuniyeti", content: "Ege Üniversitesi Hemşirelik Yüksekokulu'ndan mezun olarak Bursa Devlet Hastanesi'nde göreve başladı.", date: new Date("1963-07-01"), source: "Mezuniyet belgesi" } }),
    prisma.fact.create({ data: { id: "seed-fact-12", memberId: "seed-ayse", title: "Servis Sorumlu Hemşireliği", content: "Uzun yılların deneyimiyle dahiliye servisinde sorumlu hemşire kadrosuna yükseldi.", date: new Date("1988-01-15"), source: "Özlük dosyası" } }),
    prisma.fact.create({ data: { id: "seed-fact-13", memberId: "seed-ayse", title: "Emeklilik", content: "Yirmi beş yıllık meslek hayatının ardından Sosyal Güvenlik Kurumu'ndan emekliye ayrıldı.", date: new Date("1993-12-31"), source: "Emeklilik belgesi" } }),

    // Hasan Yıldız
    prisma.fact.create({ data: { id: "seed-fact-14", memberId: "seed-hasan", title: "Tıp Fakültesi Mezuniyeti", content: "İstanbul Üniversitesi Tıp Fakültesi'nden mezun olarak intörnlüğe başladı.", date: new Date("1991-06-28"), source: "Diploma" } }),
    prisma.fact.create({ data: { id: "seed-fact-15", memberId: "seed-hasan", title: "Kardiyoloji İhtisası", content: "Cerrahpaşa Tıp Fakültesi'nde kardiyoloji uzmanlık eğitimini tamamlayarak uzman hekim unvanı aldı.", date: new Date("1997-09-01"), source: "Uzmanlık belgesi" } }),
    prisma.fact.create({ data: { id: "seed-fact-16", memberId: "seed-hasan", title: "Akademik Yayın", content: "Atriyal fibrilasyon tedavisinde yeni bir protokol öneren makalesi European Heart Journal'da yayımlandı.", date: new Date("2006-03-15"), source: "European Heart Journal, Vol. 27" } }),
    prisma.fact.create({ data: { id: "seed-fact-17", memberId: "seed-hasan", title: "Özel Muayenehane", content: "Kadıköy'de kendi adını taşıyan kardiyoloji muayenehanesini açtı.", date: new Date("2010-05-03"), source: "Tabip Odası kaydı" } }),

    // Leyla Arslan
    prisma.fact.create({ data: { id: "seed-fact-18", memberId: "seed-leyla", title: "Hukuk Mezuniyeti", content: "Marmara Üniversitesi Hukuk Fakültesi'nden mezun olarak İstanbul Barosu'na kayıt yaptırdı.", date: new Date("1992-07-05"), source: "Baro sicil kaydı" } }),
    prisma.fact.create({ data: { id: "seed-fact-19", memberId: "seed-leyla", title: "Evlilik", content: "Murat Arslan ile Boğaziçi kıyısında düzenlenen nikah töreniyle evlendi.", date: new Date("1998-09-12"), source: "Nüfus cüzdanı" } }),
    prisma.fact.create({ data: { id: "seed-fact-20", memberId: "seed-leyla", title: "Kendi Bürosunu Kurdu", content: "Şişli'de 'Arslan Hukuk Bürosu'nu kurarak bağımsız avukatlık pratiğine geçti.", date: new Date("2003-02-17"), source: "Ticaret Sicil Gazetesi" } }),
    prisma.fact.create({ data: { id: "seed-fact-21", memberId: "seed-leyla", title: "Baro Takdirnamesi", content: "Dezavantajlı kadınlara ücretsiz hukuki destek hizmetleri nedeniyle İstanbul Barosu Kadın Hakları Merkezi tarafından takdirname ile ödüllendirildi.", date: new Date("2010-03-08"), source: "Baro bülteni" } }),

    // Zeynep Yıldız
    prisma.fact.create({ data: { id: "seed-fact-22", memberId: "seed-zeynep", title: "Matematik Bölümü Mezuniyeti", content: "Hacettepe Üniversitesi Matematik Bölümü'nden birincilik derecesiyle mezun oldu.", date: new Date("1989-06-17"), source: "Mezuniyet defteri" } }),
    prisma.fact.create({ data: { id: "seed-fact-23", memberId: "seed-zeynep", title: "Yüksek Lisans", content: "Boğaziçi Üniversitesi Matematik Eğitimi programında yüksek lisansını tamamladı.", date: new Date("1993-01-20"), source: "Yüksek lisans diploması" } }),
    prisma.fact.create({ data: { id: "seed-fact-24", memberId: "seed-zeynep", title: "Okul Satranç Kulübü", content: "Görev yaptığı ortaokulda satranç kulübünü kurdu; ilk yılda 40 öğrenci kaydoldu.", date: new Date("2005-10-01"), source: "Okul yıllığı" } }),
    prisma.fact.create({ data: { id: "seed-fact-25", memberId: "seed-zeynep", title: "Bölge Olimpiyat Şampiyonluğu", content: "Hazırladığı öğrenci İstanbul Matematik Olimpiyatları bölge finalinde birinci oldu.", date: new Date("2015-04-18"), source: "Okul gazetesi" } }),

    // Emre Yıldız
    prisma.fact.create({ data: { id: "seed-fact-26", memberId: "seed-emre", title: "Onur Derecesiyle Mezuniyet", content: "İTÜ Bilgisayar Mühendisliği'nden 3.91 not ortalamasıyla onur öğrencisi olarak mezun oldu.", date: new Date("2015-06-20"), source: "Transkript" } }),
    prisma.fact.create({ data: { id: "seed-fact-27", memberId: "seed-emre", title: "Açık Kaynak Projesi", content: "Geliştirdiği dağıtık görev kuyruğu kütüphanesi GitHub'da 2.000'den fazla yıldız alarak Türkiye açık kaynak topluluğunda öne çıktı.", date: new Date("2021-08-14"), source: "GitHub profili" } }),
    prisma.fact.create({ data: { id: "seed-fact-28", memberId: "seed-emre", title: "Konferans Konuşması", content: "DevFest İstanbul'da 'Mikroservis Mimarisinde Hata Toleransı' başlıklı oturumda davetli konuşmacı olarak yer aldı.", date: new Date("2023-11-04"), source: "Konferans programı" } }),

    // Selin Yıldız
    prisma.fact.create({ data: { id: "seed-fact-29", memberId: "seed-selin", title: "Fakülte Birincilik Ödülü", content: "Mezuniyet projesinde sürdürülebilir kentsel dönüşüm tasarımıyla İTÜ Mimarlık Fakültesi yılın projesi ödülünü kazandı.", date: new Date("2018-06-22"), source: "Fakülte bülteni" } }),
    prisma.fact.create({ data: { id: "seed-fact-30", memberId: "seed-selin", title: "Uluslararası Yarışma Finali", content: "Avrupa'nın önde gelen eko-mimari yarışması Re-Think Architecture'da Türkiye temsilcisi olarak finale kaldı.", date: new Date("2023-09-30"), source: "Yarışma web sitesi duyurusu" } }),
    prisma.fact.create({ data: { id: "seed-fact-31", memberId: "seed-selin", title: "İlk Bağımsız Proje", content: "Bağımsız olarak üstlendiği Moda'daki karma kullanımlı ofis binası projesi teslim edildi ve İstanbul Mimarlar Odası sergisinde yer aldı.", date: new Date("2025-03-15"), source: "Mimarlar Odası sergi kataloğu" } }),

    // Burak Yıldız
    prisma.fact.create({ data: { id: "seed-fact-32", memberId: "seed-burak", title: "Üniversite Kaydı", content: "İTÜ Bilgisayar Mühendisliği bölümünü YKS'de tam puan alarak kazandı.", date: new Date("2018-09-10"), source: "Kayıt belgesi" } }),
    prisma.fact.create({ data: { id: "seed-fact-33", memberId: "seed-burak", title: "TÜBİTAK Stajı", content: "İTÜ-TÜBİTAK ortak projesi kapsamında Türkçe doğal dil işleme araştırmasında stajyer olarak görev aldı.", date: new Date("2024-07-01"), source: "Staj sertifikası" } }),
    prisma.fact.create({ data: { id: "seed-fact-34", memberId: "seed-burak", title: "İstanbul Yarı Maratonu", content: "İstanbul Maratonu'nun yarım marat kategorisini 1 saat 52 dakikada tamamladı.", date: new Date("2025-11-02"), source: "Maraton sonuç listesi" } }),
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
