// lib/services/pdfGenerator.ts - CLIENT-SIDE VERSION
// PDF Generation for Browser (returns Blob instead of Buffer)

import jsPDF from 'jspdf';

// Import types
import type { CAReportCard, EndOfTermReportCard } from '@/lib/firebase/reports';

// Extended report card interfaces with curriculum info
interface EnhancedCAReportCard extends CAReportCard {
  academicTrack?: string | null;
  tradeSubject?: string | null;
  totalSubjects?: number;
  coreSubjectsCount?: number;
  electiveSubjectsCount?: number;
}

interface EnhancedTermReportCard extends EndOfTermReportCard {
  academicTrack?: string | null;
  tradeSubject?: string | null;
  totalSubjects?: number;
  coreSubjectsCount?: number;
  electiveSubjectsCount?: number;
}

/**
 * Generate CA Report Card PDF
 * Returns Blob for browser compatibility
 */
export async function generateCAReportCardPDF(reportCard: EnhancedCAReportCard): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL AI AGENT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(`${reportCard.assessmentType.toUpperCase()} REPORT CARD`, pageWidth / 2, 30, { align: 'center' });
  
  // Student Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 45;
  doc.text(`Student: ${reportCard.studentName}`, 20, yPos);
  doc.text(`Class: ${reportCard.className}`, 20, yPos + 7);
  doc.text(`Term: ${reportCard.term}`, 20, yPos + 14);
  doc.text(`Session: ${reportCard.session}`, 20, yPos + 21);
  
  // Academic Track and Curriculum Info (for SS students)
  if (reportCard.academicTrack || reportCard.tradeSubject || reportCard.totalSubjects) {
    yPos += 35;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Curriculum Information:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    yPos += 7;
    
    if (reportCard.totalSubjects) {
      doc.text(`Total Subjects: ${reportCard.totalSubjects}`, 25, yPos);
      yPos += 6;
    }
    
    if (reportCard.academicTrack) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 128);
      doc.text(`Academic Track: ${reportCard.academicTrack}`, 25, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
    }
    
    if (reportCard.coreSubjectsCount !== undefined && reportCard.electiveSubjectsCount !== undefined) {
      doc.text(`Core Subjects: ${reportCard.coreSubjectsCount} | Electives: ${reportCard.electiveSubjectsCount}`, 25, yPos);
      yPos += 6;
    }
    
    if (reportCard.tradeSubject) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 140, 0);
      doc.text(`Trade Subject: ${reportCard.tradeSubject}`, 25, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
    }
  }
  
  // Scores Table Header
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject', 20, yPos);
  doc.text('Score', 100, yPos);
  doc.text('Max', 130, yPos);
  doc.text('Grade', 160, yPos);
  
  doc.line(20, yPos + 2, 190, yPos + 2);
  yPos += 10;
  
  // Scores
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  reportCard.subjects.forEach((subject) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
      doc.setFont('helvetica', 'bold');
      doc.text('Subject', 20, yPos);
      doc.text('Score', 100, yPos);
      doc.text('Max', 130, yPos);
      doc.text('Grade', 160, yPos);
      doc.line(20, yPos + 2, 190, yPos + 2);
      yPos += 10;
      doc.setFont('helvetica', 'normal');
    }
    
    doc.text(subject.subjectName, 20, yPos);
    doc.text(subject.score.toString(), 100, yPos);
    doc.text(subject.maxScore.toString(), 130, yPos);
    doc.text(subject.grade, 160, yPos);
    yPos += 8;
  });
  
  // Summary
  yPos += 10;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total Score: ${reportCard.totalScore}`, 20, yPos);
  doc.text(`Average: ${reportCard.averageScore.toFixed(1)}`, 20, yPos + 8);
  doc.text(`Grade: ${reportCard.grade}`, 20, yPos + 16);
  doc.text(`Position: ${reportCard.position}/${reportCard.totalStudents}`, 20, yPos + 24);
  
  // Attendance & Merits
  yPos += 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Attendance: ${reportCard.attendancePercentage.toFixed(1)}%`, 20, yPos);
  doc.text(`Merit Points: ${reportCard.totalMerits}`, 20, yPos + 8);
  
  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 280);
  
  // Return as Blob for browser compatibility
  return doc.output('blob');
}

/**
 * Generate Term Report Card PDF
 * Returns Blob for browser compatibility
 */
