/**
 * TypeScript Background Workers for Parallel Real-Time Processing
 * Handles continuous background operations that persist across user sessions
 */

import { 
  BackgroundWorkerConfig, 
  BackgroundWorkerStats, 
  BackgroundWorkerState, 
  SystemHealthStatus,
  BackgroundWorkerResult,
  WorkerType 
} from '../types/index';
import { CONFIG } from '../config/constants';

export class TypeScriptBackgroundWorkerManager {
  private workers: Map<WorkerType, BackgroundWorkerState> = new Map();
  private systemHealth: SystemHealthStatus;
  private readonly safetyLimits = {
    maxMemoryUsagePercent: 95, // Increased from 90% to 95% for TypeScript system
    maxConcurrentOperations: 5,
    maxErrorsBeforeStop: 10,
    maxRuntimeHours: 24,
    maxGenerationsPerHour: 1000
  };

  constructor() {
    this.systemHealth = {
      memoryMonitorInterval: null,
      lastMemoryCheck: null,
      highMemoryWarnings: 0
    };

    // Initialize worker states
    this.initializeWorkerStates();
    
    console.log('[TS-BACKGROUND] TypeScript Background Worker Manager initialized');
  }

  /**
   * Initialize worker states for all supported worker types
   */
  private initializeWorkerStates(): void {
    const workerTypes: WorkerType[] = [
      'blogViewsGeneration',
      'superiorPowersAura', 
      'quantumHybrid',
      'cosmicEnhanced',
      'parallelProcessing'
    ];

    workerTypes.forEach(type => {
      this.workers.set(type, {
        active: false,
        starting: false,
        interval: null,
        config: null,
        stats: {
          started: null,
          totalGenerated: 0,
          errors: 0,
          lastGeneration: null,
          runtime: 0
        }
      });
    });
  }

  /**
   * Start parallel real-time background worker
   */
  async startBackgroundWorker(
    workerType: WorkerType, 
    config: Partial<BackgroundWorkerConfig> = {}
  ): Promise<BackgroundWorkerResult> {
    try {
      const worker = this.workers.get(workerType);
      if (!worker) {
        throw new Error(`Unknown worker type: ${workerType}`);
      }

      // Prevent race conditions
      if (worker.active) {
        throw new Error(`${workerType} worker is already running`);
      }

      if (worker.starting) {
        throw new Error(`${workerType} worker is already starting`);
      }
      worker.starting = true;

      try {
        // System health check
        if (!this.isSystemHealthy()) {
          throw new Error('System health check failed - cannot start worker');
        }

        // Merge with default config
        const finalConfig = this.mergeWithDefaultConfig(workerType, config);
        
        // Validate configuration
        this.validateWorkerConfig(finalConfig);

        console.log(`[TS-BACKGROUND] Starting ${workerType} worker with parallel processing`);
        
        // Initialize worker state atomically
        worker.config = finalConfig;
        worker.stats = {
          started: new Date().toISOString(),
          totalGenerated: 0,
          errors: 0,
          lastGeneration: null,
          runtime: 0
        };

        // Start the parallel background worker
        worker.interval = setInterval(async () => {
          try {
            await this.executeBackgroundWorker(workerType);
          } catch (error) {
            console.error(`[TS-BACKGROUND] Error in ${workerType} worker:`, error);
            worker.stats.errors++;
            
            // Auto-stop on excessive errors
            if (worker.stats.errors >= this.safetyLimits.maxErrorsBeforeStop) {
              console.error(`[TS-BACKGROUND] Stopping ${workerType} worker due to excessive errors`);
              this.stopBackgroundWorker(workerType);
            }
          }
        }, finalConfig.intervalMs);

        worker.active = true;
        
        // Start system monitoring
        this.startSystemMonitoring();
        
        console.log(`[TS-BACKGROUND] ${workerType} worker started successfully - running in parallel background`);
        
        return {
          success: true,
          message: `Parallel background ${workerType} worker started`,
          workerId: workerType,
          config: finalConfig,
          stats: worker.stats
        };

      } finally {
        worker.starting = false;
      }

    } catch (error) {
      const worker = this.workers.get(workerType);
      if (worker) worker.starting = false;
      console.error(`[TS-BACKGROUND] Failed to start ${workerType} worker:`, error);
      throw error;
    }
  }

