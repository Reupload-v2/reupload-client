import { File as NodeFile } from "node:buffer";

/** Minimal `File` for Node test runs (Node 18+). */
export function testFile(
  content: string | string[],
  name: string,
  type: string,
): File {
  const parts = Array.isArray(content) ? content : [content];
  return new NodeFile(parts, name, { type }) as unknown as File;
}
