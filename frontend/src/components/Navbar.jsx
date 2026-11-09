import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/navbar.css';

export const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Text Logo */}
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          VerifAI
        </Link>

        {/* Mobile Hamburger Toggle */}
        <button
          className={`navbar-toggle ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span className="toggle-line" />
          <span className="toggle-line" />
        </button>

        {/* Navigation Links */}
        <nav className={`navbar-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="nav-links">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
              end
            >
              Home
            </NavLink>
            {isAuthenticated && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={closeMenu}
              >
                Dashboard
              </NavLink>
            )}
            <NavLink
              to="/detector"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              News Detector
            </NavLink>
            {isAuthenticated && (
              <NavLink
                to="/history"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={closeMenu}
              >
                History
              </NavLink>
            )}
            <NavLink
              to="/about"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              About
            </NavLink>
            <NavLink
              to="/privacy"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              Privacy
            </NavLink>
            <NavLink
              to="/terms"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={closeMenu}
            >
              Terms
            </NavLink>
          </div>

          {/* Auth Action Buttons */}
          <div className="nav-auth">
            {isAuthenticated ? (
              <div className="auth-user-group">
                {user?.email && (
                  <NavLink
                    to="/profile"
                    className="user-email-badge"
                    title="View Profile"
                    onClick={closeMenu}
                  >
                    {user.full_name || user.email.split('@')[0]}
                  </NavLink>
                )}
                <button type="button" onClick={handleLogout} className="btn-nav-logout">
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-anon-group">
                <NavLink to="/login" className="btn-nav-login" onClick={closeMenu}>
                  Login
                </NavLink>
                <NavLink to="/signup" className="btn-nav-signup" onClick={closeMenu}>
                  Sign Up
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
