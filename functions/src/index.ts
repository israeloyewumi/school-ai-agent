import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// ✅ Import the chat functions
import { chat as adminChat } from "./lib/ai/adminChatAgent";
import { chat as parentChat } from "./lib/ai/parentChatAgent";

// Type aliases for cleaner code
type Request = functions.https.Request;
type Response = functions.Response<any>;

/**
 * Main API endpoint - handles all chat routes
 */
export const api = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes for long-running operations
    memory: "1GB",
  })
  .https.onRequest(async (request, response) => {
    // Enable CORS
    response.set("Access-Control-Allow-Origin", "*");
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    // Route to appropriate handler
    const path = request.path;

    if (path === "/admin-chat" && request.method === "POST") {
      await handleAdminChat(request, response);
    } else if (path === "/parent-chat" && request.method === "POST") {
      await handleParentChat(request, response);
    } else if (path === "/health" && request.method === "GET") {
      response.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString() 
      });
    } else {
      response.status(404).json({ error: "Not found" });
    }
  });

/**
 * Handle admin chat requests
 */
async function handleAdminChat(request: Request, response: Response) {
  try {
    const { message, adminId, conversationHistory } = request.body;

    // Validate required fields
    if (!message || !adminId) {
      response.status(400).json({
        error: "Missing required fields: message and adminId",
      });
      return;
    }

    console.log("📥 Admin chat request received");
    console.log("✅ Processing request for admin:", adminId);
    console.log("📝 Message:", message.substring(0, 100));

    // Call the admin chat function
    const aiResponse = await adminChat(
      message,
      conversationHistory || []
    );

    console.log("✅ AI response generated successfully");

    response.status(200).json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Admin chat API error:", error);

    response.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}

/**
 * Handle parent chat requests
 */
async function handleParentChat(request: Request, response: Response) {
  try {
    const { message, parentId, studentId, term, session, conversationHistory } = request.body;

    // Validate required fields
    if (!message || !parentId) {
      response.status(400).json({
        error: "Missing required fields: message and parentId",
      });
      return;
    }

    console.log("📥 Parent chat request received");
    console.log("✅ Processing request for parent:", parentId);
    console.log("📝 Message:", message.substring(0, 100));

    // Call the parent chat function with all required parameters
    const aiResponse = await parentChat(
      message,
      parentId,
      studentId || '',
      term || 'First Term',
      session || '2025/2026'
    );

    console.log("✅ AI response generated successfully");

    response.status(200).json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Parent chat API error:", error);

    response.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}