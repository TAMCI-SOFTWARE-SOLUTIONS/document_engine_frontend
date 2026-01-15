export type PdfFileStatus = 'pending' | 'processing' | 'success' | 'error';

export interface PdfFileItem {
  id: string;
  originalXmlName: string;
  xmlFile: File;
  pdfBlob: Blob | null;
  pdfUrl: string | null;
  pdfFilename: string | null;
  status: PdfFileStatus;
  error?: string;
  horizontalDuplicado?: boolean;
}
