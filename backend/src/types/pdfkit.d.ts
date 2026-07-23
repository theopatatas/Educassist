declare module "pdfkit" {
  type PDFDocumentOptions = {
    margin?: number;
    size?: string;
    layout?: "portrait" | "landscape";
  };

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    fontSize(size: number): PDFDocument;
    text(text: string, options?: object): PDFDocument;
    moveDown(amount?: number): PDFDocument;
    pipe(stream: NodeJS.WritableStream): void;
    end(): void;
  }

  export = PDFDocument;
}
