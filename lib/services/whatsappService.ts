// lib/services/whatsappService.ts - Client-side version for Next.js app

import { getParentById } from '@/lib/firebase/parentManagement';

interface WhatsAppMessageOptions {
  to: string;
  message: string;
  mediaUrl?: string;
}

/**
 * Send WhatsApp message via Twilio API
 * Client-side version (uses browser fetch)
 */
export async function sendWhatsAppMessage(options: WhatsAppMessageOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('🚀 Starting WhatsApp send...');
    console.log('📱 To:', options.to);
    
    // Get credentials from environment variables
    const accountSid = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID;
    const authToken = process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN;
    const from = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER;

    console.log('🔑 Account SID:', accountSid ? 'Set ✅' : 'Missing ❌');
    console.log('🔑 Auth Token:', authToken ? 'Set ✅' : 'Missing ❌');
    console.log('🔑 From Number:', from);

    if (!accountSid || !authToken || !from) {
      const error = 'Twilio credentials not configured';
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

    // Create basic auth header
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    // Make request to Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
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
 * Upload PDF to Vercel Blob Storage and get public URL
 * Client-side version
 */
async function uploadPDFToBlob(pdfBlob: Blob, fileName: string): Promise<string | null> {
  try {
    console.log('📤 Uploading PDF to Vercel Blob:', fileName);
    
    // Convert Blob to File
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    // Use Vercel Blob API
    const { put } = await import('@vercel/blob');
    
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: true
    });
    
    console.log('✅ PDF uploaded successfully');
    console.log('🔗 Public URL:', blob.url);
    
    return blob.url;
  } catch (error: any) {
    console.error('❌ Error uploading PDF:', error);
    return null;
  }
}

/**
 * Send report card to parent via WhatsApp
 * Client-side version (uses Blob instead of Buffer)
 */
export async function sendReportCardToParent(
  parentId: string,
  studentName: string,
  reportType: string,
  pdfBlob: Blob
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

    // Upload PDF to Vercel Blob
    const publicUrl = await uploadPDFToBlob(pdfBlob, fileName);
    
    if (!publicUrl) {
      console.error('❌ Failed to upload PDF');
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