  /**
   * Execute background worker based on type
   */
  private async executeBackgroundWorker(workerType: WorkerType): Promise<void> {
    const worker = this.workers.get(workerType);
    if (!worker || !worker.active) return;

    // System health check
    if (!this.isSystemHealthy()) {
      console.warn(`[TS-BACKGROUND] Skipping ${workerType} execution due to system health concerns`);
      return;
    }

    const config = worker.config!;
    const startTime = Date.now();

    try {
      switch (workerType) {
        case 'blogViewsGeneration':
          await this.generateBlogViewsInBackground(config, worker);
          break;
        case 'superiorPowersAura':
          await this.generateSuperiorPowersInBackground(config, worker);
          break;
        case 'quantumHybrid':
          await this.generateQuantumHybridInBackground(config, worker);
          break;
        case 'cosmicEnhanced':
          await this.generateCosmicEnhancedInBackground(config, worker);
          break;
        case 'parallelProcessing':
          await this.executeParallelProcessingTasks(config, worker);
          break;
        default:
          throw new Error(`Unsupported worker type: ${workerType}`);
      }

      worker.stats.totalGenerated++;
      worker.stats.lastGeneration = new Date().toISOString();
      worker.stats.runtime = Date.now() - new Date(worker.stats.started!).getTime();

      // Apply random delay if enabled
      if (config.enableRandomDelay && config.delayVariation) {
        const randomDelay = Math.random() * config.delayVariation - (config.delayVariation / 2);
        if (randomDelay > 0) {
          await this.sleep(randomDelay);
        }
      }

    } catch (error) {
      worker.stats.errors++;
      throw error;
    }
  }

  /**
   * Generate blog views in background
   */
  private async generateBlogViewsInBackground(
    config: BackgroundWorkerConfig, 
    worker: BackgroundWorkerState
  ): Promise<void> {
    const viewsToGenerate = Math.floor(
      Math.random() * (config.maxItemsPerInterval - config.itemsPerInterval + 1)
    ) + config.itemsPerInterval;

    console.log(`[TS-BACKGROUND] Generating ${viewsToGenerate} blog views in parallel background`);

    for (let i = 0; i < viewsToGenerate; i++) {
      // Generate advanced blog view with TypeScript aura features
      const blogView = {
        blogId: `ts_blog_${Math.floor(Math.random() * 1000) + 1}`,
        timestamp: new Date().toISOString(),
        sessionId: this.generateSessionId(),
        behavior: {
          readTime: Math.floor(Math.random() * 300000) + 60000, // 1-5 minutes
          scrollDepth: Math.floor(Math.random() * 50) + 50, // 50-100%
          engagementScore: Math.random() * 100,
          returnVisitor: Math.random() < 0.3,
          quantumEnhanced: config.enableQuantumFeatures || false,
          cosmicAligned: config.enableCosmicResonance || false
        },
        aura: {
          auraScore: Math.floor(Math.random() * 30) + 70, // 70-100
          auraQuality: config.auraQualityTarget || 85,
          quantumCoherence: config.enableQuantumFeatures ? Math.random() * 100 : 0,
          cosmicResonance: config.enableCosmicResonance ? Math.random() * 100 : 0
        },
        background: true,
        parallel: true,
        persistent: true, // Continues even if user closes browser
        generationContext: {
          type: 'typescript_background_worker',
          workerId: 'blogViewsGeneration',
          timestamp: new Date().toISOString(),
          parallelProcessing: true
        }
      };

      // Simulate small delay between generations for realism
      if (i < viewsToGenerate - 1) {
        await this.sleep(Math.random() * 2000 + 500);
      }
    }
  }

  /**
   * Generate superior powers aura in background
   */
  private async generateSuperiorPowersInBackground(
    config: BackgroundWorkerConfig, 
    worker: BackgroundWorkerState
  ): Promise<void> {
    const powerLevels = ['Alpha', 'Beta', 'Gamma', 'Omega', 'Quantum'];
    const selectedLevel = powerLevels[Math.floor(Math.random() * powerLevels.length)];
    
    console.log(`[TS-BACKGROUND] Generating Superior Powers Aura at ${selectedLevel} level in parallel background`);

    const auraGeneration = {
      powerLevel: selectedLevel,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      auraFeatures: {
        realityManipulation: Math.random() * 100,
        temporalFlow: Math.random() * 100,
        quantumEntanglement: config.enableQuantumFeatures ? Math.random() * 100 : 0,
        cosmicHarmonization: config.enableCosmicResonance ? Math.random() * 100 : 0,
        neuralNetworkPower: Math.random() * 100
      },
      background: true,
      parallel: true,
      persistent: true,
      generationContext: {
        type: 'typescript_background_worker',
        workerId: 'superiorPowersAura',
        timestamp: new Date().toISOString(),
        parallelProcessing: true
      }
    };

    await this.sleep(Math.random() * 1000 + 500);
  }