export async function generateTermReportCardPDF(reportCard: EnhancedTermReportCard): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL AI AGENT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('END OF TERM REPORT CARD', pageWidth / 2, 30, { align: 'center' });
  
  // Student Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 45;
  doc.text(`Student: ${reportCard.studentName}`, 20, yPos);
  doc.text(`Class: ${reportCard.className}`, 20, yPos + 7);
  doc.text(`Term: ${reportCard.term}`, 20, yPos + 14);
  doc.text(`Session: ${reportCard.session}`, 20, yPos + 21);
  
  // Academic Track and Curriculum Info
  if (reportCard.academicTrack || reportCard.tradeSubject || reportCard.totalSubjects) {
    yPos += 35;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Curriculum Information:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    yPos += 7;
    
    if (reportCard.totalSubjects) {
      doc.text(`Total Subjects: ${reportCard.totalSubjects}`, 25, yPos);
      yPos += 6;
    }
    
    if (reportCard.academicTrack) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 128);
      doc.text(`Academic Track: ${reportCard.academicTrack}`, 25, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
    }
    
    if (reportCard.coreSubjectsCount !== undefined && reportCard.electiveSubjectsCount !== undefined) {
      doc.text(`Core Subjects: ${reportCard.coreSubjectsCount} | Electives: ${reportCard.electiveSubjectsCount}`, 25, yPos);
      yPos += 6;
    }
    
    if (reportCard.tradeSubject) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 140, 0);
      doc.text(`Trade Subject: ${reportCard.tradeSubject}`, 25, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
    }
  }
  
  // Scores Table Header
  yPos += 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject', 20, yPos);
  doc.text('CA1', 90, yPos);
  doc.text('CA2', 110, yPos);
  doc.text('Exam', 130, yPos);
  doc.text('Total', 150, yPos);
  doc.text('Grade', 170, yPos);
  
  doc.line(20, yPos + 2, 190, yPos + 2);
  yPos += 10;
  
  // Scores
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  reportCard.subjects.forEach((subject) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject', 20, yPos);
      doc.text('CA1', 90, yPos);
      doc.text('CA2', 110, yPos);
      doc.text('Exam', 130, yPos);
      doc.text('Total', 150, yPos);
      doc.text('Grade', 170, yPos);
      doc.line(20, yPos + 2, 190, yPos + 2);
      yPos += 10;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
    }
    
    doc.text(subject.subjectName.substring(0, 25), 20, yPos);
    doc.text(subject.ca1.toString(), 90, yPos);
    doc.text(subject.ca2.toString(), 110, yPos);
    doc.text(subject.exam.toString(), 130, yPos);
    doc.text(subject.total.toString(), 150, yPos);
    doc.text(subject.grade, 170, yPos);
    yPos += 7;
  });
  
  // Summary
  yPos += 10;
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total Score: ${reportCard.totalScore}`, 20, yPos);
  doc.text(`Average: ${reportCard.averageScore.toFixed(1)}%`, 20, yPos + 8);
  doc.text(`Overall Grade: ${reportCard.overallGrade}`, 20, yPos + 16);
  doc.text(`Position: ${reportCard.position}/${reportCard.totalStudents}`, 20, yPos + 24);
  
  // Attendance
  yPos += 35;
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Attendance Summary:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`Present: ${reportCard.presentDays} days`, 20, yPos + 7);
  doc.text(`Absent: ${reportCard.absentDays} days`, 20, yPos + 14);
  doc.text(`Late: ${reportCard.lateDays} days`, 20, yPos + 21);
  doc.text(`Percentage: ${reportCard.attendancePercentage.toFixed(1)}%`, 20, yPos + 28);
  
  // Merits
  yPos += 40;
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Merit Summary:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Points: ${reportCard.totalMerits}`, 20, yPos + 7);
  doc.text(`Level: ${reportCard.meritLevel}`, 20, yPos + 14);
  
  // Comments
  if (reportCard.teacherComment || reportCard.principalComment) {
    yPos += 25;
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    if (reportCard.teacherComment) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Teacher\'s Comment:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const teacherLines = doc.splitTextToSize(reportCard.teacherComment, 170);
      doc.text(teacherLines, 20, yPos + 7);
      yPos += 7 * teacherLines.length + 10;
      
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
    }
    
    if (reportCard.principalComment) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Principal\'s Comment:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const principalLines = doc.splitTextToSize(reportCard.principalComment, 170);
      doc.text(principalLines, 20, yPos + 7);
      yPos += 7 * principalLines.length + 10;
    }
  }
  
  // Promotion status
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos += 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (reportCard.promoted) {
    doc.setTextColor(0, 128, 0);
    doc.text('✓ PROMOTED', 20, yPos);
  } else {
    doc.setTextColor(255, 0, 0);
    doc.text('NOT PROMOTED', 20, yPos);
  }
  doc.setTextColor(0, 0, 0);
  
  if (reportCard.nextTermBegins) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Next Term Begins: ${new Date(reportCard.nextTermBegins).toLocaleDateString()}`, 20, yPos + 10);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 280);
  
  // Return as Blob for browser compatibility
  return doc.output('blob');
}

/**
 * Generate Weekly Report Card PDF
 * Returns Blob for browser compatibility
 */
export async function generateWeeklyReportCardPDF(reportCard: any): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SCHOOL AI AGENT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('WEEKLY PROGRESS REPORT', pageWidth / 2, 30, { align: 'center' });
  
  // Week info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const weekStart = reportCard.weekStart instanceof Date ? reportCard.weekStart : new Date(reportCard.weekStart);
  const weekEnd = reportCard.weekEnd instanceof Date ? reportCard.weekEnd : new Date(reportCard.weekEnd);
  const weekText = `Week ${reportCard.weekNumber}: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
  doc.text(weekText, pageWidth / 2, 38, { align: 'center' });
  
  // Student Info
  let yPos = 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Information', 20, yPos);
  doc.setFont('helvetica', 'normal');
  yPos += 7;
  
  doc.text(`Name: ${reportCard.studentName}`, 25, yPos);
  doc.text(`Class: ${reportCard.className}`, 25, yPos + 6);
  doc.text(`Term: ${reportCard.term}`, 25, yPos + 12);
  doc.text(`Session: ${reportCard.session}`, 25, yPos + 18);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const genDate = reportCard.generatedAt instanceof Date ? reportCard.generatedAt : new Date(reportCard.generatedAt);
  doc.text(`Generated on: ${genDate.toLocaleDateString()} at ${genDate.toLocaleTimeString()}`, 20, 280);
  
  // Return as Blob for browser compatibility
  return doc.output('blob');
}

/**
 * Helper function to download a PDF Blob
 */
export function downloadPDF(pdfBlob: Blob, filename: string): void {
  try {
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ PDF downloaded:', filename);
  } catch (error) {
    console.error('❌ Error downloading PDF:', error);
    throw error;
  }
}