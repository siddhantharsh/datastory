import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

// Lightweight role-based access: Viewer (default) can browse/filter/export;
// Editor (passcode-gated) can upload/delete datasets. The passcode check is
// enforced server-side (server/auth.js) — this UI just reflects that state
// and offers a way to unlock/lock it, so it can't be bypassed by hiding the
// button, only by actually going through the server's check.
export function EditorAccessControl() {
  const { isEditor, loginAsEditor, logoutEditor } = useDataset();
  const [isOpen, setIsOpen] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      await loginAsEditor(passcode);
      setPasscode('');
      setIsOpen(false);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditor) {
    return (
      <button
        onClick={logoutEditor}
        title="Switch back to Viewer mode"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-emerald-600/30 bg-emerald-50 text-emerald-700 text-xs font-mono font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
      >
        <Unlock className="w-3.5 h-3.5" />
        <span>Editor</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="Unlock Editor mode to upload/delete datasets"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#161513]/15 bg-white text-[#6f6a62] text-xs font-mono font-semibold hover:bg-[#faf9f7] transition-colors cursor-pointer"
      >
        <Lock className="w-3.5 h-3.5" />
        <span>Viewer</span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Unlock Editor Mode" maxWidth="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-[#6f6a62]">
            Viewers can browse, filter, and export data. Enter the editor passcode to also
            upload and delete datasets.
          </p>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[8px] flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <input
            type="password"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Editor passcode"
            className="w-full px-3.5 py-2 text-sm bg-white border border-[#1a1a1a]/15 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50"
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!passcode || isSubmitting}>
              {isSubmitting ? 'Checking...' : 'Unlock'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
