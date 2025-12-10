import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles } from '@/lib/pdf-styles';
import type { AggregatedReport, BatchTestRun } from '@/lib/batch-api';

interface AggregatedReportPDFProps {
  batchTestRun: BatchTestRun;
  aggregatedReport: AggregatedReport;
  agentCount: number;
}

export const AggregatedReportPDF = ({ 
  batchTestRun, 
  aggregatedReport,
  agentCount 
}: AggregatedReportPDFProps) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      {/* Header */}
      <View style={pdfStyles.header}>
        <View style={pdfStyles.flexBetween}>
          <View style={{ flex: 1 }}>
            <Text style={pdfStyles.h1}>Aggregated UX Report</Text>
            <View style={pdfStyles.url}>
              <Text>{batchTestRun.targetUrl}</Text>
            </View>
          </View>
          <View style={[pdfStyles.badge, pdfStyles.statusCompleted]}>
            <Text>COMPREHENSIVE</Text>
          </View>
        </View>
      </View>

      {/* Executive Summary */}
      <View style={[pdfStyles.section, { marginTop: 0 }]}>
        <Text style={pdfStyles.h2}>Executive Summary</Text>
        <Text style={[pdfStyles.body, { marginTop: 8 }]}>{aggregatedReport.executiveSummary}</Text>
      </View>

      {/* Overall Score */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.h2}>Overall UX Score</Text>
        <View style={pdfStyles.scoreContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginRight: 16 }}>
            <Text style={pdfStyles.scoreNumber}>{aggregatedReport.overallScore}</Text>
            <Text style={pdfStyles.scoreLabel}>/10</Text>
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
        <Text style={pdfStyles.small}>
          Based on {agentCount} concurrent agent simulations
        </Text>
      </View>

      {/* Common Issues */}
      {aggregatedReport.commonIssues && aggregatedReport.commonIssues.length > 0 && (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.h2}>Common Issues Across Personas</Text>
          {aggregatedReport.commonIssues.map((issue, i) => (
            <View 
              key={i} 
              style={
                issue.severity === 'critical' ? pdfStyles.severityCritical :
                issue.severity === 'high' ? pdfStyles.severityHigh :
                issue.severity === 'medium' ? pdfStyles.severityMedium :
                pdfStyles.severityLow
              }
            >
              <View style={pdfStyles.flexBetween}              >
                <Text style={{ fontSize: 10, fontWeight: 500, marginBottom: 4, flex: 1 }}>
                  {issue.issue}
                </Text>
                <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>
                  {issue.severity}
                </Text>
              </View>
              <Text style={[pdfStyles.body, { marginBottom: 6, marginTop: 2 }]}>
                {issue.recommendation}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {issue.affectedPersonas.map((persona, j) => (
                  <Text 
                    key={j} 
                    style={{
                      fontSize: 8,
                      backgroundColor: '#F5F5F5',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      border: '1 solid #E5E5E5',
                    }}
                  >
                    {persona}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </Page>

    <Page size="A4" style={pdfStyles.page}>
      {/* Strengths */}
      {aggregatedReport.strengthsAcrossPersonas && aggregatedReport.strengthsAcrossPersonas.length > 0 && (
        <View style={pdfStyles.section}>
          <Text style={[pdfStyles.h2, { color: '#047857' }]}>What Works Well</Text>
          {aggregatedReport.strengthsAcrossPersonas.map((strength, i) => (
            <View key={i} style={pdfStyles.listItem}>
              <Text style={[pdfStyles.bullet, { color: '#047857' }]}>✓</Text>
              <Text style={pdfStyles.body}>{strength}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {aggregatedReport.recommendations && aggregatedReport.recommendations.length > 0 && (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.h2}>Prioritized Recommendations</Text>
          {aggregatedReport.recommendations.map((rec, i) => (
            <View key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < (aggregatedReport.recommendations?.length ?? 0) - 1 ? '1 solid #F5F5F5' : 'none' }}>
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
        </View>
      )}

      {/* Persona-Specific Insights */}
      {aggregatedReport.personaSpecificInsights && aggregatedReport.personaSpecificInsights.length > 0 && (
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.h2}>Persona-Specific Insights</Text>
          {aggregatedReport.personaSpecificInsights.map((insight, i) => (
            <View key={i} style={pdfStyles.card}>
              <Text style={pdfStyles.h3}>{insight.personaName}</Text>
              {insight.keyFindings.map((finding, j) => (
                <View key={j} style={pdfStyles.listItem}>
                  <Text style={pdfStyles.bullet}>•</Text>
                  <Text style={pdfStyles.small}>{finding}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={pdfStyles.footer}>
        <Text>Agent² UX Testing Platform</Text>
        <Text>{new Date().toLocaleDateString()}</Text>
      </View>
    </Page>

    {/* Full Analysis - Separate Page */}
    {aggregatedReport.fullAnalysis && (
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.h2}>Detailed Analysis</Text>
        <Text style={pdfStyles.body}>{aggregatedReport.fullAnalysis}</Text>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>Agent² UX Testing Platform</Text>
          <Text>Page 3</Text>
        </View>
      </Page>
    )}
  </Document>
);
