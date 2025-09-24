import React, { useState } from 'react';
import { ChevronDown, Settings, LogOut, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function UserProfile() {
    const [open, setOpen] = useState(false);
    const [showChange, setShowChange] = useState(false);
    const navigate = useNavigate();

    function onLogout() {
        // placeholder: clear auth and reload
        try { localStorage.removeItem('token'); } catch (e) { }
        window.location.reload();
    }

    return (
        <div className="relative">
            <button
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => setOpen((s) => !s)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors duration-200 group"
            >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <span className="font-semibold text-black text-sm">A</span>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-black truncate">Alex</div>
                    <div className="text-xs text-black/60 truncate">Free Plan</div>
                </div>

                {/* Dropdown Arrow */}
                <ChevronDown
                    className={`w-4 h-4 text-black/60 transition-transform duration-200 ${open ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 animate-slide-in"
                    onMouseLeave={() => setOpen(false)}
                >
                    <button
                        role="menuitem"
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:bg-gray-50 transition-colors duration-200"
                        onClick={() => {
                            navigate('/settings');
                            setOpen(false);
                        }}
                    >
                        <Settings className="w-4 h-4" />
                        Settings
                    </button>

                    <button
                        role="menuitem"
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:bg-gray-50 transition-colors duration-200"
                        onClick={() => { setShowChange(true); setOpen(false); }}
                    >
                        <Key className="w-4 h-4" />
                        Change password
                    </button>

                    <div className="border-t border-gray-200 my-1" />

                    <button
                        role="menuitem"
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus-visible:bg-red-50 transition-colors duration-200"
                        onClick={onLogout}
                    >
                        <LogOut className="w-4 h-4" />
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
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle password change logic here
        console.log('Password change requested:', formData);
        onDone();
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                </label>
                <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                </label>
                <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                </label>
                <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <Button variant="secondary" onClick={onDone}>
                    Cancel
                </Button>
                <Button variant="primary" type="submit">
                    Change Password
                </Button>
            </div>
        </form>
    );
}
