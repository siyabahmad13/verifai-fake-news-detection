/**
 * VerifAI — Authentication Controller
 * Handles organization login, registration, and session routing.
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already authenticated, redirect to destination
  if (window.isAuthenticated && window.isAuthenticated()) {
    const destination = getSafeRedirectDestination();
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
    alertEl.style.display = 'block';
    if (alertText && redirectTarget) {
      const pageNames = {
        'detector.html': 'News Article Detector',
        'dashboard.html': 'Dashboard',
        'history.html': 'Prediction History'
      };
      const pageTitle = pageNames[redirectTarget] || 'Protected Workspace';
      alertText.textContent = `Please sign in or create an account to access ${pageTitle}.`;
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
  return (redirectTarget && validTargets.includes(redirectTarget)) ? redirectTarget : 'detector.html';
}

function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const togglePassBtn = document.getElementById('togglePasswordBtn');
  const passwordInput = document.getElementById('passwordInput');
  const submitBtn = document.getElementById('submitLoginBtn');

  // Toggle password visibility
  togglePassBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassBtn.textContent = isPassword ? 'Hide' : 'Show';
  });

  // Handle Login Submit
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput')?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
    }

    // Attempt backend API login
    let backendUser = null;
    if (window.VerifaiAPI && typeof window.VerifaiAPI.login === 'function') {
      try {
        const res = await window.VerifaiAPI.login(email, password);
        if (res?.data?.user) {
          backendUser = res.data.user;
        }
      } catch (err) {
        console.warn('Backend login message:', err.message);
        if (err.data && err.data.errors) {
          const firstErr = Object.values(err.data.errors)[0];
          showToast(Array.isArray(firstErr) ? firstErr[0] : (err.message || 'Login failed'), 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
          }
          return;
        }
      }
    }

    const userName = backendUser?.full_name || email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const user = backendUser || {
      name: userName,
      email: email,
      organization: 'Organization Member',
      institution: 'Organization Member',
      role: 'Member',
      joined: '2026-09'
    };

    setMockUser(user);
    showToast(`Signed in as ${user.name || user.email}.`, 'success');

    const destination = getSafeRedirectDestination();
    setTimeout(() => {
      window.location.href = destination;
    }, 350);
  });
}

function initSignupForm() {
  const signupForm = document.getElementById('signupForm');
  const passwordInput = document.getElementById('signupPassword');
  const confirmInput = document.getElementById('signupConfirmPassword');
  const submitBtn = document.getElementById('submitSignupBtn');

  // Handle Signup Submit
  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const organization = document.getElementById('signupOrganization')?.value.trim();
    const name = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = passwordInput?.value;
    const confirm = confirmInput?.value;

    if (!organization || !name || !email || !password || !confirm) {
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

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
    }

    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Attempt backend registration
    let backendUser = null;
    if (window.VerifaiAPI && typeof window.VerifaiAPI.register === 'function') {
      try {
        const res = await window.VerifaiAPI.register({
          email: email,
          password: password,
          confirm_password: confirm,
          organization: organization,
          institution: organization,
          first_name: firstName,
          last_name: lastName
        });
        if (res?.data?.user) {
          backendUser = res.data.user;
        }
      } catch (err) {
        console.warn('Backend register message:', err.message);
        if (err.data && err.data.errors) {
          const firstErr = Object.values(err.data.errors)[0];
          showToast(Array.isArray(firstErr) ? firstErr[0] : (err.message || 'Registration failed'), 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
          }
          return;
        }
      }
    }

    const user = backendUser || {
      name: name,
      email: email,
      organization: organization,
      institution: organization,
      role: 'Member',
      joined: new Date().toISOString().slice(0, 7)
    };

    setMockUser(user);
    showToast('Account created successfully.', 'success');

    const destination = getSafeRedirectDestination();
    setTimeout(() => {
      window.location.href = destination;
    }, 450);
  });
}
