import { supabase, supabaseConfigured } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('booking-form');
  const bookingFields = document.getElementById('booking-fields');
  const bookingStatus = document.getElementById('booking-status');
  const confirmation = document.getElementById('booking-confirmation');
  const confirmationLabel = document.getElementById('booking-confirmation-label');
  const confirmationCopy = document.getElementById('booking-confirmation-copy');
  const emailLink = document.getElementById('booking-email-link');
  const dashboardLink = document.getElementById('booking-dashboard-link');
  const accountLink = document.querySelector('.booking-account-prompt a');
  const submitButton = form.querySelector('button[type="submit"]');
  const preferredDate = document.getElementById('booking-date');

  if (!form || !bookingFields) return;

  const localDate = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  };
  preferredDate.min = localDate(new Date());

  const requestedService = new URLSearchParams(window.location.search).get('service');
  const serviceNames = {
    website: 'Website design',
    photography: 'Photography',
    videography: 'Videography',
    property: 'Property marketing',
    app: 'App development',
    design: 'Branding and graphic design'
  };
  const serviceOption = Array.from(document.getElementById('booking-service').options)
    .find((option) => option.textContent === serviceNames[requestedService]);
  if (serviceOption) serviceOption.selected = true;

  const formatDate = (value) => new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' })
    .format(new Date(`${value}T12:00:00`));

  const createEmailDraft = (values) => {
    const reference = `OG-REQUEST-${localDate(new Date()).replaceAll('-', '')}`;
    const subject = `Booking request ${reference} - ${values.service}`;
    const body = [
      `Booking request: ${reference}`,
      `Name: ${values.name}`,
      `Email: ${values.email}`,
      `Phone: ${values.phone}`,
      `Business: ${values.business || 'Not provided'}`,
      `Service: ${values.service}`,
      `Project: ${values.title || 'Not provided'}`,
      `Preferred date: ${formatDate(values.date)}`,
      `Preferred time: ${values.time}`,
      `Format: ${values.format}`,
      '',
      'Project details:',
      values.brief
    ].join('\n');
    emailLink.href = `mailto:oncharigroup@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    emailLink.hidden = false;
    dashboardLink.hidden = true;
    confirmationLabel.textContent = 'Email request';
    confirmationCopy.textContent = 'The site is not connected to Supabase yet, so this request will not be saved to an account. Send it by email to contact the team.';
    confirmation.hidden = false;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());

    if (!supabaseConfigured) {
      createEmailDraft(values);
      setStatus('Supabase is not configured. Use the email button to send this request.');
      return;
    }

    bookingStatus.classList.remove('is-error');
    setStatus('Checking your account…');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setStatus(sessionError.message, true);
      return;
    }
    if (!session) {
      setStatus('Sign in or create an account first. Your details are still here; return to this tab after signing in.');
      accountLink.classList.add('booking-account-required');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Saving booking…';
    const { data, error } = await supabase.from('bookings').insert({
      owner_id: session.user.id,
      service: values.service,
      project_title: values.title || null,
      business: values.business || null,
      preferred_date: values.date,
      preferred_time: values.time,
      project_format: values.format,
      brief: values.brief,
      contact_name: values.name,
      contact_email: values.email || null,
      contact_phone: values.phone
    }).select('id, reference').single();

    if (error) {
      setStatus(`Could not save the booking: ${error.message}`, true);
      submitButton.disabled = false;
      submitButton.textContent = 'Prepare booking request';
      return;
    }

    bookingFields.disabled = true;
    submitButton.textContent = 'Booking saved';
    confirmationLabel.textContent = 'Request saved';
    dashboardLink.hidden = false;
    emailLink.hidden = true;
    confirmationCopy.textContent = `Request ${data.reference} is saved to your account. The team will review the date and confirm the scope with you.`;
    confirmation.hidden = false;
    setStatus('');
    confirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  function setStatus(message, isError = false) {
    bookingStatus.textContent = message;
    bookingStatus.classList.toggle('is-error', isError);
  }
});