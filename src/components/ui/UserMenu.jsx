import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [showChange, setShowChange] = useState(false);

  function onLogout() {
    // placeholder: clear auth and reload
    try { localStorage.removeItem('token'); } catch (e) {}
    window.location.reload();
  }

  return (
    <div className="relative">
      <button aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((s) => !s)} className="w-10 h-10 rounded-xl bg-[var(--bg-muted)] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
        <span className="font-semibold">A</span>
      </button>

      {open && (
        <div role="menu" className="fixed right-6 top-16 z-50 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-md py-2 animate-slide-in" onMouseLeave={() => setOpen(false)}>
          <button role="menuitem" className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-muted)] focus-visible:bg-[var(--bg-muted)]" onClick={() => { /* open profile/settings */ setOpen(false); }}>
            Settings
          </button>
          <button role="menuitem" className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-muted)] focus-visible:bg-[var(--bg-muted)]" onClick={() => { setShowChange(true); setOpen(false); }}>
            Change password
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button role="menuitem" className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-[var(--bg-muted)] focus-visible:bg-[var(--bg-muted)]" onClick={onLogout}>
            Logout
          </button>
        </div>
      )}

      <Modal open={showChange} onOpenChange={setShowChange} title="Change password">
        <ChangePasswordForm onDone={() => setShowChange(false)} />
      </Modal>
    </div>
  );
}

function ChangePasswordForm({ onDone }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (newPw.length < 8) return setError('New password must be at least 8 characters');
    if (newPw !== confirm) return setError('Passwords do not match');
    setSaving(true);
    // placeholder: call API
    setTimeout(() => { setSaving(false); onDone(); }, 700);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-sm">Current password</label>
        <input type="password" value={oldPw} onChange={(e)=>setOldPw(e.target.value)} className="w-full mt-1 p-2 border border-[var(--border)] rounded-md" />
      </div>
      <div>
        <label className="text-sm">New password</label>
        <input type="password" value={newPw} onChange={(e)=>setNewPw(e.target.value)} className="w-full mt-1 p-2 border border-[var(--border)] rounded-md" />
      </div>
      <div>
        <label className="text-sm">Confirm password</label>
        <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} className="w-full mt-1 p-2 border border-[var(--border)] rounded-md" />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onDone}>Cancel</Button>
        <Button variant="primary" type="submit" className="" disabled={saving}>{saving ? 'Saving...' : 'Change'}</Button>
      </div>
    </form>
  );
}
