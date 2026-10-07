// Client-side interactions for BlogSphere

document.addEventListener('DOMContentLoaded', () => {
  // Demo login credentials quick-fill buttons
  const fillAdminBtn = document.getElementById('fill-admin-btn');
  const fillUserBtn = document.getElementById('fill-user-btn');
  const credentialInput = document.getElementById('credential');
  const passwordInput = document.getElementById('password');

  if (fillAdminBtn && credentialInput && passwordInput) {
    fillAdminBtn.addEventListener('click', () => {
      credentialInput.value = 'admin';
      passwordInput.value = 'admin123';
      credentialInput.focus();
    });
  }

  if (fillUserBtn && credentialInput && passwordInput) {
    fillUserBtn.addEventListener('click', () => {
      credentialInput.value = 'alice';
      passwordInput.value = 'user123';
      credentialInput.focus();
    });
  }

  // Delete confirmation modals / alerts
  const deleteForms = document.querySelectorAll('form[data-confirm]');
  deleteForms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      const confirmMessage = form.getAttribute('data-confirm') || 'Are you sure you want to proceed?';
      if (!window.confirm(confirmMessage)) {
        e.preventDefault();
      }
    });
  });
});
