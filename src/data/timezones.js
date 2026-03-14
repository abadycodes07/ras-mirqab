/* ═══════════════════════════════════════════════
   WORLD TIMEZONES DATABASE
   ═══════════════════════════════════════════════ */

const WORLD_CITIES = [
    // Middle East
    { name: "الرياض", nameEn: "Riyadh", tz: "Asia/Riyadh", country: "السعودية", countryEn: "Saudi Arabia" },
    { name: "جدة", nameEn: "Jeddah", tz: "Asia/Riyadh", country: "السعودية", countryEn: "Saudi Arabia" },
    { name: "مكة المكرمة", nameEn: "Mecca", tz: "Asia/Riyadh", country: "السعودية", countryEn: "Saudi Arabia" },
    { name: "المدينة المنورة", nameEn: "Medina", tz: "Asia/Riyadh", country: "السعودية", countryEn: "Saudi Arabia" },
    { name: "أبو ظبي", nameEn: "Abu Dhabi", tz: "Asia/Dubai", country: "الإمارات", countryEn: "UAE" },
    { name: "دبي", nameEn: "Dubai", tz: "Asia/Dubai", country: "الإمارات", countryEn: "UAE" },
    { name: "الكويت", nameEn: "Kuwait City", tz: "Asia/Kuwait", country: "الكويت", countryEn: "Kuwait" },
    { name: "الدوحة", nameEn: "Doha", tz: "Asia/Qatar", country: "قطر", countryEn: "Qatar" },
    { name: "مسقط", nameEn: "Muscat", tz: "Asia/Muscat", country: "عمان", countryEn: "Oman" },
    { name: "المنامة", nameEn: "Manama", tz: "Asia/Bahrain", country: "البحرين", countryEn: "Bahrain" },
    { name: "عمان", nameEn: "Amman", tz: "Asia/Amman", country: "الأردن", countryEn: "Jordan" },
    { name: "بيروت", nameEn: "Beirut", tz: "Asia/Beirut", country: "لبنان", countryEn: "Lebanon" },
    { name: "دمشق", nameEn: "Damascus", tz: "Asia/Damascus", country: "سوريا", countryEn: "Syria" },
    { name: "بغداد", nameEn: "Baghdad", tz: "Asia/Baghdad", country: "العراق", countryEn: "Iraq" },
    { name: "القدس", nameEn: "Jerusalem", tz: "Asia/Jerusalem", country: "فلسطين", countryEn: "Palestine" },
    { name: "القاهرة", nameEn: "Cairo", tz: "Africa/Cairo", country: "مصر", countryEn: "Egypt" },
    { name: "طرابلس", nameEn: "Tripoli", tz: "Africa/Tripoli", country: "ليبيا", countryEn: "Libya" },
    { name: "تونس", nameEn: "Tunis", tz: "Africa/Tunis", country: "تونس", countryEn: "Tunisia" },
    { name: "الجزائر", nameEn: "Algiers", tz: "Africa/Algiers", country: "الجزائر", countryEn: "Algeria" },
    { name: "الرباط", nameEn: "Rabat", tz: "Africa/Casablanca", country: "المغرب", countryEn: "Morocco" },
    { name: "صنعاء", nameEn: "Sanaa", tz: "Asia/Aden", country: "اليمن", countryEn: "Yemen" },
    { name: "الخرطوم", nameEn: "Khartoum", tz: "Africa/Khartoum", country: "السودان", countryEn: "Sudan" },
    { name: "طهران", nameEn: "Tehran", tz: "Asia/Tehran", country: "إيران", countryEn: "Iran" },
    { name: "إسطنبول", nameEn: "Istanbul", tz: "Europe/Istanbul", country: "تركيا", countryEn: "Turkey" },
    { name: "أنقرة", nameEn: "Ankara", tz: "Europe/Istanbul", country: "تركيا", countryEn: "Turkey" },

    // Europe
    { name: "لندن", nameEn: "London", tz: "Europe/London", country: "بريطانيا", countryEn: "UK" },
    { name: "باريس", nameEn: "Paris", tz: "Europe/Paris", country: "فرنسا", countryEn: "France" },
    { name: "برلين", nameEn: "Berlin", tz: "Europe/Berlin", country: "ألمانيا", countryEn: "Germany" },
    { name: "روما", nameEn: "Rome", tz: "Europe/Rome", country: "إيطاليا", countryEn: "Italy" },
    { name: "مدريد", nameEn: "Madrid", tz: "Europe/Madrid", country: "إسبانيا", countryEn: "Spain" },
    { name: "موسكو", nameEn: "Moscow", tz: "Europe/Moscow", country: "روسيا", countryEn: "Russia" },
    { name: "كييف", nameEn: "Kyiv", tz: "Europe/Kyiv", country: "أوكرانيا", countryEn: "Ukraine" },
    { name: "وارسو", nameEn: "Warsaw", tz: "Europe/Warsaw", country: "بولندا", countryEn: "Poland" },
    { name: "أمستردام", nameEn: "Amsterdam", tz: "Europe/Amsterdam", country: "هولندا", countryEn: "Netherlands" },
    { name: "بروكسل", nameEn: "Brussels", tz: "Europe/Brussels", country: "بلجيكا", countryEn: "Belgium" },
    { name: "جنيف", nameEn: "Geneva", tz: "Europe/Zurich", country: "سويسرا", countryEn: "Switzerland" },
    { name: "فيينا", nameEn: "Vienna", tz: "Europe/Vienna", country: "النمسا", countryEn: "Austria" },
    { name: "ستوكهولم", nameEn: "Stockholm", tz: "Europe/Stockholm", country: "السويد", countryEn: "Sweden" },
    { name: "أوسلو", nameEn: "Oslo", tz: "Europe/Oslo", country: "النرويج", countryEn: "Norway" },
    { name: "كوبنهاجن", nameEn: "Copenhagen", tz: "Europe/Copenhagen", country: "الدنمارك", countryEn: "Denmark" },
    { name: "أثينا", nameEn: "Athens", tz: "Europe/Athens", country: "اليونان", countryEn: "Greece" },

    // Americas
    { name: "نيويورك", nameEn: "New York", tz: "America/New_York", country: "أمريكا", countryEn: "USA" },
    { name: "واشنطن", nameEn: "Washington D.C.", tz: "America/New_York", country: "أمريكا", countryEn: "USA" },
    { name: "شيكاغو", nameEn: "Chicago", tz: "America/Chicago", country: "أمريكا", countryEn: "USA" },
    { name: "لوس أنجلوس", nameEn: "Los Angeles", tz: "America/Los_Angeles", country: "أمريكا", countryEn: "USA" },
    { name: "ميامي", nameEn: "Miami", tz: "America/New_York", country: "أمريكا", countryEn: "USA" },
    { name: "هيوستن", nameEn: "Houston", tz: "America/Chicago", country: "أمريكا", countryEn: "USA" },
    { name: "سياتل", nameEn: "Seattle", tz: "America/Los_Angeles", country: "أمريكا", countryEn: "USA" },
    { name: "تورونتو", nameEn: "Toronto", tz: "America/Toronto", country: "كندا", countryEn: "Canada" },
    { name: "فانكوفر", nameEn: "Vancouver", tz: "America/Vancouver", country: "كندا", countryEn: "Canada" },
    { name: "مكسيكو سيتي", nameEn: "Mexico City", tz: "America/Mexico_City", country: "المكسيك", countryEn: "Mexico" },
    { name: "ساو باولو", nameEn: "Sao Paulo", tz: "America/Sao_Paulo", country: "البرازيل", countryEn: "Brazil" },
    { name: "ريو دي جانيرو", nameEn: "Rio de Janeiro", tz: "America/Sao_Paulo", country: "البرازيل", countryEn: "Brazil" },
    { name: "بوينس آيرس", nameEn: "Buenos Aires", tz: "America/Argentina/Buenos_Aires", country: "الأرجنتين", countryEn: "Argentina" },
    { name: "سانتياغو", nameEn: "Santiago", tz: "America/Santiago", country: "تشيلي", countryEn: "Chile" },
    { name: "بوغوتا", nameEn: "Bogota", tz: "America/Bogota", country: "كولومبيا", countryEn: "Colombia" },

    // Asia & Oceania
    { name: "طوكيو", nameEn: "Tokyo", tz: "Asia/Tokyo", country: "اليابان", countryEn: "Japan" },
    { name: "بكين", nameEn: "Beijing", tz: "Asia/Shanghai", country: "الصين", countryEn: "China" },
    { name: "شنغهاي", nameEn: "Shanghai", tz: "Asia/Shanghai", country: "الصين", countryEn: "China" },
    { name: "هونغ كونغ", nameEn: "Hong Kong", tz: "Asia/Hong_Kong", country: "الصين", countryEn: "China" },
    { name: "سول", nameEn: "Seoul", tz: "Asia/Seoul", country: "كوريا الجنوبية", countryEn: "South Korea" },
    { name: "تايبيه", nameEn: "Taipei", tz: "Asia/Taipei", country: "تايوان", countryEn: "Taiwan" },
    { name: "بانكوك", nameEn: "Bangkok", tz: "Asia/Bangkok", country: "تايلاند", countryEn: "Thailand" },
    { name: "سنغافورة", nameEn: "Singapore", tz: "Asia/Singapore", country: "سنغافورة", countryEn: "Singapore" },
    { name: "كوالالمبور", nameEn: "Kuala Lumpur", tz: "Asia/Kuala_Lumpur", country: "ماليزيا", countryEn: "Malaysia" },
    { name: "جاكرتا", nameEn: "Jakarta", tz: "Asia/Jakarta", country: "إندونيسيا", countryEn: "Indonesia" },
    { name: "مانيلا", nameEn: "Manila", tz: "Asia/Manila", country: "الفلبين", countryEn: "Philippines" },
    { name: "نيودلهي", nameEn: "New Delhi", tz: "Asia/Kolkata", country: "الهند", countryEn: "India" },
    { name: "مومباي", nameEn: "Mumbai", tz: "Asia/Kolkata", country: "الهند", countryEn: "India" },
    { name: "إسلام آباد", nameEn: "Islamabad", tz: "Asia/Karachi", country: "باكستان", countryEn: "Pakistan" },
    { name: "كابول", nameEn: "Kabul", tz: "Asia/Kabul", country: "أفغانستان", countryEn: "Afghanistan" },
    { name: "سيدني", nameEn: "Sydney", tz: "Australia/Sydney", country: "أستراليا", countryEn: "Australia" },
    { name: "ملبورن", nameEn: "Melbourne", tz: "Australia/Melbourne", country: "أستراليا", countryEn: "Australia" },
    { name: "أوكلاند", nameEn: "Auckland", tz: "Pacific/Auckland", country: "نيوزيلندا", countryEn: "New Zealand" },

    // Africa
    { name: "جوهانسبرغ", nameEn: "Johannesburg", tz: "Africa/Johannesburg", country: "جنوب أفريقيا", countryEn: "South Africa" },
    { name: "نيروبي", nameEn: "Nairobi", tz: "Africa/Nairobi", country: "كينيا", countryEn: "Kenya" },
    { name: "لاغوس", nameEn: "Lagos", tz: "Africa/Lagos", country: "نيجيريا", countryEn: "Nigeria" },
    { name: "أديس أبابا", nameEn: "Addis Ababa", tz: "Africa/Addis_Ababa", country: "إثيوبيا", countryEn: "Ethiopia" },
    { name: "داكار", nameEn: "Dakar", tz: "Africa/Dakar", country: "السنغال", countryEn: "Senegal" },
];

if (typeof window !== 'undefined') {
    window.WORLD_CITIES = WORLD_CITIES;
}
if (typeof module !== 'undefined') {
    module.exports = WORLD_CITIES;
}
