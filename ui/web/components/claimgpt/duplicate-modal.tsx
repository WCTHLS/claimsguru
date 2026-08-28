"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Files } from 'lucide-react';

interface DuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DuplicateClaimModal({ isOpen, onClose, onConfirm }: DuplicateModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[440px] bg-background/90 backdrop-blur-lg border border-amber-500/20 shadow-2xl rounded-2xl p-6">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Files className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-base sm:text-lg font-bold text-foreground">
            Duplicate Claim Detected
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm text-muted-foreground leading-relaxed">
            This exact set of documents has already been uploaded and processed under a different claim record.
            <br />
            Would you like to view the existing completed audit report?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full h-10 text-xs font-semibold rounded-lg border-border hover:bg-muted text-foreground"
          >
            Cancel / Upload New
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="w-full h-10 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-md"
          >
            Yes, View Existing Claim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
