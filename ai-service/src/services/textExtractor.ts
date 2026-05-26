import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const execFileAsync = promisify(execFile);

// Pages with fewer characters than this are treated as image-based (e.g. screenshot slides)
const MIN_TEXT_CHARS_PER_PAGE = 50;

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

// Run Tesseract OCR on a single PDF page rendered to PNG via pdftoppm.
// Returns '' (silently) if either tool is not installed.
async function ocrPdfPage(pdfPath: string, pageNum: number): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upquiz-ocr-'));
  try {
    const imgPrefix = path.join(tmpDir, 'p');
    await execFileAsync('pdftoppm', [
      '-r', '200', '-png',
      '-f', String(pageNum), '-l', String(pageNum),
      pdfPath, imgPrefix,
    ]);

    const pngFiles = fs.readdirSync(tmpDir).filter(f => f.endsWith('.png'));
    if (pngFiles.length === 0) return '';

    const imgPath = path.join(tmpDir, pngFiles[0]);
    const outBase = path.join(tmpDir, 'ocr');
    await execFileAsync('tesseract', [imgPath, outBase, '-l', 'eng', '--psm', '6']);

    return fs.readFileSync(`${outBase}.txt`, 'utf-8');
  } catch {
    return '';
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function extractPdf(filePath: string): Promise<ExtractResult> {
  const buf = fs.readFileSync(filePath);

  // Collect per-page text while running pdf-parse
  const pageTexts: string[] = [];
  const pdfOptions = {
    pagerender: (pageData: any) =>
      pageData.getTextContent({ normalizeWhitespace: false }).then((tc: any) => {
        const text = (tc.items as any[]).map((it: any) => it.str).join(' ');
        pageTexts.push(text);
        return text;
      }),
  };

  let numPages = 1;
  try {
    const data = await (pdfParse as any)(buf, pdfOptions);
    numPages = data.numpages;
  } catch (err) {
    console.error('PDF extraction error:', err);
    return { text: '', pageCount: 0 };
  }

  // For pages that have very little extracted text, try OCR
  const sparseIndices = pageTexts
    .map((t, i) => ({ pageNum: i + 1, len: t.trim().length }))
    .filter(({ len }) => len < MIN_TEXT_CHARS_PER_PAGE);

  if (sparseIndices.length > 0) {
    console.log(`[OCR] ${sparseIndices.length} sparse page(s) in "${path.basename(filePath)}", running OCR…`);
    for (const { pageNum } of sparseIndices) {
      const ocrText = await ocrPdfPage(filePath, pageNum);
      if (ocrText.trim().length > (pageTexts[pageNum - 1]?.trim().length ?? 0)) {
        pageTexts[pageNum - 1] = ocrText;
      }
    }
  }

  return { text: normalise(pageTexts.join('\n\n')), pageCount: numPages };
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
