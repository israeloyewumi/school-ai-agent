// functions/src/lib/ai/parentChatAgent.ts - Admin SDK Version for Cloud Functions

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// ✅ Import from Admin SDK versions
import {
  getStudentDashboardData,
  getDetailedAttendanceRecords,
  getDetailedMeritRecords,
  getDetailedGradeRecords,
  getStudentFeeStatus
} from '../firebase/parentAccess';
import { getStudentById } from '../firebase/studentManagement';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Define parent-specific tools
const parentTools = [
  {
    name: "get_child_overview",
    description: "Get complete overview of child's performance including attendance, merits, grades, and fees",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The student ID" },
        term: { type: "STRING", description: "The term (e.g., 'First Term')" },
        session: { type: "STRING", description: "The session (e.g., '2025/2026')" }
      },
      required: ["studentId", "term", "session"]
    }
  },
  {
    name: "get_attendance_details",
    description: "Get detailed attendance records with dates, status, and remarks",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The student ID" },
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The session" }
      },
      required: ["studentId", "term", "session"]
    }
  },
  {
    name: "get_merit_details",
    description: "Get detailed merit/demerit records with points, reasons, and teachers",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The student ID" },
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The session" }
      },
      required: ["studentId", "term", "session"]
    }
  },
  {
    name: "get_grade_details",
    description: "Get ALL individual grade records including every single classwork, homework, CA1, CA2, and exam. Returns complete list of all assessments by subject with dates, scores, and percentages. Use this when parent asks for 'all classwork', 'all homework', 'list of grades', 'show all assessments', or any detailed academic records.",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The student ID" },
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The session" }
      },
      required: ["studentId", "term", "session"]
    }
  },
  {
    name: "get_fee_status",
    description: "Get fee payment status, balance, and payment history",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The student ID" },
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The session" }
      },
      required: ["studentId", "term", "session"]
    }
  }
];

