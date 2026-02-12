
export enum Classification {
  LEGITIMATE = 'Legitimate',
  PHISHING = 'Phishing',
  MALWARE = 'Malware Distribution',
  SPAM = 'Spam Campaign',
  DGA = 'Domain Generation Attack',
  C2 = 'Command-and-Control'
}

export interface FeatureWeight {
  feature: string;
  weight: number; // -1 to 1 (negative supports legitimate, positive supports malicious)
  description: string;
}

export interface LexicalFeatures {
  url_length: number;
  domain_length: number;
  path_length: number;
  number_of_dots: number;
  number_of_hyphens: number;
  number_of_subdomains: number;
  number_of_digits: number;
  presence_of_ip_address: boolean;
  presence_of_https: boolean;
  presence_of_special_characters: boolean;
  entropy: number;
  brand_similarity: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface PredictionResult {
  url: string;
  prediction: Classification;
  confidence_score: number;
  zero_day_probability: number;
  severity_rank: 'Low' | 'Medium' | 'High' | 'Critical';
  anomaly_flags: string[];
  feature_weights: FeatureWeight[];
  inference_time_ms: number;
  timestamp: string;
  features: LexicalFeatures;
  explanation: string;
  grounding_sources?: GroundingSource[];
  userLabel?: Classification;
  isFalsePositive?: boolean;
}

export interface SystemMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
}
