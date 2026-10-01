const flags: Record<string, string> = {
  "United States": "🇺🇸",
  "United Kingdom": "🇬🇧",
  Germany: "🇩🇪",
  "Türkiye": "🇹🇷",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  India: "🇮🇳",
  France: "🇫🇷",
  Spain: "🇪🇸",
  Netherlands: "🇳🇱",
  Global: "🌐",
};
export const countryFlag = (country: string) => flags[country] ?? "🌐";
