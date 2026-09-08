"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Eye, RefreshCw, X } from 'lucide-react';

interface DuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewExisting?: () => void;
  onConfirm?: () => void;
  onReprocess: () => void;
  isReprocessing?: boolean;
}

export function DuplicateClaimModal({ 
  isOpen, 
  onClose, 
  onViewExisting, 
  onConfirm,
  onReprocess,
  isReprocessing = false,
}: DuplicateModalProps) {
  const handleView = () => {
    if (onViewExisting) onViewExisting();
    else if (onConfirm) onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px] bg-white border border-amber-200 shadow-2xl rounded-2xl p-6 text-slate-800">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-inner">
            <AlertCircle className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Duplicate Claim Detected
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-slate-600 leading-relaxed">
            This exact document set has already been uploaded and processed into an existing claim audit report.
            <br />
            Would you like to view the existing completed claim, or re-upload and process fresh?
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <span className="font-semibold text-amber-700 uppercase tracking-wide text-[10px] bg-amber-200/60 px-1.5 py-0.5 rounded shrink-0">Note</span>
          <span>Choosing <strong>"Upload Anyway"</strong> will delete the previous duplicate claim and trigger a fresh end-to-end OCR, ICD-10 coding & adjudication run.</span>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isReprocessing}
            className="w-full sm:w-auto h-11 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 order-3 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleView}
            disabled={isReprocessing}
            className="w-full sm:flex-1 h-11 text-xs font-bold rounded-xl border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 shadow-sm flex items-center justify-center gap-1.5 order-2"
          >
            <Eye className="w-4 h-4" />
            View Existing Claim
          </Button>
          <Button
            type="button"
            onClick={onReprocess}
            disabled={isReprocessing}
            className="w-full sm:flex-1 h-11 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md flex items-center justify-center gap-1.5 order-1 sm:order-3"
          >
            <RefreshCw className={`w-4 h-4 ${isReprocessing ? 'animate-spin' : ''}`} />
            {isReprocessing ? "Processing..." : "Upload Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
