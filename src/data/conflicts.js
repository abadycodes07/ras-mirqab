/* ═══════════════════════════════════════════════
   COMPREHENSIVE GEOPOLITICAL SEED DATA
   ═══════════════════════════════════════════════ */

var RasMirqabData = window.RasMirqabData || {};

// All categories requested by the user
RasMirqabData.categories = {
  'iran_attacks': { id: 'iran_attacks', labelAr: 'ضربات إيران', labelEn: 'Iran Attacks', emoji: '🎯', color: '#ff1100', default: true },
  'intel': { id: 'intel', labelAr: 'نقاط استخباراتية', labelEn: 'Intel Hotspots', emoji: '🎯', color: '#3498db', default: true },
  'conflict': { id: 'conflict', labelAr: 'مناطق النزاع', labelEn: 'Conflict Zones', emoji: '⚔', color: '#e74c3c', default: true },
  'bases': { id: 'bases', labelAr: 'قواعد عسكرية', labelEn: 'Military Bases', emoji: '🏛', color: '#9b59b6', default: true },
  'us_bases': { id: 'us_bases', labelAr: 'القواعد الأمريكية', labelEn: 'US Military Bases', emoji: '🦅', color: '#ff7675', default: true },
  'nuclear': { id: 'nuclear', labelAr: 'مواقع نووية', labelEn: 'Nuclear Sites', emoji: '☢', color: '#e67e22', default: false },
  'gamma': { id: 'gamma', labelAr: 'مشعات غاما', labelEn: 'Gamma Irradiators', emoji: '⚠', color: '#f39c12', default: false },
  'spaceports': { id: 'spaceports', labelAr: 'موانئ فضائية', labelEn: 'Spaceports', emoji: '🚀', color: '#ecf0f1', default: false },
  'cables': { id: 'cables', labelAr: 'كابلات بحرية', labelEn: 'Undersea Cables', emoji: '🔌', color: '#00cec9', default: false },
  'pipelines': { id: 'pipelines', labelAr: 'انابيب نفط', labelEn: 'Pipelines', emoji: '🛢', color: '#55efc4', default: false },
  'ai_data': { id: 'ai_data', labelAr: 'مراكز بيانات ذكاء اصطناعي', labelEn: 'AI Data Centers', emoji: '🖥', color: '#0984e3', default: false },
  'military_activity': { id: 'military_activity', labelAr: 'نشاط عسكري', labelEn: 'Military Activity', emoji: '✈', color: '#d63031', default: false },
  'navies': { id: 'navies', labelAr: 'أساطيل وبارجات', labelEn: 'Naval Fleets', emoji: '🛳', color: '#0984e3', default: true },
  'ship_traffic': { id: 'ship_traffic', labelAr: 'حركة السفن', labelEn: 'Ship Traffic', emoji: '🚢', color: '#74b9ff', default: false },
  'trade_routes': { id: 'trade_routes', labelAr: 'طرق التجارة', labelEn: 'Trade Routes', emoji: '⚓', color: '#ffeaa7', default: false },
  'aviation': { id: 'aviation', labelAr: 'طيران', labelEn: 'Aviation', emoji: '✈', color: '#81ecec', default: false },
  'protests': { id: 'protests', labelAr: 'احتجاجات', labelEn: 'Protests', emoji: '📢', color: '#fdcb6e', default: false },
  'armed_conflict': { id: 'armed_conflict', labelAr: 'أحداث نزاع مسلح', labelEn: 'Armed Conflict Events', emoji: '⚔', color: '#d63031', default: true },
  'displacement': { id: 'displacement', labelAr: 'موجات نزوح', labelEn: 'Displacement Flows', emoji: '👥', color: '#a29bfe', default: false },
  'climate': { id: 'climate', labelAr: 'شذوذ مناخي', labelEn: 'Climate Anomalies', emoji: '🌫', color: '#b2bec3', default: false },
  'weather': { id: 'weather', labelAr: 'تنبيهات طقس', labelEn: 'Weather Alerts', emoji: '⛈', color: '#00b894', default: false },
  'internet_outage': { id: 'internet_outage', labelAr: 'انقطاع الإنترنت', labelEn: 'Internet Outages', emoji: '📡', color: '#ff7675', default: true },
  'cyber': { id: 'cyber', labelAr: 'تهديدات سيبرانية', labelEn: 'Cyber Threats', emoji: '🛡', color: '#6ab04c', default: true },
  'natural_events': { id: 'natural_events', labelAr: 'أحداث طبيعية', labelEn: 'Natural Events', emoji: '🌋', color: '#e17055', default: false },
  'fires': { id: 'fires', labelAr: 'حرائق', labelEn: 'Fires', emoji: '🔥', color: '#d35400', default: false },
  'straits': { id: 'straits', labelAr: 'ممرات مائية استراتيجية', labelEn: 'Strategic Waterways', emoji: '⚓', color: '#0984e3', default: true },
  'econ_centers': { id: 'econ_centers', labelAr: 'مراكز اقتصادية', labelEn: 'Economic Centers', emoji: '💰', color: '#f1c40f', default: true },
  'minerals': { id: 'minerals', labelAr: 'معادن حرجة', labelEn: 'Critical Minerals', emoji: '💎', color: '#9b59b6', default: false },
  'gps_jamming': { id: 'gps_jamming', labelAr: 'تشويش جي بي إس', labelEn: 'GPS JAMMING', emoji: '📡', color: '#e74c3c', default: true },
  'cii_instability': { id: 'cii_instability', labelAr: 'عدم استقرار CII', labelEn: 'CII Instability', emoji: '🌎', color: '#f39c12', default: false },
};

