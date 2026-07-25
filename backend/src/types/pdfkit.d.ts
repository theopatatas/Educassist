declare module "pdfkit" {
  type PDFDocumentOptions = {
    margin?: number;
    size?: string;
    layout?: "portrait" | "landscape";
  };

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    fontSize(size: number): PDFDocument;
    fillColor(color: string): PDFDocument;
    text(text: string, options?: object): PDFDocument;
    moveDown(amount?: number): PDFDocument;
    on(event: "data", listener: (chunk: Buffer) => void): PDFDocument;
    on(event: "end", listener: () => void): PDFDocument;
    pipe(stream: NodeJS.WritableStream): void;
    end(): void;
  }

  export = PDFDocument;
}
