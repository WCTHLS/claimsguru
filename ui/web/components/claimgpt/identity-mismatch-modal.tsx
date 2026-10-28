"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface IdentityMismatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  onClearAndReupload?: () => void;
  isSubsequentUpload?: boolean;
}

export function IdentityMismatchModal({
  isOpen,
  onClose,
  message,
  onClearAndReupload,
  isSubsequentUpload = false,
}: IdentityMismatchModalProps) {
  const handleClear = () => {
    if (onClearAndReupload) onClearAndReupload();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border border-rose-500/30 shadow-2xl rounded-2xl p-6 text-slate-100">
        <DialogHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <DialogTitle className="text-center text-lg sm:text-xl font-bold text-white tracking-tight">
            {isSubsequentUpload ? "Wrong Patient Document Uploaded" : "Identity Mismatch Detected"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-slate-300 leading-relaxed">
            {isSubsequentUpload
              ? "The uploaded document belongs to a different patient and has been removed. Your existing claim and previously submitted documents are safe and active."
              : "The uploaded documents contain conflicting patient identities or date of birth details. All processing has been stopped and uploaded records removed for compliance & privacy."}
          </DialogDescription>
        </DialogHeader>

        {message && (
          <div className="my-3 p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-200 flex flex-col gap-1.5 leading-relaxed">
            <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">Verification Failure Reason</span>
            <p className="text-slate-200">{message}</p>
          </div>
        )}

        <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-400 flex items-center gap-2.5">
          <span className="font-semibold text-emerald-400 uppercase tracking-wide text-[10px] bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">Action</span>
          <span>
            {isSubsequentUpload
              ? "Please ensure the requested document belongs to the designated patient for this claim and re-upload."
              : "Please verify that all ID proofs, bills, and medical summaries belong to the same patient and re-upload."}
          </span>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2.5 mt-5">
          {isSubsequentUpload ? (
            <Button
              type="button"
              onClick={onClose}
              className="w-full h-11 text-xs font-semibold rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-900/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              Understood, Upload Correct Document
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto h-11 text-xs font-semibold rounded-xl border-slate-700 hover:bg-slate-800 text-slate-300 order-2 sm:order-1"
              >
                Dismiss
              </Button>
              <Button
                type="button"
                onClick={handleClear}
                className="w-full sm:flex-1 h-11 text-xs font-semibold rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-900/40 order-1 sm:order-2 flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear & Re-Upload Documents
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