// Unified points array mapped to categories
RasMirqabData.points = [
  // 🎯 Iran Attacks
  { cat: 'iran_attacks', name: 'قاعدة عين الأسد', lat: 33.79, lng: 42.43, size: 20, desc: 'استهداف بصواريخ باليستية' },
  { cat: 'iran_attacks', name: 'أربيل', lat: 36.19, lng: 44.00, size: 18, desc: 'ضربات مسيّرة في الإقليم' },

  // 🎯 Intel Hotspots
  { cat: 'intel', name: 'طهران - مقر الحرس الثوري', lat: 35.69, lng: 51.39, size: 16, desc: 'مركز قيادة العمليات' },
  { cat: 'intel', name: 'موسكو - الكرملين', lat: 55.75, lng: 37.62, size: 16, desc: 'اتخاذ القرارات الاستراتيجية' },
  { cat: 'intel', name: 'بكين', lat: 39.90, lng: 116.40, size: 16, desc: 'نشاط استخباراتي متزايد' },

  // ⚔ Conflict Zones / Armed Conflict
  { cat: 'conflict', name: 'غزة', lat: 31.35, lng: 34.31, size: 25, desc: 'عمليات عسكرية برية وجوية مكثفة' },
  { cat: 'conflict', name: 'جنوب لبنان', lat: 33.27, lng: 35.20, size: 20, desc: 'اشتباكات حدودية متبادلة' },
  { cat: 'conflict', name: 'اليمن', lat: 15.35, lng: 44.20, size: 20, desc: 'جبهة استهداف السفن' },
  { cat: 'conflict', name: 'شرق أوكرانيا', lat: 48.57, lng: 37.80, size: 25, desc: 'حرب استنزاف على طول الجبهة' },
  { cat: 'conflict', name: 'الخرطوم', lat: 15.50, lng: 32.56, size: 22, desc: 'حرب حضرية مستمرة' },

  { cat: 'armed_conflict', name: 'كييف', lat: 50.45, lng: 30.52, size: 18, desc: 'هجوم جوي ليلي' },
  { cat: 'armed_conflict', name: 'الفاشر', lat: 13.62, lng: 25.35, size: 18, desc: 'مواجهات وحصار' },

  // 🏛 Military Bases
  { cat: 'bases', name: 'قاعدة العديد', lat: 25.11, lng: 51.31, size: 14, desc: 'مقر القيادة المركزية الأمريكية (قطر)' },
  { cat: 'bases', name: 'إنجرليك', lat: 37.00, lng: 35.43, size: 14, desc: 'قاعدة الناتو في تركيا' },
  { cat: 'bases', name: 'حميميم', lat: 35.41, lng: 35.95, size: 14, desc: 'قاعدة جوية روسية (سوريا)' },
  { cat: 'bases', name: 'أوكيناوا', lat: 26.33, lng: 127.80, size: 14, desc: 'تمركز عسكري أمريكي متقدم باليابان' },

  // ☢ Nuclear & Gamma
  { cat: 'nuclear', name: 'نطنز', lat: 33.72, lng: 51.72, size: 18, desc: 'منشأة تخصيب اليورانيوم (إيران)' },
  { cat: 'nuclear', name: 'ديمونا', lat: 31.00, lng: 35.14, size: 18, desc: 'مركز الأبحاث النووية' },
  { cat: 'nuclear', name: 'زاباروجيا', lat: 47.51, lng: 34.58, size: 18, desc: 'أكبر محطة نووية في أوروبا بمناطق النزاع' },
  { cat: 'gamma', name: 'مفاعل تشيرنوبل', lat: 51.38, lng: 30.09, size: 15, desc: 'منطقة حظر إشعاعي' },

  // 🚀 Spaceports
  { cat: 'spaceports', name: 'بايكونور', lat: 45.96, lng: 63.30, size: 15, desc: 'مركز الإطلاق الفضائي الروسي (كازاخستان)' },
  { cat: 'spaceports', name: 'كيب كانافيرال', lat: 28.39, lng: -80.60, size: 15, desc: 'عمليات إطلاق متعاقبة (أمريكا)' },

  // 🔌 Cables & Pipelines
  { cat: 'cables', name: 'بحر العرب', lat: 14.0, lng: 55.0, size: 15, desc: 'شبكة كابلات SEA-ME-WE' },
  { cat: 'cables', name: 'البحر الأحمر', lat: 20.0, lng: 38.0, size: 15, desc: 'نقطة تقاطع كابلات الإنترنت العالمية' },
  { cat: 'pipelines', name: 'نورد ستريم', lat: 55.33, lng: 15.0, size: 15, desc: 'موقع التخريب تحت بحر البلطيق' },
  { cat: 'pipelines', name: 'خط سوميد', lat: 29.58, lng: 32.33, size: 15, desc: 'نقل النفط حول مضيق هرمز' },

  // 🖥 AI Data Centers & Cyber
  { cat: 'ai_data', name: 'تكساس ديتا سنتر', lat: 30.26, lng: -97.74, size: 15, desc: 'مركز حوسبة عملاقة للذكاء الاصطناعي' },
  { cat: 'cyber', name: 'تايبيه', lat: 25.03, lng: 121.56, size: 16, desc: 'هجمات حرمان من الخدمة مستفحلة' },
  { cat: 'cyber', name: 'استونيا', lat: 59.43, lng: 24.75, size: 16, desc: 'نشاط استطلاع سيبراني مكثف' },

  // ⚓ Straits & Trade Routes
  { cat: 'straits', name: 'مضيق هرمز', lat: 26.56, lng: 56.25, size: 20, desc: 'نقطة تمركز ناقلات النفط' },
  { cat: 'straits', name: 'مضيق باب المندب', lat: 12.58, lng: 43.33, size: 20, desc: 'شريان الملاحة مهدد جراء النزاع اليمني' },
  { cat: 'straits', name: 'قناة السويس', lat: 30.58, lng: 32.26, size: 20, desc: 'توترات تؤثر على رسوم العبور والسلاسل' },
  { cat: 'straits', name: 'مضيق ملقا', lat: 2.37, lng: 101.45, size: 20, desc: 'ممر تجارة آسيا الرئيسي' },
  { cat: 'straits', name: 'مضيق تايوان', lat: 24.50, lng: 119.50, size: 20, desc: 'مناورات ومضايقات بحرية' },
  { cat: 'trade_routes', name: 'طريق رأس الرجاء الصالح', lat: -34.35, lng: 18.47, size: 16, desc: 'مسار بديل مكلف للسفن' },

  // ✈ Aviation & Military Activity
  { cat: 'military_activity', name: 'بحر الصين الجنوبي', lat: 14.00, lng: 115.00, size: 18, desc: 'دوريات استطلاع مكثفة للغواصات والطيران' },
  { cat: 'aviation', name: 'أجواء البحر الأسود', lat: 43.0, lng: 34.0, size: 16, desc: 'حظر طيران مدني وتحليق مسيّرات المراقبة' },

  // 📡 GPS Jamming
  { cat: 'gps_jamming', name: 'البلطيق', lat: 55.0, lng: 19.0, size: 18, desc: 'انقطاع إشارات الملاحة الجوية والبحرية' },
  { cat: 'gps_jamming', name: 'شرق المتوسط', lat: 34.0, lng: 34.0, size: 18, desc: 'تداخلات إلكترونية عسكرية' },

  // 💰 Economic Centers & Minerals
  { cat: 'econ_centers', name: 'وول ستريت', lat: 40.71, lng: -74.00, size: 18, desc: 'مؤشرات الأسواق العالمية متذبذبة' },
  { cat: 'econ_centers', name: 'شانغهاي', lat: 31.23, lng: 121.47, size: 18, desc: 'مركز تصنيع وتصدير السلع المتقدمة' },
  { cat: 'minerals', name: 'الكونغو', lat: -4.0, lng: 21.0, size: 16, desc: 'تصدير الكوبالت الحرج لبطاريات العالم' },

  // 👥 Displacement, Protests, Internet Outage
  { cat: 'displacement', name: 'نزوح داخلي (غزة)', lat: 31.42, lng: 34.35, size: 16, desc: 'موجات نزوح جماعي هائلة مستمرة' },
  { cat: 'displacement', name: 'اللاجئون السودانيون', lat: 14.0, lng: 30.0, size: 16, desc: 'عبور للحدود نحو مصر وتشاد' },
  { cat: 'protests', name: 'باريس', lat: 48.85, lng: 2.35, size: 15, desc: 'احتجاجات تتعلق بالسياسات الزراعية' },
  { cat: 'internet_outage', name: 'الشرق الأوسط', lat: 31.0, lng: 40.0, size: 16, desc: 'اضطرابات وتخفيف سرعات مقصودة' }
];
