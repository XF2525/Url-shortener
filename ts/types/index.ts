/**
 * Core type definitions for URL Shortener with Advanced Aura Features
 * Enhanced with Background Workers for Parallel Real-Time Processing
 */

// ===== BACKGROUND WORKERS TYPES =====

export type WorkerType = 
  | 'blogViewsGeneration'
  | 'superiorPowersAura'
  | 'quantumHybrid'
  | 'cosmicEnhanced'
  | 'parallelProcessing';

export interface BackgroundWorkerConfig {
  intervalMs: number;
  itemsPerInterval: number;
  maxItemsPerInterval: number;
  enableRandomDelay: boolean;
  delayVariation?: number;
  respectRateLimits: boolean;
  enableQuantumFeatures?: boolean;
  enableCosmicResonance?: boolean;
  auraQualityTarget?: number;
  parallelProcessing?: boolean;
  persistentExecution?: boolean;
}

export interface BackgroundWorkerStats {
  started: string | null;
  totalGenerated: number;
  errors: number;
  lastGeneration: string | null;
  runtime: number;
}

export interface BackgroundWorkerState {
  active: boolean;
  starting: boolean;
  interval: NodeJS.Timeout | null;
  config: BackgroundWorkerConfig | null;
  stats: BackgroundWorkerStats;
}

export interface BackgroundWorkerResult {
  success: boolean;
  message: string;
  workerId: WorkerType;
  config?: BackgroundWorkerConfig;
  stats?: BackgroundWorkerStats;
  finalStats?: BackgroundWorkerStats;
}

export interface SystemHealthStatus {
  memoryMonitorInterval: NodeJS.Timeout | null;
  lastMemoryCheck: any;
  highMemoryWarnings: number;
}

export interface BackgroundWorkerStatusResponse {
  success: boolean;
  message: string;
  timestamp: string;
  version: string;
  data: {
    timestamp: string;
    systemHealth: any;
    totalActiveWorkers: number;
    workers: {
      [key in WorkerType]: {
        active: boolean;
        config: BackgroundWorkerConfig | null;
        stats: BackgroundWorkerStats;
        runtime: number;
        parallel: boolean;
        persistent: boolean;
      };
    };
  };
}

export interface StartBackgroundWorkerRequest {
  workerType: WorkerType;
  config?: Partial<BackgroundWorkerConfig>;
}

export interface StopBackgroundWorkerRequest {
  workerType?: WorkerType;
  stopAll?: boolean;
}

// Core URL shortener types
export interface ShortUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  createdAt: Date;
  lastAccessed?: Date;
  clicks: number;
  isActive: boolean;
  metadata: UrlMetadata;
  auraData?: AuraEnhancedData;
}

export interface UrlMetadata {
  title?: string;
  description?: string;
  favicon?: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  tags?: string[];
}

// Advanced Aura System Types
export interface AuraEnhancedData {
  auraScore: number;
  qualityMetrics: QualityMetrics;
  premiumFeatures: PremiumFeatures;
  behaviorPatterns: BehaviorPatterns;
  geographicData: GeographicData;
  securityMetrics: SecurityMetrics;
  performanceData: PerformanceData;
  nextGenFeatures?: NextGenFeatures;
}

export interface QualityMetrics {
  qualityTier: 'Basic' | 'Premium' | 'Ultra' | 'Supreme';
  authenticityScore: number;
  naturalityIndex: number;
  coherenceRating: number;
  sophisticationLevel: number;
}

export interface PremiumFeatures {
  realTimeAnalytics: boolean;
  advancedHeatmaps: boolean;
  predictiveForecasting: boolean;
  intelligentFiltering: boolean;
  customDashboards: boolean;
  aiOptimization: boolean;
}

export interface BehaviorPatterns {
  sessionDuration: number;
  scrollDepth: number;
  clickEvents: number;
  auraEngagement: number;
  naturalityScore: number;
  authenticityIndex: number;
  premiumIndicators: {
    organicFlow: number;
    humanPatterns: number;
    engagementDepth: number;
  };
}

export interface GeographicData {
  country: string;
  region: string;
  city: string;
  timezone: string;
  localTimeAccuracy: number;
  culturalAlignment: number;
  regionPatterns: {
    browsingStyle: string;
    preferredHours: number[];
    culturalFactors: number;
  };
}

