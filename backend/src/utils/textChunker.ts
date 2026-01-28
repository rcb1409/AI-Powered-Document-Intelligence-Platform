type ChunkOptions = {
  maxChars?: number;      // max characters per chunk
  overlapChars?: number;  // overlap between chunks
};

/**
 * Chunk long text into smaller overlapping chunks.
 * - maxChars: how big each chunk can be (characters)
 * - overlapChars: how much text to repeat between chunks for context
 */
export function chunkText(input: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? 1200;
  const overlapChars = options.overlapChars ?? 200;

  if (!input || !input.trim()) return [];

  // Normalize whitespace a bit (keeps it readable)
  const text = input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Split into paragraph-like units first
  const parts = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };

  for (const part of parts) {
    // If current chunk can fit this paragraph, add it
    if (current && current.length + part.length + 2 <= maxChars) {
      current = `${current}\n\n${part}`;
      continue;
    }

    if (!current && part.length <= maxChars) {
      // Start a new chunk with this paragraph
      current = part;
      continue;
    }

    // If current has something, push it
    if (current) pushCurrent();

    // If this single paragraph is too big, split by sentences/characters
    if (part.length > maxChars) {
      const sentences = part.split(/(?<=[.!?])\s+/);

      if (sentences.length === 1) {
        // Fallback: no punctuation → hard split by characters
        for (let i = 0; i < part.length; i += maxChars) {
          const slice = part.slice(i, i + maxChars).trim();
          if (slice) chunks.push(slice);
        }
      } else {
        let sentenceChunk = "";

        for (const s of sentences) {
          // If single sentence is too long, hard split it
          if (s.length > maxChars) {
            if (sentenceChunk) {
              chunks.push(sentenceChunk.trim());
              sentenceChunk = "";
            }
            for (let i = 0; i < s.length; i += maxChars) {
              const slice = s.slice(i, i + maxChars).trim();
              if (slice) chunks.push(slice);
            }
            continue;
          }

          if (sentenceChunk.length + s.length + 1 <= maxChars) {
            sentenceChunk = sentenceChunk ? `${sentenceChunk} ${s}` : s;
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk.trim());
            }
            sentenceChunk = s;
          }
        }
        if (sentenceChunk) chunks.push(sentenceChunk.trim());
      }
    } else {
      // Paragraph fits alone as its own chunk
      chunks.push(part);
    }
  }

  if (current) pushCurrent();

  // Add overlap (sliding window over chunks)
  if (overlapChars > 0 && chunks.length > 1) {
    const withOverlap: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const prev = i > 0 ? chunks[i - 1] : "";
      const overlap = prev ? prev.slice(Math.max(0, prev.length - overlapChars)) : "";
      const combined = overlap ? `${overlap}\n${chunks[i]}` : chunks[i];
      withOverlap.push(combined.trim());
    }
    return withOverlap;
  }

  return chunks;
}