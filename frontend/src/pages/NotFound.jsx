import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages.css';

export const NotFound = () => {
  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <span className="notfound-code">404</span>
        <h1 className="notfound-title">Page Not Found</h1>
        <p className="notfound-desc">
          The requested page does not exist or may have been moved.
        </p>
        <Link to="/" className="btn-primary" style={{ marginTop: '8px' }}>
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
