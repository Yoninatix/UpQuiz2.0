import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export interface ExtractResult {
  text: string;
  pageCount: number;
}

export async function extractText(filePath: string): Promise<ExtractResult> {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':  return extractPdf(filePath);
    case '.docx': return extractDocx(filePath);
    case '.doc':  return extractDoc(filePath);
    case '.pptx': return extractPptx(filePath);
    case '.xlsx':
    case '.xls':  return extractExcel(filePath);
    case '.odt':  return extractOdt(filePath);
    case '.html':
    case '.htm':  return extractHtml(filePath);
    case '.rtf':  return extractRtf(filePath);
    // .txt .md .csv .json .xml .yaml .yml — plain text reads work fine
    default:      return extractPlainText(filePath);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function estimatePages(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 500));
}

function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// ── Extractors ────────────────────────────────────────────────────────────────

async function extractPdf(filePath: string): Promise<ExtractResult> {
  try {
    const data = await pdfParse(fs.readFileSync(filePath));
    return { text: normalise(data.text), pageCount: data.numpages };
  } catch (err) {
    console.error('PDF extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}

async function extractDocx(filePath: string): Promise<ExtractResult> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = normalise(result.value);
    return { text, pageCount: estimatePages(text) };
  } catch (err) {
    console.error('DOCX extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}

async function extractDoc(filePath: string): Promise<ExtractResult> {
  // Mammoth handles some .doc files; fall back to raw bytes as last resort
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    if (result.value.trim().length > 20) {
      const text = normalise(result.value);
      return { text, pageCount: estimatePages(text) };
    }
  } catch {
    // fall through
  }
  return extractPlainText(filePath);
}

async function extractPptx(filePath: string): Promise<ExtractResult> {
  try {
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    const slideNames = Object.keys(zip.files)
      .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => {
        const num = (s: string) => parseInt(s.match(/\d+/)![0], 10);
        return num(a) - num(b);
      });

    const slideTexts: string[] = [];
    for (const name of slideNames) {
      const xml = await zip.files[name].async('string');
      const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
      const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').trim();
      if (slideText) slideTexts.push(slideText);
    }

    const text = normalise(slideTexts.join('\n\n'));
    return { text, pageCount: slideNames.length || 1 };
  } catch (err) {
    console.error('PPTX extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}

function extractExcel(filePath: string): ExtractResult {
  try {
    const workbook = XLSX.readFile(filePath);
    const parts = workbook.SheetNames.map(name => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `[${name}]\n${csv}`;
    });
    const text = normalise(parts.join('\n\n'));
    return { text, pageCount: estimatePages(text) };
  } catch (err) {
    console.error('Excel extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}

async function extractOdt(filePath: string): Promise<ExtractResult> {
  try {
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    const xml = await zip.files['content.xml']?.async('string');
    if (!xml) return { text: '', pageCount: 0 };
    const text = normalise(xml.replace(/<[^>]+>/g, ' '));
    return { text, pageCount: estimatePages(text) };
  } catch (err) {
    console.error('ODT extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}

function extractHtml(filePath: string): ExtractResult {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const text = normalise(
      raw
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#?\w+;/g, ' '),
    );
    return { text, pageCount: estimatePages(text) };
  } catch (err) {
    console.error('HTML extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}

function extractRtf(filePath: string): ExtractResult {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    // Strip RTF control words, groups, and non-ASCII binary data
    const text = normalise(
      raw
        .replace(/\{[^{}]*\}/g, ' ')
        .replace(/\\[a-z]+[-]?\d*\s?/gi, '')
        .replace(/[{}\\]/g, ' '),
    );
    return { text, pageCount: estimatePages(text) };
  } catch (err) {
    console.error('RTF extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}

function extractPlainText(filePath: string): ExtractResult {
  try {
    const text = normalise(fs.readFileSync(filePath, 'utf-8'));
    return { text, pageCount: estimatePages(text) };
  } catch (err) {
    console.error('Plain-text extraction error:', err);
    return { text: '', pageCount: 0 };
  }
}
