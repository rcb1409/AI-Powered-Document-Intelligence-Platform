import * as pdfParse from 'pdf-parse';

/**
 * Extract text from PDF file buffer
 * @param buffer - PDF file as Buffer (from file upload)
 * @returns Extracted text as string
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse is a CommonJS module, handle default export
    const pdf = (pdfParse as any).default || pdfParse;
    const data = await pdf(buffer);
    return data.text || '';
  } catch (error: any) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}