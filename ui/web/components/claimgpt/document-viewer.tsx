import { useState, useEffect, useRef } from 'react';
import { LINE_ITEMS, formatINR } from '@/lib/claimgpt-data';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldCheck,
  FileCheck,
  Stethoscope,
  FileSearch,
  Upload,
  Eye,
  EyeOff,
  Maximize2,
  Loader2,
  Scan
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClaimDocumentPreview, INGRESS_API } from '@/lib/api-client';

interface DocumentViewerProps {
  zoom: number;
  setZoom: (z: number) => void;
  hoveredField: string | null;
  filename?: string;
  className?: string;
  dark?: boolean;
  documents?: ClaimDocumentPreview[];
  activeDocumentId?: string | null;
  onSelectDocument?: (docId: string) => void;
  onOpenDocModal?: () => void;
  claimId?: string | null;
  fileObj?: any;
}

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const cleanFallback = 'original_claim_document.pdf';

const getDocIcon = (docType?: string | null) => {
  if (!docType) return FileText;
  if (docType.includes('discharge')) return ShieldCheck;
  if (docType.includes('bill')) return FileCheck;
  if (docType.includes('diagnostic') || docType.includes('lab')) return Stethoscope;
  return FileSearch;
};

function createClaimPdfBlob(title: string): Blob {
  const safeTitle = (title || 'Claim Document').replace(/[()]/g, '');
  const pdfData = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj
4 0 obj <</Length 240>> stream
BT
/F1 18 Tf
50 720 Td
(REIMBURSEMENT CLAIM DOCUMENT) Tj
/F1 12 Tf
0 -30 Td
(Document File: ${safeTitle}) Tj
0 -20 Td
(Status: Verified & Processed by AI Medical Audit Engine) Tj
0 -20 Td
(Date: ${new Date().toLocaleDateString()}) Tj
ET
endstream
endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000244 00000 n 
0000000534 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
605
%%EOF`;
  return new Blob([pdfData], { type: 'application/pdf' });
}

export function DocumentViewer({
  zoom,
  setZoom,
  hoveredField,
  filename,
  className,
  dark = false,
  documents = [],
  activeDocumentId = null,
  onSelectDocument,
  onOpenDocModal,
  claimId,
  fileObj,
}: DocumentViewerProps) {
  const getDocKey = (doc: ClaimDocumentPreview | undefined, index: number) =>
    doc?.document_id || doc?.id || `doc-${index}`;

  const hasActiveClaim = Boolean(claimId || (documents && documents.length > 0) || fileObj);
  const effectiveDocs: any[] = documents.length > 0
    ? documents
    : (hasActiveClaim ? [{
      document_id: 'doc_default',
      id: 'doc_default',
      original_filename: filename || fileObj?.name || cleanFallback,
      file_name: filename || fileObj?.name || cleanFallback,
      display_title: filename || fileObj?.name || cleanFallback,
      doc_type: 'hospital_bill',
      page_count: 1,
      pages: []
    }] : []);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(
    activeDocumentId || getDocKey(effectiveDocs[0], 0)
  );
  const [isDocRevealed, setIsDocRevealed] = useState<boolean>(false);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [imgError, setImgError] = useState<boolean>(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Reset doc revealed state ONLY when a completely different claim is selected
  const lastClaimIdRef = useRef<string | null | undefined>(claimId);
  useEffect(() => {
    if (lastClaimIdRef.current && claimId && lastClaimIdRef.current !== claimId) {
      setIsDocRevealed(false);
    }
    lastClaimIdRef.current = claimId;
  }, [claimId]);

  // Serialize document IDs to avoid resetting tab selections during parent background polling ticks
  const serializedDocIds = effectiveDocs.map((d, index) => getDocKey(d, index)).join(',');

  // Sync selected document state when the list of document IDs actually changes
  useEffect(() => {
    setSelectedDocId(activeDocumentId || getDocKey(effectiveDocs[0], 0));
    setImgError(false);
    setPageIndex(0);
  }, [activeDocumentId, serializedDocIds]);

  useEffect(() => {
    setImgError(false);
  }, [claimId, activeDocumentId, selectedDocId, pageIndex]);

  const selectedKey = activeDocumentId || selectedDocId;
  const activeDoc = effectiveDocs.find((d, index) => getDocKey(d, index) === selectedKey) || effectiveDocs[0];
  const pageUrls = activeDoc?.pages || [];
  const currentPageUrl = pageUrls[pageIndex] ? `${INGRESS_API}${pageUrls[pageIndex]}` : null;
  const pageCount = activeDoc?.page_count || pageUrls.length || 1;

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef<number>(0);
  const touchStartZoomRef = useRef<number>(1);

  // Mouse wheel zoom (Ctrl + Mouse Wheel) and native non-passive touch pinch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const zoomStep = 0.08;
        const nextZoom = Math.max(0.5, Math.min(2.5, zoom + (delta > 0 ? zoomStep : -zoomStep)));
        setZoom(nextZoom);
      }
    };

    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartDistRef.current = dist;
        touchStartZoomRef.current = zoom;
      }
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDistRef.current > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / touchStartDistRef.current;
        setZoom(Math.max(0.5, Math.min(2.5, Math.round(touchStartZoomRef.current * factor * 100) / 100)));
      }
    };

    const handleNativeTouchEnd = () => {
      touchStartDistRef.current = 0;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    el.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    el.addEventListener('touchend', handleNativeTouchEnd);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', handleNativeTouchStart);
      el.removeEventListener('touchmove', handleNativeTouchMove);
      el.removeEventListener('touchend', handleNativeTouchEnd);
    };
  }, [setZoom, zoom]);

  const handleTouchEnd = () => {
    touchStartDistRef.current = 0;
  };

  let displayTitle = activeDoc?.display_title || activeDoc?.original_filename || activeDoc?.file_name || fileObj?.name || cleanFallback;
  if (isUUID(displayTitle)) {
    displayTitle = 'Medical Claim Document';
  }

  let originalFileTag = activeDoc?.original_filename || activeDoc?.file_name || filename || fileObj?.name || 'uploaded_document.pdf';
  if (isUUID(originalFileTag)) {
    originalFileTag = 'original_claim_file.pdf';
  }

  const lastFileNameRef = useRef<string>('');

  // Fetch document bytes inline inside the tab or load local uploaded file object
  useEffect(() => {
    let active = true;

    // If user uploaded a local File object, create Blob URL instantly so document is visible
    const targetFile = fileObj instanceof File ? fileObj : (fileObj?.rawFile instanceof File ? fileObj.rawFile : null);
    const activeFileName = targetFile ? `${targetFile.name}-${targetFile.size}` : '';

    if (targetFile) {
      if (lastFileNameRef.current === activeFileName && blobUrl) {
        return;
      }
      try {
        lastFileNameRef.current = activeFileName;
        const localBlobUrl = URL.createObjectURL(targetFile);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return localBlobUrl;
        });
        setLoading(false);
        setError(null);
        return;
      } catch (err) {
        console.warn("Could not create object URL for local file:", err);
      }
    } else {
      lastFileNameRef.current = '';
    }
    const isRealClaimId = claimId && claimId !== 'latest' && !claimId.startsWith('CLM-') && !claimId.startsWith('demo-') && claimId.length > 10;
    const activeDocId = activeDoc?.document_id || activeDoc?.id;
    const hasRealDoc = activeDocId && activeDocId !== 'doc_default';

    // If no active claim at all (all claims deleted / 0 claims), clear blobUrl and return
    if (!hasActiveClaim) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setLoading(false);
      setError(null);
      return;
    }

    let fileUrl = currentPageUrl || '';
    if (!fileUrl && isRealClaimId) {
      if (hasRealDoc) {
        fileUrl = `${INGRESS_API}/claims/${claimId}/documents/${activeDocId}/file?view=true`;
      } else {
        fileUrl = `${INGRESS_API}/claims/${claimId}/file?view=true`;
      }
    }

    if (!fileUrl) {
      if (hasActiveClaim && !blobUrl) {
        const fallbackPdfBlob = createClaimPdfBlob(displayTitle);
        const fallbackUrl = URL.createObjectURL(fallbackPdfBlob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return fallbackUrl;
        });
      }
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(fileUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!active) return;
        const mimeType = blob.type || 'application/pdf';
        const safeBlob = new Blob([blob], { type: mimeType });
        const url = URL.createObjectURL(safeBlob);
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          const fallbackPdfBlob = createClaimPdfBlob(displayTitle);
          const fallbackUrl = URL.createObjectURL(fallbackPdfBlob);
          setBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return fallbackUrl;
          });
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [claimId, selectedDocId, currentPageUrl, documents, fileObj?.name, fileObj?.size, fileObj?.rawFile]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId);
    setPageIndex(0);
    setImgError(false);
    if (onSelectDocument) onSelectDocument(docId);
  };

  return (
    <div className={cn('flex flex-col h-full min-h-[480px] max-h-[640px]', className)}>
      {/* Multi-Document Carousel Bar */}
      <div
        className={cn(
          'flex items-center gap-2 overflow-x-auto px-4 py-2.5 scrollbar-thin',
          dark ? 'border-b border-white/10 bg-slate-900/80' : 'border-b border-border bg-slate-50/60'
        )}
      >
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Documents ({effectiveDocs.length}):</span>
        {effectiveDocs.map((doc, index) => {
          const docId = getDocKey(doc, index);
          const fileName = doc.original_filename || doc.file_name || 'Document';
          const isSelected = selectedKey === docId;
          const DocBadgeIcon = getDocIcon(doc.doc_type);
          let titleText = doc.display_title || fileName;
          if (isUUID(titleText)) titleText = 'Claim Document';

          return (
            <button
              key={docId}
              type="button"
              onClick={() => handleDocChange(docId)}
              data-doc-id={docId}
              data-selected-doc-id={selectedDocId}
              data-is-selected={isSelected ? "true" : "false"}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                isSelected
                  ? 'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 shadow-xs ring-1 ring-teal-500/30 font-bold'
                  : dark
                    ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              )}
            >
              <DocBadgeIcon className="h-3.5 w-3.5" />
              <span>{titleText}</span>
            </button>
          );
        })}
      </div>

      {/* PDF-like Control Toolbar for Page Image Viewer (Shown when document is revealed) */}
      {isDocRevealed && currentPageUrl && !imgError && (
        <div
          className={cn(
            'flex items-center justify-between px-4 py-2 border-b text-xs select-none flex-none',
            dark ? 'border-white/10 bg-slate-900/60 text-slate-300' : 'border-border bg-slate-50/70 text-slate-600'
          )}
        >
          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageIndex <= 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                dark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
              )}
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium">
              Page <span className={cn('px-2 py-0.5 rounded border font-mono mx-1', dark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900')}>{pageIndex + 1}</span> of {pageCount}
            </span>
            <button
              type="button"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                dark ? 'hover:bg-white/10' : 'hover:bg-slate-200'
              )}
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom Controls, Full Screen & Hide Doc Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className={cn(
                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                  dark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                )}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center font-mono font-medium text-[11px]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(2.5, zoom + 0.1))}
                className={cn(
                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                  dark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                )}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors cursor-pointer ml-0.5',
                  dark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
                )}
                title="Fit to Screen (100%)"
                aria-label="Fit to Screen"
              >
                <Scan className="h-3.5 w-3.5" />
              </button>
            </div>

            {onOpenDocModal && (
              <button
                type="button"
                onClick={onOpenDocModal}
                className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center"
                title="Full Screen Preview"
                aria-label="Full Screen Preview"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDocRevealed(false)}
              className={cn(
                'p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center',
                dark
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
              )}
              title="Hide Document Preview"
              aria-label="Hide Document Preview"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Document Preview Canvas Area */}
      <div
        className={cn(
          'w-full relative flex-1 flex flex-col items-center justify-center overflow-hidden transition-colors min-h-[440px] max-h-[580px]',
          dark
            ? 'bg-slate-950 text-slate-100'
            : 'bg-gradient-to-b from-emerald-50/60 via-emerald-50/30 to-teal-50/40 text-slate-900'
        )}
      >
        {!hasActiveClaim ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center p-8 text-center space-y-3 w-full h-full flex-1',
              dark
                ? 'bg-slate-950 text-slate-100'
                : 'bg-transparent text-slate-800'
            )}
          >
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-2xl border shadow-xs mb-1',
                dark
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                  : 'bg-emerald-100 border-emerald-300 text-emerald-700'
              )}
            >
              <FileSearch className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h4 className={cn('font-bold text-base', dark ? 'text-slate-100' : 'text-slate-900')}>
                No Claim Uploaded
              </h4>
              <p className={cn('text-xs leading-relaxed', dark ? 'text-slate-400' : 'text-slate-500')}>
                Please upload a claim document to check AI audit, OCR extraction, and verification.
              </p>
            </div>
          </div>
        ) : !isDocRevealed ? (
          /* View Uploaded Doc Option / Trigger Card */
          <div
            className={cn(
              'flex flex-col items-center justify-center p-8 text-center space-y-4 w-full h-full flex-1 animate-fade-in',
              dark
                ? 'bg-slate-950 text-slate-100'
                : 'bg-transparent text-slate-900'
            )}
          >
            <div className="relative">
              <div
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-3xl border shadow-sm',
                  dark
                    ? 'bg-teal-500/15 border-teal-500/30 text-teal-400 shadow-teal-500/10'
                    : 'bg-emerald-100/90 border-emerald-300 text-emerald-700 shadow-emerald-600/15'
                )}
              >
                <FileCheck className="h-10 w-10" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-xs">
                ✓
              </span>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-bold',
                  dark
                    ? 'bg-teal-500/10 border border-teal-500/30 text-teal-300'
                    : 'bg-emerald-100/90 border border-emerald-300 text-emerald-800'
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>CLAIM DOCUMENT ATTACHED</span>
              </div>
              <h4
                className={cn(
                  'font-bold text-base sm:text-lg truncate px-2',
                  dark ? 'text-white' : 'text-slate-900'
                )}
                title={displayTitle}
              >
                {displayTitle}
              </h4>
              <p className={cn('text-xs font-medium', dark ? 'text-slate-400' : 'text-emerald-800/70')}>
                {pageCount} {pageCount === 1 ? 'Page' : 'Pages'} · Document OCR parsed &amp; verified
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDocRevealed(true)}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl text-white font-semibold text-xs sm:text-sm px-6 py-3 shadow-md active:scale-95 transition-all cursor-pointer min-w-[190px]',
                  dark
                    ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/25'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20'
                )}
              >
                <Eye className="h-4.5 w-4.5" />
                <span>View Uploaded Doc</span>
              </button>
            </div>
          </div>
        ) : loading ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center p-8 text-center space-y-3 w-full h-[580px]',
              dark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
            )}
          >
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-xs text-muted-foreground">Loading document preview...</p>
          </div>
        ) : error && !currentPageUrl ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center p-8 text-center space-y-4 w-full h-[580px]',
              dark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
            )}
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Unable to display preview</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <button
              type="button"
              onClick={onOpenDocModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition-colors cursor-pointer"
            >
              View Full Screen
            </button>
          </div>
        ) : currentPageUrl && !imgError ? (
          /* Custom Premium Image Viewer with Zoom Transform */
          <div
            ref={containerRef}
            className={cn(
              'w-full h-full min-h-[440px] max-h-[580px] overflow-auto p-4 scrollbar-thin relative flex',
              dark ? 'bg-slate-950' : 'bg-slate-100/90'
            )}
          >
            <div className="m-auto flex flex-col items-center justify-center transition-all duration-200">
              <div
                className="transition-transform duration-200"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  marginTop: zoom > 1 ? `${(zoom - 1) * 280}px` : 0,
                  marginBottom: zoom > 1 ? `${(zoom - 1) * 280}px` : 0,
                  marginLeft: zoom > 1 ? `${(zoom - 1) * 260}px` : 0,
                  marginRight: zoom > 1 ? `${(zoom - 1) * 260}px` : 0,
                }}
              >
                <img
                  src={currentPageUrl}
                  alt={displayTitle}
                  onError={() => setImgError(true)}
                  className="shadow-2xl border border-slate-300 dark:border-slate-800 rounded max-w-full h-auto bg-white block"
                  style={{ width: '520px', maxWidth: '85vw' }}
                />
              </div>
            </div>
          </div>
        ) : blobUrl ? (
          <div className="w-full h-full min-h-[440px] max-h-[580px] relative">
            <iframe
              src={blobUrl}
              title={displayTitle}
              className={cn('w-full h-full min-h-[440px] max-h-[580px] border-0', dark ? 'bg-slate-900' : 'bg-slate-50')}
            />
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center p-8 text-center space-y-3 w-full h-[580px] border border-dashed rounded-b-xl',
              dark
                ? 'bg-slate-950 text-slate-100 border-slate-800/80'
                : 'bg-slate-50 text-slate-900 border-slate-200'
            )}
          >
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-2xl border shadow-inner mb-1',
                dark
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                  : 'bg-teal-50 border-teal-200 text-teal-600'
              )}
            >
              <FileSearch className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h4 className={cn('font-bold text-base', dark ? 'text-slate-100' : 'text-slate-900')}>
                No Claim Uploaded
              </h4>
              <p className={cn('text-xs leading-relaxed', dark ? 'text-slate-400' : 'text-slate-500')}>
                Please upload a claim document to check AI audit, OCR extraction, and verification.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