  /**
   * Generate quantum hybrid content in background
   */
  private async generateQuantumHybridInBackground(
    config: BackgroundWorkerConfig, 
    worker: BackgroundWorkerState
  ): Promise<void> {
    if (!config.enableQuantumFeatures) return;

    console.log('[TS-BACKGROUND] Generating Quantum Hybrid content in parallel background');

    const quantumContent = {
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      quantumState: {
        superposition: Math.random() < 0.5,
        entanglement: Math.random() * 100,
        coherence: Math.random() * 100,
        decoherence: Math.random() * 30
      },
      hybridFeatures: {
        multidimensionalAnalytics: true,
        realityAnchoring: Math.random() * 100,
        quantumAlgorithms: true,
        parallelUniverseSync: Math.random() < 0.1
      },
      background: true,
      parallel: true,
      persistent: true,
      generationContext: {
        type: 'typescript_background_worker',
        workerId: 'quantumHybrid',
        timestamp: new Date().toISOString(),
        parallelProcessing: true
      }
    };

    await this.sleep(Math.random() * 1500 + 500);
  }

  /**
   * Generate cosmic enhanced content in background
   */
  private async generateCosmicEnhancedInBackground(
    config: BackgroundWorkerConfig, 
    worker: BackgroundWorkerState
  ): Promise<void> {
    if (!config.enableCosmicResonance) return;

    console.log('[TS-BACKGROUND] Generating Cosmic Enhanced content in parallel background');

    const cosmicContent = {
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      cosmicAlignment: {
        planetaryAlignment: Math.random() * 100,
        lunarPhase: Math.floor(Math.random() * 8), // 0-7 lunar phases
        solarActivity: Math.random() * 100,
        universalHarmony: Math.random() * 100
      },
      enhancedFeatures: {
        celestialSynchronization: true,
        galacticResonance: Math.random() * 100,
        dimensionalShift: Math.random() < 0.05,
        cosmicEnergy: Math.random() * 100
      },
      background: true,
      parallel: true,
      persistent: true,
      generationContext: {
        type: 'typescript_background_worker',
        workerId: 'cosmicEnhanced',
        timestamp: new Date().toISOString(),
        parallelProcessing: true
      }
    };

    await this.sleep(Math.random() * 1200 + 500);
  }

  /**
   * Execute parallel processing tasks
   */
  private async executeParallelProcessingTasks(
    config: BackgroundWorkerConfig, 
    worker: BackgroundWorkerState
  ): Promise<void> {
    console.log('[TS-BACKGROUND] Executing parallel processing tasks in background');

    // Execute multiple background tasks in parallel
    const parallelTasks = [
      this.generateBlogViewsInBackground(config, worker),
      this.generateSuperiorPowersInBackground(config, worker)
    ];

    if (config.enableQuantumFeatures) {
      parallelTasks.push(this.generateQuantumHybridInBackground(config, worker));
    }

    if (config.enableCosmicResonance) {
      parallelTasks.push(this.generateCosmicEnhancedInBackground(config, worker));
    }

    // Execute all tasks in parallel
    await Promise.all(parallelTasks);
  }

  /**
   * Stop background worker
   */
  stopBackgroundWorker(workerType: WorkerType): BackgroundWorkerResult {
    try {
      const worker = this.workers.get(workerType);
      if (!worker || !worker.active) {
        return { 
          success: false, 
          message: `${workerType} worker is not running`,
          workerId: workerType
        };
      }

      if (worker.interval) {
        clearInterval(worker.interval);
        worker.interval = null;
      }

      worker.active = false;
      const stats = { ...worker.stats };
      stats.runtime = Date.now() - new Date(stats.started!).getTime();
      
      console.log(`[TS-BACKGROUND] Stopped ${workerType} worker. Final stats:`, stats);
      
      // Stop system monitoring if no workers are active
      this.checkSystemMonitoring();
      
      return {
        success: true,
        message: `${workerType} worker stopped successfully`,
        workerId: workerType,
        finalStats: stats
      };

    } catch (error) {
      console.error(`[TS-BACKGROUND] Error stopping ${workerType} worker:`, error);
      throw error;
    }
  }

  /**
   * Stop all background workers
   */
  stopAllBackgroundWorkers(): { [key: string]: BackgroundWorkerResult } {
    const results: { [key: string]: BackgroundWorkerResult } = {};
    
    for (const [workerType] of this.workers) {
      try {
        results[workerType] = this.stopBackgroundWorker(workerType);
      } catch (error) {
        results[workerType] = { 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error',
          workerId: workerType
        };
      }
    }
    
    this.stopSystemMonitoring();
    
    console.log('[TS-BACKGROUND] All background workers stopped');
    return results;
  }

