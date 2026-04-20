/**
 * Maps common Assetto Corsa country names to emoji flags.
 * Falls back to 🏁 for unknown countries.
 */
const COUNTRY_FLAGS: Record<string, string> = {
  "Italy": "🇮🇹",
  "Germany": "🇩🇪",
  "United Kingdom": "🇬🇧",
  "UK": "🇬🇧",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Japan": "🇯🇵",
  "United States": "🇺🇸",
  "USA": "🇺🇸",
  "France": "🇫🇷",
  "Spain": "🇪🇸",
  "Belgium": "🇧🇪",
  "Netherlands": "🇳🇱",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Brazil": "🇧🇷",
  "Canada": "🇨🇦",
  "China": "🇨🇳",
  "South Korea": "🇰🇷",
  "Korea": "🇰🇷",
  "Sweden": "🇸🇪",
  "Switzerland": "🇨🇭",
  "Monaco": "🇲🇨",
  "Portugal": "🇵🇹",
  "Mexico": "🇲🇽",
  "Hungary": "🇭🇺",
  "Czech Republic": "🇨🇿",
  "Czechia": "🇨🇿",
  "Finland": "🇫🇮",
  "Norway": "🇳🇴",
  "Denmark": "🇩🇰",
  "Poland": "🇵🇱",
  "Russia": "🇷🇺",
  "Singapore": "🇸🇬",
  "United Arab Emirates": "🇦🇪",
  "UAE": "🇦🇪",
  "Bahrain": "🇧🇭",
  "Saudi Arabia": "🇸🇦",
  "South Africa": "🇿🇦",
  "Argentina": "🇦🇷",
  "New Zealand": "🇳🇿",
  "India": "🇮🇳",
  "Malaysia": "🇲🇾",
  "Turkey": "🇹🇷",
  "Romania": "🇷🇴",
  "Ireland": "🇮🇪",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
};

export function getCountryFlag(country: string | null | undefined): string {
  if (!country) return "🏁";
  return COUNTRY_FLAGS[country] ?? "🏁";
}
