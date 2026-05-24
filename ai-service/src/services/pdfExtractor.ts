import fs from 'fs';
import pdfParse from 'pdf-parse';

export interface ExtractResult {
  text: string;
  pageCount: number;
}

/**
 * Extract plain text from a PDF file on disk.
 * Returns empty text (not an error) for encrypted/image-only PDFs.
 */
export async function extractPdfText(filePath: string): Promise<ExtractResult> {
  const buffer = fs.readFileSync(filePath);
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text.replace(/\s+/g, ' ').trim(),
      pageCount: data.numpages,
    };
  } catch (err) {
    console.error('PDF extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}