  /**
   * Get status of all background workers
   */
  getBackgroundWorkersStatus(): any {
    const status = {
      timestamp: new Date().toISOString(),
      systemHealth: this.getSystemHealth(),
      totalActiveWorkers: 0,
      workers: {} as any
    };

    for (const [workerType, worker] of this.workers) {
      if (worker.active) status.totalActiveWorkers++;
      
      status.workers[workerType] = {
        active: worker.active,
        config: worker.config,
        stats: worker.stats,
        runtime: worker.stats.started ? 
          Math.floor((Date.now() - new Date(worker.stats.started).getTime()) / 1000) : 0,
        parallel: true,
        persistent: true
      };
    }

    return status;
  }

  /**
   * Merge with default configuration
   */
  private mergeWithDefaultConfig(workerType: WorkerType, config: Partial<BackgroundWorkerConfig>): BackgroundWorkerConfig {
    const defaultConfig: BackgroundWorkerConfig = {
      intervalMs: 10000, // 10 seconds
      itemsPerInterval: 1,
      maxItemsPerInterval: 3,
      enableRandomDelay: true,
      delayVariation: 2000,
      respectRateLimits: true,
      enableQuantumFeatures: CONFIG.EXPERIMENTAL.enableQuantumFeatures,
      enableCosmicResonance: CONFIG.EXPERIMENTAL.enableCosmicResonance,
      auraQualityTarget: 90,
      parallelProcessing: true,
      persistentExecution: true
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Validate worker configuration
   */
  private validateWorkerConfig(config: BackgroundWorkerConfig): void {
    if (config.intervalMs < 1000) {
      throw new Error('Interval must be at least 1000ms to prevent system overload');
    }
    
    if (config.maxItemsPerInterval > 20) {
      throw new Error('Maximum items per interval cannot exceed 20 for safety');
    }
  }

  /**
   * System monitoring and health management
   */
  private startSystemMonitoring(): void {
    if (this.systemHealth.memoryMonitorInterval) return;
    
    this.systemHealth.memoryMonitorInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 30000); // Check every 30 seconds
    
    console.log('[TS-BACKGROUND] System health monitoring started for parallel workers');
  }

  private stopSystemMonitoring(): void {
    if (this.systemHealth.memoryMonitorInterval) {
      clearInterval(this.systemHealth.memoryMonitorInterval);
      this.systemHealth.memoryMonitorInterval = null;
      console.log('[TS-BACKGROUND] System health monitoring stopped');
    }
  }

  private checkSystemMonitoring(): void {
    const hasActiveWorkers = Array.from(this.workers.values()).some(worker => worker.active);
    if (!hasActiveWorkers) {
      this.stopSystemMonitoring();
    }
  }

  private checkSystemHealth(): void {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    this.systemHealth.lastMemoryCheck = {
      timestamp: new Date().toISOString(),
      memoryUsagePercent: memUsagePercent,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
    };

    if (memUsagePercent > this.safetyLimits.maxMemoryUsagePercent) {
      this.systemHealth.highMemoryWarnings++;
      console.warn(`[TS-BACKGROUND] High memory usage detected: ${memUsagePercent.toFixed(1)}%`);
      
      if (this.systemHealth.highMemoryWarnings >= 3) {
        console.error('[TS-BACKGROUND] Stopping all workers due to persistent high memory usage');
        this.stopAllBackgroundWorkers();
      }
    } else {
      this.systemHealth.highMemoryWarnings = 0;
    }
  }

  private isSystemHealthy(): boolean {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    return memUsagePercent < this.safetyLimits.maxMemoryUsagePercent;
  }

  private getSystemHealth(): any {
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    return {
      healthy: this.isSystemHealthy(),
      memoryUsage: {
        percent: memUsagePercent,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
      },
      uptime: process.uptime(),
      lastCheck: this.systemHealth.lastMemoryCheck,
      warnings: this.systemHealth.highMemoryWarnings,
      parallelWorkers: true,
      persistentExecution: true
    };
  }

  /**
   * Graceful shutdown
   */
  gracefulShutdown(): { [key: string]: BackgroundWorkerResult } {
    console.log('[TS-BACKGROUND] Initiating graceful shutdown of TypeScript background workers...');
    
    const results = this.stopAllBackgroundWorkers();
    this.stopSystemMonitoring();
    
    console.log('[TS-BACKGROUND] Graceful shutdown completed');
    return results;
  }

  /**
   * Utility methods
   */
  private generateSessionId(): string {
    return `ts_bg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance for TypeScript background workers
export const typeScriptBackgroundWorkerManager = new TypeScriptBackgroundWorkerManager();

// Process management for graceful shutdown
process.on('SIGTERM', () => {
  console.log('[TS-BACKGROUND] Received SIGTERM, gracefully shutting down background workers...');
  typeScriptBackgroundWorkerManager.gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('[TS-BACKGROUND] Received SIGINT, gracefully shutting down background workers...');
  typeScriptBackgroundWorkerManager.gracefulShutdown();
});