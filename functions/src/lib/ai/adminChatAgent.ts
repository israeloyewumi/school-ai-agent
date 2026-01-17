// functions/src/lib/ai/adminChatAgent.ts - Admin SDK Version for Cloud Functions

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";// Import all necessary functions from Admin SDK versions
import {
  getAllStudents,
  getAllClasses,
  getSchoolStatistics,
  getTopPerformingStudents,
  getStudentsNeedingAttention,
  getFeeCollectionReport,
  getStudentByAdmissionNumber,
  getStudent,
  getStudentsByClass,
  getClassAttendanceSummary,
  getClassMeritLeaderboard
} from '../firebase/db';

import {
  generateCAReportCard,
  generateEndOfTermReportCard,
  generateWeeklyReportCard,
  generateBulkCAReports,
  generateBulkTermReports
} from '../firebase/adminReports';

import {
  getTeacherStats,
  getPendingApprovals
} from '../firebase/teacherManagement';

import {
  getPendingParentApprovals,
  getParentStats
} from '../firebase/parentManagement';

import { getClassById } from '../firebase/classManagement';

// ✅ NEW: Import from Admin SDK dailyRecordings
import { getDailyTeacherActivity } from '../firebase/dailyRecordings';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// System prompt for admin AI
const ADMIN_SYSTEM_PROMPT = `You are an intelligent school administration assistant. You help school administrators monitor and manage their school efficiently.

CAPABILITIES:
- Provide school-wide analytics and insights
- Compare classes by attendance, grades, or performance
- Search for students, teachers, and parents
- Monitor attendance, grades, fees, and merit points
- Generate and send report cards via WhatsApp
- Identify students needing attention
- Track teacher and parent approvals
- Analyze class performance and rank classes
- Track daily teacher activity (attendance recording, grade recording)

IMPORTANT - HANDLING NEGATIVE QUERIES:
When asked "who did NOT do X" or "who hasn't done X":
1. Use get_daily_teacher_activity to get complete data
2. Focus on the "teachersWhoDidNot" or "teachersWhoDidNotRecordAttendance" arrays
3. Present the list of teachers who DIDN'T perform the action
4. Include helpful context (total teachers, percentage who didn't, etc.)
5. Offer actionable suggestions (send reminders, follow up, etc.)

Examples of queries you CAN answer:
- "Which teachers did NOT record attendance today?"
- "Who hasn't recorded grades today?"
- "Show me teachers with no activity today"
- "Which class teachers haven't recorded attendance?"

TONE & STYLE:
- Professional, analytical, and action-oriented
- Use data to support recommendations
- Highlight urgent issues proactively
- Be concise but comprehensive
- Use emojis strategically for visual clarity
- ALWAYS provide direct answers, never say "I cannot"

RESPONSE FORMAT:
- Start with key metrics/summary
- Use clear sections with emojis
- Provide actionable insights
- Offer relevant follow-up actions
- When comparing classes, show top and bottom performers
- Present data in ranked lists when appropriate
- Highlight concerning trends that need attention
- For "who didn't" queries, lead with the list of non-compliant staff

CURRENT CONTEXT:
- Term: First Term
- Session: 2025/2026
- Today: ${new Date().toLocaleDateString()}

When generating or sending reports:
- Always confirm student details before generating
- When sending reports via WhatsApp:
  1. First check if report already exists
  2. If not, generate the report (CA, Term, or Weekly)
  3. Then fetch the report data from Firestore
  4. Pass the complete report object to send_report_to_parent
- Ask for confirmation before sending via WhatsApp
- Provide summary of report after generation

You have access to 20 specialized tools for school management.`;

