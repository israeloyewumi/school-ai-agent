// lib/ai/agent.ts - COMPLETE with All Role Support
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  getStudent,
  getStudentsByClass,
  getStudentMerits,
  getStudentMeritSummary,
  getStudentAttendance,
  getStudentResults,
  getParent,
  getStudentsByParent,
  getTeacher,
  getTeacherClasses,
  getTeacherSubjects,
  getClassAttendanceSummary,
  getClassResultsSummary,
  getAdmin,
  getAllStudents,
  getAllTeachers,
  getAllClasses,
  getSchoolStatistics,
  getTopPerformingStudents,
  getStudentsNeedingAttention,
  getFeeCollectionReport,
} from '../firebase/db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Define the available database tools for the AI
const databaseTools = [
  // STUDENT TOOLS
  {
    name: "get_student_info",
    description: "Get detailed information about a student including their class, contact info, and guardian details",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The unique ID of the student" }
      },
      required: ["studentId"]
    }
  },
  {
    name: "get_student_merits",
    description: "Get a student's merit points, level, and recent merit history for the current term",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The unique ID of the student" },
        term: { type: "STRING", description: "The term (e.g., 'First Term')" },
        session: { type: "STRING", description: "The academic session (e.g., '2024/2025')" }
      },
      required: ["studentId", "term", "session"]
    }
  },
  {
    name: "get_student_attendance",
    description: "Get a student's attendance records showing present, absent, or late days",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The unique ID of the student" },
        term: { type: "STRING", description: "The term to check" },
        session: { type: "STRING", description: "The academic session" }
      },
      required: ["studentId", "term", "session"]
    }
  },
  {
    name: "get_student_results",
    description: "Get a student's academic results/grades for subjects in a specific term",
    parameters: {
      type: "OBJECT",
      properties: {
        studentId: { type: "STRING", description: "The unique ID of the student" },
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The academic session" }
      },
      required: ["studentId", "term", "session"]
    }
  },
  {
    name: "get_class_students",
    description: "Get a list of all students in a specific class",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "The unique ID of the class" }
      },
      required: ["classId"]
    }
  },
  
  // PARENT TOOLS
  {
    name: "get_parent_info",
    description: "Get parent/guardian information including their children",
    parameters: {
      type: "OBJECT",
      properties: {
        parentId: { type: "STRING", description: "The unique ID of the parent" }
      },
      required: ["parentId"]
    }
  },
  {
    name: "get_parent_children",
    description: "Get list of all children for a parent",
    parameters: {
      type: "OBJECT",
      properties: {
        parentId: { type: "STRING", description: "The unique ID of the parent" }
      },
      required: ["parentId"]
    }
  },
  
  // TEACHER TOOLS
  {
    name: "get_teacher_info",
    description: "Get teacher information including subjects and classes they teach",
    parameters: {
      type: "OBJECT",
      properties: {
        teacherId: { type: "STRING", description: "The unique ID of the teacher" }
      },
      required: ["teacherId"]
    }
  },
  {
    name: "get_teacher_classes",
    description: "Get all classes assigned to a teacher",
    parameters: {
      type: "OBJECT",
      properties: {
        teacherId: { type: "STRING", description: "The unique ID of the teacher" }
      },
      required: ["teacherId"]
    }
  },
  {
    name: "get_teacher_subjects",
    description: "Get all subjects taught by a teacher",
    parameters: {
      type: "OBJECT",
      properties: {
        teacherId: { type: "STRING", description: "The unique ID of the teacher" }
      },
      required: ["teacherId"]
    }
  },
  {
    name: "get_class_attendance_summary",
    description: "Get attendance summary for an entire class",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "The unique ID of the class" },
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The academic session" }
      },
      required: ["classId", "term", "session"]
    }
  },
  {
    name: "get_class_results_summary",
    description: "Get academic results summary for an entire class",
    parameters: {
      type: "OBJECT",
      properties: {
        classId: { type: "STRING", description: "The unique ID of the class" },
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The academic session" },
        subjectId: { type: "STRING", description: "Optional: specific subject ID" }
      },
      required: ["classId", "term", "session"]
    }
  },
  
  // ADMIN TOOLS
  {
    name: "get_school_statistics",
    description: "Get comprehensive school-wide statistics",
    parameters: {
      type: "OBJECT",
      properties: {
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The academic session" }
      },
      required: ["term", "session"]
    }
  },
  {
    name: "get_all_students",
    description: "Get list of all active students in the school",
    parameters: {
      type: "OBJECT",
      properties: {},
      required: []
    }
  },
  {
    name: "get_all_teachers",
    description: "Get list of all active teachers in the school",
    parameters: {
      type: "OBJECT",
      properties: {},
      required: []
    }
  },
  {
    name: "get_all_classes",
    description: "Get list of all active classes in the school",
    parameters: {
      type: "OBJECT",
      properties: {},
      required: []
    }
  },
  {
    name: "get_top_performing_students",
    description: "Get top performing students ranked by average scores",
    parameters: {
      type: "OBJECT",
      properties: {
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The academic session" },
        limit: { type: "NUMBER", description: "Number of students to return (default: 10)" }
      },
      required: ["term", "session"]
    }
  },
  {
    name: "get_students_needing_attention",
    description: "Get students who need attention (low grades, poor attendance, negative merits)",
    parameters: {
      type: "OBJECT",
      properties: {
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The academic session" }
      },
      required: ["term", "session"]
    }
  },
  {
    name: "get_fee_collection_report",
    description: "Get comprehensive fee collection report",
    parameters: {
      type: "OBJECT",
      properties: {
        term: { type: "STRING", description: "The term" },
        session: { type: "STRING", description: "The academic session" }
      },
      required: ["term", "session"]
    }
  }
];

