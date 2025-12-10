import { StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts for clean typography
// Note: Using system fonts, can be replaced with custom fonts if needed

export const pdfStyles = StyleSheet.create({
  // Layout
  page: {
    backgroundColor: '#FFFFFF',
    padding: 48,
    fontFamily: 'Helvetica',
    color: '#171717', // neutral-900
  },
  
  // Typography
  h1: {
    fontSize: 24,
    fontWeight: 400,
    marginBottom: 12,
    color: '#171717',
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 16,
    fontWeight: 500,
    marginBottom: 12,
    marginTop: 20,
    color: '#171717',
  },
  h3: {
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 10,
    color: '#171717',
  },
  body: {
    fontSize: 10,
    fontWeight: 300,
    lineHeight: 1.7,
    color: '#404040', // neutral-700
  },
  small: {
    fontSize: 9,
    fontWeight: 300,
    color: '#737373', // neutral-500
  },
  label: {
    fontSize: 8,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#737373',
    marginBottom: 4,
  },
  url: {
    fontSize: 11,
    fontWeight: 400,
    color: '#171717',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 16,
    border: '1 solid #E5E5E5',
  },
  
  // Components
  header: {
    borderBottom: '1 solid #E5E5E5',
    paddingBottom: 16,
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
    borderLeft: '1 solid #171717',
    paddingLeft: 16,
  },
  card: {
    border: '1 solid #E5E5E5',
    padding: 16,
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 300,
    color: '#171717',
  },
  scoreLabel: {
    fontSize: 20,
    fontWeight: 300,
    color: '#A3A3A3',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    flex: 1,
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#171717',
  },
  
  // Lists
  list: {
    marginTop: 8,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 300,
  },
  bullet: {
    width: 20,
    color: '#737373',
  },
  
  // Badges & Tags
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPending: {
    backgroundColor: '#F5F5F5',
    color: '#737373',
    border: '1 solid #E5E5E5',
  },
  statusRunning: {
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    border: '1 solid #BFDBFE',
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    border: '1 solid #A7F3D0',
  },
  statusFailed: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1 solid #FECACA',
  },
  
  // Severity
  severityCritical: {
    borderLeft: '4 solid #DC2626',
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginBottom: 8,
  },
  severityHigh: {
    borderLeft: '4 solid #F97316',
    backgroundColor: '#FFF7ED',
    padding: 12,
    marginBottom: 8,
  },
  severityMedium: {
    borderLeft: '4 solid #EAB308',
    backgroundColor: '#FEFCE8',
    padding: 12,
    marginBottom: 8,
  },
  severityLow: {
    borderLeft: '4 solid #737373',
    backgroundColor: '#F5F5F5',
    padding: 12,
    marginBottom: 8,
  },
  
  // Priority
  priorityHigh: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1 solid #FECACA',
  },
  priorityMedium: {
    backgroundColor: '#FEFCE8',
    color: '#CA8A04',
    border: '1 solid #FDE047',
  },
  priorityLow: {
    backgroundColor: '#F5F5F5',
    color: '#737373',
    border: '1 solid #E5E5E5',
  },
  
  // Utilities
  flex: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexCol: {
    flexDirection: 'column',
  },
  gap4: {
    gap: 4,
  },
  gap8: {
    gap: 8,
  },
  gap12: {
    gap: 12,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  mb16: {
    marginBottom: 16,
  },
  mb24: {
    marginBottom: 24,
  },
  mt24: {
    marginTop: 24,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: '#A3A3A3',
    borderTop: '1 solid #E5E5E5',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
