import { chunkText } from '../utils/textChunker';

describe("chunkText", () => {
  it("returns empty array for empty string", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(chunkText("   \n\n  \t  ")).toEqual([]);
  });

  it("returns one chunk for short text", () => {
    const text = "Hello world. This is a short paragraph.";
    expect(chunkText(text)).toEqual([text]);
  });

  it("returns one chunk for text under default maxChars", () => {
    const text = "A".repeat(500);
    expect(chunkText(text)).toHaveLength(1);
    expect(chunkText(text)[0]).toBe(text);
  });

  it("splits long text into multiple chunks", () => {
    const part = "Sentence one. Sentence two. Sentence three. ";
    const text = part.repeat(50);
    const chunks = chunkText(text, { maxChars: 200 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(200 + 200);
    });
  });

  it("respects custom maxChars", () => {
    const text = "A".repeat(500);
    const chunks = chunkText(text, { maxChars: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(5);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(100 + 200);
    });
  });

  it("respects custom overlapChars", () => {
    const part = "Paragraph content here. ";
    const text = part.repeat(80);
    const chunks = chunkText(text, { maxChars: 300, overlapChars: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    const firstTail = chunks[0].slice(-50);
    expect(chunks[1].startsWith(firstTail) || chunks[1].includes(firstTail.trim())).toBe(true);
  });

  it("normalizes whitespace", () => {
    const text = "Word1   Word2\n\n\nWord3\r\nWord4";
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).not.toMatch(/\r\n/);
    expect(chunks[0]).not.toMatch(/   /);
  });
});