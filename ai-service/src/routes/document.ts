import { Router, Request, Response } from 'express';
import { extractText } from '../services/textExtractor';
import { chunkText } from '../services/chunker';
import { embedBatch } from '../services/embeddings';
import { insertChunks } from '../services/milvus';
import { db } from '../db';

export const documentRouter = Router();

/**
 * POST /api/document/process
 * Body: { document_id, subject_id, stored_path }
 *
 * Called by the Go backend after a PDF is uploaded.
 * Orchestrates: extract → chunk → embed → store in Milvus → update Postgres.
 */
documentRouter.post('/process', async (req: Request, res: Response) => {
  const { document_id, subject_id, stored_path } = req.body;

  if (!document_id || !subject_id || !stored_path) {
    return res.status(400).json({ error: 'document_id, subject_id, stored_path required' });
  }

  // Mark document as processing
  await db.query(
    `UPDATE uploaded_documents SET status='processing', updated_at=NOW() WHERE id=$1`,
    [document_id],
  );

  try {
    // 1. Extract text from document
    const { text, pageCount } = await extractText(stored_path);

    if (!text || text.length < 50) {
      await db.query(
        `UPDATE uploaded_documents SET status='failed', error_message=$1, updated_at=NOW() WHERE id=$2`,
        ['Could not extract readable text from document (may be image-based, encrypted, or unsupported format).', document_id],
      );
      return res.status(422).json({ error: 'Text extraction failed or insufficient content.' });
    }

    // 2. Chunk text
    const chunks = chunkText(text);

    // 3. Embed chunks
    const embeddings = await embedBatch(chunks);

    // 4. Insert into Milvus
    const milvusRecords = chunks.map((content, i) => ({
      chunk_uuid: '', // will be set after Postgres insert
      document_id,
      subject_id,
      content,
      embedding: embeddings[i],
    }));

    // 5. Insert chunk metadata into Postgres and get UUIDs
    const chunkUUIDs: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const result = await db.query(
        `INSERT INTO document_chunks(document_id, chunk_index, content, token_count)
         VALUES($1,$2,$3,$4) RETURNING id`,
        [document_id, i, chunks[i], chunks[i].split(/\s+/).length],
      );
      chunkUUIDs.push(result.rows[0].id as string);
    }

    // 6. Assign UUIDs and insert into Milvus
    milvusRecords.forEach((r, i) => { r.chunk_uuid = chunkUUIDs[i]; });
    const milvusIDs = await insertChunks(milvusRecords);

    // 7. Update each chunk with its Milvus ID
    for (let i = 0; i < chunkUUIDs.length; i++) {
      await db.query(
        `UPDATE document_chunks SET milvus_id=$1 WHERE id=$2`,
        [milvusIDs[i], chunkUUIDs[i]],
      );
    }

    // 8. Mark document as ready
    await db.query(
      `UPDATE uploaded_documents SET status='ready', page_count=$1, updated_at=NOW() WHERE id=$2`,
      [pageCount, document_id],
    );

    return res.json({
      message: 'Document processed successfully.',
      chunk_count: chunks.length,
      page_count: pageCount,
    });
  } catch (err: any) {
    console.error('Document processing error:', err);
    await db.query(
      `UPDATE uploaded_documents SET status='failed', error_message=$1, updated_at=NOW() WHERE id=$2`,
      [err.message ?? 'Unknown error', document_id],
    );
    return res.status(500).json({ error: err.message ?? 'Processing failed' });
  }
});
