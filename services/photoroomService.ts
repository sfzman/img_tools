
/**
 * Service to interact with the Photoroom API for background removal.
 * Documentation: https://www.photoroom.com/api/docs/
 */

// Use environment variable for API key
const PHOTOROOM_API_KEY = process.env.PHOTOROOM_API_KEY;

/**
 * Removes the background from a base64 encoded image using Photoroom API.
 * @param base64Image The input image in base64 format.
 * @returns A promise that resolves to the processed image in base64 format.
 */
export const removeBackgroundWithPhotoroom = async (base64Image: string): Promise<string> => {
  // 1. Validation
  if (!PHOTOROOM_API_KEY) {
    throw new Error('Photoroom API Key 未配置。请在环境变量中设置 PHOTOROOM_API_KEY。');
  }

  try {
    // 2. Convert Base64 string to Blob for FormData
    // Using fetch(base64) is an efficient way to convert base64 to Blob in modern browsers
    const imageResponse = await fetch(base64Image);
    const imageBlob = await imageResponse.blob();

    // 3. Prepare FormData
    const formData = new FormData();
    formData.append('image_file', imageBlob);
    // Optional: formData.append('size', 'auto');
    // Optional: formData.append('format', 'png');

    // 4. Call Photoroom API
    const response = await fetch('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: {
        'x-api-key': PHOTOROOM_API_KEY,
        // Do not set Content-Type; fetch sets it automatically with the boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        errorDetails = await response.text();
      } catch (e) { /* ignore */ }
      
      if (response.status === 403 || response.status === 401) {
        throw new Error('Photoroom API Key 无效，请检查您的环境变量。');
      }
      if (response.status === 402) {
        throw new Error('Photoroom API 额度已耗尽。');
      }
      
      throw new Error(`Photoroom API 错误 (${response.status}): ${errorDetails}`);
    }

    // 5. Convert result Blob back to Base64 for the UI
    const resultBlob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('无法将 Photoroom 响应转换为 Base64'));
        }
      };
      reader.onerror = () => reject(new Error('无法读取 Photoroom 响应数据'));
      reader.readAsDataURL(resultBlob);
    });

  } catch (error) {
    console.error('Photoroom Service Error:', error);
    throw error;
  }
};
