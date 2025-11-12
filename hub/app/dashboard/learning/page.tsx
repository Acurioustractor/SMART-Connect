import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Learning System Dashboard
 * Visualizes the continuous improvement system's performance
 */
export default async function LearningDashboard() {
  const supabase = await createClient();

  // Fetch system health metrics
  const { data: healthMetrics } = await supabase
    .from('system_health_metrics')
    .select('*')
    .single();

  // Fetch recent learned patterns
  const { data: recentPatterns } = await supabase
    .from('learned_patterns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch recommendation effectiveness
  const { data: recEffectiveness } = await supabase
    .from('recommendation_effectiveness_summary')
    .select('*')
    .order('avg_ctr', { ascending: false });

  // Fetch recent facilitator feedback
  const { data: recentFeedback } = await supabase
    .from('facilitator_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch open improvements
  const { data: openImprovements } = await supabase
    .from('system_improvements')
    .select('*')
    .eq('status', 'identified')
    .order('priority', { ascending: true });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Learning System Dashboard</h1>
          <p className="text-muted-foreground">
            Continuous improvement metrics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => triggerLearning('analyze_engagement')}>
            Analyze Now
          </Button>
          <Button onClick={() => triggerLearning('update_weights')}>
            Update Weights
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Content Quality"
          value={(healthMetrics?.avg_quality_score || 0).toFixed(2)}
          target="0.70"
          status={getHealthStatus(healthMetrics?.avg_quality_score, 0.7, 0.6)}
        />
        <MetricCard
          title="Avg CTR"
          value={`${((healthMetrics?.avg_ctr || 0) * 100).toFixed(1)}%`}
          target="15%"
          status={getHealthStatus(healthMetrics?.avg_ctr, 0.15, 0.10)}
        />
        <MetricCard
          title="Avg Save Rate"
          value={`${((healthMetrics?.avg_save_rate || 0) * 100).toFixed(1)}%`}
          target="5%"
          status={getHealthStatus(healthMetrics?.avg_save_rate, 0.05, 0.03)}
        />
        <MetricCard
          title="Stale Content"
          value={healthMetrics?.stale_content_count || 0}
          target="< 10%"
          status={getHealthStatus(
            1 - (healthMetrics?.stale_content_count || 0) / (healthMetrics?.total_content || 1),
            0.9,
            0.8
          )}
        />
      </div>

      {/* Recommendation Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendation Effectiveness by Type</CardTitle>
          <CardDescription>Performance breakdown of different recommendation types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recEffectiveness?.map((rec: any) => (
              <div key={rec.type} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{formatType(rec.type)}</div>
                  <div className="text-sm text-muted-foreground">
                    {rec.total_recommendations} recommendations · {rec.total_views} views
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-muted-foreground">CTR</div>
                    <div className={`font-medium ${getCTRColor(rec.avg_ctr)}`}>
                      {(rec.avg_ctr * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Save Rate</div>
                    <div className="font-medium">
                      {(rec.avg_save_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Confidence</div>
                    <div className="font-medium">
                      {(rec.avg_confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recently Learned Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Learned Patterns</CardTitle>
          <CardDescription>Insights extracted from engagement analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPatterns && recentPatterns.length > 0 ? (
              recentPatterns.map((pattern: any) => (
                <div key={pattern.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={pattern.applied ? 'default' : 'secondary'}>
                      {pattern.pattern_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Confidence: {(pattern.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    {pattern.analysis?.high_performer_patterns && (
                      <div>
                        <strong>High Performers:</strong>{' '}
                        {pattern.analysis.high_performer_patterns.slice(0, 2).join(', ')}
                      </div>
                    )}
                    {pattern.analysis?.recommendations && (
                      <div className="text-muted-foreground">
                        <strong>Action:</strong> {pattern.analysis.recommendations[0]}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Sample size: {pattern.sample_size} · {new Date(pattern.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No patterns learned yet. Run engagement analysis to start learning.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Facilitator Feedback */}
      {recentFeedback && recentFeedback.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Facilitator Feedback</CardTitle>
            <CardDescription>Direct feedback from users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFeedback.map((feedback: any) => (
                <div key={feedback.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-2">
                      <Badge variant={getSentimentVariant(feedback.sentiment)}>
                        {feedback.sentiment || 'Not analyzed'}
                      </Badge>
                      {feedback.challenge_category && (
                        <Badge variant="outline">{feedback.challenge_category}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rating: {feedback.relevance_rating}/5
                    </div>
                  </div>
                  <div className="text-sm mb-1">{feedback.feedback_text}</div>
                  {feedback.context && (
                    <div className="text-xs text-muted-foreground">
                      Context: {feedback.context}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Improvements */}
      {openImprovements && openImprovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Issues & Improvements</CardTitle>
            <CardDescription>
              {openImprovements.length} issues identified that need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {openImprovements.slice(0, 5).map((improvement: any) => (
                <div key={improvement.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={getPriorityVariant(improvement.priority)}>
                      {improvement.priority}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {improvement.improvement_type}
                    </span>
                  </div>
                  <div className="text-sm mb-1">{improvement.diagnosis}</div>
                  {improvement.estimated_impact && (
                    <div className="text-xs text-muted-foreground">
                      Impact: {improvement.estimated_impact}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, target, status }: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{value}</div>
          <Badge variant={status}>{status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">Target: {target}</div>
      </CardContent>
    </Card>
  );
}

// Helper Functions
function getHealthStatus(value: number | undefined, good: number, warning: number): 'default' | 'secondary' | 'destructive' {
  if (!value) return 'secondary';
  if (value >= good) return 'default';
  if (value >= warning) return 'secondary';
  return 'destructive';
}

function getCTRColor(ctr: number): string {
  if (ctr >= 0.2) return 'text-green-600';
  if (ctr >= 0.15) return 'text-blue-600';
  if (ctr >= 0.10) return 'text-yellow-600';
  return 'text-red-600';
}

function formatType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSentimentVariant(sentiment: string): 'default' | 'secondary' | 'destructive' {
  if (sentiment === 'positive') return 'default';
  if (sentiment === 'negative') return 'destructive';
  return 'secondary';
}

function getPriorityVariant(priority: string): 'default' | 'secondary' | 'destructive' {
  if (priority === 'critical' || priority === 'high') return 'destructive';
  if (priority === 'medium') return 'secondary';
  return 'default';
}

async function triggerLearning(action: string) {
  try {
    const response = await fetch('/api/content/learning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    if (response.ok) {
      window.location.reload();
    } else {
      alert('Failed to trigger learning action');
    }
  } catch (error) {
    alert('Error triggering learning action');
  }
}
