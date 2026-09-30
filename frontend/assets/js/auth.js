/**
 * VERIFAI — Authentication Controller (Mock Auth, Form Validation & Route Protection)
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already authenticated, redirect to destination
  if (window.isAuthenticated && window.isAuthenticated()) {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTarget = urlParams.get('redirect');
    const validTargets = ['detector.html', 'dashboard.html', 'history.html'];
    const destination = (redirectTarget && validTargets.includes(redirectTarget)) ? redirectTarget : 'dashboard.html';
    window.location.replace(destination);
    return;
  }

  checkRedirectParams();
  initLoginForm();
  initSignupForm();
});

/**
 * Handle incoming redirect queries and display notification banners if access was restricted
 */
function checkRedirectParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');
  const isAuthRequired = urlParams.get('auth') === 'required';
  const alertEl = document.getElementById('authRequiredAlert');
  const alertText = document.getElementById('authAlertText');

  if ((isAuthRequired || redirectTarget) && alertEl) {
    alertEl.style.display = 'flex';
    if (alertText && redirectTarget) {
      const pageNames = {
        'detector.html': 'Forensic Detector Workbench',
        'dashboard.html': 'Analytics Dashboard',
        'history.html': 'Verification Audit History'
      };
      const pageTitle = pageNames[redirectTarget] || 'Protected Workspace';
      alertText.textContent = `Please sign in or create an account to access the ${pageTitle}.`;
    }
  }

  // Update cross-links between Login and Signup to preserve destination
  if (redirectTarget) {
    const signupLinks = document.querySelectorAll('a[href^="signup.html"]');
    signupLinks.forEach(link => {
      link.href = `signup.html?redirect=${encodeURIComponent(redirectTarget)}&auth=required`;
    });

    const loginLinks = document.querySelectorAll('a[href^="login.html"]');
    loginLinks.forEach(link => {
      link.href = `login.html?redirect=${encodeURIComponent(redirectTarget)}&auth=required`;
    });
  }
}

function getSafeRedirectDestination() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');
  const validTargets = ['detector.html', 'dashboard.html', 'history.html'];
  return (redirectTarget && validTargets.includes(redirectTarget)) ? redirectTarget : 'dashboard.html';
}

function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const demoFillBtn = document.getElementById('demoFillBtn');
  const togglePassBtn = document.getElementById('togglePasswordBtn');
  const passwordInput = document.getElementById('passwordInput');

  // Toggle password visibility
  togglePassBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassBtn.textContent = isPassword ? 'Hide' : 'Show';
  });

  // Demo auto-fill
  demoFillBtn?.addEventListener('click', () => {
    const emailInput = document.getElementById('emailInput');
    if (emailInput) emailInput.value = 'researcher@verifai.org';
    if (passwordInput) passwordInput.value = 'VerifAI_2026!Secure';
    showToast('Demo credentials filled.', 'info');
  });

  // Handle Login Submit
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput')?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      showToast('Please fill in both email and password.', 'error');
      return;
    }

    // Attempt backend API login if available
    if (window.VerifaiAPI && typeof window.VerifaiAPI.login === 'function') {
      try {
        await window.VerifaiAPI.login(email, password);
      } catch (err) {
        // Fallback to client mock session if backend is offline
        console.warn('Backend login fallback to local session:', err.message);
      }
    }

    // Set local session
    const user = {
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: email,
      institution: 'University Verification Lab',
      role: 'Research Analyst',
      joined: '2026-09'
    };

    setMockUser(user);
    showToast(`Welcome back, ${user.name}!`, 'success');

    const destination = getSafeRedirectDestination();
    setTimeout(() => {
      window.location.href = destination;
    }, 450);
  });
}

function initSignupForm() {
  const signupForm = document.getElementById('signupForm');
  const passwordInput = document.getElementById('signupPassword');
  const confirmInput = document.getElementById('signupConfirmPassword');
  const togglePassBtn = document.getElementById('toggleSignupPasswordBtn');

  // Password strength meter
  passwordInput?.addEventListener('input', () => {
    const val = passwordInput.value;
    updateStrengthMeter(val);
  });

  // Toggle password
  togglePassBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassBtn.textContent = isPassword ? 'Hide' : 'Show';
  });

  // Handle Signup Submit
  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const institution = document.getElementById('signupInstitution')?.value.trim();
    const password = passwordInput?.value;
    const confirm = confirmInput?.value;
    const terms = document.getElementById('termsCheck')?.checked;

    if (!name || !email || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    if (password !== confirm) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (!terms) {
      showToast('Please agree to the Academic Research & Data Integrity Terms.', 'error');
      return;
    }

    // Attempt backend registration if API available
    if (window.VerifaiAPI && typeof window.VerifaiAPI.register === 'function') {
      try {
        await window.VerifaiAPI.register({
          username: email.split('@')[0],
          email: email,
          password: password,
          first_name: name.split(' ')[0] || '',
          last_name: name.split(' ').slice(1).join(' ') || ''
        });
      } catch (err) {
        console.warn('Backend register fallback to local session:', err.message);
      }
    }

    const user = {
      name: name,
      email: email,
      institution: institution || 'Academic Researcher',
      role: 'Analyst',
      joined: new Date().toISOString().slice(0, 7)
    };

    setMockUser(user);
    showToast('Account registered successfully!', 'success');

    const destination = getSafeRedirectDestination();
    setTimeout(() => {
      window.location.href = destination;
    }, 550);
  });
}

function updateStrengthMeter(password) {
  const bars = [
    document.getElementById('strBar1'),
    document.getElementById('strBar2'),
    document.getElementById('strBar3'),
    document.getElementById('strBar4')
  ];

  if (!bars[0]) return;

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const colors = ['#E7E7E3', '#EF4444', '#F59E0B', '#10B981', '#059669'];

  bars.forEach((bar, idx) => {
    if (bar) {
      bar.style.backgroundColor = (idx < score) ? colors[score] : '#E7E7E3';
    }
  });
}
