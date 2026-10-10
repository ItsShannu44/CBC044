// Works out the real type of an uploaded file from its first bytes.
// Returns a MIME type for PDF, PNG and JPEG, or null for anything else.
export function sniffFileType(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  return null;
}
