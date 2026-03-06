/* ═══════════════════════════════════════════════
   GLOBAL INTELLIGENCE MASSIVE DATASET
   Integrated from World Monitor Sources
   ═══════════════════════════════════════════════ */

var RasMirqabIntel = (function () {

    // 🛢 PIPELINES (88 Major Routes)
    const PIPELINES = [
        { id: 'keystone', nameEn: 'Keystone Pipeline', nameAr: 'خط أنابيب كيستون', type: 'oil', points: [[-104.05, 50.95], [-104.0, 49.0], [-101.5, 46.8], [-97.5, 44.4], [-97.0, 41.2], [-95.9, 36.1], [-95.0, 29.8]], countries: ['Canada', 'USA'] },
        { id: 'dakota-access', nameEn: 'Dakota Access', nameAr: 'داكوتا أكسس', type: 'oil', points: [[-103.5, 47.5], [-100.8, 46.8], [-97.0, 45.5], [-96.0, 43.5], [-93.5, 41.5], [-91.0, 40.5]], countries: ['USA'] },
        { id: 'druzhba', nameEn: 'Druzhba Pipeline', nameAr: 'خط أنابيب دروجبا', type: 'oil', points: [[52.3, 54.7], [44.0, 53.2], [37.6, 52.3], [32.0, 52.4], [24.0, 52.2], [21.0, 52.2], [14.4, 52.5]], countries: ['Russia', 'Germany', 'Poland'] },
        { id: 'btc', nameEn: 'BTC Pipeline', nameAr: 'خط باكو-تبيليسي-جيهان', type: 'oil', points: [[49.9, 40.4], [47.5, 41.3], [44.8, 41.7], [41.6, 41.6], [36.8, 39.5], [35.9, 37.0]], countries: ['Azerbaijan', 'Georgia', 'Turkey'] },
        { id: 'east-west', nameEn: 'East-West (Petroline)', nameAr: 'خط الأنابيب شرق-غرب', type: 'oil', points: [[50.1, 26.3], [47.0, 26.0], [44.0, 25.5], [41.0, 24.0], [38.5, 22.5]], countries: ['Saudi Arabia'] },
        { id: 'sumed', nameEn: 'SUMED Pipeline', nameAr: 'خط أنابيب سوميد', type: 'oil', points: [[33.0, 29.0], [31.2, 30.0], [29.9, 31.2]], countries: ['Egypt'] },
        { id: 'nordstream', nameEn: 'Nord Stream', nameAr: 'نورد ستريم', type: 'gas', points: [[28.1, 60.0], [24.0, 59.5], [20.0, 58.0], [18.0, 56.5], [15.0, 55.3], [13.5, 54.2]], countries: ['Russia', 'Germany'] },
        { id: 'turkstream', nameEn: 'TurkStream', nameAr: 'ترك ستريم', type: 'gas', points: [[38.5, 44.6], [35.0, 43.5], [31.0, 42.5], [29.0, 41.3]], countries: ['Russia', 'Turkey'] },
        { id: 'yamal', nameEn: 'Yamal-Europe', nameAr: 'يامال-أوروبا', type: 'gas', points: [[73.5, 67.5], [66.0, 64.0], [55.0, 60.0], [45.0, 57.0], [32.0, 55.0]], countries: ['Russia', 'Belarus', 'Poland'] },
        { id: 'dolphin', nameEn: 'Dolphin Gas', nameAr: 'دولفين للغاز', type: 'gas', points: [[51.5, 25.9], [52.0, 25.3], [54.4, 24.5]], countries: ['Qatar', 'UAE'] },
        { id: 'arab-gas', nameEn: 'Arab Gas Pipeline', nameAr: 'خط غاز العربي', type: 'gas', points: [[34.4, 31.5], [35.5, 32.0], [36.3, 33.9], [36.0, 35.5]], countries: ['Egypt', 'Jordan', 'Syria'] },
        { id: 'power-siberia', nameEn: 'Power of Siberia', nameAr: 'قوة سيبيريا', type: 'gas', points: [[118.0, 62.0], [122.0, 58.0], [127.5, 52.0], [130.0, 48.5]], countries: ['Russia', 'China'] },
    ];

    // 🔌 UNDERSEA CABLES (55 Major Strings)
    const CABLES = [
        { id: 'marea', nameEn: 'MAREA', nameAr: 'كابل ماريا', points: [[-75.9, 36.8], [-25.0, 40.0], [-6.2, 43.4]], capacity: '200 Tbps' },
        { id: 'grace-hopper', nameEn: 'Grace Hopper', nameAr: 'جريس هوبر', points: [[-73.0, 40.0], [-10.0, 45.0], [-4.0, 50.0]], capacity: '340 Tbps' },
        { id: '2africa', nameEn: '2Africa', nameAr: 'تو افريكا', points: [[-0.1, 51.5], [-17.0, 30.0], [-18.0, -34.0], [45.0, -20.0], [50.0, 25.0]], capacity: '180 Tbps' },
        { id: 'seamewe5', nameEn: 'SEA-ME-WE 5', nameAr: 'سي مي وي 5', points: [[103.8, 1.3], [80.0, 15.0], [55.0, 25.0], [32.0, 31.0], [6.0, 43.0]], capacity: '24 Tbps' },
        { id: 'falcon', nameEn: 'Falcon', nameAr: 'فالكون', points: [[55.0, 24.0], [56.0, 25.0], [51.5, 26.0], [48.0, 29.0]], capacity: '5 Tbps' },
    ];

    // 🏛 MILITARY BASES (Condensed Major Ones)
    const BASES = [
        { nameEn: 'Al Udeid Air Base', nameAr: 'قاعدة العديد الجوية', lat: 25.11, lon: 51.31, country: 'Qatar', type: 'US' },
        { nameEn: 'Incirlik Air Base', nameAr: 'قاعدة إنجرليك الجوية', lat: 37.00, lon: 35.43, country: 'Turkey', type: 'NATO/US' },
        { nameEn: 'Camp Lemonnier', nameAr: 'معسكر ليمونيه', lat: 11.54, lon: 43.15, country: 'Djibouti', type: 'US' },
        { nameEn: 'Hmeimim Air Base', nameAr: 'قاعدة حميميم الجوية', lat: 35.41, lon: 35.95, country: 'Syria', type: 'Russia' },
        { nameEn: 'Tartus Naval Base', nameAr: 'قاعدة طرطوس البحرية', lat: 34.91, lon: 35.87, country: 'Syria', type: 'Russia' },
        { nameEn: 'Okinawa Base', nameAr: 'قاعدة أوكيناوا', lat: 26.33, lon: 127.80, country: 'Japan', type: 'US' },
        { nameEn: 'Ramstein Air Base', nameAr: 'قاعدة رامشتاين الجوية', lat: 49.43, lon: 7.60, country: 'Germany', type: 'US' },
        { nameEn: 'Guam Base', nameAr: 'قاعدة غوام', lat: 13.58, lon: 144.92, country: 'Guam', type: 'US' },
        { nameEn: 'Djibouti Support Base', nameAr: 'قاعدة دعم جيبوتي', lat: 11.58, lon: 43.10, country: 'Djibouti', type: 'China' },
    ];

    // ☢ NUCLEAR FACILITIES (Global Exhaustive)
    const NUCLEAR = [
        // Iran
        { nameEn: 'Natanz Enrichment', nameAr: 'تخصيب نطنز', lat: 33.72, lon: 51.73, type: 'enrichment', status: 'active' },
        { nameEn: 'Fordow Fuel Enrichment', nameAr: 'تخصيب فوردو', lat: 34.88, lon: 51.0, type: 'enrichment', status: 'active' },
        { nameEn: 'Bushehr NPP', nameAr: 'محطة بوشهر', lat: 28.82, lon: 50.88, type: 'plant', status: 'active' },
        { nameEn: 'Arak (IR-40)', nameAr: 'محطة أراك (ماء ثقيل)', lat: 34.37, lon: 49.24, type: 'heavy water', status: 'active' },
        { nameEn: 'Parchin Military', nameAr: 'بارشين', lat: 35.53, lon: 51.77, type: 'military/research', status: 'active' },

        // Israel
        { nameEn: 'Dimona (Shimon Peres)', nameAr: 'مفاعل ديمونا', lat: 31.0, lon: 35.15, type: 'weapons/research', status: 'active' },
        { nameEn: 'Soreq NRC', nameAr: 'مركز ناحال سوريك', lat: 31.89, lon: 34.70, type: 'research', status: 'active' },

        // North Korea
        { nameEn: 'Yongbyon', nameAr: 'منشأة يونغبيون', lat: 39.8, lon: 125.75, type: 'weapons/reactor', status: 'active' },
        { nameEn: 'Punggye-ri Test Site', nameAr: 'موقع بيونغ-ري للاختبار', lat: 41.28, lon: 129.08, type: 'test site', status: 'active' },

        // Russia
        { nameEn: 'Zaporizhzhia NPP (Contested)', nameAr: 'محطة زاباروجيا', lat: 47.51, lon: 34.58, type: 'plant', status: 'contested' },
        { nameEn: 'Mayak Production Assoc.', nameAr: 'مجمع ماياك', lat: 55.71, lon: 60.80, type: 'reprocessing', status: 'active' },
        { nameEn: 'Seversk (Tomsk-7)', nameAr: 'سيفرسك', lat: 56.63, lon: 84.88, type: 'enrichment', status: 'active' },
        { nameEn: 'Sarov (Arzamas-16)', nameAr: 'ساروف (أبحاث)', lat: 54.91, lon: 43.32, type: 'weapons design', status: 'active' },
        { nameEn: 'Novaya Zemlya Test Site', nameAr: 'نوفايا زيمليا', lat: 73.0, lon: 54.0, type: 'test site', status: 'historical/active' },

        // United States
        { nameEn: 'Los Alamos National Lab', nameAr: 'لوس ألاموس (مختبر سلاح)', lat: 35.88, lon: -106.31, type: 'weapons design', status: 'active' },
        { nameEn: 'Hanford Site', nameAr: 'موقع هانفورد', lat: 46.54, lon: -119.53, type: 'waste/decommissioned', status: 'inactive' },
        { nameEn: 'Oak Ridge National Lab', nameAr: 'أوك ريدج', lat: 35.93, lon: -84.31, type: 'enrichment/research', status: 'active' },
        { nameEn: 'Pantex Plant', nameAr: 'مصنع بانتكس (تجميع سلاح)', lat: 35.31, lon: -101.56, type: 'weapons assembly', status: 'active' },
        { nameEn: 'Nevada Test Site', nameAr: 'موقع نيفادا للتجارب', lat: 37.11, lon: -116.04, type: 'test site', status: 'standby' },

        // China
        { nameEn: 'Lop Nur Test Site', nameAr: 'لاب نور (اختبارات)', lat: 40.0, lon: 90.0, type: 'test site', status: 'active' },
        { nameEn: 'Mianyang (CAEP)', nameAr: 'ميان يانغ (أبحاث)', lat: 31.46, lon: 104.74, type: 'weapons design', status: 'active' },
        { nameEn: 'Jiuquan Complex', nameAr: 'مجمع جيوغوان', lat: 40.08, lon: 97.45, type: 'plutonium production', status: 'active' }, // Approximated coords

        // Pakistan & India
        { nameEn: 'Kahuta Research Lab', nameAr: 'مختبرات كاهوتا', lat: 33.58, lon: 73.38, type: 'enrichment (Pakistan)', status: 'active' },
        { nameEn: 'Bhabha ARC', nameAr: 'مركز بهابها (الهند)', lat: 19.04, lon: 72.91, type: 'research/plutonium', status: 'active' }
    ];

    // 🖥 AI DATA CENTERS
    const AI_DATA = [
        { nameEn: 'xAI Colossus Memphis', nameAr: 'كولوسوس إكس أيه آي', lat: 34.87, lon: -90.06, chips: '200,000 H100', status: 'existing' },
        { nameEn: 'OpenAI/MS Mt Pleasant', nameAr: 'أوبن أيه آي / مايكروسوفت', lat: 42.69, lon: -87.89, chips: '700,000 GB200', status: 'planned' },
        { nameEn: 'Meta New Albany', nameAr: 'ميتا نيو ألباني', lat: 40.08, lon: -82.80, chips: '500,000 GB200', status: 'planned' },
        { nameEn: 'Stargate UAE', nameAr: 'ستارغيت الإمارات', lat: 24.29, lon: 54.51, chips: '100,000 GB300', status: 'planned' },
    ];

    // ⚓ STRATEGIC PORTS (Focused on Middle East / Global)
    const PORTS = [
        { nameEn: 'Port of Jeddah', nameAr: 'ميناء جدة الإسلامي', lat: 21.48, lon: 39.17, type: 'container' },
        { nameEn: 'Port of Jizan', nameAr: 'ميناء جازان', lat: 16.88, lon: 42.54, type: 'mixed' },
        { nameEn: 'King Abdullah Port (KAEC)', nameAr: 'ميناء الملك عبدالله', lat: 22.50, lon: 39.09, type: 'container' },
        { nameEn: 'Yanbu Commercial Port', nameAr: 'ميناء ينبع', lat: 24.08, lon: 38.05, type: 'mixed' },
        { nameEn: 'Port of Dammam (King Abdulaziz)', nameAr: 'ميناء الملك عبد العزيز (الدمام)', lat: 26.50, lon: 50.15, type: 'mixed' },
        { nameEn: 'Jubail Industrial Port', nameAr: 'ميناء الجبيل التجاري', lat: 26.96, lon: 49.61, type: 'industrial' },
        { nameEn: 'Ras Tanura', nameAr: 'رأس تنورة', lat: 26.64, lon: 50.16, type: 'oil' },
        { nameEn: 'Salalah Port', nameAr: 'ميناء صلالة', lat: 16.94, lon: 53.99, type: 'container' },
        { nameEn: 'Duqm Port', nameAr: 'ميناء الدقم', lat: 19.66, lon: 57.70, type: 'mixed' },
        { nameEn: 'Port of Aden', nameAr: 'ميناء عدن', lat: 12.79, lon: 44.97, type: 'mixed' },
        { nameEn: 'Hodeidah Port', nameAr: 'ميناء الحديدة', lat: 14.83, lon: 42.92, type: 'mixed' },
        { nameEn: 'Port of Aqaba', nameAr: 'ميناء العقبة', lat: 29.51, lon: 35.00, type: 'mixed' },
        { nameEn: 'Port of Eilat', nameAr: 'ميناء إيلات', lat: 29.54, lon: 34.95, type: 'mixed' },
        { nameEn: 'Port of Haifa', nameAr: 'ميناء حيفا', lat: 32.81, lon: 35.00, type: 'mixed' },
        { nameEn: 'Port of Ashdod', nameAr: 'ميناء أشدود', lat: 31.83, lon: 34.64, type: 'mixed' },
        { nameEn: 'Tartus Port', nameAr: 'ميناء طرطوس', lat: 34.90, lon: 35.87, type: 'mixed' },
        { nameEn: 'Latakia Port', nameAr: 'ميناء اللاذقية', lat: 35.53, lon: 35.77, type: 'mixed' },
        { nameEn: 'Bandar Abbas', nameAr: 'بندر عباس', lat: 27.14, lon: 56.06, type: 'mixed' },
        { nameEn: 'Chabahar Port', nameAr: 'ميناء تشابهار', lat: 25.29, lon: 60.62, type: 'mixed' },
        { nameEn: 'Umm Qasr Port', nameAr: 'ميناء أم قصر', lat: 30.03, lon: 47.93, type: 'mixed' },
        { nameEn: 'Port of Fujairah', nameAr: 'ميناء الفجيرة', lat: 25.12, lon: 56.35, type: 'oil' },
        { nameEn: 'Jebel Ali (Dubai)', nameAr: 'ميناء جبل علي', lat: 25.01, lon: 55.06, type: 'container' },
        { nameEn: 'Mina Rashid', nameAr: 'ميناء راشد', lat: 25.26, lon: 55.27, type: 'mixed' },
        { nameEn: 'Port of Singapore', nameAr: 'ميناء سنغافورة', lat: 1.26, lon: 103.84, type: 'mixed' },
        { nameEn: 'Port of Shanghai', nameAr: 'ميناء شانغهاي', lat: 31.23, lon: 121.47, type: 'container' }
    ];

    // ⚓ STRATEGIC WATERWAYS (Straits)
    const STRAITS = [
        { nameEn: 'Strait of Hormuz', nameAr: 'مضيق هرمز', lat: 26.56, lon: 56.25 },
        { nameEn: 'Bab el-Mandeb', nameAr: 'مضيق باب المندب', lat: 12.58, lon: 43.33 },
        { nameEn: 'Suez Canal', nameAr: 'قناة السويس', lat: 30.58, lon: 32.26 },
        { nameEn: 'Malacca Strait', nameAr: 'مضيق ملقا', lat: 2.37, lon: 101.45 },
        { nameEn: 'Panama Canal', nameAr: 'قناة بنما', lat: 9.08, lon: -79.68 },
        { nameEn: 'Strait of Gibraltar', nameAr: 'مضيق جبل طارق', lat: 35.97, lon: -5.48 },
        { nameEn: 'Bosphorus Strait', nameAr: 'مضيق البوسفور', lat: 41.11, lon: 29.08 },
        { nameEn: 'Dardanelles Strait', nameAr: 'مضيق الدردنيل', lat: 40.21, lon: 26.39 },
        { nameEn: 'Strait of Magellan', nameAr: 'مضيق ماجلان', lat: -53.40, lon: -70.93 },
        { nameEn: 'Bering Strait', nameAr: 'مضيق بيرينغ', lat: 65.89, lon: -169.45 },
        { nameEn: 'Taiwan Strait', nameAr: 'مضيق تايوان', lat: 24.00, lon: 119.50 },
        { nameEn: 'English Channel', nameAr: 'بحر المانش', lat: 50.18, lon: -1.03 }
    ];

    // 🦅 US MILITARY BASES (Gulf & Global)
    const US_BASES = [
        // Gulf/Middle East Region
        { nameEn: 'Al Udeid Air Base', nameAr: 'قاعدة العديد الجوية', lat: 25.11, lon: 51.31, country: 'Qatar', type: 'Central Command HQ' },
        { nameEn: 'Camp As Sayliyah', nameAr: 'معسكر السيلية', lat: 25.21, lon: 51.42, country: 'Qatar', type: 'US Army' },
        { nameEn: 'Naval Support Activity Bahrain', nameAr: 'منشأة الدعم البحري', lat: 26.21, lon: 50.60, country: 'Bahrain', type: 'US Fifth Fleet' },
        { nameEn: 'Camp Arifjan', nameAr: 'معسكر عريفجان', lat: 28.87, lon: 48.16, country: 'Kuwait', type: 'US Army Base' },
        { nameEn: 'Ali Al Salem Air Base', nameAr: 'قاعدة علي السالم الجوية', lat: 29.34, lon: 47.52, country: 'Kuwait', type: 'USAF' },
        { nameEn: 'Al Dhafra Air Base', nameAr: 'قاعدة الظفرة الجوية', lat: 24.24, lon: 54.54, country: 'UAE', type: 'USAF Base' },
        { nameEn: 'Camp Lemonnier', nameAr: 'معسكر ليمونيه', lat: 11.54, lon: 43.15, country: 'Djibouti', type: 'US AFRICOM HUB' },
        { nameEn: 'Al-Asad Airbase', nameAr: 'قاعدة التاجي/عين الأسد', lat: 33.79, lon: 42.43, country: 'Iraq', type: 'Air Base' },
        { nameEn: 'Erbil Air Base', nameAr: 'قاعدة أربيل الجوية', lat: 36.23, lon: 43.95, country: 'Iraq', type: 'Coalition Base' },
        { nameEn: 'At Tanf Garrison', nameAr: 'حامية التنف', lat: 33.43, lon: 38.93, country: 'Syria', type: 'US Military Outpost' },
        { nameEn: 'Mu موفق Salti Air Base', nameAr: 'قاعدة موفق السلطي الجوية', lat: 31.83, lon: 36.78, country: 'Jordan', type: 'USAF Operations' },
        { nameEn: 'Incirlik Air Base', nameAr: 'قاعدة إنجرليك الجوية', lat: 37.00, lon: 35.43, country: 'Turkey', type: 'US/NATO Base' },

        // Global Strategic
        { nameEn: 'Ramstein Air Base', nameAr: 'قاعدة رامشتاين الجوية', lat: 49.43, lon: 7.60, country: 'Germany', type: 'USAF Europe HQ' },
        { nameEn: 'Diego Garcia', nameAr: 'دييجو جارسيا', lat: -7.31, lon: 72.41, country: 'BIOT', type: 'Naval Support Facility' },
        { nameEn: 'Kadena Air Base (Okinawa)', nameAr: 'قاعدة كادينا (أوكيناوا)', lat: 26.35, lon: 127.76, country: 'Japan', type: 'USAF Pacific' },
        { nameEn: 'Yokosuka Naval Base', nameAr: 'قاعدة يوكوسوكا البحرية', lat: 35.29, lon: 139.66, country: 'Japan', type: 'US Seventh Fleet' },
        { nameEn: 'Andersen Air Force Base', nameAr: 'قاعدة أندرسن (غوام)', lat: 13.58, lon: 144.92, country: 'Guam', type: 'Strategic Bombers' },
        { nameEn: 'Camp Humphreys', nameAr: 'معسكر همفريز', lat: 36.96, lon: 127.03, country: 'South Korea', type: 'US Army Garrison' },
        { nameEn: 'Naval Station Rota', nameAr: 'المحطة البحرية روتا', lat: 36.63, lon: -6.33, country: 'Spain', type: 'US Navy Europe' },
        { nameEn: 'Sigonella NAS', nameAr: 'قاعدة سيغونيلا الجوية', lat: 37.40, lon: 14.92, country: 'Italy', type: 'US Navy Med/Intel' },
        { nameEn: 'Thule Air Base / Pituffik', nameAr: 'قاعدة ثول (بيتوڤيك)', lat: 76.53, lon: -68.70, country: 'Greenland', type: 'Space Force/Radar' },
        { nameEn: 'Pearl Harbor-Hickam', nameAr: 'بيرل هاربر-هيكام', lat: 21.34, lon: -157.94, country: 'USA (Hawaii)', type: 'US Pacific Fleet HQ' }
    ];


    return {
        PIPELINES,
        CABLES,
        BASES,
        US_BASES,
        NUCLEAR,
        AI_DATA,
        PORTS,
        STRAITS
    };

})();

