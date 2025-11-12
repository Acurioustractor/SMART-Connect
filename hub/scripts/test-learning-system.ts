#!/usr/bin/env tsx

/**
 * Test script for the continuous learning system
 * Run with: npx tsx scripts/test-learning-system.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testLearningSystem() {
  console.log('🧪 Testing Continuous Learning System\n');

  const tests = [
    {
      name: 'Analyze Engagement Patterns',
      action: 'analyze_engagement',
      description: 'Identifies what content performs well'
    },
    {
      name: 'Update Recommendation Weights',
      action: 'update_weights',
      description: 'Adjusts confidence scores based on performance'
    },
    {
      name: 'Detect Success Patterns',
      action: 'detect_patterns',
      description: 'Machine learning from successful recommendations'
    },
    {
      name: 'Audit Content Quality',
      action: 'audit_quality',
      description: 'Finds stale or low-quality content'
    }
  ];

  const results: Array<{ test: string; success: boolean; duration: number; data?: any; error?: string }> = [];

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log(`   ${test.description}`);

    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE}/api/content/learning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: test.action })
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      const data = await response.json();

      results.push({
        test: test.name,
        success: true,
        duration,
        data
      });

      console.log(`   ✅ Success (${duration}ms)`);
      console.log(`   Result:`, JSON.stringify(data, null, 2).split('\n').map(line => `   ${line}`).join('\n'));

    } catch (error: any) {
      const duration = Date.now() - startTime;

      results.push({
        test: test.name,
        success: false,
        duration,
        error: error.message
      });

      console.log(`   ❌ Failed (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`✅ Passed: ${successCount}/${tests.length}`);
  console.log(`❌ Failed: ${failCount}/${tests.length}`);

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`⏱️  Total time: ${(totalDuration / 1000).toFixed(2)}s`);

  if (failCount > 0) {
    console.log('\n⚠️  Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.test}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Test the cron endpoint (manual trigger)
  console.log('\n🔧 Testing Manual Cron Trigger\n');

  try {
    const cronResponse = await fetch(`${API_BASE}/api/cron/improve-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actions: ['update_weights', 'analyze_engagement']
      })
    });

    const cronData = await cronResponse.json();
    console.log('✅ Cron trigger successful');
    console.log('   Results:', JSON.stringify(cronData, null, 2).split('\n').map(line => `   ${line}`).join('\n'));

  } catch (error: any) {
    console.log('❌ Cron trigger failed:', error.message);
  }

  console.log('\n✨ Testing complete!\n');

  return {
    success: failCount === 0,
    passed: successCount,
    failed: failCount,
    total: tests.length
  };
}

// Run tests
testLearningSystem()
  .then((summary) => {
    process.exit(summary.success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
