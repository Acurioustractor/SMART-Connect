import { NextResponse } from 'next/server';

/**
 * Automated System Improvement Cron Job
 * Runs weekly to continuously improve the AI system
 *
 * Schedule: Every Sunday at 2 AM UTC
 * Configure in vercel.json or run manually
 */
export async function GET(request: Request) {
  // Verify authorization (cron secret)
  const authHeader = request.headers.get('Authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    console.warn('❌ Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('🚀 Starting weekly system improvement cycle...');
  const startTime = Date.now();

  const jobs = [
    {
      name: 'Update Recommendation Weights',
      action: 'update_weights',
      description: 'Boost high-performers, reduce low-performers'
    },
    {
      name: 'Analyze Engagement Patterns',
      action: 'analyze_engagement',
      description: 'Identify what content works best'
    },
    {
      name: 'Detect Success Patterns',
      action: 'detect_patterns',
      description: 'Machine learning from successful recommendations'
    },
    {
      name: 'Audit Content Quality',
      action: 'audit_quality',
      description: 'Find stale or low-quality content'
    }
  ];

  const results: Array<{
    job: string;
    status: 'success' | 'error';
    duration_ms?: number;
    data?: any;
    error?: string;
  }> = [];

  // Execute each job sequentially
  for (const job of jobs) {
    const jobStart = Date.now();
    console.log(`\n📋 Running: ${job.name}...`);

    try {
      // Call the learning API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/content/learning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: job.action })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const duration = Date.now() - jobStart;

      results.push({
        job: job.name,
        status: 'success',
        duration_ms: duration,
        data: data
      });

      console.log(`✅ ${job.name} completed in ${duration}ms`);
    } catch (error: any) {
      const duration = Date.now() - jobStart;

      results.push({
        job: job.name,
        status: 'error',
        duration_ms: duration,
        error: error.message
      });

      console.error(`❌ ${job.name} failed:`, error.message);
    }
  }

  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log(`\n🏁 System improvement cycle complete`);
  console.log(`   ✅ Success: ${successCount}/${jobs.length}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   ⏱️ Total time: ${(totalDuration / 1000).toFixed(2)}s`);

  // Prepare summary
  const summary = {
    timestamp: new Date().toISOString(),
    success: errorCount === 0,
    total_duration_ms: totalDuration,
    jobs_completed: successCount,
    jobs_failed: errorCount,
    results: results
  };

  // TODO: Send email report to admin if there are errors
  if (errorCount > 0) {
    console.warn('⚠️ Some jobs failed. Consider sending an alert.');
    // await sendAlertEmail(summary);
  }

  return NextResponse.json(summary);
}

/**
 * POST endpoint to trigger manually (for testing)
 */
export async function POST(request: Request) {
  console.log('🔧 Manual trigger of system improvement cycle');

  // For manual triggers, we'll allow it without cron secret
  // but we should still verify it's an authenticated request

  try {
    const { actions } = await request.json();

    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { error: 'Please provide an array of actions to run' },
        { status: 400 }
      );
    }

    const results = [];

    for (const action of actions) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/content/learning`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
          }
        );

        const data = await response.json();
        results.push({ action, success: response.ok, data });
      } catch (error: any) {
        results.push({ action, success: false, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process manual trigger', details: error.message },
      { status: 500 }
    );
  }
}
