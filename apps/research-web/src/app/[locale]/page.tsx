"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadContract } from '@/app/actions/research';
import { getPdfPageCount } from '@/utils/pdfHelpers';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { msg } from '@lingui/core/macro';
import { type Locale } from '@/lib/i18n';
import { useDocumentStore } from '@/hooks/useDocumentStore';
import { Header } from '@/components/Header';
import { DocumentGrid } from '@/components/DocumentGrid';

export default function HomePage() {
  const router = useRouter();
  const params = useParams();
  const { _, i18n } = useLingui();

  // Get locale from LingUI - the source of truth!
  const locale = i18n.locale as Locale;

  const { documents, isLoading } = useDocumentStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      setSelectedFile(file);

      const pageCount = await getPdfPageCount(file);

      const formData = new FormData();
      formData.append('contractName', file.name);
      formData.append('file', file);
      formData.append('totalPages', pageCount.toString());
      formData.append('locale', locale); // Send user's language to backend

      const result = await uploadContract(formData);

      if (!result.success || !result.data) {
        setError(result.error || _(msg`Failed to upload document`));
        setIsUploading(false);
        return;
      }

      router.push(`/${locale}/research/${result.data.research.id}`);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : _(msg`Failed to upload document`));
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      handleUpload(file);
    } else {
      setError(_(msg`Please upload a PDF file`));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Upload Section - 50vh */}
      <section className="flex items-center justify-center border-b" style={{ minHeight: '50vh' }}>
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              <Trans>AI-Powered Contract Analysis</Trans>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              <Trans>Upload your contract documents and get instant AI-powered legal analysis</Trans>
            </p>

            <div
              className="rounded-lg border-2 border-dashed border-border p-12 transition-colors hover:border-primary/50"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
                  <div>
                    <p className="mb-1 text-lg font-medium">
                      <Trans>Uploading Document...</Trans>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedFile?.name}
                    </p>
                  </div>
                  {error && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
                      <p className="text-sm text-destructive">{error}</p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFile(null);
                          setError(null);
                          setIsUploading(false);
                        }}
                        size="sm"
                        className="mt-2"
                      >
                        <Trans>Try Again</Trans>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-16 w-16 text-muted-foreground" />
                  <div>
                    <p className="mb-1 text-lg font-medium">
                      <Trans>Drop your PDF file here</Trans>
                    </p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      <Trans>or click to browse</Trans>
                    </p>
                  </div>
                  <Button
                    onClick={() => document.getElementById('file-input')?.click()}
                    size="lg"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    <Trans>Upload Document</Trans>
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Documents Grid Section - 50vh */}
      <section className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
        <div className="container mx-auto px-4 py-8">
          <h2 className="mb-6 text-2xl font-semibold">
            <Trans>Your Documents</Trans>
          </h2>
          <DocumentGrid documents={documents} locale={locale} isLoading={isLoading} />
        </div>
      </section>
    </div>
  );
}