// Execute parent-specific tool calls
async function executeParentTool(toolName: string, args: any) {
  console.log(`🔧 [ParentAgent] Executing: ${toolName}`, args);
  
  try {
    let result;
    
    switch (toolName) {
      case "get_child_overview":
        const overview = await getStudentDashboardData(args.studentId, args.term, args.session);
        result = {
          student: overview.student,
          attendance: {
            percentage: overview.attendance.percentage,
            present: overview.attendance.present,
            absent: overview.attendance.absent,
            late: overview.attendance.late,
            totalDays: overview.attendance.totalDays
          },
          merits: {
            totalPoints: overview.merits.totalPoints,
            positivePoints: overview.merits.positivePoints,
            negativePoints: overview.merits.negativePoints,
            recentCount: overview.merits.recentAwards.length
          },
          academics: {
            overallAverage: overview.academics.overallAverage,
            subjectCount: overview.academics.subjects.length,
            subjects: overview.academics.subjects.map(s => ({
              name: s.subjectName,
              total: s.total,
              grade: s.grade
            }))
          },
          fees: {
            status: overview.fees.status,
            totalAmount: overview.fees.totalAmount,
            amountPaid: overview.fees.amountPaid,
            balance: overview.fees.balance
          }
        };
        break;
      
      case "get_attendance_details":
        const attendanceRecords = await getDetailedAttendanceRecords(
          args.studentId,
          args.term,
          args.session
        );
        result = {
          totalRecords: attendanceRecords.length,
          records: attendanceRecords.map(r => ({
            date: r.date.toLocaleDateString(),
            day: r.date.toLocaleDateString('en-US', { weekday: 'long' }),
            status: r.status,
            markedBy: r.markedBy,
            remarks: r.remarks
          })),
          summary: {
            present: attendanceRecords.filter(r => r.status === 'present').length,
            absent: attendanceRecords.filter(r => r.status === 'absent').length,
            late: attendanceRecords.filter(r => r.status === 'late').length,
            excused: attendanceRecords.filter(r => r.status === 'excused').length
          }
        };
        break;
      
      case "get_merit_details":
        const meritRecords = await getDetailedMeritRecords(
          args.studentId,
          args.term,
          args.session
        );
        result = {
          totalRecords: meritRecords.length,
          records: meritRecords.map(r => ({
            date: r.date.toLocaleDateString(),
            points: r.points,
            category: r.category,
            reason: r.reason,
            teacherName: r.teacherName
          })),
          summary: {
            totalPoints: meritRecords.reduce((sum, r) => sum + r.points, 0),
            positivePoints: meritRecords.filter(r => r.points > 0).reduce((sum, r) => sum + r.points, 0),
            negativePoints: Math.abs(meritRecords.filter(r => r.points < 0).reduce((sum, r) => sum + r.points, 0))
          }
        };
        break;
      
      case "get_grade_details":
        const gradeRecords = await getDetailedGradeRecords(
          args.studentId,
          args.term,
          args.session
        );
        
        // Group by subject and assessment type for better organization
        const bySubject: Record<string, any> = {};
        const byType: Record<string, any[]> = {
          classwork: [],
          homework: [],
          ca1: [],
          ca2: [],
          exam: []
        };
        
        gradeRecords.forEach(r => {
          // Group by subject
          if (!bySubject[r.subjectName]) {
            bySubject[r.subjectName] = {
              classwork: [],
              homework: [],
              ca1: [],
              ca2: [],
              exam: [],
              totalAssessments: 0
            };
          }
          
          const record = {
            date: r.date.toLocaleDateString(),
            score: r.score,
            maxScore: r.maxScore,
            percentage: Math.round(r.percentage * 10) / 10,
            teacherName: r.teacherName
          };
          
          bySubject[r.subjectName][r.assessmentType].push(record);
          bySubject[r.subjectName].totalAssessments++;
          
          // Group by type for easy filtering
          byType[r.assessmentType].push({
            subjectName: r.subjectName,
            ...record
          });
        });
        
        result = {
          totalRecords: gradeRecords.length,
          subjectCount: Object.keys(bySubject).length,
          
          // Organized by subject (for "show me Math grades")
          bySubject: bySubject,
          
          // Organized by type (for "show all classwork" or "list all homework")
          byAssessmentType: {
            allClasswork: byType.classwork,
            allHomework: byType.homework,
            allCA1: byType.ca1,
            allCA2: byType.ca2,
            allExams: byType.exam
          },
          
          // Overall statistics
          overallStats: {
            totalAssessments: gradeRecords.length,
            classworkCount: byType.classwork.length,
            homeworkCount: byType.homework.length,
            ca1Count: byType.ca1.length,
            ca2Count: byType.ca2.length,
            examCount: byType.exam.length,
            averagePercentage: gradeRecords.length > 0
              ? Math.round((gradeRecords.reduce((sum, r) => sum + r.percentage, 0) / gradeRecords.length) * 10) / 10
              : 0
          }
        };
        break;
      
      case "get_fee_status":
        const feeStatus = await getStudentFeeStatus(
          args.studentId,
          args.term,
          args.session
        );
        result = {
          status: feeStatus.status,
          totalAmount: feeStatus.totalAmount,
          amountPaid: feeStatus.amountPaid,
          balance: feeStatus.balance,
          dueDate: feeStatus.dueDate?.toLocaleDateString(),
          paymentHistory: feeStatus.paymentHistory.map(p => ({
            date: p.date.toLocaleDateString(),
            amount: p.amount,
            method: p.method,
            receiptNumber: p.receiptNumber
          }))
        };
        break;
      
      default:
        result = { error: "Unknown tool" };
    }
    
    console.log(`✅ [ParentAgent] ${toolName} completed`);
    return result;
    
  } catch (error: any) {
    console.error(`❌ [ParentAgent] Error in ${toolName}:`, error);
    return { error: `Failed to execute ${toolName}: ${error.message}` };
  }
}

