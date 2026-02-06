const pdfParse = require('pdf-parse');

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error: any) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}