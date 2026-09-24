/**
 * VERIFAI — Authentication Controller (Mock Auth & Form Validation)
 */

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initSignupForm();
});

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
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput')?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      showToast('Please fill in both email and password.', 'error');
      return;
    }

    // Mock successful authentication
    const user = {
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: email,
      institution: 'University Verification Lab',
      role: 'Research Analyst',
      joined: '2026-09'
    };

    setMockUser(user);
    showToast(`Welcome back, ${user.name}!`, 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 600);
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
  signupForm?.addEventListener('submit', (e) => {
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

    const user = {
      name: name,
      email: email,
      institution: institution || 'Academic Researcher',
      role: 'Analyst',
      joined: new Date().toISOString().slice(0, 7)
    };

    setMockUser(user);
    showToast('Account registered successfully!', 'success');

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 700);
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
