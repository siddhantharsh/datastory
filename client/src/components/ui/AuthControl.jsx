import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { User, LogOut, AlertCircle } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

// Real per-user login/signup, replacing the earlier shared-passcode
// Editor/Viewer gate. Logged out: browse public/sample datasets only. Logged
// in: upload your own, and see anything shared with you.
export function AuthControl() {
  const { user, signup, login, logout } = useDataset();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      if (mode === 'signup') {
        await signup(email, password, displayName);
      } else {
        await login(email, password);
      }
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return (
      <button
        onClick={logout}
        title="Log out"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] text-xs font-mono font-semibold hover:text-[var(--ink)] transition-colors cursor-pointer"
      >
        <User className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">{user.displayName || user.email}</span>
        <LogOut className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] text-xs font-mono font-semibold hover:text-[var(--ink)] transition-colors cursor-pointer"
      >
        <User className="w-3.5 h-3.5" />
        <span>Log in</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); resetForm(); }}
        title={mode === 'signup' ? 'Create an account' : 'Log in'}
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 p-1 bg-[#1a1a1a]/5 rounded-[8px]">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold cursor-pointer transition-colors ${mode === 'login' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-[#6b6b6b]'}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-1.5 rounded-[6px] text-xs font-semibold cursor-pointer transition-colors ${mode === 'signup' ? 'bg-white shadow-sm text-[#1a1a1a]' : 'text-[#6b6b6b]'}`}
            >
              Sign up
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[8px] flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name (optional)"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#1a1a1a]/15 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50"
            />
          )}
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3.5 py-2 text-sm bg-white border border-[#1a1a1a]/15 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50"
          />
          <input
            type="password"
            required
            minLength={mode === 'signup' ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
            className="w-full px-3.5 py-2 text-sm bg-white border border-[#1a1a1a]/15 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50"
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!email || !password || isSubmitting}>
              {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
