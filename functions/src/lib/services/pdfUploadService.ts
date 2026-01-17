// lib/services/pdfUploadService.ts - UPDATED FOR HTTPS
export async function uploadPDFToBlob(pdfBlob: Blob, fileName: string): Promise<string | null> {
  try {
    console.log('📤 Uploading PDF using free HTTPS hosting...');
    
    // Method 1: Use file.io (supports HTTPS)
    const formData = new FormData();
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    formData.append('file', pdfFile);
    
    console.log('📄 File size:', pdfBlob.size, 'bytes');
    
    // Try file.io first (supports HTTPS)
    try {
      const response = await fetch('https://file.io', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.link) {
          console.log('✅ PDF uploaded to file.io:', result.link);
          return result.link; // This should be HTTPS
        }
      }
    } catch (error) {
      console.log('⚠️ file.io failed:', error);
    }
    
    // Method 2: Try catbox.moe (free, HTTPS)
    try {
      const catboxFormData = new FormData();
      catboxFormData.append('reqtype', 'fileupload');
      catboxFormData.append('fileToUpload', pdfFile);
      
      const catboxResponse = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: catboxFormData
      });
      
      if (catboxResponse.ok) {
        const url = await catboxResponse.text();
        if (url.startsWith('http')) {
          console.log('✅ PDF uploaded to catbox.moe:', url);
          // Ensure HTTPS
          return url.replace('http://', 'https://');
        }
      }
    } catch (error) {
      console.log('⚠️ catbox.moe failed:', error);
    }
    
    // Method 3: Use tmpfiles.org but force HTTPS
    try {
      const tmpfilesResponse = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      
      if (tmpfilesResponse.ok) {
        const result = await tmpfilesResponse.json();
        if (result.data && result.data.url) {
          // Convert to HTTPS direct download link
          const downloadUrl = result.data.url
            .replace('http://', 'https://')
            .replace('tmpfiles.org/', 'tmpfiles.org/dl/');
          console.log('✅ PDF uploaded to tmpfiles.org (HTTPS):', downloadUrl);
          return downloadUrl;
        }
      }
    } catch (error) {
      console.log('⚠️ tmpfiles.org failed:', error);
    }
    
    console.error('❌ All free upload services failed');
    return null;
    
  } catch (error) {
    console.error('❌ Error uploading PDF:', error);
    return null;
  }
}