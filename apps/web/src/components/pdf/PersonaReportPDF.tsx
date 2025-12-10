import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles } from '@/lib/pdf-styles';
import type { TestRunWithReport } from '@/lib/batch-api';

interface PersonaReportPDFProps {
  testRun: TestRunWithReport;
  targetUrl: string;
}

export const PersonaReportPDF = ({ testRun, targetUrl }: PersonaReportPDFProps) => {
  const { report, testRun: test } = testRun;
  
  if (!report) return null;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
      {/* Header */}
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.h1}>{test.personaName}'s Experience</Text>
        <View style={pdfStyles.url}>
          <Text>{targetUrl}</Text>
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

        {/* Confusion Points */}
        {report.accessibilityNotes && report.accessibilityNotes.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={[pdfStyles.h2, { color: '#CA8A04' }]}>Confusion Points</Text>
            {report.accessibilityNotes.map((item, i) => (
              <View key={i} style={pdfStyles.listItem}>
                <Text style={[pdfStyles.bullet, { color: '#CA8A04' }]}>•</Text>
                <Text style={pdfStyles.body}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text>Agent² UX Testing Platform • {test.personaName}</Text>
          <Text>{new Date().toLocaleDateString()}</Text>
        </View>
      </Page>

      {/* Usability Issues - Page 2 */}
      {report.usabilityIssues && report.usabilityIssues.length > 0 && (
        <Page size="A4" style={pdfStyles.page}>
          <Text style={pdfStyles.h2}>Usability Issues</Text>
          {report.usabilityIssues.map((issue: any, i: number) => (
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

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <View style={[pdfStyles.section, { marginTop: 24 }]}>
              <Text style={pdfStyles.h2}>Recommendations</Text>
              {report.recommendations.map((rec, i) => (
                <View key={i} style={pdfStyles.listItem}>
                  <Text style={pdfStyles.bullet}>{i + 1}.</Text>
                  <Text style={pdfStyles.body}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={pdfStyles.footer}>
            <Text>Agent² UX Testing Platform • {test.personaName}</Text>
            <Text>Page 2</Text>
          </View>
        </Page>
      )}
    </Document>
  );
};
