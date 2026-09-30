/**
 * VERIFAI — Global Application Controller
 * Handles Navigation, Toast notifications, Modal dialogs, and Session State.
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

  // Protected Route Interceptor: Block unauthenticated clicks on detector/history
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Check if target points to a protected route
    const protectedPages = ['detector.html', 'history.html'];
    const matched = protectedPages.find(page => {
      return href === page || href.endsWith('/' + page) || href.startsWith(page + '?') || href.startsWith(page + '#');
    });

    if (matched && !isAuthenticated()) {
      e.preventDefault();
      showToast('Please sign in to access News Test.', 'info');
      setTimeout(() => {
        window.location.href = `login.html?redirect=${encodeURIComponent(matched)}&auth=required`;
      }, 250);
    }
  });
}

/**
 * Check if user is authenticated via JWT access token and user record
 */
function isAuthenticated() {
  return !!(
    localStorage.getItem('verifai_access_token') &&
    localStorage.getItem('verifai_user')
  );
}

function getCurrentUser() {
  const data = localStorage.getItem('verifai_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

async function logoutUser() {
  const refresh = localStorage.getItem('verifai_refresh_token');
  const access = localStorage.getItem('verifai_access_token');
  
  if (refresh && access) {
    try {
      await fetch('http://localhost:8000/api/auth/logout/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`
        },
        body: JSON.stringify({ refresh })
      });
    } catch (e) {
      // Ignore network errors during signout
    }
  }

  localStorage.removeItem('verifai_access_token');
  localStorage.removeItem('verifai_refresh_token');
  localStorage.removeItem('verifai_user');
  localStorage.removeItem('verifai_mock_user');
  
  showToast('You have signed out successfully.', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 300);
}

function initAuthUI() {
  const user = getCurrentUser();
  const authContainer = document.getElementById('navAuthContainer');

  if (!authContainer) return;

  if (isAuthenticated() && user) {
    authContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <a href="history.html" class="btn btn-secondary btn-sm" title="History">History</a>
        <button id="logoutBtn" class="btn btn-ghost btn-sm" title="Sign Out">Sign Out</button>
      </div>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  } else {
    authContainer.innerHTML = `
      <a href="login.html" class="btn btn-ghost btn-sm">Login</a>
      <a href="signup.html" class="btn btn-primary btn-sm">Sign Up</a>
    `;
  }
}

window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.logoutUser = logoutUser;
window.initAuthUI = initAuthUI;

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