// Define the 20 tools
const tools = [
  {
    name: "get_school_overview",
    description: "Get complete school statistics including students, teachers, classes, fees, attendance, and merit points for current term/session. Use this for queries like 'school overview', 'school statistics', 'how is the school doing'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        term: { type: "string", description: "Term name, default: First Term" },
        session: { type: "string", description: "Session year, default: 2025/2026" }
      }
    }
  },
  {
    name: "search_student",
    description: "Search for a student by name or admission number. Returns student details including class, grades, attendance. Use for queries like 'find student John', 'search admission number 12345'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        searchTerm: { type: "string", description: "Student name or admission number" }
      },
      required: ["searchTerm"]
    }
  },
  {
    name: "get_students_needing_attention",
    description: "Get list of students with low grades (<50%), poor attendance (<75%), or negative merit points. Use for 'students needing attention', 'at-risk students', 'students struggling'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" }
      }
    }
  },
  {
    name: "get_top_performers",
    description: "Get top performing students by average grade for current term. Use for 'top students', 'best performers', 'highest grades'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" },
        limit: { type: "number", description: "Number of students, default: 10" }
      }
    }
  },
  {
    name: "get_class_students",
    description: "Get all students in a specific class with basic details. Use for 'show JSS 2 students', 'list SS 1A students'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        classId: { type: "string", description: "Class ID (e.g., jss_2_a, ss_1_b)" }
      },
      required: ["classId"]
    }
  },
  {
    name: "get_fee_summary",
    description: "Get complete fee collection report including total expected, collected, outstanding, and breakdown by payment status. Use for 'fee collection', 'fees collected', 'outstanding fees'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" }
      }
    }
  },
  {
    name: "get_fee_defaulters",
    description: "Get list of students with unpaid or partial fee payments. Use for 'who hasn't paid fees', 'fee defaulters', 'unpaid fees'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" },
        statusFilter: { type: "string", enum: ["unpaid", "partial", "both"], description: "Filter by status" }
      }
    }
  },
  {
    name: "get_teacher_statistics",
    description: "Get teacher statistics including total, pending, active, class teachers, and subject teachers. Use for 'teacher stats', 'how many teachers', 'pending teacher approvals'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "get_parent_statistics",
    description: "Get parent statistics including total, pending, and approved parents. Use for 'parent stats', 'pending parent approvals'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "get_pending_approvals",
    description: "Get all pending teacher and parent approvals awaiting admin review. Use for 'pending approvals', 'who needs approval', 'approval queue'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "get_class_details",
    description: "Get detailed information about a class including students, teachers, and performance statistics. Use for 'JSS 2A details', 'class information'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        classId: { type: "string", description: "Class ID" }
      },
      required: ["classId"]
    }
  },
  {
    name: "generate_ca_report",
    description: "Generate CA1 or CA2 report for a single student. Returns report summary. Use for 'generate CA1 report for John', 'create CA2 report for admission 12345'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        studentId: { type: "string", description: "Student ID or admission number" },
        assessmentType: { type: "string", enum: ["ca1", "ca2"], description: "CA1 or CA2" },
        term: { type: "string", description: "Term name, default: First Term" },
        session: { type: "string", description: "Session, default: 2025/2026" }
      },
      required: ["studentId", "assessmentType"]
    }
  },
  {
    name: "generate_term_report",
    description: "Generate end-of-term report for a single student. Returns report summary. Use for 'generate term report for John', 'create end of term report'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        studentId: { type: "string", description: "Student ID or admission number" },
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" }
      },
      required: ["studentId"]
    }
  },
  {
    name: "generate_weekly_report",
    description: "Generate weekly progress report for a student for specific week. Use for 'generate weekly report', 'weekly progress report'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        studentId: { type: "string", description: "Student ID or admission number" },
        weekStart: { type: "string", description: "Week start date (YYYY-MM-DD)" },
        weekEnd: { type: "string", description: "Week end date (YYYY-MM-DD)" },
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" }
      },
      required: ["studentId", "weekStart", "weekEnd"]
    }
  },
  {
    name: "send_report_to_parent",
    description: "Send a PREVIOUSLY GENERATED report to parent via WhatsApp. IMPORTANT: You must first generate the report using generate_ca_report, generate_term_report, or generate_weekly_report, then pass the COMPLETE report data object from that generation to this tool. Use when user says 'send to parent', 'send via WhatsApp' AFTER a report has been generated.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        studentId: { type: "string", description: "Student ID (same as used for report generation)" },
        reportType: { type: "string", description: "Report type: CA1, CA2, Term, or Weekly (must match the generated report)" },
        reportData: { type: SchemaType.OBJECT, description: "The COMPLETE report data object returned from the generate_*_report tool" }
      },
      required: ["studentId", "reportType", "reportData"]
    }
  },
  {
    name: "generate_bulk_reports",
    description: "Generate reports for all students in a class. Use for 'generate CA1 for JSS 2', 'bulk generate term reports for SS 1'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        classId: { type: "string", description: "Class ID" },
        reportType: { type: "string", enum: ["ca1", "ca2", "term"], description: "Type of report" },
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" },
        sendToParents: { type: "boolean", description: "Whether to send to parents via WhatsApp, default: false" }
      },
      required: ["classId", "reportType"]
    }
  },
  {
    name: "get_attendance_analytics",
    description: "Get attendance statistics for school or specific class. Can compare ALL classes to find lowest/highest attendance. Use for 'attendance rate', 'which classes have low attendance', 'compare class attendance', 'classes with lowest attendance'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        classId: { type: "string", description: "Optional class ID for class-specific stats. If not provided, returns ALL classes ranked by attendance." },
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" }
      }
    }
  },
  {
    name: "get_grade_analytics",
    description: "Get grade analytics including average scores, top performers, and failing students. Use for 'grade statistics', 'academic performance', 'average scores'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        classId: { type: "string", description: "Optional class ID for class-specific stats" },
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" }
      }
    }
  },
  {
    name: "get_merit_leaderboard",
    description: "Get top students by merit points for school or specific class. Use for 'merit leaderboard', 'top students by merits', 'best behaved students'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        classId: { type: "string", description: "Optional class ID for class-specific leaderboard" },
        term: { type: "string", description: "Term name" },
        session: { type: "string", description: "Session year" },
        limit: { type: "number", description: "Number of students to return, default: 10" }
      }
    }
  },
  {
    name: "get_daily_teacher_activity",
    description: "Get comprehensive daily teacher activity showing who DID and who DID NOT record attendance or grades today. CRITICAL: This tool returns BOTH lists - teachers who recorded AND teachers who did NOT record. Use this for ALL teacher activity queries including: 'which teachers recorded attendance', 'who didn't record attendance', 'who hasn't recorded', 'teachers who did not record', 'missing attendance recordings', 'teacher activity today', 'daily recordings', 'which class teachers recorded', 'subject teachers who recorded grades'. The response includes complete data on both compliant and non-compliant teachers.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        activityType: { 
          type: "string", 
          enum: ["attendance", "grades", "all"],
          description: "Type of activity to check: 'attendance' (check attendance recording), 'grades' (check grade recording), or 'all' (check both)" 
        },
        date: { 
          type: "string", 
          description: "Date in YYYY-MM-DD format, defaults to today if not provided" 
        }
      }
    }
  }
];