export async function getParentChatResponse(
  message: string,
  parentId: string,
  studentId: string,
  term: string,
  session: string
): Promise<string> {
  console.log('🚀 [ParentAgent] Starting chat response');
  
  try {
    // Get student info for context
    const student = await getStudentById(studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'your child';
    
    const systemPrompt = `You are a helpful AI assistant for parents in a school management system.

CURRENT CONTEXT:
- Parent ID: ${parentId}
- Student: ${studentName} (ID: ${studentId})
- Term: ${term}
- Session: ${session}

YOUR ROLE:
You help parents understand their child's academic performance, attendance, behavior (merits), and fee status.

IMPORTANT GUIDELINES:
1. **Always be warm, supportive, and encouraging** - You're talking to a parent about their child
2. **Use the child's name when possible** - Makes responses more personal
3. **Provide actionable insights** - Not just data, but what it means
4. **Be proactive with suggestions** - If attendance is low, suggest checking in with teachers
5. **Format data clearly** - Use bullet points, headings, and structure for readability
6. **Celebrate achievements** - Highlight positive performance enthusiastically
7. **Frame concerns constructively** - If there are issues, present them with solutions

WHEN PARENTS ASK:
- "How is my child doing?" → Use get_child_overview for complete summary
- "Show attendance" → Use get_attendance_details for full records
- "What about merits?" → Use get_merit_details for behavior records
- "How are the grades?" → Use get_grade_details for academic performance
- "List all classwork/homework/assessments" → Use get_grade_details (it returns EVERY individual record!)
- "Show me all grades in [subject]" → Use get_grade_details and filter by subject
- "What classwork has been done?" → Use get_grade_details - it has all individual classwork
- "Fee status?" → Use get_fee_status for payment information

IMPORTANT FOR LISTING REQUESTS:
- When parent asks for "all classwork", "list of homework", etc., use get_grade_details
- The tool returns EVERY individual assessment - present them in a clear list format
- Organize by subject if asking for all, or by date if asking for one subject
- Include dates, scores, and percentages for each item

RESPONSE FORMAT:
- Start with a friendly greeting if it's a general question
- Present data in organized sections with emojis for visual appeal
- End with encouragement or next steps
- Keep responses conversational but informative

EXAMPLE GOOD RESPONSES:
❌ Bad: "Attendance is 85%"
✅ Good: "Great news! ${studentName}'s attendance is at 85% this term - that's above the recommended 75% threshold! 📋"

❌ Bad: "I don't have a way to list all classwork"
✅ Good: "Here are ALL of ${studentName}'s classwork assignments this term:

**Mathematics** (5 classwork)
1. Jan 8 - 18/20 (90%) - Teacher: Mr. John
2. Jan 15 - 16/20 (80%) - Teacher: Mr. John
...

**English** (4 classwork)
1. Jan 10 - 25/30 (83.3%) - Teacher: Mrs. Sarah
..."

Remember: You're not just delivering data, you're helping parents stay connected with their child's education.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: [],
      tools: [{
        // @ts-ignore - Google AI schema type complexity
        functionDeclarations: parentTools
      }],
    });

    let result = await chat.sendMessage(message);
    let response = result.response;

    // Handle function calls (up to 5 iterations)
    const maxIterations = 5;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;
      
      const functionCalls = response.functionCalls();
      
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      console.log(`🔄 [ParentAgent] Iteration ${iterations}: ${functionCalls.length} function call(s)`);
      
      const functionResponses = await Promise.all(
        functionCalls.map(async (call: any) => {
          const toolResult = await executeParentTool(call.name, call.args);
          return {
            name: call.name,
            response: toolResult
          };
        })
      );

      const functionResponseParts = functionResponses.map(fr => ({
        functionResponse: {
          name: fr.name,
          response: fr.response
        }
      }));

      result = await chat.sendMessage(functionResponseParts);
      response = result.response;
    }

    const text = response.text();
    console.log('✅ [ParentAgent] Response generated');
    
    return text;

  } catch (error: any) {
    console.error("❌ [ParentAgent] Error:", error);
    return `I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.\n\nError: ${error.message}`;
  }
}

// Alias for easier importing
export const chat = getParentChatResponse;
