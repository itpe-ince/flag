// Comprehensive country data for flag guessing game
// Includes flag URLs, regions, colors, and difficulty levels

export interface CountryData {
  code: string;
  name: string;
  imageUrl: string;
  region: string;
  colors: string[];
  difficulty: number;
}

export const COUNTRIES: CountryData[] = [
  // Easy flags (difficulty 1) - distinctive and well-known
  { code: 'US', name: 'United States', imageUrl: 'https://flagcdn.com/w320/us.png', region: 'North America', colors: ['red', 'white', 'blue'], difficulty: 1 },
  { code: 'GB', name: 'United Kingdom', imageUrl: 'https://flagcdn.com/w320/gb.png', region: 'Europe', colors: ['red', 'white', 'blue'], difficulty: 1 },
  { code: 'CA', name: 'Canada', imageUrl: 'https://flagcdn.com/w320/ca.png', region: 'North America', colors: ['red', 'white'], difficulty: 1 },
  { code: 'FR', name: 'France', imageUrl: 'https://flagcdn.com/w320/fr.png', region: 'Europe', colors: ['blue', 'white', 'red'], difficulty: 1 },
  { code: 'DE', name: 'Germany', imageUrl: 'https://flagcdn.com/w320/de.png', region: 'Europe', colors: ['black', 'red', 'yellow'], difficulty: 1 },
  { code: 'JP', name: 'Japan', imageUrl: 'https://flagcdn.com/w320/jp.png', region: 'Asia', colors: ['white', 'red'], difficulty: 1 },
  { code: 'CN', name: 'China', imageUrl: 'https://flagcdn.com/w320/cn.png', region: 'Asia', colors: ['red', 'yellow'], difficulty: 1 },
  { code: 'BR', name: 'Brazil', imageUrl: 'https://flagcdn.com/w320/br.png', region: 'South America', colors: ['green', 'yellow', 'blue'], difficulty: 1 },
  { code: 'AU', name: 'Australia', imageUrl: 'https://flagcdn.com/w320/au.png', region: 'Oceania', colors: ['blue', 'red', 'white'], difficulty: 1 },
  { code: 'IN', name: 'India', imageUrl: 'https://flagcdn.com/w320/in.png', region: 'Asia', colors: ['orange', 'white', 'green', 'blue'], difficulty: 1 },

  // Medium flags (difficulty 2) - moderately recognizable
  { code: 'IT', name: 'Italy', imageUrl: 'https://flagcdn.com/w320/it.png', region: 'Europe', colors: ['green', 'white', 'red'], difficulty: 2 },
  { code: 'ES', name: 'Spain', imageUrl: 'https://flagcdn.com/w320/es.png', region: 'Europe', colors: ['red', 'yellow'], difficulty: 2 },
  { code: 'RU', name: 'Russia', imageUrl: 'https://flagcdn.com/w320/ru.png', region: 'Europe', colors: ['white', 'blue', 'red'], difficulty: 2 },
  { code: 'MX', name: 'Mexico', imageUrl: 'https://flagcdn.com/w320/mx.png', region: 'North America', colors: ['green', 'white', 'red'], difficulty: 2 },
  { code: 'AR', name: 'Argentina', imageUrl: 'https://flagcdn.com/w320/ar.png', region: 'South America', colors: ['light blue', 'white', 'yellow'], difficulty: 2 },
  { code: 'ZA', name: 'South Africa', imageUrl: 'https://flagcdn.com/w320/za.png', region: 'Africa', colors: ['green', 'yellow', 'red', 'blue', 'white', 'black'], difficulty: 2 },
  { code: 'KR', name: 'South Korea', imageUrl: 'https://flagcdn.com/w320/kr.png', region: 'Asia', colors: ['white', 'red', 'blue', 'black'], difficulty: 2 },
  { code: 'NL', name: 'Netherlands', imageUrl: 'https://flagcdn.com/w320/nl.png', region: 'Europe', colors: ['red', 'white', 'blue'], difficulty: 2 },
  { code: 'SE', name: 'Sweden', imageUrl: 'https://flagcdn.com/w320/se.png', region: 'Europe', colors: ['blue', 'yellow'], difficulty: 2 },
  { code: 'CH', name: 'Switzerland', imageUrl: 'https://flagcdn.com/w320/ch.png', region: 'Europe', colors: ['red', 'white'], difficulty: 2 },

  // Medium-Hard flags (difficulty 3) - similar to others or less distinctive
  { code: 'BE', name: 'Belgium', imageUrl: 'https://flagcdn.com/w320/be.png', region: 'Europe', colors: ['black', 'yellow', 'red'], difficulty: 3 },
  { code: 'AT', name: 'Austria', imageUrl: 'https://flagcdn.com/w320/at.png', region: 'Europe', colors: ['red', 'white'], difficulty: 3 },
  { code: 'PL', name: 'Poland', imageUrl: 'https://flagcdn.com/w320/pl.png', region: 'Europe', colors: ['white', 'red'], difficulty: 3 },
  { code: 'NO', name: 'Norway', imageUrl: 'https://flagcdn.com/w320/no.png', region: 'Europe', colors: ['red', 'white', 'blue'], difficulty: 3 },
  { code: 'DK', name: 'Denmark', imageUrl: 'https://flagcdn.com/w320/dk.png', region: 'Europe', colors: ['red', 'white'], difficulty: 3 },
  { code: 'FI', name: 'Finland', imageUrl: 'https://flagcdn.com/w320/fi.png', region: 'Europe', colors: ['white', 'blue'], difficulty: 3 },
  { code: 'GR', name: 'Greece', imageUrl: 'https://flagcdn.com/w320/gr.png', region: 'Europe', colors: ['blue', 'white'], difficulty: 3 },
  { code: 'PT', name: 'Portugal', imageUrl: 'https://flagcdn.com/w320/pt.png', region: 'Europe', colors: ['green', 'red'], difficulty: 3 },
  { code: 'IE', name: 'Ireland', imageUrl: 'https://flagcdn.com/w320/ie.png', region: 'Europe', colors: ['green', 'white', 'orange'], difficulty: 3 },
  { code: 'CZ', name: 'Czech Republic', imageUrl: 'https://flagcdn.com/w320/cz.png', region: 'Europe', colors: ['white', 'red', 'blue'], difficulty: 3 },

  // Hard flags (difficulty 4) - very similar to others or obscure
  { code: 'SK', name: 'Slovakia', imageUrl: 'https://flagcdn.com/w320/sk.png', region: 'Europe', colors: ['white', 'blue', 'red'], difficulty: 4 },
  { code: 'SI', name: 'Slovenia', imageUrl: 'https://flagcdn.com/w320/si.png', region: 'Europe', colors: ['white', 'blue', 'red'], difficulty: 4 },
  { code: 'HR', name: 'Croatia', imageUrl: 'https://flagcdn.com/w320/hr.png', region: 'Europe', colors: ['red', 'white', 'blue'], difficulty: 4 },
  { code: 'HU', name: 'Hungary', imageUrl: 'https://flagcdn.com/w320/hu.png', region: 'Europe', colors: ['red', 'white', 'green'], difficulty: 4 },
  { code: 'BG', name: 'Bulgaria', imageUrl: 'https://flagcdn.com/w320/bg.png', region: 'Europe', colors: ['white', 'green', 'red'], difficulty: 4 },
  { code: 'RO', name: 'Romania', imageUrl: 'https://flagcdn.com/w320/ro.png', region: 'Europe', colors: ['blue', 'yellow', 'red'], difficulty: 4 },
  { code: 'LT', name: 'Lithuania', imageUrl: 'https://flagcdn.com/w320/lt.png', region: 'Europe', colors: ['yellow', 'green', 'red'], difficulty: 4 },
  { code: 'LV', name: 'Latvia', imageUrl: 'https://flagcdn.com/w320/lv.png', region: 'Europe', colors: ['red', 'white'], difficulty: 4 },
  { code: 'EE', name: 'Estonia', imageUrl: 'https://flagcdn.com/w320/ee.png', region: 'Europe', colors: ['blue', 'black', 'white'], difficulty: 4 },
  { code: 'LU', name: 'Luxembourg', imageUrl: 'https://flagcdn.com/w320/lu.png', region: 'Europe', colors: ['red', 'white', 'light blue'], difficulty: 4 },

  // African countries
  { code: 'NG', name: 'Nigeria', imageUrl: 'https://flagcdn.com/w320/ng.png', region: 'Africa', colors: ['green', 'white'], difficulty: 2 },
  { code: 'EG', name: 'Egypt', imageUrl: 'https://flagcdn.com/w320/eg.png', region: 'Africa', colors: ['red', 'white', 'black'], difficulty: 2 },
  { code: 'KE', name: 'Kenya', imageUrl: 'https://flagcdn.com/w320/ke.png', region: 'Africa', colors: ['black', 'red', 'green', 'white'], difficulty: 3 },
  { code: 'GH', name: 'Ghana', imageUrl: 'https://flagcdn.com/w320/gh.png', region: 'Africa', colors: ['red', 'yellow', 'green', 'black'], difficulty: 3 },
  { code: 'MA', name: 'Morocco', imageUrl: 'https://flagcdn.com/w320/ma.png', region: 'Africa', colors: ['red', 'green'], difficulty: 3 },
  { code: 'TN', name: 'Tunisia', imageUrl: 'https://flagcdn.com/w320/tn.png', region: 'Africa', colors: ['red', 'white'], difficulty: 4 },
  { code: 'DZ', name: 'Algeria', imageUrl: 'https://flagcdn.com/w320/dz.png', region: 'Africa', colors: ['green', 'white', 'red'], difficulty: 4 },
  { code: 'SN', name: 'Senegal', imageUrl: 'https://flagcdn.com/w320/sn.png', region: 'Africa', colors: ['green', 'yellow', 'red'], difficulty: 4 },

  // Asian countries
  { code: 'TH', name: 'Thailand', imageUrl: 'https://flagcdn.com/w320/th.png', region: 'Asia', colors: ['red', 'white', 'blue'], difficulty: 2 },
  { code: 'VN', name: 'Vietnam', imageUrl: 'https://flagcdn.com/w320/vn.png', region: 'Asia', colors: ['red', 'yellow'], difficulty: 2 },
  { code: 'ID', name: 'Indonesia', imageUrl: 'https://flagcdn.com/w320/id.png', region: 'Asia', colors: ['red', 'white'], difficulty: 3 },
  { code: 'MY', name: 'Malaysia', imageUrl: 'https://flagcdn.com/w320/my.png', region: 'Asia', colors: ['red', 'white', 'blue', 'yellow'], difficulty: 3 },
  { code: 'SG', name: 'Singapore', imageUrl: 'https://flagcdn.com/w320/sg.png', region: 'Asia', colors: ['red', 'white'], difficulty: 3 },
  { code: 'PH', name: 'Philippines', imageUrl: 'https://flagcdn.com/w320/ph.png', region: 'Asia', colors: ['blue', 'red', 'white', 'yellow'], difficulty: 3 },
  { code: 'BD', name: 'Bangladesh', imageUrl: 'https://flagcdn.com/w320/bd.png', region: 'Asia', colors: ['green', 'red'], difficulty: 4 },
  { code: 'PK', name: 'Pakistan', imageUrl: 'https://flagcdn.com/w320/pk.png', region: 'Asia', colors: ['green', 'white'], difficulty: 4 },

  // South American countries
  { code: 'CL', name: 'Chile', imageUrl: 'https://flagcdn.com/w320/cl.png', region: 'South America', colors: ['blue', 'white', 'red'], difficulty: 2 },
  { code: 'PE', name: 'Peru', imageUrl: 'https://flagcdn.com/w320/pe.png', region: 'South America', colors: ['red', 'white'], difficulty: 3 },
  { code: 'CO', name: 'Colombia', imageUrl: 'https://flagcdn.com/w320/co.png', region: 'South America', colors: ['yellow', 'blue', 'red'], difficulty: 3 },
  { code: 'VE', name: 'Venezuela', imageUrl: 'https://flagcdn.com/w320/ve.png', region: 'South America', colors: ['yellow', 'blue', 'red'], difficulty: 4 },
  { code: 'EC', name: 'Ecuador', imageUrl: 'https://flagcdn.com/w320/ec.png', region: 'South America', colors: ['yellow', 'blue', 'red'], difficulty: 4 },
  { code: 'UY', name: 'Uruguay', imageUrl: 'https://flagcdn.com/w320/uy.png', region: 'South America', colors: ['white', 'blue', 'yellow'], difficulty: 4 },

  // Middle Eastern countries
  { code: 'TR', name: 'Turkey', imageUrl: 'https://flagcdn.com/w320/tr.png', region: 'Asia', colors: ['red', 'white'], difficulty: 2 },
  { code: 'IL', name: 'Israel', imageUrl: 'https://flagcdn.com/w320/il.png', region: 'Asia', colors: ['white', 'blue'], difficulty: 3 },
  { code: 'SA', name: 'Saudi Arabia', imageUrl: 'https://flagcdn.com/w320/sa.png', region: 'Asia', colors: ['green', 'white'], difficulty: 3 },
  { code: 'AE', name: 'United Arab Emirates', imageUrl: 'https://flagcdn.com/w320/ae.png', region: 'Asia', colors: ['red', 'green', 'white', 'black'], difficulty: 4 },
  { code: 'IR', name: 'Iran', imageUrl: 'https://flagcdn.com/w320/ir.png', region: 'Asia', colors: ['green', 'white', 'red'], difficulty: 4 },

  // Oceania
  { code: 'NZ', name: 'New Zealand', imageUrl: 'https://flagcdn.com/w320/nz.png', region: 'Oceania', colors: ['blue', 'red', 'white'], difficulty: 3 },
  { code: 'FJ', name: 'Fiji', imageUrl: 'https://flagcdn.com/w320/fj.png', region: 'Oceania', colors: ['light blue', 'blue', 'red', 'white'], difficulty: 4 },

  // Additional challenging flags
  { code: 'IS', name: 'Iceland', imageUrl: 'https://flagcdn.com/w320/is.png', region: 'Europe', colors: ['blue', 'white', 'red'], difficulty: 4 },
  { code: 'MT', name: 'Malta', imageUrl: 'https://flagcdn.com/w320/mt.png', region: 'Europe', colors: ['white', 'red'], difficulty: 4 },
  { code: 'CY', name: 'Cyprus', imageUrl: 'https://flagcdn.com/w320/cy.png', region: 'Europe', colors: ['white', 'orange'], difficulty: 4 },
];

// Helper functions for data analysis
export const getCountriesByRegion = (region: string): CountryData[] => {
  return COUNTRIES.filter(country => country.region === region);
};

export const getCountriesByDifficulty = (difficulty: number): CountryData[] => {
  return COUNTRIES.filter(country => country.difficulty === difficulty);
};

export const getCountriesByColor = (color: string): CountryData[] => {
  return COUNTRIES.filter(country => 
    country.colors.some(c => c.toLowerCase().includes(color.toLowerCase()))
  );
};

export const getAllRegions = (): string[] => {
  return [...new Set(COUNTRIES.map(country => country.region))];
};

export const getAllColors = (): string[] => {
  const allColors = COUNTRIES.flatMap(country => country.colors);
  return [...new Set(allColors)];
};