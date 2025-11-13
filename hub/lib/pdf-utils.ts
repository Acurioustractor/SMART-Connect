// Import PDFParse at the top level to avoid module resolution issues in Next.js
import { PDFParse } from 'pdf-parse'

/**
 * Extract text content from a PDF buffer
 *
 * @param pdfBuffer - Buffer containing the PDF data
 * @returns Extracted text content from the PDF
 */
export async function extractPDFText(pdfBuffer: Buffer): Promise<{
  text: string
  numPages: number
  info: any
}> {
  try {
    // Create parser instance with the buffer
    const parser = new PDFParse({ data: pdfBuffer })

    // Get document info to know the total pages
    const infoResult = await parser.getInfo()

    // Extract text from all pages
    const textResult = await parser.getText()

    // Clean up
    await parser.destroy()

    return {
      text: textResult.text,
      numPages: infoResult.total,
      info: infoResult.info || {}
    }
  } catch (error: any) {
    throw new Error(`Failed to extract PDF text: ${error.message}`)
  }
}

/**
 * Download a PDF from a URL and extract its text content
 *
 * @param pdfUrl - URL of the PDF to download and extract
 * @returns Extracted text content and metadata
 */
export async function downloadAndExtractPDF(pdfUrl: string): Promise<{
  text: string
  numPages: number
  buffer: Buffer
  info: any
}> {
  try {
    // Download the PDF
    const response = await fetch(pdfUrl)

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from the PDF
    const extracted = await extractPDFText(buffer)

    return {
      ...extracted,
      buffer
    }
  } catch (error: any) {
    throw new Error(`Failed to download and extract PDF from ${pdfUrl}: ${error.message}`)
  }
}

/**
 * Convert PDF text to markdown-friendly format
 * Cleans up common PDF extraction artifacts
 */
export function cleanPDFText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove form feed characters
    .replace(/\f/g, '\n\n')
    // Remove excessive spaces
    .replace(/  +/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim()
}
