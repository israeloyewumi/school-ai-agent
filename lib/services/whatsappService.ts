// lib/services/whatsappService.ts - FIXED VERSION WITH FREE HOSTING

import { getParentById } from '@/lib/firebase/parentManagement';

interface WhatsAppMessageOptions {
  to: string;
  message: string;
  mediaUrl?: string;
}

/**
 * Upload PDF using FREE hosting services (no tokens needed)
 */
async function uploadPDFToBlob(pdfBlob: Blob, fileName: string): Promise<string | null> {
  try {
    console.log('📤 Uploading PDF using free HTTPS hosting...');
    
    const formData = new FormData();
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    formData.append('file', pdfFile);
    
    console.log('📄 File size:', pdfBlob.size, 'bytes');
    
    // Method 1: Try file.io (gives HTTPS URLs)
    try {
      console.log('🔄 Trying file.io...');
      const response = await fetch('https://file.io', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.link) {
          console.log('✅ PDF uploaded to file.io:', result.link);
          return result.link;
        }
      }
    } catch (error) {
      console.log('⚠️ file.io failed, trying next service...');
    }
    
    // Method 2: Try 0x0.st (free, HTTPS)
    try {
      console.log('🔄 Trying 0x0.st...');
      const oxFormData = new FormData();
      oxFormData.append('file', pdfFile);
      
      const response = await fetch('https://0x0.st', {
        method: 'POST',
        body: oxFormData
      });
      
      if (response.ok) {
        const url = await response.text();
        const cleanUrl = url.trim();
        console.log('✅ PDF uploaded to 0x0.st:', cleanUrl);
        return cleanUrl;
      }
    } catch (error) {
      console.log('⚠️ 0x0.st failed, trying next service...');
    }
    
    // Method 3: Try tmpfiles.org (convert to HTTPS)
    try {
      console.log('🔄 Trying tmpfiles.org...');
      const response = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.url) {
          // Convert to HTTPS direct download link
          const httpsUrl = result.data.url
            .replace('http://', 'https://')
            .replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          console.log('✅ PDF uploaded to tmpfiles.org:', httpsUrl);
          return httpsUrl;
        }
      }
    } catch (error) {
      console.log('⚠️ tmpfiles.org failed');
    }
    
    console.error('❌ All free upload services failed');
    return null;
    
  } catch (error) {
    console.error('❌ Error uploading PDF:', error);
    return null;
  }
}

/**
 * Send WhatsApp message via Twilio API
 */
export async function sendWhatsAppMessage(options: WhatsAppMessageOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('🚀 Starting WhatsApp send...');
    console.log('📱 To:', options.to);
    
    const accountSid = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID;
    const authToken = process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN;
    const from = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER;

    console.log('🔑 Account SID:', accountSid ? 'Set ✅' : 'Missing ❌');
    console.log('🔑 Auth Token:', authToken ? 'Set ✅' : 'Missing ❌');
    console.log('🔑 From Number:', from);

    if (!accountSid || !authToken || !from) {
      const error = 'Twilio credentials not configured';
      console.error('❌', error);
      return { success: false, error };
    }

    // Format phone number
    let phoneNumber = options.to;
    console.log('📞 Original number:', phoneNumber);
    
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+234' + phoneNumber.replace(/^0+/, '');
      console.log('📞 Formatted to:', phoneNumber);
    }

    // Check: Make sure "To" and "From" are different
    if (phoneNumber === from) {
      console.error('❌ Cannot send to same number as Twilio number');
      return {
        success: false,
        error: 'Cannot send message to same number as sender'
      };
    }

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
      console.log('📎 Media URL:', options.mediaUrl);
    }

    console.log('🌐 Sending to Twilio...');

    // Create basic auth header
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

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
 * Send report card to parent via WhatsApp
 */
export async function sendReportCardToParent(
  parentId: string,
  studentName: string,
  reportType: string,
  pdfBlob: Blob
): Promise<{ success: boolean; error?: string; publicUrl?: string }> {
  try {
    console.log('👨‍👩‍👧 Looking up parent:', parentId);
    
    const parent = await getParentById(parentId);
    
    if (!parent) {
      console.error('❌ Parent not found:', parentId);
      return { success: false, error: 'Parent not found' };
    }
    
    console.log('👤 Found parent:', parent.firstName, parent.lastName);
    console.log('📱 Parent phone:', parent.phoneNumber);

    if (!parent.phoneNumber) {
      console.error('❌ Parent has no phone number');
      return { success: false, error: 'Parent has no phone number' };
    }

    // Generate filename
    const timestamp = Date.now();
    const sanitizedStudentName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedReportType = reportType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${sanitizedStudentName}_${sanitizedReportType}_${timestamp}.pdf`;
    
    console.log('📄 Processing PDF:', fileName);

    // Upload PDF using free hosting services
    const publicUrl = await uploadPDFToBlob(pdfBlob, fileName);
    
    if (!publicUrl) {
      console.error('❌ Failed to upload PDF to free hosting');
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
      
      // Auto-download PDF for admin (optional - won't break if it fails)
      try {
        if (typeof window !== 'undefined' && pdfBlob instanceof Blob) {
          const adminDownloadUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = adminDownloadUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(adminDownloadUrl);
          console.log('📥 PDF also downloaded for admin');
        }
      } catch (downloadError) {
        console.log('⚠️ Auto-download skipped (not critical)');
        // Not critical - WhatsApp delivery succeeded
      }
      
      return { success: true, publicUrl: publicUrl };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('❌ Error in sendReportCardToParent:', error);
    return {
      success: false,
      error: error.message || 'Failed to send report to parent'
    };
  }
}