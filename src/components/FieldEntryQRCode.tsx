"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, QrCode } from "lucide-react";
import { toast } from "sonner";

interface FieldEntryQRCodeProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export function FieldEntryQRCode({ isOpen, onClose, projectId, projectName }: FieldEntryQRCodeProps) {
  const [fieldEntryUrl, setFieldEntryUrl] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      setFieldEntryUrl(`${baseUrl}/field-entry?project=${projectId}`);
    }
  }, [projectId]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Could not open print window. Please allow pop-ups.");
      return;
    }

    const qrCodeElement = document.getElementById('qr-code-print');
    if (!qrCodeElement) return;

    const svgData = qrCodeElement.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Field Entry QR Code - ${projectName}</title>
          <style>
            @media print {
              @page {
                margin: 0.5in;
                size: letter portrait;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .container {
              text-align: center;
              max-width: 600px;
            }
            h1 {
              color: #1f2937;
              margin-bottom: 8px;
              font-size: 28px;
            }
            h2 {
              color: #2563eb;
              margin-bottom: 24px;
              font-size: 20px;
              font-weight: 600;
            }
            .qr-container {
              display: inline-block;
              padding: 24px;
              background: white;
              border: 2px solid #e5e7eb;
              border-radius: 8px;
              margin: 20px 0;
            }
            .instructions {
              margin-top: 24px;
              text-align: left;
              padding: 16px;
              background: #f3f4f6;
              border-radius: 8px;
              line-height: 1.6;
            }
            .instructions h3 {
              margin-top: 0;
              color: #1f2937;
            }
            .instructions ol {
              margin: 8px 0;
              padding-left: 20px;
            }
            .instructions li {
              margin: 4px 0;
            }
            .footer {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>PileTrackerPro Field Entry</h1>
            <h2>${projectName}</h2>
            <div class="qr-container">
              ${svgData}
            </div>
            <div class="instructions">
              <h3>Instructions for Field Inspectors:</h3>
              <ol>
                <li>Scan this QR code with your mobile device's camera</li>
                <li>Enter your name as the inspector</li>
                <li>Fill out the pile information form</li>
                <li>Submit to instantly add pile data to the project</li>
              </ol>
            </div>
            <div class="footer">
              <p>Scan this code to access the mobile pile entry form</p>
              <p style="font-size: 12px; margin-top: 8px; word-break: break-all;">${fieldEntryUrl}</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load before printing
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const handleDownload = () => {
    const svgElement = document.getElementById('qr-code-download')?.querySelector('svg');
    if (!svgElement) {
      toast.error("Could not generate QR code image");
      return;
    }

    // Convert SVG to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `field-entry-qr-${projectName.replace(/\s+/g, '-').toLowerCase()}.png`;
        downloadLink.click();
        URL.revokeObjectURL(pngUrl);
        toast.success("QR code downloaded!");
      });
    };

    img.src = url;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fieldEntryUrl);
    toast.success("Field entry URL copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Field Entry QR Code
          </DialogTitle>
          <DialogDescription>
            Scan this QR code with a mobile device to access the field pile entry form
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700">
              <div id="qr-code-print">
                <QRCodeSVG
                  value={fieldEntryUrl}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              {/* Hidden element for download */}
              <div id="qr-code-download" className="hidden">
                <QRCodeSVG
                  value={fieldEntryUrl}
                  size={512}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {projectName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Field Entry Form
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handlePrint} variant="outline" className="w-full">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownload} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          {/* URL Copy */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Direct URL:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {fieldEntryUrl}
              </code>
              <Button onClick={handleCopyUrl} size="sm" variant="ghost">
                Copy
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How to Use:
            </h4>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Print or download this QR code</li>
              <li>Post it in the field where inspectors can access it</li>
              <li>Inspectors scan with their mobile camera</li>
              <li>They enter their name and pile data</li>
              <li>Data syncs instantly to your project</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