// Tool execution function
async function executeTool(toolName: string, args: any, adminId: string) {
  console.log(`🔧 Executing tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case "get_school_overview": {
        const stats = await getSchoolStatistics(
          args.term || "First Term",
          args.session || "2025/2026"
        );
        return {
          success: true,
          data: stats
        };
      }

      case "search_student": {
        let student = await getStudentByAdmissionNumber(args.searchTerm);
        if (!student) {
          student = await getStudent(args.searchTerm);
        }
        if (!student) {
          const allStudents = await getAllStudents();
          const searchLower = args.searchTerm.toLowerCase();
          student = allStudents.find(s => 
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchLower)
          );
        }
        
        return {
          success: !!student,
          data: student || null,
          message: student ? undefined : "Student not found"
        };
      }

      case "get_students_needing_attention": {
        const students = await getStudentsNeedingAttention(
          args.term || "First Term",
          args.session || "2025/2026"
        );
        return {
          success: true,
          data: students,
          count: students.length
        };
      }

case "get_top_performers": {
  const allStudents = await getTopPerformingStudents(
    args.term || "First Term",
    args.session || "2025/2026"
  );
  const students = allStudents.slice(0, args.limit || 10);
  return {
    success: true,
    data: students,
    count: students.length
  };
}

      case "get_class_students": {
        const students = await getStudentsByClass(args.classId);
        return {
          success: true,
          data: students,
          count: students.length
        };
      }

      case "get_fee_summary": {
        const report = await getFeeCollectionReport(
          args.term || "First Term",
          args.session || "2025/2026"
        );
        return {
          success: true,
          data: report
        };
      }

      case "get_fee_defaulters": {
        const report = await getFeeCollectionReport(
          args.term || "First Term",
          args.session || "2025/2026"
        );
        
        const filter = args.statusFilter || "both";
        let defaulters = report.students || [];
        
        if (filter === "unpaid") {
          defaulters = defaulters.filter((s: any) => s.status === "unpaid");
        } else if (filter === "partial") {
          defaulters = defaulters.filter((s: any) => s.status === "partial");
        } else {
          defaulters = defaulters.filter((s: any) => s.status === "unpaid" || s.status === "partial");
        }
        
        return {
          success: true,
          data: defaulters,
          count: defaulters.length
        };
      }

      case "get_teacher_statistics": {
        const stats = await getTeacherStats();
        return {
          success: true,
          data: stats
        };
      }

      case "get_parent_statistics": {
        const stats = await getParentStats();
        return {
          success: true,
          data: stats
        };
      }

      case "get_pending_approvals": {
        const [teacherApprovals, parentApprovals] = await Promise.all([
          getPendingApprovals(),
          getPendingParentApprovals()
        ]);
        
        return {
          success: true,
          data: {
            teachers: teacherApprovals,
            parents: parentApprovals,
            totalPending: teacherApprovals.length + parentApprovals.length
          }
        };
      }

      case "get_class_details": {
        const classData = await getClassById(args.classId);
        if (!classData) {
          return { success: false, message: "Class not found" };
        }
        
        const students = await getStudentsByClass(args.classId);
        
        return {
          success: true,
          data: {
            ...classData,
            students: students.map(s => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              admissionNumber: s.admissionNumber
            })),
            studentCount: students.length
          }
        };
      }

      case "generate_ca_report": {
        let student = await getStudentByAdmissionNumber(args.studentId);
        if (!student) student = await getStudent(args.studentId);
        if (!student) return { success: false, message: "Student not found" };

        const report = await generateCAReportCard(
          student.id,
          args.term || "First Term",
          args.session || "2025/2026",
          args.assessmentType,
          adminId
        );

        return {
          success: true,
          data: report,
          message: `✅ ${args.assessmentType.toUpperCase()} report generated for ${student.firstName} ${student.lastName}`
        };
      }

      case "generate_term_report": {
        let student = await getStudentByAdmissionNumber(args.studentId);
        if (!student) student = await getStudent(args.studentId);
        if (!student) return { success: false, message: "Student not found" };

        const report = await generateEndOfTermReportCard(
          student.id,
          args.term || "First Term",
          args.session || "2025/2026",
          adminId
        );

        return {
          success: true,
          data: report,
          message: `✅ Term report generated for ${student.firstName} ${student.lastName}`
        };
      }

      case "generate_weekly_report": {
        let student = await getStudentByAdmissionNumber(args.studentId);
        if (!student) student = await getStudent(args.studentId);
        if (!student) return { success: false, message: "Student not found" };

        const report = await generateWeeklyReportCard(
          student.id,
          new Date(args.weekStart),
          new Date(args.weekEnd),
          args.term || "First Term",
          args.session || "2025/2026",
          adminId
        );

        return {
          success: true,
          data: report,
          message: `✅ Weekly report generated for ${student.firstName} ${student.lastName}`
        };
      }

      case "send_report_to_parent": {
        // NOTE: PDF and WhatsApp services will be migrated next
        return {
          success: false,
          message: "PDF and WhatsApp services migration pending"
        };
      }

      case "generate_bulk_reports": {
        const students = await getStudentsByClass(args.classId);
        if (students.length === 0) {
          return { success: false, message: "No students found in class" };
        }

        let result;
        if (args.reportType === "term") {
          result = await generateBulkTermReports(
            args.classId,
            args.term || "First Term",
            args.session || "2025/2026",
            adminId
          );
        } else {
          result = await generateBulkCAReports(
            args.classId,
            args.term || "First Term",
            args.session || "2025/2026",
            args.reportType as 'ca1' | 'ca2',
            adminId
          );
        }

        return {
          success: true,
          data: result,
          message: `✅ Bulk generation complete! Success: ${result.success}, Failed: ${result.failed}`
        };
      }

      case "get_attendance_analytics": {
        const term = args.term || "First Term";
        const session = args.session || "2025/2026";
        
        if (args.classId) {
          const classSummary = await getClassAttendanceSummary(args.classId, term, session);
          return {
            success: true,
            data: classSummary
          };
        } else {
          const allClasses = await getAllClasses();
          
          const classAttendanceData = await Promise.all(
            allClasses.map(async (cls) => {
              const summary = await getClassAttendanceSummary(cls.id, term, session);
              return {
                classId: cls.id,
                className: cls.name || cls.className,
                averageAttendance: summary.classAverage,
                totalStudents: summary.students.length,
                students: summary.students
              };
            })
          );
          
          classAttendanceData.sort((a, b) => a.averageAttendance - b.averageAttendance);
          
          const stats = await getSchoolStatistics(term, session);
          
          return {
            success: true,
            data: {
              overallAttendanceRate: stats.overallAttendanceRate,
              term: stats.term,
              session: stats.session,
              classByAttendance: classAttendanceData,
              lowestAttendanceClasses: classAttendanceData.slice(0, 5),
              highestAttendanceClasses: classAttendanceData.slice(-5).reverse()
            }
          };
        }
      }

      case "get_grade_analytics": {
        const topStudents = await getTopPerformingStudents(
          args.term || "First Term",
          args.session || "2025/2026",
          10
        );
        
        const needsAttention = await getStudentsNeedingAttention(
          args.term || "First Term",
          args.session || "2025/2026"
        );
        
        const lowGrades = needsAttention.filter(s => s.reasons.includes('Low academic performance'));
        
        return {
          success: true,
          data: {
            topPerformers: topStudents,
            failingStudents: lowGrades,
            schoolAverage: topStudents.length > 0 
              ? topStudents.reduce((sum, s) => sum + s.average, 0) / topStudents.length 
              : 0
          }
        };
      }

      case "get_merit_leaderboard": {
        if (args.classId) {
          const leaderboard = await getClassMeritLeaderboard(
            args.classId,
            args.limit || 10
          );
          return {
            success: true,
            data: leaderboard,
            count: leaderboard.length
          };
        } else {
          const allStudents = await getAllStudents();
          const needsAttention = await getStudentsNeedingAttention(
            args.term || "First Term",
            args.session || "2025/2026"
          );
          
          const studentMerits = needsAttention.map(s => ({
            studentId: s.studentId,
            studentName: s.studentName,
            admissionNumber: s.admissionNumber,
            classId: s.classId,
            totalMerits: s.totalMerits
          }));
          
          const topMeritStudents = studentMerits
            .sort((a, b) => b.totalMerits - a.totalMerits)
            .slice(0, args.limit || 10);
          
          return {
            success: true,
            data: topMeritStudents,
            count: topMeritStudents.length
          };
        }
      }

      case "get_daily_teacher_activity": {
        // ✅ NOW USES ADMIN SDK VERSION!
        const activityType = args.activityType || "all";
        const targetDate = args.date ? new Date(args.date) : new Date();
        
        const result = await getDailyTeacherActivity(activityType, targetDate);
        
        return {
          success: true,
          data: result
        };
      }

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolName}`
        };
    }
  } catch (error: any) {
    console.error(`❌ Error executing ${toolName}:`, error);
    return {
      success: false,
      error: error.message || "Tool execution failed"
    };
  }
}