// Execute database tool calls
async function executeDatabaseTool(toolName: string, args: any) {
  console.log(`🔧 [Agent] Executing tool: ${toolName}`, args);
  try {
    let result;
    switch (toolName) {
      // STUDENT OPERATIONS
      case "get_student_info":
        result = await getStudent(args.studentId);
        if (!result) result = { error: "Student not found", studentId: args.studentId };
        break;
      
      case "get_student_merits":
        const merits = await getStudentMerits(args.studentId, args.term, args.session);
        const summary = await getStudentMeritSummary(args.studentId, args.term, args.session);
        result = { merits: merits || [], summary: summary || { totalMerits: 0, level: 'bronze' } };
        break;
      
      case "get_student_attendance":
        const attendance = await getStudentAttendance(args.studentId, args.term, args.session);
        result = { attendance: attendance || [] };
        break;
      
      case "get_student_results":
        const results = await getStudentResults(args.studentId, args.term, args.session);
        result = { results: results || [] };
        break;
      
      case "get_class_students":
        const students = await getStudentsByClass(args.classId);
        result = { students: students || [] };
        break;
      
      // PARENT OPERATIONS
      case "get_parent_info":
        result = await getParent(args.parentId);
        if (!result) result = { error: "Parent not found", parentId: args.parentId };
        break;
      
      case "get_parent_children":
        const children = await getStudentsByParent(args.parentId);
        result = { children: children || [] };
        break;
      
      // TEACHER OPERATIONS
      case "get_teacher_info":
        result = await getTeacher(args.teacherId);
        if (!result) result = { error: "Teacher not found", teacherId: args.teacherId };
        break;
      
      case "get_teacher_classes":
        const teacherClasses = await getTeacherClasses(args.teacherId);
        result = { classes: teacherClasses || [] };
        break;
      
      case "get_teacher_subjects":
        const teacherSubjects = await getTeacherSubjects(args.teacherId);
        result = { subjects: teacherSubjects || [] };
        break;
      
      case "get_class_attendance_summary":
        result = await getClassAttendanceSummary(args.classId, args.term, args.session);
        break;
      
      case "get_class_results_summary":
        result = await getClassResultsSummary(args.classId, args.term, args.session, args.subjectId);
        break;
      
      // ADMIN OPERATIONS
      case "get_school_statistics":
        result = await getSchoolStatistics(args.term, args.session);
        break;
      
      case "get_all_students":
        const allStudents = await getAllStudents();
        result = { students: allStudents || [], total: allStudents?.length || 0 };
        break;
      
      case "get_all_teachers":
        const allTeachers = await getAllTeachers();
        result = { teachers: allTeachers || [], total: allTeachers?.length || 0 };
        break;
      
      case "get_all_classes":
        const allClasses = await getAllClasses();
        result = { classes: allClasses || [], total: allClasses?.length || 0 };
        break;
      
      case "get_top_performing_students":
        result = await getTopPerformingStudents(args.term, args.session, args.limit || 10);
        result = { topStudents: result || [] };
        break;
      
      case "get_students_needing_attention":
        result = await getStudentsNeedingAttention(args.term, args.session);
        result = { students: result || [] };
        break;
      
      case "get_fee_collection_report":
        result = await getFeeCollectionReport(args.term, args.session);
        break;
      
      default:
        result = { error: "Unknown tool" };
    }
    console.log(`✅ [Agent] Tool ${toolName} result:`, JSON.stringify(result).substring(0, 200));
    return result;
  } catch (error) {
    console.error(`❌ [Agent] Error executing ${toolName}:`, error);
    return { error: `Failed to execute ${toolName}: ${error}` };
  }
}

