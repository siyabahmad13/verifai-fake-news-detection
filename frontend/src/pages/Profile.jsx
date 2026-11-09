import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/profile.css';

export const Profile = () => {
  const { user } = useAuth();

  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email?.split('@')[0] ||
    'Researcher';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <header className="profile-header">
          <h1 className="profile-title">User Profile</h1>
          <p className="profile-desc">
            Account identity, organizational affiliation, and platform permissions.
          </p>
        </header>

        {/* Profile Identity Card */}
        <div className="profile-card">
          <div className="profile-identity-strip">
            <div className="profile-avatar-large" aria-hidden="true">
              {initials}
            </div>
            <div className="profile-identity-meta">
              <h2 className="profile-display-name">{displayName}</h2>
              <span className="profile-email-sub">{user?.email}</span>
              <div className="profile-badge-row">
                <span className="profile-role-badge">
                  {user?.role || 'Member'}
                </span>
                {user?.is_staff && (
                  <span className="profile-staff-badge">Staff Administrator</span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="profile-field-row">
              <span className="profile-field-label">User ID:</span>
              <code className="profile-field-code">{user?.id || '—'}</code>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Primary Email:</span>
              <span className="profile-field-val">{user?.email || '—'}</span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">First Name:</span>
              <span className="profile-field-val">{user?.first_name || '—'}</span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Last Name:</span>
              <span className="profile-field-val">{user?.last_name || '—'}</span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Institution / Organization:</span>
              <span className="profile-field-val">
                {user?.institution || user?.organization || 'Independent Researcher'}
              </span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Account Role:</span>
              <span className="profile-field-val">{user?.role || 'Member'}</span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Member Since:</span>
              <span className="profile-field-val">{formatDate(user?.date_joined)}</span>
            </div>

            <div className="profile-field-row">
              <span className="profile-field-label">Account Status:</span>
              <span className="profile-status-active">
                <span className="status-dot" /> Active Session
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
