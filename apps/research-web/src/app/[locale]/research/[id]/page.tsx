"use client";

import { getResearchStatus, triggerComplianceCheck, getComplianceStatus } from "@/app/actions/research";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Doc, DocStatus } from "@/types/document";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Loader2, Clock } from "lucide-react";
import { ComplianceModal } from "@/components/ComplianceModal";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";
import { type Locale } from "@/lib/i18n";

export default function ResearchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const researchId = params.id as string;
  const { toast } = useToast();
  const { _, i18n } = useLingui();

  // Get locale directly from LingUI i18n instance
  const locale = i18n.locale as Locale;

  const [document, setDocument] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [complianceModalOpen, setComplianceModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [startingCompliance, setStartingCompliance] = useState(false);
  const [complianceData, setComplianceData] = useState<any>(null); // Latest compliance check data

  useEffect(() => {
    if (!researchId) return;

    // Fetch initial status
    const fetchStatus = async () => {
      const result = await getResearchStatus(researchId);

      if (!result.success || !result.data) {
        console.error("Failed to fetch research:", result.error);
        setLoading(false);
        return;
      }

      const research = result.data;

      // Map research to Doc format
      const doc: Doc = {
        id: research.id,
        name: research.contractName,
        title: research.title, // AI-generated title
        size: 0, // We don't have size info
        createdAt: new Date(research.createdAt).getTime(),
        status: mapStatus(research.status),
        result: research.results ? parseResults(research.results, research.summary) : undefined,
        errorMessage: research.errorMessage || undefined,
        currentStage: research.currentStage || undefined,
        progress: research.progress || 0,
      };

      setDocument(doc);
      setLoading(false);
    };

    // Fetch compliance status
    const fetchComplianceStatus = async () => {
      const result = await getComplianceStatus(researchId);
      if (result.success && result.data && result.data.length > 0) {
        // Get the most recent compliance check (first item, already sorted)
        setComplianceData(result.data[0]);
      }
    };

    fetchStatus();
    fetchComplianceStatus();

    // Poll for updates every 3 seconds
    const interval = setInterval(async () => {
      const result = await getResearchStatus(researchId);

      if (result.success && result.data) {
        const research = result.data;

        const doc: Doc = {
          id: research.id,
          name: research.contractName,
          title: research.title, // AI-generated title
          size: 0,
          createdAt: new Date(research.createdAt).getTime(),
          status: mapStatus(research.status),
          result: research.results ? parseResults(research.results, research.summary) : undefined,
          errorMessage: research.errorMessage || undefined,
          currentStage: research.currentStage || undefined,
          progress: research.progress || 0,
        };

        setDocument(doc);

        // Stop polling research if completed or failed
        if (research.status === "completed" || research.status === "failed") {
          clearInterval(interval);
        }
      }

      // Also poll compliance status
      const complianceResult = await getComplianceStatus(researchId);
      if (complianceResult.success && complianceResult.data && complianceResult.data.length > 0) {
        setComplianceData(complianceResult.data[0]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [researchId]);

  const mapStatus = (status: string): DocStatus => {
    switch (status) {
      case "pending":
      case "in_progress":
        return "processing";
      case "completed":
        return "done";
      case "failed":
        return "error";
      default:
        return "uploaded";
    }
  };

  const parseResults = (resultsJson: string, summaryText?: string | null) => {
    try {
      const parsed = JSON.parse(resultsJson);

      return {
        blocks: parsed.blocks || [],
        reviews:
          parsed.reviews?.map((review: any, idx: number) => ({
            id: `review-${idx}`,
            paragraphId: review.blockIndex,
            severity: review.severity,
            comment: review.comment,
          })) || [],
        summary: summaryText || `Analysis completed with ${
          parsed.totalBlocks || 0
        } blocks reviewed.`,
      };
    } catch {
      return undefined;
    }
  };

  const handleStartComplianceCheck = () => {
    setConfirmDialogOpen(true);
  };

  const confirmStartComplianceCheck = async () => {
    setConfirmDialogOpen(false);
    setStartingCompliance(true);
    try {
      const result = await triggerComplianceCheck(researchId, locale);

      if (result.success) {
        toast({
          title: _(msg`Compliance check started`),
          description: _(msg`The legal compliance workflow has been triggered.`),
        });
        // Set the new compliance data
        if (result.data?.compliance) {
          setComplianceData(result.data.compliance);
        }
        setComplianceModalOpen(true);
      } else {
        // Check if there's an existing compliance check
        if (result.existingCompliance) {
          toast({
            title: _(msg`Compliance check already running`),
            description: _(msg`A compliance check is already in progress for this contract.`),
            variant: "default",
          });
          setComplianceData(result.existingCompliance);
          setComplianceModalOpen(true);
        } else {
          toast({
            title: _(msg`Failed to start compliance check`),
            description: result.error,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: _(msg`Error`),
        description: _(msg`An unexpected error occurred`),
        variant: "destructive",
      });
    } finally {
      setStartingCompliance(false);
    }
  };

  const handleRetry = () => {
    // Redirect back to home to upload again
    router.push(`/${locale}`);
  };

  const handleBlockClick = (blockIndex: number) => {
    // Get the actual anchorId from the block
    const block = document?.result?.blocks[blockIndex];
    const anchorId = block?.anchorId;

    if (!anchorId) {
      console.warn(`No anchorId found for block ${blockIndex}`);
      return;
    }

    // Use setTimeout to ensure the drawer closes first
    setTimeout(() => {
      const element = window.document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight animation
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      } else {
        console.warn(`Element with id ${anchorId} not found`);
      }
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600"><Trans>Loading research...</Trans></p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4"><Trans>Research not found</Trans></p>
          <button
            onClick={() => router.push(`/${locale}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Trans>Go Home</Trans>
          </button>
        </div>
      </div>
    );
  }

  // Determine if we can start a new compliance check
  const hasOngoingCompliance = complianceData &&
    (complianceData.status === "pending" || complianceData.status === "in_progress");
  const canStartCompliance = document?.status === "done" && !hasOngoingCompliance;

  // Parse compliance results if available
  const complianceResults = complianceData?.results ?
    (() => {
      try {
        return JSON.parse(complianceData.results);
      } catch {
        return null;
      }
    })() : null;

  return (
    <div className="h-screen flex flex-col">
      <Header />

      <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${locale}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <Trans>Back to Documents</Trans>
          </Button>

          <div className="border-l pl-3 ml-1">
            <h2 className="text-sm font-semibold">
              {document.title || document.name}
            </h2>
            {document.title && (
              <p className="text-xs text-muted-foreground">{document.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canStartCompliance && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartComplianceCheck}
              disabled={startingCompliance}
            >
              {startingCompliance ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <Trans>Starting...</Trans>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  <Trans>Check Legal Compliance</Trans>
                </>
              )}
            </Button>
          )}

          {complianceData && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setComplianceModalOpen(true)}
            >
              <Shield className="h-4 w-4 mr-2" />
              {hasOngoingCompliance ? <Trans>View Compliance Status</Trans> : <Trans>View Compliance Results</Trans>}
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <DocumentViewer
          document={document}
          documents={[document]}
          onDocumentSelect={() => {}}
          onRetry={handleRetry}
        />
      </div>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <Trans>Start Legal Compliance Check?</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <Trans>This will perform a comprehensive legal compliance analysis of your contract against German commercial law (HGB).</Trans>
              </p>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <Trans><span className="font-medium">Processing Time:</span> This analysis can take up to 8 minutes to complete.</Trans>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
            <AlertDialogAction onClick={confirmStartComplianceCheck}>
              <Trans>Start Analysis</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ComplianceModal
        open={complianceModalOpen}
        onOpenChange={setComplianceModalOpen}
        currentStage={complianceData?.currentStage}
        progress={complianceData?.progress || 0}
        complianceResults={complianceResults}
        status={complianceData?.status || "pending"}
        onBlockClick={handleBlockClick}
      />
    </div>
  );
}