export interface AgentMessage {
  role: "student" | "teacher" | "parent" | "admin";
  message: string;
  context?: {
    userId?: string;
    classId?: string;
    studentId?: string;
    parentId?: string;
    teacherId?: string;
    adminId?: string;
    term?: string;
    session?: string;
  };
}

export async function getAIResponse(input: AgentMessage): Promise<string> {
  console.log('🚀 [Agent] Starting getAIResponse with:', input);
  
  try {
    const { role, message, context } = input;

    const currentTerm = context?.term || "First Term";
    const currentSession = context?.session || "2024/2025";

    console.log('📝 [Agent] Building system prompt for role:', role);
    
    const systemPrompt = buildSystemPrompt(role, context);

    console.log('🤖 [Agent] Initializing Gemini model...');
    
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    console.log('💬 [Agent] Starting chat with tools enabled');
    
    const chat = model.startChat({
      history: [],
      tools: [{
        // @ts-ignore - Google AI schema type complexity
        functionDeclarations: databaseTools
      }],
    });

    console.log('📤 [Agent] Sending message to Gemini:', message);
    
    let result = await chat.sendMessage(message);
    let response = result.response;

    console.log('📥 [Agent] Got initial response from Gemini');
    
    const maxIterations = 5;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;
      
      const functionCalls = response.functionCalls();
      
      console.log(`🔍 [Agent] Iteration ${iterations}: Function calls:`, functionCalls?.length || 0);

      if (!functionCalls || functionCalls.length === 0) {
        console.log('✅ [Agent] No more function calls, breaking loop');
        break;
      }

      console.log(`🔄 [Agent] Processing ${functionCalls.length} function call(s)`);
      
      const functionResponsesData = await Promise.all(
        functionCalls.map(async (call: any) => {
          console.log(`🔧 [Agent] Calling: ${call.name}`, call.args);
          const toolResult = await executeDatabaseTool(call.name, call.args);
          return {
            name: call.name,
            response: toolResult
          };
        })
      );

      console.log(`📤 [Agent] Sending ${functionResponsesData.length} function response(s) back to Gemini`);
      
      const functionResponseParts = functionResponsesData.map(fr => {
        console.log(`📦 [Agent] Preparing response for ${fr.name}:`, fr.response);
        return {
          functionResponse: {
            name: fr.name,
            response: fr.response
          }
        };
      });

      console.log(`📋 [Agent] Function response parts:`, JSON.stringify(functionResponseParts, null, 2));

      result = await chat.sendMessage(functionResponseParts);
      response = result.response;
      
      console.log('📥 [Agent] Got response after function call(s)');
    }

    if (iterations >= maxIterations) {
      console.warn('⚠️ [Agent] Reached max iterations, stopping function call loop');
    }

    console.log('📝 [Agent] Extracting final text from response');
    const text = response.text();
    console.log('✅ [Agent] Final text:', { length: text.length, preview: text.substring(0, 100) });
    
    return text;

  } catch (error: any) {
    console.error("❌ [Agent] Error in getAIResponse:", error);
    console.error("❌ [Agent] Error message:", error.message);
    console.error("❌ [Agent] Error stack:", error.stack);
    return `I apologize, but I encountered an error while processing your request: ${error.message}. Please try again or contact support if the issue persists.`;
  }
}