export interface SecurityMetrics {
  fingerprintMasking: number;
  antiDetectionScore: number;
  stealthCapability: number;
  securityLevel: 'Basic' | 'Enhanced' | 'Military' | 'Quantum';
}

export interface PerformanceData {
  processingTime: number;
  memoryUsage: number;
  cpuEfficiency: number;
  loadBalancingScore: number;
  optimizationLevel: number;
}

export interface NextGenFeatures {
  quantumRandomization?: QuantumData;
  blockchainVerification?: BlockchainData;
  aiQualityScoring?: AIData;
  predictiveModeling?: PredictiveData;
}

// Blog Views Generation Types
export interface BlogViewConfig {
  targetViews: number;
  readingPatterns: ReadingPattern[];
  contentCategories: string[];
  demographicTargeting: DemographicTarget;
  seasonalAdjustments: SeasonalAdjustment[];
  auraQualityTarget: number;
}

export interface ReadingPattern {
  avgReadTime: number;
  scrollBehavior: ScrollBehavior;
  engagementLevel: 'Low' | 'Medium' | 'High' | 'Ultra';
  interactionPoints: InteractionPoint[];
}

export interface ScrollBehavior {
  scrollSpeed: number;
  pausePoints: number[];
  backtrackingProbability: number;
  naturalPauses: boolean;
}

export interface InteractionPoint {
  type: 'click' | 'hover' | 'focus' | 'scroll_pause';
  timing: number;
  duration: number;
  element?: string;
}

export interface DemographicTarget {
  ageGroups: string[];
  interests: string[];
  deviceTypes: string[];
  geographicRegions: string[];
}

export interface SeasonalAdjustment {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  adjustmentFactor: number;
  peakHours: number[];
  contentPreferences: string[];
}

// SuperiorPowers Advanced Aura Types
export interface SuperiorPowersConfig {
  powerLevel: 'Alpha' | 'Beta' | 'Gamma' | 'Omega' | 'Quantum';
  enhancementModules: EnhancementModule[];
  neuralNetworkConfig: NeuralNetworkConfig;
  quantumAlgorithms: QuantumAlgorithm[];
  adaptiveLearning: boolean;
}

export interface EnhancementModule {
  name: string;
  type: 'performance' | 'quality' | 'security' | 'intelligence';
  level: number;
  configuration: Record<string, any>;
  isActive: boolean;
}

export interface NeuralNetworkConfig {
  layers: NetworkLayer[];
  learningRate: number;
  optimizationAlgorithm: string;
  trainingData: TrainingDataSet[];
}

export interface NetworkLayer {
  type: 'input' | 'hidden' | 'output';
  neurons: number;
  activationFunction: string;
  dropoutRate?: number;
}

export interface TrainingDataSet {
  input: number[];
  expectedOutput: number[];
  weight: number;
  category: string;
}

export interface QuantumAlgorithm {
  name: string;
  implementation: string;
  quantumBits: number;
  entanglementLevel: number;
  superpositionStates: number;
}

// Experimental Features Types
export interface ExperimentalFeatures {
  realTimeQuantumGeneration: boolean;
  multidimensionalAnalytics: boolean;
  predictiveAI: boolean;
  adaptiveQuality: boolean;
  holisticOptimization: boolean;
  cosmicResonance?: CosmicResonanceData;
}

export interface CosmicResonanceData {
  lunarPhaseAlignment: number;
  solarActivityIndex: number;
  planetaryAlignment: number;
  quantumFluctuation: number;
}

// Advanced Analytics Types
export interface AdvancedAnalytics {
  heatmapData: HeatmapData;
  predictiveForecasting: PredictiveForecasting;
  trendAnalysis: TrendAnalysis;
  realTimeInsights: RealTimeInsights;
  behaviorPrediction: BehaviorPrediction;
}

export interface HeatmapData {
  dataPoints: DataPoint[];
  intensity: number[][];
  timeRange: TimeRange;
  interactionDensity: number;
}