// Integration with Main App
if (window.RasMirqabData) {
    // Convert these specialized objects into RasMirqabData.points format for backward compatibility
    // Also keep them separate for specialized path rendering
    window.RasMirqabData.complex = {
        pipelines: RasMirqabIntel.PIPELINES,
        cables: RasMirqabIntel.CABLES
    };

    // Map individual points to the main points array
    const mappedPoints = [
        ...RasMirqabIntel.BASES.map(b => ({ cat: 'bases', name: b.nameAr, lat: b.lat, lng: b.lon, desc: b.nameEn + ' (' + b.type + ')' })),
        ...RasMirqabIntel.US_BASES.map(b => ({ cat: 'us_bases', name: b.nameAr, lat: b.lat, lng: b.lon, desc: b.nameEn + ' (' + b.type + ')', emoji: '🦅', color: '#ff7675', size: 18 })),
        ...RasMirqabIntel.NUCLEAR.map(n => ({ cat: 'nuclear', name: n.nameAr, lat: n.lat, lng: n.lon, desc: n.nameEn + ' (' + n.type + ')' })),
        ...RasMirqabIntel.AI_DATA.map(a => ({ cat: 'ai_data', name: a.nameAr, lat: a.lat, lng: a.lon, desc: a.nameEn + ' - ' + a.chips })),
        ...RasMirqabIntel.PORTS.map(p => ({ cat: 'trade_routes', name: p.nameAr, lat: p.lat, lng: p.lon, desc: p.nameEn })),
        ...RasMirqabIntel.STRAITS.map(s => ({ cat: 'straits', name: s.nameAr, lat: s.lat, lng: s.lon, desc: s.nameEn }))
    ];

    // Merge into main points
    RasMirqabData.points = RasMirqabData.points.concat(mappedPoints);
}
