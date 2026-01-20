import { Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { pdfStyles } from '@/lib/pdf-styles';
import type { BatchTestRun, TestRunWithReport, UXAgentRun, AggregatedReport, UXAgentInsight } from '@/lib/batch-api';

interface ComprehensiveTestReportPDFProps {
  batchTestRun: BatchTestRun;
  testRuns: TestRunWithReport[];
  uxagentRuns: UXAgentRun[];
  aggregatedReport: AggregatedReport | null;
  insightsByRunId?: Record<string, UXAgentInsight[]>; // Map of runId -> insights
}

// Helper to get persona name
function getPersonaName(run: UXAgentRun, index: number): string {
  const personaData = run.personaData as any;
  if (personaData?.name) return personaData.name;
  const basicInfo = run.basicInfo as any;
  if (basicInfo?.persona) {
    const match = basicInfo.persona.match(/(?:name[:\s]+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (match) return match[1];
  }
  return `Agent ${index + 1}`;
}

// Helper to convert base64 or URL to image source
async function getImageSource(screenshot: any): Promise<string | null> {
  if (screenshot?.base64Data) {
    return screenshot.base64Data;
  }
  if (screenshot?.signedUrl) {
    try {
      // For URLs, we'd need to fetch and convert to base64
      // For now, return null and handle in component
      return screenshot.signedUrl;
    } catch {
      return null;
    }
  }
  if (screenshot?.s3Url) {
    return screenshot.s3Url;
  }
  return null;
}

export const ComprehensiveTestReportPDF = ({ 
  batchTestRun, 
  testRuns,
  uxagentRuns,
  aggregatedReport,
  insightsByRunId = {}
}: ComprehensiveTestReportPDFProps) => {
  const hasUXAgent = batchTestRun.useUXAgent && uxagentRuns.length > 0;
  const hasStandardTests = testRuns.length > 0;
  const totalAgents = hasUXAgent ? uxagentRuns.length : testRuns.length;
  const overallScore = aggregatedReport?.overallScore || 
    (hasUXAgent ? uxagentRuns.reduce((sum, r) => sum + (r.score || 0), 0) / uxagentRuns.length :
     testRuns.reduce((sum, r) => sum + (r.report?.score || 0), 0) / testRuns.length);

  // Collect all insights across all runs
  const allInsights: UXAgentInsight[] = [];
  Object.values(insightsByRunId).forEach(insights => {
    allInsights.push(...insights);
  });

  // Group insights by category
  const insightsByCategory = allInsights.reduce((acc, insight) => {
    const cat = insight.category || 'usability';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(insight);
    return acc;
  }, {} as Record<string, UXAgentInsight[]>);

  // Count by severity
  const severityCounts = allInsights.reduce((acc, i) => {
    acc[i.severity] = (acc[i.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={pdfStyles.page}>
        <View style={[pdfStyles.header, { borderBottom: 'none', marginBottom: 32 }]}>
          <Text style={[pdfStyles.h1, { fontSize: 20, marginBottom: 12 }]}>Comprehensive UX Test Report</Text>
          <View style={pdfStyles.url}>
            <Text style={{ fontSize: 10 }}>{batchTestRun.targetUrl}</Text>
          </View>
        </View>

        <View style={{ marginTop: 32 }}>
          <View style={pdfStyles.scoreContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginRight: 16 }}>
              <Text style={[pdfStyles.scoreNumber, { fontSize: 36 }]}>{Math.round(overallScore * 10) / 10}</Text>
              <Text style={[pdfStyles.scoreLabel, { fontSize: 18 }]}>/10</Text>
            </View>
          </View>
          <Text style={[pdfStyles.body, { fontSize: 10, marginTop: 12 }]}>
            Based on {totalAgents} agent simulation{totalAgents !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={{ marginTop: 32 }}>
          <Text style={[pdfStyles.label, { marginBottom: 8 }]}>Test Information</Text>
          <View style={pdfStyles.card}>
            <View style={{ marginBottom: 8 }}>
              <Text style={pdfStyles.small}>Test Date</Text>
              <Text style={pdfStyles.body}>
                {new Date(batchTestRun.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={pdfStyles.small}>Status</Text>
              <Text style={pdfStyles.body}>{batchTestRun.status}</Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={pdfStyles.small}>User Description</Text>
              <Text style={pdfStyles.body}>{batchTestRun.userDescription || 'N/A'}</Text>
            </View>
            {batchTestRun.completedAt && (
              <View>
                <Text style={pdfStyles.small}>Completed</Text>
                <Text style={pdfStyles.body}>
                  {new Date(batchTestRun.completedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={pdfStyles.footer}>
          <Text>Agent² UX Testing Platform</Text>
          <Text>Comprehensive Report</Text>
        </View>
      </Page>

      {/* Executive Summary */}
      {aggregatedReport && (
        <Page size="A4" style={pdfStyles.page}>
          <View style={[pdfStyles.header, { marginBottom: 20 }]}>
            <Text style={[pdfStyles.h1, { fontSize: 18 }]}>Executive Summary</Text>
          </View>

          {aggregatedReport.executiveSummary && (
            <View style={[pdfStyles.section, { marginBottom: 16 }]}>
              <Text style={pdfStyles.body}>{aggregatedReport.executiveSummary}</Text>
            </View>
          )}

          {aggregatedReport.overallScore !== null && (
            <View style={[pdfStyles.section, { marginBottom: 16 }]}>
              <Text style={[pdfStyles.h2, { fontSize: 14 }]}>Overall UX Score</Text>
              <View style={pdfStyles.scoreContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginRight: 12 }}>
                  <Text style={[pdfStyles.scoreNumber, { fontSize: 32 }]}>{aggregatedReport.overallScore}</Text>
                  <Text style={[pdfStyles.scoreLabel, { fontSize: 16 }]}>/10</Text>
                </View>
                <View style={pdfStyles.scoreBar}>
                  <View 
                    style={[
                      pdfStyles.scoreBarFill, 
                      { width: `${(aggregatedReport.overallScore || 0) * 10}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          )}

          {aggregatedReport.strengthsAcrossPersonas && aggregatedReport.strengthsAcrossPersonas.length > 0 && (
            <View style={[pdfStyles.section, { marginBottom: 16 }]}>
              <Text style={[pdfStyles.h2, { color: '#047857', fontSize: 14 }]}>What Works Well</Text>
              {aggregatedReport.strengthsAcrossPersonas.map((strength, i) => (
                <View key={i} style={pdfStyles.listItem}>
                  <Text style={[pdfStyles.bullet, { color: '#047857' }]}>✓</Text>
                  <Text style={pdfStyles.body}>{strength}</Text>
                </View>
              ))}
            </View>
          )}

          {aggregatedReport.commonIssues && aggregatedReport.commonIssues.length > 0 && (
            <View style={[pdfStyles.section, { marginBottom: 16 }]}>
              <Text style={[pdfStyles.h2, { fontSize: 14 }]}>Common Issues</Text>
              {aggregatedReport.commonIssues.slice(0, 5).map((issue, i) => (
                <View 
                  key={i} 
                  style={[
                    issue.severity === 'critical' ? pdfStyles.severityCritical :
                    issue.severity === 'high' ? pdfStyles.severityHigh :
                    issue.severity === 'medium' ? pdfStyles.severityMedium :
                    pdfStyles.severityLow,
                    { padding: 10, marginBottom: 6 }
                  ]}
                >
                  <View style={pdfStyles.flexBetween}>
                    <Text style={{ fontSize: 9, fontWeight: 500, marginBottom: 3, flex: 1 }}>
                      {issue.issue}
                    </Text>
                    <Text style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase' }}>
                      {issue.severity}
                    </Text>
                  </View>
                  <Text style={[pdfStyles.body, { fontSize: 9, marginTop: 2 }]}>
                    {issue.recommendation}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={pdfStyles.footer}>
            <Text>Agent² UX Testing Platform</Text>
            <Text>Page 2</Text>
          </View>
        </Page>
      )}

      {/* UXAgent Runs */}
      {hasUXAgent && uxagentRuns.map((run, idx) => {
        const personaName = getPersonaName(run, idx);
        const basicInfo = run.basicInfo as any || {};
        const timingMetrics = basicInfo.timing_metrics || {};
        const persona = basicInfo.persona || run.personaData || {};
        
        return (
          <Page key={run.id} size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.header}>
              <Text style={pdfStyles.h1}>{personaName}'s Experience</Text>
              <View style={pdfStyles.url}>
                <Text>{run.startUrl || batchTestRun.targetUrl}</Text>
              </View>
            </View>

            {/* Agent Profile */}
            <View style={[pdfStyles.card, { backgroundColor: '#171717', marginBottom: 24, padding: 20 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[pdfStyles.label, { color: '#A3A3A3' }]}>Intent</Text>
                  <Text style={{ fontSize: 11, fontWeight: 500, color: '#FFFFFF', marginBottom: 2 }}>
                    {run.intent || 'Explore website'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[pdfStyles.label, { color: '#A3A3A3' }]}>Status</Text>
                  <Text style={{ fontSize: 9, fontWeight: 300, color: '#D4D4D4', textTransform: 'capitalize' }}>
                    {run.status}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[pdfStyles.label, { color: '#A3A3A3' }]}>Score</Text>
                  <Text style={{ fontSize: 11, fontWeight: 500, color: '#FFFFFF' }}>
                    {run.score !== null ? `${run.score}/10` : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={{ borderTop: '1 solid #404040', paddingTop: 10 }}>
                <Text style={[pdfStyles.label, { color: '#A3A3A3', marginBottom: 4 }]}>Persona Details</Text>
                <Text style={{ fontSize: 9, fontWeight: 300, color: '#D4D4D4', lineHeight: 1.5 }}>
                  {typeof persona === 'string' ? persona.substring(0, 300) : JSON.stringify(persona, null, 2).substring(0, 300)}
                </Text>
              </View>
            </View>

            {/* Metrics */}
            <View style={pdfStyles.section}>
              <Text style={pdfStyles.h2}>Session Metrics</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <View style={[pdfStyles.card, { flex: 1, minWidth: '45%' }]}>
                  <Text style={pdfStyles.label}>Steps Taken</Text>
                  <Text style={[pdfStyles.body, { fontSize: 18, fontWeight: 500 }]}>
                    {run.stepsTaken || 0}
                  </Text>
                </View>
                <View style={[pdfStyles.card, { flex: 1, minWidth: '45%' }]}>
                  <Text style={pdfStyles.label}>Screenshots</Text>
                  <Text style={[pdfStyles.body, { fontSize: 18, fontWeight: 500 }]}>
                    {run.screenshots?.length || 0}
                  </Text>
                </View>
                {run.startedAt && run.completedAt && (
                  <View style={[pdfStyles.card, { flex: 1, minWidth: '45%' }]}>
                    <Text style={pdfStyles.label}>Duration</Text>
                    <Text style={[pdfStyles.body, { fontSize: 18, fontWeight: 500 }]}>
                      {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Timing Metrics */}
            {Object.keys(timingMetrics).length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.h2}>Timing Metrics</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                  {timingMetrics.total_duration_ms && (
                    <View style={[pdfStyles.card, { flex: 1, minWidth: '45%' }]}>
                      <Text style={pdfStyles.label}>Total Duration</Text>
                      <Text style={pdfStyles.body}>
                        {(timingMetrics.total_duration_ms / 1000).toFixed(1)}s
                      </Text>
                    </View>
                  )}
                  {timingMetrics.time_to_first_action_ms && (
                    <View style={[pdfStyles.card, { flex: 1, minWidth: '45%' }]}>
                      <Text style={pdfStyles.label}>Time to First Action</Text>
                      <Text style={pdfStyles.body}>
                        {(timingMetrics.time_to_first_action_ms / 1000).toFixed(1)}s
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Actions */}
            {run.actionTrace && run.actionTrace.length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.h2}>Action Timeline</Text>
                {run.actionTrace.slice(0, 10).map((action: any, i: number) => (
                  <View key={i} style={[pdfStyles.card, { marginBottom: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={[pdfStyles.badge, { backgroundColor: '#F5F5F5', color: '#171717' }]}>
                        Step {i + 1}
                      </Text>
                      <Text style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase' }}>
                        {action.action || 'Action'}
                      </Text>
                    </View>
                    {action.description && (
                      <Text style={pdfStyles.small}>{action.description}</Text>
                    )}
                    {action.target && (
                      <Text style={[pdfStyles.small, { color: '#737373', marginTop: 2 }]}>
                        Target: {action.target}
                      </Text>
                    )}
                  </View>
                ))}
                {run.actionTrace.length > 10 && (
                  <Text style={[pdfStyles.small, { fontStyle: 'italic', marginTop: 8 }]}>
                    ... and {run.actionTrace.length - 10} more actions
                  </Text>
                )}
              </View>
            )}

            {/* Error if any */}
            {run.errorMessage && (
              <View style={[pdfStyles.card, { backgroundColor: '#FEF2F2', borderLeft: '4 solid #DC2626' }]}>
                <Text style={[pdfStyles.h3, { color: '#DC2626' }]}>Error</Text>
                <Text style={[pdfStyles.body, { color: '#991B1B' }]}>{run.errorMessage}</Text>
              </View>
            )}

            <View style={pdfStyles.footer}>
              <Text>Agent² UX Testing Platform • {personaName}</Text>
              <Text>Page {3 + idx}</Text>
            </View>
          </Page>
        );
      })}

      {/* Standard Test Runs */}
      {hasStandardTests && testRuns.map((testRun, idx) => {
        const { report, testRun: test } = testRun;
        if (!report) return null;

        return (
          <Page key={test.id} size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.header}>
              <Text style={pdfStyles.h1}>{test.personaName}'s Experience</Text>
              <View style={pdfStyles.url}>
                <Text>{batchTestRun.targetUrl}</Text>
              </View>
            </View>

            {/* Persona Profile */}
            {test.personaData && (
              <View style={[pdfStyles.card, { backgroundColor: '#171717', marginBottom: 24, padding: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[pdfStyles.label, { color: '#A3A3A3' }]}>Profile</Text>
                    <Text style={{ fontSize: 11, fontWeight: 500, color: '#FFFFFF', marginBottom: 2 }}>
                      {test.personaData.age} years old
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: 300, color: '#D4D4D4' }}>
                      {test.personaData.occupation}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[pdfStyles.label, { color: '#A3A3A3' }]}>Location</Text>
                    <Text style={{ fontSize: 9, fontWeight: 300, color: '#D4D4D4' }}>
                      {test.personaData.country}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[pdfStyles.label, { color: '#A3A3A3' }]}>Tech Level</Text>
                    <Text style={{ fontSize: 9, fontWeight: 300, color: '#D4D4D4', textTransform: 'capitalize' }}>
                      {test.personaData.techSavviness}
                    </Text>
                  </View>
                </View>
                <View style={{ borderTop: '1 solid #404040', paddingTop: 10 }}>
                  <Text style={[pdfStyles.label, { color: '#A3A3A3', marginBottom: 4 }]}>Primary Goal</Text>
                  <Text style={{ fontSize: 9, fontWeight: 300, color: '#D4D4D4', lineHeight: 1.5 }}>
                    {test.personaData.primaryGoal}
                  </Text>
                </View>
              </View>
            )}

            {/* Score */}
            <View style={pdfStyles.section}>
              <Text style={pdfStyles.h2}>Experience Score</Text>
              <View style={pdfStyles.scoreContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginRight: 16 }}>
                  <Text style={pdfStyles.scoreNumber}>{report.score}</Text>
                  <Text style={pdfStyles.scoreLabel}>/10</Text>
                </View>
                <View style={pdfStyles.scoreBar}>
                  <View 
                    style={[
                      pdfStyles.scoreBarFill, 
                      { width: `${(report.score || 0) * 10}%` }
                    ]} 
                  />
                </View>
              </View>
              {report.summary && (
                <Text style={pdfStyles.body}>{report.summary}</Text>
              )}
            </View>

            {/* Positive Aspects */}
            {report.positiveAspects && report.positiveAspects.length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={[pdfStyles.h2, { color: '#047857' }]}>What Worked</Text>
                {report.positiveAspects.map((item, i) => (
                  <View key={i} style={pdfStyles.listItem}>
                    <Text style={[pdfStyles.bullet, { color: '#047857' }]}>✓</Text>
                    <Text style={pdfStyles.body}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Usability Issues */}
            {report.usabilityIssues && report.usabilityIssues.length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.h2}>Usability Issues</Text>
                {report.usabilityIssues.slice(0, 5).map((issue: any, i: number) => (
                  <View 
                    key={i} 
                    style={
                      issue.severity === 'critical' ? pdfStyles.severityCritical :
                      issue.severity === 'high' ? pdfStyles.severityHigh :
                      issue.severity === 'medium' ? pdfStyles.severityMedium :
                      pdfStyles.severityLow
                    }
                  >
                    <View style={pdfStyles.flexBetween}>
                      <Text style={{ fontSize: 10, fontWeight: 500 }}>
                        {issue.description}
                      </Text>
                      <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>
                        {issue.severity}
                      </Text>
                    </View>
                    {issue.recommendation && (
                      <Text style={[pdfStyles.small, { marginTop: 6 }]}>
                        {issue.recommendation}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.h2}>Recommendations</Text>
                {report.recommendations.map((rec, i) => (
                  <View key={i} style={pdfStyles.listItem}>
                    <Text style={pdfStyles.bullet}>{i + 1}.</Text>
                    <Text style={pdfStyles.body}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={pdfStyles.footer}>
              <Text>Agent² UX Testing Platform • {test.personaName}</Text>
              <Text>Page {3 + (hasUXAgent ? uxagentRuns.length : 0) + idx + 1}</Text>
            </View>
          </Page>
        );
      })}

      {/* Comprehensive Insights Section */}
      {allInsights.length > 0 && (
        <Page size="A4" style={pdfStyles.page}>
          <View style={[pdfStyles.header, { marginBottom: 20 }]}>
            <Text style={[pdfStyles.h1, { fontSize: 18 }]}>Insights</Text>
            <Text style={[pdfStyles.small, { marginTop: 6 }]}>
              Actionable UX improvements identified from agent observations
            </Text>
          </View>

          {/* Summary Stats */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <View style={[pdfStyles.card, { backgroundColor: '#171717', padding: 12, minWidth: '45%' }]}>
              <Text style={[pdfStyles.label, { color: '#A3A3A3', marginBottom: 4 }]}>Total Insights</Text>
              <Text style={{ fontSize: 24, fontWeight: 300, color: '#FFFFFF' }}>
                {allInsights.length}
              </Text>
            </View>
            {['critical', 'high', 'medium', 'low'].map(severity => (
              <View 
                key={severity} 
                style={[
                  pdfStyles.card, 
                  { 
                    minWidth: '20%',
                    padding: 12,
                    backgroundColor: severity === 'critical' ? '#FEF2F2' :
                                    severity === 'high' ? '#FFF7ED' :
                                    severity === 'medium' ? '#FEFCE8' :
                                    '#F5F5F5'
                  }
                ]}
              >
                <Text style={[pdfStyles.label, { marginBottom: 4, fontSize: 7 }]}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: 300 }}>
                  {severityCounts[severity] || 0}
                </Text>
              </View>
            ))}
          </View>

          {/* Insights by Category */}
          {Object.entries(insightsByCategory).map(([category, categoryInsights]) => (
            <View key={category} style={[pdfStyles.section, { marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Text style={[pdfStyles.h2, { textTransform: 'capitalize', fontSize: 14 }]}>
                  {category}
                </Text>
                <Text style={[pdfStyles.small, { color: '#737373', fontSize: 8 }]}>
                  ({categoryInsights.length} issue{categoryInsights.length !== 1 ? 's' : ''})
                </Text>
              </View>

              {categoryInsights.map((insight, i) => (
                <View 
                  key={insight.id || i}
                  style={[
                    pdfStyles.card,
                    {
                      borderLeft: '3 solid',
                      borderLeftColor: insight.severity === 'critical' ? '#DC2626' :
                                      insight.severity === 'high' ? '#F97316' :
                                      insight.severity === 'medium' ? '#EAB308' :
                                      '#737373',
                      backgroundColor: insight.severity === 'critical' ? '#FEF2F2' :
                                      insight.severity === 'high' ? '#FFF7ED' :
                                      insight.severity === 'medium' ? '#FEFCE8' :
                                      '#F5F5F5',
                      marginBottom: 8,
                      padding: 10,
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: 500, flex: 1 }}>
                      {insight.title}
                    </Text>
                    <View style={[
                      pdfStyles.badge,
                      { fontSize: 7, paddingHorizontal: 6, paddingVertical: 2 },
                      insight.severity === 'critical' ? pdfStyles.priorityHigh :
                      insight.severity === 'high' ? pdfStyles.priorityMedium :
                      pdfStyles.priorityLow
                    ]}>
                      <Text style={{ fontSize: 7 }}>{insight.severity.toUpperCase()}</Text>
                    </View>
                  </View>
                  
                  <Text style={[pdfStyles.body, { fontSize: 9, marginBottom: 6 }]}>
                    {insight.description}
                  </Text>

                  <View style={{ 
                    backgroundColor: '#ECFDF5', 
                    border: '1 solid #A7F3D0',
                    padding: 8,
                    borderRadius: 3,
                  }}>
                    <Text style={[pdfStyles.label, { color: '#047857', marginBottom: 3, fontSize: 7 }]}>
                      RECOMMENDATION
                    </Text>
                    <Text style={[pdfStyles.body, { color: '#065F46', fontSize: 9 }]}>
                      {insight.recommendation}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <View style={pdfStyles.footer}>
            <Text>Agent² UX Testing Platform</Text>
            <Text>Insights Analysis</Text>
          </View>
        </Page>
      )}

      {/* Recommendations Summary */}
      {aggregatedReport?.recommendations && aggregatedReport.recommendations.length > 0 && (
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.header}>
            <Text style={pdfStyles.h1}>Prioritized Recommendations</Text>
          </View>

          {aggregatedReport.recommendations.map((rec, i) => (
            <View key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < aggregatedReport.recommendations!.length - 1 ? '1 solid #F5F5F5' : 'none' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <View style={[
                  pdfStyles.badge,
                  rec.priority === 'high' ? pdfStyles.priorityHigh :
                  rec.priority === 'medium' ? pdfStyles.priorityMedium :
                  pdfStyles.priorityLow
                ]}>
                  <Text>{rec.priority}</Text>
                </View>
                <Text style={[pdfStyles.body, { fontWeight: 500, flex: 1 }]}>
                  {rec.recommendation}
                </Text>
              </View>
              <Text style={[pdfStyles.small, { marginLeft: 60 }]}>
                Impact: {rec.impact}
              </Text>
            </View>
          ))}

          <View style={pdfStyles.footer}>
            <Text>Agent² UX Testing Platform</Text>
            <Text>Final Recommendations</Text>
          </View>
        </Page>
      )}
    </Document>
  );
};
