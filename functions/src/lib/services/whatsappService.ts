// functions/src/lib/services/whatsappService.ts - Admin SDK Version for Cloud Functions

import { getParentById } from '../firebase/parentManagement';

interface WhatsAppMessageOptions {
  to: string;
  message: string;
  mediaUrl?: string;
}

/**
 * Send WhatsApp message via Twilio API
 * Cloud Functions compatible version
 */
export async function sendWhatsAppMessage(options: WhatsAppMessageOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('🚀 Starting WhatsApp send...');
    console.log('📱 To:', options.to);
    
    // Get credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_NUMBER;

    console.log('🔑 Account SID:', accountSid ? 'Set ✅' : 'Missing ❌');
    console.log('🔑 Auth Token:', authToken ? 'Set ✅' : 'Missing ❌');
    console.log('🔑 From Number:', from);

    if (!accountSid || !authToken || !from) {
      const error = 'Twilio credentials not configured in environment variables';
      console.error('❌', error);
      return {
        success: false,
        error
      };
    }

    // Format phone number
    let phoneNumber = options.to;
    console.log('📞 Original number:', phoneNumber);
    
    // Add Nigeria country code if not present
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+234' + phoneNumber.replace(/^0+/, '');
      console.log('📞 Formatted to:', phoneNumber);
    }

    // Validate: Make sure "To" and "From" are different
    if (phoneNumber === from) {
      console.error('❌ Cannot send to same number as Twilio number');
      return {
        success: false,
        error: 'Cannot send message to same number as sender'
      };
    }

    // Prepare Twilio API payload
    const payload: any = {
      From: `whatsapp:${from}`,
      To: `whatsapp:${phoneNumber}`,
      Body: options.message
    };

    console.log('📦 Payload:', {
      From: payload.From,
      To: payload.To,
      Body: options.message.substring(0, 50) + '...'
    });

    // Add media URL if provided
    if (options.mediaUrl) {
      // Ensure URL is valid for Twilio (must be HTTPS)
      if (!options.mediaUrl.startsWith('https://')) {
        console.error('❌ Media URL must be HTTPS:', options.mediaUrl);
        return {
          success: false,
          error: 'Media URL must be a secure HTTPS URL'
        };
      }
      payload.MediaUrl = options.mediaUrl;
      console.log('🖼️ Media URL:', options.mediaUrl);
    }

    console.log('🌐 Sending to Twilio...');

    // Make request to Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(payload)
      }
    );

    console.log('📡 Response status:', response.status);

    const result = await response.json();
    console.log('📨 Response data:', result);

    if (response.ok) {
      console.log('✅ WhatsApp message sent successfully!');
      console.log('📬 Message SID:', result.sid);
      return { success: true };
    } else {
      console.error('❌ Twilio API Error:', result);
      return {
        success: false,
        error: result.message || JSON.stringify(result)
      };
    }
  } catch (error: any) {
    console.error('❌ WhatsApp service error:', error);
    return {
      success: false,
      error: error.message || 'WhatsApp service error'
    };
  }
}

/**
 * Upload PDF to temporary storage and get public URL
 * For Cloud Functions, we'll use Firebase Storage or a similar service
 */
async function uploadPDFToStorage(pdfBuffer: Buffer, fileName: string): Promise<string | null> {
  try {
    console.log('📤 Uploading PDF to Firebase Storage:', fileName);
    
    // Import Firebase Admin Storage
    const admin = require('firebase-admin');
    const bucket = admin.storage().bucket();
    
    // Create file reference
    const file = bucket.file(`report-cards/${fileName}`);
    
    // Upload the PDF buffer
    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          firebaseStorageDownloadTokens: generateUUID()
        }
      }
    });
    
    // Make file publicly accessible
    await file.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    
    console.log('✅ PDF uploaded successfully');
    console.log('🔗 Public URL:', publicUrl);
    
    return publicUrl;
  } catch (error: any) {
    console.error('❌ Error uploading PDF:', error);
    return null;
  }
}

/**
 * Generate a simple UUID for Firebase Storage tokens
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Send report card to parent via WhatsApp
 * Cloud Functions compatible version
 */
export async function sendReportCardToParent(
  parentId: string,
  studentName: string,
  reportType: string,
  pdfBuffer: Buffer  // Changed from Blob to Buffer for Cloud Functions
): Promise<{ success: boolean; error?: string; publicUrl?: string }> {
  try {
    console.log('👨‍👩‍👧 Looking up parent:', parentId);
    
    // Get parent info
    const parent = await getParentById(parentId);
    
    if (!parent) {
      console.error('❌ Parent not found:', parentId);
      return {
        success: false,
        error: 'Parent not found'
      };
    }
    
    console.log('👤 Found parent:', parent.firstName, parent.lastName);
    console.log('📱 Parent phone:', parent.phoneNumber);

    if (!parent.phoneNumber) {
      console.error('❌ Parent has no phone number');
      return {
        success: false,
        error: 'Parent has no phone number'
      };
    }

    // Generate filename
    const timestamp = Date.now();
    const sanitizedStudentName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedReportType = reportType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${sanitizedStudentName}_${sanitizedReportType}_${timestamp}.pdf`;
    
    console.log('📄 Uploading PDF:', fileName);

    // Upload PDF to Firebase Storage
    const publicUrl = await uploadPDFToStorage(pdfBuffer, fileName);
    
    if (!publicUrl) {
      console.error('❌ Failed to upload PDF to Firebase Storage');
      // Send WhatsApp without PDF attachment
      const messageWithoutPDF = `
Hello ${parent.firstName} ${parent.lastName},

Your child ${studentName}'s ${reportType} is ready.

The PDF report could not be attached. Please contact the school administration to receive your copy.

Best regards,
School Administration
      `.trim();
      
      const result = await sendWhatsAppMessage({
        to: parent.phoneNumber,
        message: messageWithoutPDF
      });
      
      return result;
    }
    
    console.log('✅ PDF uploaded successfully');
    console.log('🔗 Public URL:', publicUrl);

    // Create WhatsApp message WITH media URL
    const message = `
Hello ${parent.firstName} ${parent.lastName},

Your child ${studentName}'s ${reportType} is now available.

📊 Report Summary:
- Student: ${studentName}
- Report Type: ${reportType}
- Generated: ${new Date().toLocaleDateString()}

📎 The PDF report is attached to this message.

Best regards,
School Administration
    `.trim();

    console.log('💬 Message prepared, sending with PDF...');

    // Send WhatsApp WITH media URL
    const result = await sendWhatsAppMessage({
      to: parent.phoneNumber,
      message,
      mediaUrl: publicUrl
    });

    if (result.success) {
      console.log('✅ WhatsApp sent with PDF attachment!');
      
      return { 
        success: true, 
        publicUrl: publicUrl 
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error: any) {
    console.error('❌ Error in sendReportCardToParent:', error);
    return {
      success: false,
      error: error.message || 'Failed to send report to parent'
    };
  }
}