function buildSystemPrompt(
  role: "student" | "teacher" | "parent" | "admin",
  context?: AgentMessage["context"]
): string {
  const contextInfo = buildContextInfo(role, context);

  const basePrompt = `You are a helpful AI assistant for a school management system. Current term: ${context?.term || "First Term"}, Session: ${context?.session || "2024/2025"}.${contextInfo}

You have access to database tools to fetch real information about students, parents, merits, attendance, results, and more. When a user asks about their data, use the appropriate tools to fetch accurate information.

OTHER GUIDELINES:
1. Always use the database tools when users ask about their personal data
2. Present data in a clear, friendly, and organized way
3. When showing numbers, use proper formatting (e.g., "You have 85 merits" not "85")
4. Be encouraging and positive, especially when discussing academic performance
5. If data is not found, politely inform the user and suggest they verify their ID or contact admin

MERIT LEVELS:
- Bronze: 0-50 merits
- Silver: 51-150 merits
- Gold: 151-300 merits
- Platinum: 301-500 merits
- Diamond: 501+ merits`;

  const roleSpecificPrompts = {
    student: `
You are speaking with a STUDENT. Keep your tone friendly, encouraging, and age-appropriate.

🔴 CRITICAL: If the student ID is in the CURRENT USER CONTEXT (shown above), use it RIGHT AWAY. Do NOT ask for it again!

When students ask about:
- "My merits" → IMMEDIATELY use get_student_merits with the studentId from context
- "My attendance" → IMMEDIATELY use get_student_attendance with the studentId from context
- "My results" or "My grades" → IMMEDIATELY use get_student_results with the studentId from context
- "My class" or "classmates" → Use get_class_students

Always be supportive and celebrate their achievements.`,

    teacher: `
You are speaking with a TEACHER. Keep your tone professional and informative.

Teachers can ask about:
- Individual student information (they will provide student IDs)
- Class-wide statistics
- Attendance records for their class
- Student performance data

Provide detailed, actionable insights that help teachers support their students better.`,

    parent: `
You are speaking with a PARENT/GUARDIAN. Keep your tone respectful and informative.

🔴 CRITICAL PARENT WORKFLOW:
1. When a parent asks about "my child" or "my children", IMMEDIATELY use get_parent_children with their Parent ID from context
2. Once you have the children, use their student IDs to fetch grades, attendance, merits, etc.
3. DO NOT ask the parent for their child's student ID - you should find it automatically!

Example flow:
- Parent asks: "How is my child performing?"
- You call: get_parent_children(parentId: PARENT001)
- You get: children array with student IDs
- You call: get_student_results(studentId: STU2024001, ...)
- You respond with the child's performance

CRITICAL REMINDERS:
- If parent ID is in context, use get_parent_children FIRST before asking about any child
- Parents should NEVER need to provide their child's student ID
- Always refer to children by name when presenting data
- Be encouraging and provide actionable advice

Present information clearly and suggest action items when appropriate.`,

    admin: `
You are speaking with an ADMIN. Provide comprehensive data and insights.

Admins need:
- School-wide statistics
- Multiple student comparisons
- Detailed reports
- System-level information

Be thorough and data-driven in your responses.`
  };

  return basePrompt + "\n\n" + roleSpecificPrompts[role];
}

function buildContextInfo(
  role: "student" | "teacher" | "parent" | "admin",
  context?: AgentMessage["context"]
): string {
  if (role === "student" && context?.studentId) {
    return `\n\n🆔 CURRENT USER CONTEXT:\n- Student ID: ${context.studentId}\n- Term: ${context.term}\n- Session: ${context.session}\n\n⚠️ CRITICAL: You already have their Student ID! Use it DIRECTLY in your tool calls. DO NOT ask for it again!`;
  }
  
  if (role === "parent" && context?.parentId) {
    return `\n\n🆔 CURRENT USER CONTEXT:\n- Parent ID: ${context.parentId}\n- Term: ${context.term}\n- Session: ${context.session}\n\n⚠️ CRITICAL: You have the Parent ID! When they ask about "my child", IMMEDIATELY call get_parent_children with this Parent ID to find their children. DO NOT ask for student IDs!`;
  }
  
  if (role === "teacher" && context?.teacherId) {
    return `\n\n🆔 CURRENT USER CONTEXT:\n- Teacher ID: ${context.teacherId}\n- Term: ${context.term}\n- Session: ${context.session}\n\n⚠️ CRITICAL: You have the Teacher ID! Use it when querying teacher-specific data.`;
  }
  
  if (role === "admin" && context?.adminId) {
    return `\n\n🆔 CURRENT USER CONTEXT:\n- Admin ID: ${context.adminId}\n- Term: ${context.term}\n- Session: ${context.session}`;
  }
  
  return `\n\nNOTE: No user ID has been provided yet. Ask the user for their ID if they request personal data.`;
}

export async function generateResponse(
  role: "student" | "teacher" | "parent" | "admin",
  message: string,
  context?: AgentMessage["context"]
): Promise<string> {
  console.log('🎯 [Agent] generateResponse called with:', { role, message, context });
  return getAIResponse({
    role,
    message,
    context
  });
}
