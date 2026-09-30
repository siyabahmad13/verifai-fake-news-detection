/**
 * VerifAI — Authentication Controller
 * Handles user login, simple registration (Name, Email, Password), and session routing.
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
    if (alertText) {
      alertText.textContent = 'Please sign in or create an account to access News Test.';
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
  const validTargets = ['detector.html', 'history.html'];
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

    try {
      const res = await window.VerifaiAPI.login(email, password);
      showToast('Signed in successfully.', 'success');
      const destination = getSafeRedirectDestination();
      setTimeout(() => {
        window.location.href = destination;
      }, 350);
    } catch (err) {
      let message = err.message || 'Login failed. Please check your credentials.';
      if (err.data && err.data.errors) {
        const firstKey = Object.keys(err.data.errors)[0];
        const firstVal = err.data.errors[firstKey];
        message = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      } else if (err.data && err.data.message) {
        message = err.data.message;
      }
      showToast(message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  });
}

function initSignupForm() {
  const signupForm = document.getElementById('signupForm');
  const nameInput = document.getElementById('signupName');
  const emailInput = document.getElementById('signupEmail');
  const passwordInput = document.getElementById('signupPassword');
  const submitBtn = document.getElementById('submitSignupBtn');

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!name || !email || !password) {
      showToast('Please enter your name, email, and password.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
    }

    try {
      const res = await window.VerifaiAPI.register({
        name: name,
        email: email,
        password: password,
      });

      showToast('Account created successfully.', 'success');
      const destination = getSafeRedirectDestination();
      setTimeout(() => {
        window.location.href = destination;
      }, 350);
    } catch (err) {
      let message = err.message || 'Registration failed.';
      if (err.data && err.data.errors) {
        const firstKey = Object.keys(err.data.errors)[0];
        const firstVal = err.data.errors[firstKey];
        message = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      } else if (err.data && err.data.message) {
        message = err.data.message;
      }
      showToast(message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
      }
    }
  });
}
