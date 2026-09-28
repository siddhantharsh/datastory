import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle, Users } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

// Owner-only: grant/revoke view access to a specific registered user by
// email. Deliberately simple — no public share links, no invite-by-email for
// people without an account yet (see CLAUDE.md roadmap for why).
export function ShareModal({ isOpen, onClose, datasetId, datasetName }) {
  const { shareDataset, getDatasetShares, revokeDatasetShare } = useDataset();
  const [email, setEmail] = useState('');
  const [shares, setShares] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  const loadShares = async () => {
    if (!datasetId) return;
    try {
      setIsLoadingShares(true);
      setShares(await getDatasetShares(datasetId));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingShares(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadShares();
      setEmail('');
      setError(null);
      setMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, datasetId]);

  const handleShare = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);
      const result = await shareDataset(datasetId, email);
      setMessage(result.message);
      setEmail('');
      await loadShares();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (userId) => {
    try {
      setError(null);
      await revokeDatasetShare(datasetId, userId);
      await loadShares();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${datasetName}"`} maxWidth="max-w-md">
      <div className="space-y-4">
        <form onSubmit={handleShare} className="flex gap-2">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Their account email"
            className="flex-1 px-3.5 py-2 text-sm bg-white border border-[#1a1a1a]/15 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50"
          />
          <Button type="submit" variant="primary" disabled={!email || isSubmitting}>
            {isSubmitting ? '...' : 'Share'}
          </Button>
        </form>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[8px] flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && !error && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-[8px] text-sm text-emerald-700">
            {message}
          </div>
        )}

        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Has access ({shares.length})</span>
          </div>
          {isLoadingShares ? (
            <p className="text-xs text-[#9b958c]">Loading...</p>
          ) : shares.length === 0 ? (
            <p className="text-xs text-[#9b958c]">Only you can see this dataset right now.</p>
          ) : (
            <div className="space-y-1.5">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-3 py-2 bg-[#faf9f7] border border-[#1a1a1a]/8 rounded-[8px] text-xs"
                >
                  <span className="truncate">{s.displayName || s.email}</span>
                  <button
                    onClick={() => handleRevoke(s.id)}
                    className="text-red-600 hover:underline cursor-pointer shrink-0 ml-2 font-semibold"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
