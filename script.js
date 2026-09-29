document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const page = body.dataset.page;

  const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');
  navLinks.forEach((link) => {
    const target = link.getAttribute('href');
    if (page && target && target.includes(page)) {
      link.classList.add('active');
    }
  });

  const menuToggle = document.querySelector('.mobile-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });
  }

  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const forms = document.querySelectorAll('form[data-form="quote"]');
  forms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const message = form.querySelector('.form-message');

      if (button) {
        button.disabled = true;
        button.textContent = 'Request Sent';
      }

      if (message) {
        message.textContent = 'Thank you — your request has been received. We will get back to you shortly.';
      }
    });
  });
});