// Main chat function
export async function getAdminChatResponse(
  userMessage: string,
  adminId: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: ADMIN_SYSTEM_PROMPT,
      // @ts-ignore - Google AI schema type complexity
      tools: [{ functionDeclarations: tools }]
    });

    // ✅ Clean and validate conversation history
    const cleanedHistory = conversationHistory
      .filter(msg => {
        if (msg.content.includes('Welcome to A.T.L.A.S AI')) return false;
        if (msg.content.includes('Academic Tracking, Learning & Administration System')) return false;
        if ((msg as any).id === 'welcome') return false;
        return msg.role === 'user' || msg.role === 'assistant';
      })
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    if (cleanedHistory.length > 0 && cleanedHistory[0].role === 'model') {
      console.log('⚠️ Removing first message (model role) from history');
      cleanedHistory.shift();
    }

    const validHistory: any[] = [];
    let lastRole = '';
    
    for (const msg of cleanedHistory) {
      if (msg.role !== lastRole) {
        validHistory.push(msg);
        lastRole = msg.role;
      } else {
        console.log(`⚠️ Skipping consecutive ${msg.role} message`);
      }
    }

    console.log('📜 Final history:', {
      totalMessages: validHistory.length,
      firstRole: validHistory[0]?.role,
      lastRole: validHistory[validHistory.length - 1]?.role
    });

    const chat = model.startChat({ history: validHistory });
    
    console.log('💬 Sending user message:', userMessage);
    const result = await chat.sendMessage(userMessage);
    const response = result.response;

    let functionCall = response.functionCalls()?.[0];
    let iterationCount = 0;
    const maxIterations = 10;
    
    while (functionCall && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`🔧 AI wants to call (iteration ${iterationCount}):`, functionCall.name);
      console.log('   Args:', functionCall.args);
      
      const toolResult = await executeTool(
        functionCall.name,
        functionCall.args,
        adminId
      );

      console.log('✅ Tool result:', {
        success: toolResult.success,
        hasData: !!toolResult.data,
        dataType: typeof toolResult.data,
        message: toolResult.message
      });

      const functionResponse = await chat.sendMessage([{
        functionResponse: {
          name: functionCall.name,
          response: toolResult
        }
      }]);

      const newResponse = functionResponse.response;
      functionCall = newResponse.functionCalls()?.[0];
      
      if (!functionCall) {
        const finalText = newResponse.text();
        console.log('📝 Final response:', finalText.substring(0, 200));
        return finalText;
      }
    }

    if (iterationCount >= maxIterations) {
      console.error('⚠️ Maximum function call iterations reached');
      return "I apologize, but I encountered too many nested operations. Please try breaking down your request into smaller parts.";
    }

    const finalText = response.text();
    console.log('📝 AI response:', finalText.substring(0, 200));
    return finalText;

  } catch (error: any) {
    console.error('❌ Admin chat error:', error);
    
    if (error.message?.includes('candidate.content.parts must not be empty')) {
      return "I apologize, but I encountered an issue processing your request. Could you please rephrase your question?";
    }
    
    if (error.message?.includes('User location is not supported')) {
      return "I apologize, but I'm having trouble accessing the AI service. Please try again in a moment.";
    }
    
    throw error;
  }
}

// Alias for easier importing
export const chat = getAdminChatResponse;
