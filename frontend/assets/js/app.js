/**
 * VERIFAI — Global Application Controller
 * Handles Navigation, Toast notifications, Modal dialogs, and Mock User Session.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAuthUI();
  initModalBackdrops();
});

/* ==========================================================================
   Navigation & Mobile Menu
   ========================================================================== */

function initNavigation() {
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navMenu = document.getElementById('navMenu');

  if (mobileBtn && navMenu) {
    mobileBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const isOpen = navMenu.classList.contains('open');
      mobileBtn.setAttribute('aria-expanded', isOpen);
    });
  }

  // Highlight active link based on current path
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Protected Route Interceptor: Block unauthenticated clicks on detector/dashboard/history
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Check if target points to a protected route
    const protectedPages = ['detector.html', 'dashboard.html', 'history.html'];
    const matched = protectedPages.find(page => {
      return href === page || href.endsWith('/' + page) || href.startsWith(page + '?') || href.startsWith(page + '#');
    });

    if (matched && !isAuthenticated()) {
      e.preventDefault();
      showToast('Please sign in or register to access this section.', 'info');
      setTimeout(() => {
        window.location.href = `login.html?redirect=${encodeURIComponent(matched)}&auth=required`;
      }, 250);
    }
  });
}

/**
 * Check if the user has an active session (mock session, JWT token, or user object)
 */
function isAuthenticated() {
  return !!(
    localStorage.getItem(AUTH_STORAGE_KEY) ||
    localStorage.getItem('verifai_access_token') ||
    localStorage.getItem('verifai_user')
  );
}

window.isAuthenticated = isAuthenticated;

/* ==========================================================================
   Toast Notifications System
   ========================================================================== */

function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none;border:none;color:inherit;cursor:pointer;opacity:0.75;font-size:16px;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'opacity 200ms, transform 200ms';
      setTimeout(() => toast.remove(), 200);
    }
  }, duration);
}

// Expose toast globally
window.showToast = showToast;

/* ==========================================================================
   Modal Dialog Utilities
   ========================================================================== */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function initModalBackdrops() {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  // ESC key closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModalElem = document.querySelector('.modal-backdrop.open');
      if (openModalElem) {
        openModalElem.classList.remove('open');
        document.body.style.overflow = '';
      }
    }
  });
}

window.openModal = openModal;
window.closeModal = closeModal;

/* ==========================================================================
   Mock User Authentication & Session State
   ========================================================================== */

const AUTH_STORAGE_KEY = 'verifai_mock_user';

function getMockUser() {
  const data = localStorage.getItem(AUTH_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

function setMockUser(user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  initAuthUI();
}

function clearMockUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem('verifai_access_token');
  localStorage.removeItem('verifai_refresh_token');
  localStorage.removeItem('verifai_user');
  initAuthUI();
}

function initAuthUI() {
  const user = getMockUser();
  const authContainer = document.getElementById('navAuthContainer');

  if (!authContainer) return;

  if (user) {
    authContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <a href="dashboard.html" class="btn btn-secondary btn-sm" title="Dashboard">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>${user.name.split(' ')[0]}</span>
        </a>
        <button id="logoutBtn" class="btn btn-ghost btn-sm" title="Sign Out">Sign Out</button>
      </div>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearMockUser();
      showToast('You have signed out successfully.', 'info');
      setTimeout(() => {
        const currentPath = window.location.pathname.split('/').pop() || '';
        const protectedPages = ['detector.html', 'dashboard.html', 'history.html'];
        if (protectedPages.includes(currentPath)) {
          window.location.href = 'index.html';
        }
      }, 400);
    });
  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="btn btn-ghost btn-sm">Sign In</a>
      <a href="signup.html" class="btn btn-primary btn-sm">Get Started</a>
    `;
  }
}

window.getMockUser = getMockUser;
window.setMockUser = setMockUser;
window.clearMockUser = clearMockUser;

/* ==========================================================================
   Scan History Persistence in localStorage
   ========================================================================== */

const HISTORY_STORAGE_KEY = 'verifai_scan_history';

function getScanHistory() {
  const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse scan history', e);
    }
  }
  return [];
}

function saveScanRecord(record) {
  const history = getScanHistory();
  history.unshift(record); // Add to beginning
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  return history;
}

function deleteScanRecord(id) {
  let history = getScanHistory();
  history = history.filter(item => item.id !== id);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  return history;
}

function clearAllScans() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]));
  return [];
}

window.getScanHistory = getScanHistory;
window.saveScanRecord = saveScanRecord;
window.deleteScanRecord = deleteScanRecord;
window.clearAllScans = clearAllScans;
