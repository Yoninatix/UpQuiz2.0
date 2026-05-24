import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractResult {
  text: string;
  pageCount: number;
}

export async function extractText(filePath: string): Promise<ExtractResult> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    return extractPdf(filePath);
  }
  if (ext === '.docx') {
    return extractDocx(filePath);
  }
  if (['.txt', '.md', '.csv'].includes(ext)) {
    return extractPlainText(filePath);
  }
  // Attempt plain-text read for unknown extensions
  return extractPlainText(filePath);
}

async function extractPdf(filePath: string): Promise<ExtractResult> {
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

async function extractDocx(filePath: string): Promise<ExtractResult> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value.replace(/\s+/g, ' ').trim();
    // DOCX has no reliable page count — estimate ~500 words per page
    const wordCount = text.split(/\s+/).length;
    const pageCount = Math.max(1, Math.round(wordCount / 500));
    return { text, pageCount };
  } catch (err) {
    console.error('DOCX extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}

function extractPlainText(filePath: string): ExtractResult {
  try {
    const text = fs.readFileSync(filePath, 'utf-8').replace(/\s+/g, ' ').trim();
    const wordCount = text.split(/\s+/).length;
    const pageCount = Math.max(1, Math.round(wordCount / 500));
    return { text, pageCount };
  } catch (err) {
    console.error('Plain-text extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}
