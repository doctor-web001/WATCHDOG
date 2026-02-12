
import { LexicalFeatures } from './types';

const SENSITIVE_BRANDS = [
  'google', 'microsoft', 'apple', 'amazon', 'netflix', 'facebook', 'instagram', 
  'twitter', 'paypal', 'chase', 'bankofamerica', 'wellsFargo', 'binance', 'coinbase'
];

/**
 * Calculates Shannon Entropy of a string to detect randomness (DGA/C2)
 */
const calculateEntropy = (str: string): number => {
  if (!str) return 0;
  const len = str.length;
  const frequencies: Record<string, number> = {};
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  return Object.values(frequencies).reduce((sum, freq) => {
    const p = freq / len;
    return sum - p * Math.log2(p);
  }, 0);
};

/**
 * Heuristic to detect spoofing of known high-value brands
 */
const checkBrandSimilarity = (domain: string): number => {
  const cleanDomain = domain.toLowerCase().replace(/\./g, '');
  let maxScore = 0;
  
  for (const brand of SENSITIVE_BRANDS) {
    // Exact match is safe (handled by legitimate logic), 
    // but fuzzy matches are highly suspicious
    if (cleanDomain === brand) return 0; 
    
    if (cleanDomain.includes(brand)) {
      maxScore = 0.8; // e.g. "secure-paypal-login.com"
    }
    
    // Simple character substitution check (e.g., p4ypal)
    const substituted = brand.replace(/a/g, '4').replace(/e/g, '3').replace(/i/g, '1').replace(/o/g, '0');
    if (cleanDomain.includes(substituted)) {
      maxScore = 1.0;
    }
  }
  return maxScore;
};

export const extractLexicalFeatures = (url: string): LexicalFeatures => {
  let urlObj: URL | null = null;
  try {
    urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch (e) {
    urlObj = null;
  }

  const domain = urlObj?.hostname || '';
  const path = urlObj?.pathname || '';
  
  const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const specialChars = /[!@#$%^&*(),.?":{}|<>]/;

  return {
    url_length: url.length,
    domain_length: domain.length,
    path_length: path.length,
    number_of_dots: (url.match(/\./g) || []).length,
    number_of_hyphens: (url.match(/-/g) || []).length,
    number_of_subdomains: domain.split('.').length - 2 > 0 ? domain.split('.').length - 2 : 0,
    number_of_digits: (url.match(/\d/g) || []).length,
    presence_of_ip_address: ipPattern.test(domain),
    presence_of_https: url.toLowerCase().startsWith('https'),
    presence_of_special_characters: specialChars.test(url),
    entropy: calculateEntropy(domain + path),
    brand_similarity: checkBrandSimilarity(domain),
  };
};

export const formatConfidence = (score: number) => (score * 100).toFixed(1) + '%';