export interface DataPoint {
  x: number;
  y: number;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface PredictiveForecasting {
  accuracy: number;
  confidenceInterval: number;
  predictions: Prediction[];
  modelType: string;
}

export interface Prediction {
  timestamp: Date;
  predictedValue: number;
  confidence: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  influence: number;
  weight: number;
}

export interface TrendAnalysis {
  trendDirection: 'up' | 'down' | 'stable' | 'volatile';
  trendStrength: number;
  volatility: number;
  seasonality: number;
  anomalies: Anomaly[];
}

export interface Anomaly {
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number;
}

export interface RealTimeInsights {
  currentQuality: number;
  liveMetrics: LiveMetric[];
  alerts: Alert[];
  recommendations: Recommendation[];
}

export interface LiveMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  timestamp: Date;
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  source: string;
}

export interface Recommendation {
  id: string;
  type: 'optimization' | 'quality' | 'performance' | 'security';
  description: string;
  priority: number;
  estimatedImpact: number;
}

export interface BehaviorPrediction {
  userSegments: UserSegment[];
  predictedActions: PredictedAction[];
  engagementForecast: EngagementForecast;
}

export interface UserSegment {
  id: string;
  characteristics: Record<string, any>;
  size: number;
  behavior: BehaviorPatterns;
}

export interface PredictedAction {
  action: string;
  probability: number;
  timing: number;
  conditions: string[];
}

export interface EngagementForecast {
  shortTerm: ForecastPeriod;
  mediumTerm: ForecastPeriod;
  longTerm: ForecastPeriod;
}

export interface ForecastPeriod {
  duration: string;
  expectedEngagement: number;
  confidence: number;
  factors: string[];
}

// Additional quantum and blockchain types
export interface QuantumData {
  entropy: number;
  coherenceTime: number;
  quantumStates: QuantumState[];
  entanglement: EntanglementData;
}

export interface QuantumState {
  qubits: number;
  superposition: number;
  measurement: number;
  probability: number;
}

export interface EntanglementData {
  partners: string[];
  correlationStrength: number;
  decoherenceRate: number;
}

export interface BlockchainData {
  blockHash: string;
  transactionId: string;
  verificationRate: number;
  consensusScore: number;
  immutabilityIndex: number;
}

export interface AIData {
  modelVersion: string;
  accuracy: number;
  confidence: number;
  learningRate: number;
  adaptationScore: number;
}

export interface PredictiveData {
  precision: number;
  recall: number;
  f1Score: number;
  modelComplexity: number;
  predictionHorizon: number;
}

// Configuration and system types
export interface SystemConfig {
  auraFeatures: AuraConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  experimental: ExperimentalConfig;
}

export interface AuraConfig {
  enabled: boolean;
  qualityThreshold: number;
  premiumMode: boolean;
  enhancedAnalytics: boolean;
  realTimeMonitoring: boolean;
  visualFeedback: boolean;
  [key: string]: any;
}

export interface SecurityConfig {
  rateLimiting: RateLimitConfig;
  authentication: AuthConfig;
  encryption: EncryptionConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface AuthConfig {
  tokenExpiry: number;
  refreshTokens: boolean;
  multiFactorAuth: boolean;
}

export interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  saltRounds: number;
}

export interface PerformanceConfig {
  maxConcurrentOperations: number;
  memoryUsageThreshold: number;
  processingTimeout: number;
  cacheSize: number;
}

export interface ExperimentalConfig {
  enableQuantumFeatures: boolean;
  enableCosmicResonance: boolean;
  enableMultidimensionalAnalytics: boolean;
  betaFeatures: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
  version: string;
}

export interface BulkGenerationResult {
  totalGenerated: number;
  successRate: number;
  auraMetrics: AuraMetrics;
  processingTime: number;
  qualityDistribution: QualityDistribution;
  errors?: string[];
}

export interface AuraMetrics {
  averageScore: number;
  qualityDistribution: QualityDistribution;
  premiumFeatureUsage: number;
  performanceIndex: number;
}

export interface QualityDistribution {
  Basic: number;
  Premium: number;
  Ultra: number;
  Supreme: number;
}

// Event and activity types
export interface ActivityLog {
  id: string;
  type: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
}

export interface GenerationActivity extends ActivityLog {
  operationType: string;
  count: number;
  auraScore: number;
  qualityMetrics: Partial<QualityMetrics>;
}

// Express.js augmentation for TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: any;
      auraData?: AuraEnhancedData;
      experimentalFeatures?: ExperimentalFeatures;
    }
  }
}