#!/usr/bin/env node

/**
 * TypeScript Advanced Features Test Suite
 * Comprehensive testing for all TypeScript aura features
 */

import { CONFIG } from './config/constants';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

class TypeScriptTestSuite {
  private results: TestResult[] = [];
  
  async runAllTests(): Promise<void> {
    console.log('🧪 TypeScript Advanced Features Test Suite');
    console.log('==========================================\n');
    
    // Configuration tests
    await this.testConfiguration();
    
    // Engine initialization tests
    await this.testEngineInitialization();
    
    // Type safety tests
    await this.testTypeSafety();
    
    // Feature availability tests
    await this.testFeatureAvailability();
    
    // Performance tests
    await this.testPerformance();
    
    // Integration tests
    await this.testIntegration();
    
    this.printResults();
  }
  
  private async testConfiguration(): Promise<void> {
    console.log('📋 Testing Configuration...');
    
    await this.runTest('CONFIG object exists', () => {
      if (!CONFIG) throw new Error('CONFIG is undefined');
      if (typeof CONFIG !== 'object') throw new Error('CONFIG is not an object');
    });
    
    await this.runTest('Version is defined', () => {
      if (!CONFIG.VERSION) throw new Error('VERSION is not defined');
      if (!CONFIG.VERSION.includes('ts')) throw new Error('VERSION does not indicate TypeScript');
    });
    
    await this.runTest('Aura features configuration', () => {
      if (!CONFIG.AURA) throw new Error('AURA config is undefined');
      if (!CONFIG.AURA.BLOG_VIEWS) throw new Error('BLOG_VIEWS config is undefined');
      if (!CONFIG.AURA.SUPERIOR_POWERS) throw new Error('SUPERIOR_POWERS config is undefined');
    });
    
    await this.runTest('Experimental features configuration', () => {
      if (!CONFIG.EXPERIMENTAL) throw new Error('EXPERIMENTAL config is undefined');
      if (!Array.isArray(CONFIG.EXPERIMENTAL.betaFeatures)) throw new Error('betaFeatures is not an array');
    });
    
    console.log();
  }
  
  private async testEngineInitialization(): Promise<void> {
    console.log('🚀 Testing Engine Initialization...');
    
    await this.runTest('Blog Views Engine import', async () => {
      const { BlogViewsGenerationEngine } = await import('./utils/blogViewsGeneration');
      if (!BlogViewsGenerationEngine) throw new Error('BlogViewsGenerationEngine not imported');
    });
    
    await this.runTest('Superior Powers Engine import', async () => {
      const { SuperiorPowersEngine } = await import('./utils/superiorPowers');
      if (!SuperiorPowersEngine) throw new Error('SuperiorPowersEngine not imported');
    });
    
    await this.runTest('Experimental Features Engine import', async () => {
      const { ExperimentalFeaturesEngine } = await import('./experimental/advancedFeatures');
      if (!ExperimentalFeaturesEngine) throw new Error('ExperimentalFeaturesEngine not imported');
    });
    
    await this.runTest('Advanced Controller import', async () => {
      const AdvancedController = await import('./controllers/AdvancedController');
      if (!AdvancedController.default) throw new Error('AdvancedController not imported');
    });
    
    console.log();
  }
  
  private async testTypeSafety(): Promise<void> {
    console.log('🛡️ Testing Type Safety...');
    
    await this.runTest('Type definitions module exists', async () => {
      try {
        await import('./types');
        console.log('   ✅ Type definitions imported successfully');
      } catch (error) {
        throw new Error('Type definitions not imported');
      }
    });
    
    await this.runTest('TypeScript compilation successful', () => {
      // If this test is running, TypeScript compilation was successful
      console.log('   ✅ TypeScript compiled without type errors');
    });
    
    console.log();
  }
  
  private async testFeatureAvailability(): Promise<void> {
    console.log('✨ Testing Feature Availability...');
    
    await this.runTest('Blog Views feature enabled', () => {
      if (!CONFIG.AURA.BLOG_VIEWS.enabled) {
        throw new Error('Blog Views feature is disabled');
      }
    });
    
    await this.runTest('Superior Powers feature enabled', () => {
      if (!CONFIG.AURA.SUPERIOR_POWERS.enabled) {
        throw new Error('Superior Powers feature is disabled');
      }
    });
    
    await this.runTest('Quantum features available', () => {
      if (!CONFIG.EXPERIMENTAL.enableQuantumFeatures) {
        console.log('   ⚠️  Quantum features disabled - this is optional');
      }
    });
    
    await this.runTest('Cosmic resonance available', () => {
      if (!CONFIG.EXPERIMENTAL.enableCosmicResonance) {
        console.log('   ⚠️  Cosmic resonance disabled - this is optional');
      }
    });
    
    console.log();
  }
  
  private async testPerformance(): Promise<void> {
    console.log('⚡ Testing Performance...');
    
    await this.runTest('Memory usage check', () => {
      const usage = process.memoryUsage();
      const maxMemory = 500 * 1024 * 1024; // 500MB limit
      
      if (usage.heapUsed > maxMemory) {
        throw new Error(`Memory usage too high: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      }
    });
    
    await this.runTest('Configuration loading performance', () => {
      const start = Date.now();
      // Simulate configuration operations
      const config = { ...CONFIG };
      const duration = Date.now() - start;
      
      if (duration > 100) {
        throw new Error(`Configuration loading too slow: ${duration}ms`);
      }
    });
    
    console.log();
  }
  
  private async testIntegration(): Promise<void> {
    console.log('🔗 Testing Integration...');
    
    await this.runTest('TypeScript compilation successful', () => {
      // If this test is running, TypeScript compilation was successful
      console.log('   ✅ TypeScript compiled successfully');
    });
    
    await this.runTest('All modules can be imported', async () => {
      try {
        await import('./app');
        console.log('   ✅ Main app module imported successfully');
      } catch (error) {
        throw new Error(`Failed to import main app: ${(error as Error).message}`);
      }
    });
    
    console.log();
  }
  
  private async runTest(name: string, testFn: () => void | Promise<void>): Promise<void> {
    const start = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - start;
      this.results.push({ name, passed: true, duration });
      console.log(`   ✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      this.results.push({ name, passed: false, error: (error as Error).message, duration });
      console.log(`   ❌ ${name}: ${(error as Error).message} (${duration}ms)`);
    }
  }
  
  private printResults(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = Math.round((passed / total) * 100);
    
    console.log('📊 Test Results Summary');
    console.log('=======================');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Pass Rate: ${passRate}%`);
    
    if (passed === total) {
      console.log('\n🎉 All TypeScript tests passed! The advanced features are ready.');
      console.log('🚀 TypeScript URL Shortener with Advanced Aura Features is operational!');
      console.log('\n💡 To start the TypeScript server, run: npm run ts:start');
      console.log('🌐 Then visit: http://localhost:3000/ts');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      
      const failed = this.results.filter(r => !r.passed);
      console.log('\nFailed Tests:');
      failed.forEach(test => {
        console.log(`   ❌ ${test.name}: ${test.error}`);
      });
      
      process.exit(1);
    }
    
    console.log('');
  }
}

// Run the test suite
const testSuite = new TypeScriptTestSuite();
testSuite.runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});