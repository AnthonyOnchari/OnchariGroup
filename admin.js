import { jsPDF } from 'jspdf';
import { supabase, supabaseConfigured } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const setupNotice = document.getElementById('admin-setup-notice');
  const accessNotice = document.getElementById('admin-access-notice');
  const workspace = document.getElementById('admin-workspace');
  const bookingList = document.getElementById('admin-bookings');
  const detail = document.getElementById('admin-detail');
  const emptySelection = document.getElementById('admin-empty-selection');
  const status = document.getElementById('admin-status');
  const estimateForm = document.getElementById('estimate-form');
  const invoiceForm = document.getElementById('invoice-form');
  const paymentForm = document.getElementById('payment-form');
  const deliverableForm = document.getElementById('deliverable-form');
  const messageForm = document.getElementById('admin-message-form');
  const messages = document.getElementById('admin-messages');
  let session = null;
  let activeBooking = null;
  let bookingRows = [];
  let messageChannel = null;

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  };

  const appendText = (parent, tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  };

  const formatDate = (value) => value
    ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
    : 'To be agreed';

  const formatMoney = (value) => new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', maximumFractionDigits: 0
  }).format(value);

  const makeDocumentNumber = (booking, kind) => `OG-${booking.reference}-${kind}-${Date.now().toString(36).toUpperCase()}`;

  const createPdfBlob = ({ booking, type, docNumber, amount, dueDate, paymentReference, paymentDate }) => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 18;
    const usableWidth = pageWidth - margin * 2;
    let y = 25;
    const titles = { estimate: 'ESTIMATED QUOTE', invoice: 'INVOICE', receipt: 'PAYMENT RECEIPT' };
    const writeLabel = (label, value) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, margin, y);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(String(value || '-'), usableWidth - 42);
      pdf.text(lines, margin + 42, y);
      y += Math.max(7, lines.length * 5);
    };

    pdf.setFillColor(15, 107, 92);
    pdf.rect(0, 0, pageWidth, 5, 'F');
    pdf.setTextColor(11, 79, 68);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('ONCHARI GROUP', margin, y);
    pdf.setFontSize(10);
    pdf.text(titles[type], pageWidth - margin, y, { align: 'right' });
    y += 7;
    pdf.setTextColor(80, 90, 96);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Utawala, Nairobi, Kenya · oncharigroup@gmail.com · +254 750 600 715', margin, y);
    y += 14;
    pdf.setDrawColor(220, 226, 222);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;
    pdf.setTextColor(26, 29, 35);
    pdf.setFontSize(10);
    writeLabel('DOCUMENT NO.', docNumber);
    writeLabel('BOOKING REF.', booking.reference);
    writeLabel('ISSUED', new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date()));
    writeLabel('CUSTOMER', booking.contact_name);
    writeLabel('EMAIL / PHONE', `${booking.contact_email || '-'} · ${booking.contact_phone}`);
    writeLabel('SERVICE', booking.service);
    writeLabel('PROJECT', booking.project_title || booking.service);
    writeLabel('PREFERRED DATE', formatDate(booking.preferred_date));
    if (type === 'estimate') writeLabel('VALID UNTIL', formatDate(dueDate));
    if (type === 'invoice') writeLabel('PAYMENT DUE', formatDate(dueDate));
    if (type === 'receipt') {
      writeLabel('PAYMENT REF.', paymentReference);
      writeLabel('PAYMENT DATE', formatDate(paymentDate));
    }
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROJECT SCOPE', margin, y);
    y += 6;
    pdf.setFont('helvetica', 'normal');
    const scopeLines = pdf.splitTextToSize(booking.brief, usableWidth);
    pdf.text(scopeLines, margin, y);
    y += scopeLines.length * 5 + 12;
    pdf.setDrawColor(220, 226, 222);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 11;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(`TOTAL: ${formatMoney(amount)}`, pageWidth - margin, y, { align: 'right' });
    y += 14;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 90, 96);
    const note = type === 'estimate'
      ? 'Estimate only. Work and dates are confirmed after written acceptance and invoice.'
      : type === 'invoice'
        ? 'Please contact Onchari Group if any invoice detail needs correction.'
        : 'Payment recorded by Onchari Group staff. Keep this receipt for your records.';
    const noteLines = pdf.splitTextToSize(note, usableWidth);
    pdf.text(noteLines, margin, y);
    return pdf.output('blob');
  };

  const uploadPdf = async (ownerId, bookingId, docNumber, blob) => {
    const path = `${ownerId}/${bookingId}/${docNumber}.pdf`;
    const { error } = await supabase.storage.from('customer-documents').upload(path, blob, {
      contentType: 'application/pdf',
      upsert: false
    });
    if (error) throw error;
    return path;
  };

  const renderDocumentHistory = () => {
    const container = document.getElementById('admin-document-history');
    container.replaceChildren();
    appendText(container, 'h4', '', 'Issued documents');
    if (!activeBooking.documents?.length) {
      appendText(container, 'p', 'account-empty-note', 'No estimate or invoice has been issued yet.');
      return;
    }
    activeBooking.documents.forEach((item) => {
      const label = `${item.doc_type.toUpperCase()} · ${item.doc_number} · ${formatMoney(item.amount)} · ${item.status}`;
      appendText(container, 'p', 'admin-document-row', label);
    });
  };

  const renderBookingList = () => {
    bookingList.replaceChildren();
    if (!bookingRows.length) {
      appendText(bookingList, 'p', 'account-empty-note', 'No booking requests yet.');
      return;
    }
    bookingRows.forEach((booking) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `admin-booking-button${activeBooking?.id === booking.id ? ' is-active' : ''}`;
      const title = appendText(button, 'strong', '', booking.project_title || booking.service);
      title.title = booking.project_title || booking.service;
      appendText(button, 'span', '', `${booking.contact_name} · ${booking.service}`);
      appendText(button, 'span', 'booking-status-pill', booking.status.replaceAll('_', ' '));
      button.addEventListener('click', () => selectBooking(booking));
      bookingList.appendChild(button);
    });
  };

  const selectBooking = async (booking) => {
    activeBooking = booking;
    renderBookingList();
    emptySelection.hidden = true;
    detail.hidden = false;
    document.getElementById('admin-booking-summary').replaceChildren();
    const summary = document.getElementById('admin-booking-summary');
    appendText(summary, 'span', 'booking-step-label', `${booking.reference} · ${booking.status.replaceAll('_', ' ')}`);
    appendText(summary, 'h3', '', booking.project_title || booking.service);
    appendText(summary, 'p', '', `${booking.contact_name} · ${booking.contact_email} · ${booking.contact_phone}`);
    appendText(summary, 'p', '', `${booking.service} · ${formatDate(booking.preferred_date)} · ${booking.preferred_time} · ${booking.project_format}`);
    appendText(summary, 'p', 'admin-brief', booking.brief);
    renderDocumentHistory();

    const hasAcceptedEstimate = booking.documents?.some((item) => item.doc_type === 'estimate' && item.status === 'accepted');
    const activeEstimate = booking.documents?.some((item) => item.doc_type === 'estimate' && item.status !== 'void');
    const invoice = booking.documents?.find((item) => item.doc_type === 'invoice' && item.status === 'issued');
    const isPaid = booking.documents?.some((item) => item.doc_type === 'invoice' && item.status === 'paid');
    estimateForm.hidden = Boolean(activeEstimate);
    invoiceForm.hidden = !hasAcceptedEstimate || Boolean(invoice) || isPaid;
    paymentForm.hidden = !invoice;
    document.getElementById('invoice-amount').value = hasAcceptedEstimate
      ? String(booking.documents.find((item) => item.doc_type === 'estimate' && item.status === 'accepted').amount)
      : '';
    document.getElementById('invoice-due-date').value = invoice?.due_at || '';
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', booking.owner_id).maybeSingle();
    document.getElementById('admin-conversation-title').textContent = profile?.display_name
      ? `Project conversation · ${profile.display_name}`
      : 'Project conversation';
    await renderMessages();
    if (messageChannel) await supabase.removeChannel(messageChannel);
    messageChannel = supabase.channel(`staff-messages-${booking.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'booking_messages', filter: `booking_id=eq.${booking.id}`
      }, renderMessages)
      .subscribe();
  };

  const loadBookings = async () => {
    setStatus('Loading booking requests…');
    const { data, error } = await supabase
      .from('bookings')
      .select('id, owner_id, reference, service, project_title, business, preferred_date, preferred_time, project_format, brief, contact_name, contact_email, contact_phone, status, created_at, documents(id, doc_number, doc_type, status, amount, currency, due_at, file_path, payment_reference, paid_at)')
      .order('created_at', { ascending: false });
    if (error) {
      setStatus(`Could not load bookings: ${error.message}`, true);
      return;
    }
    bookingRows = data || [];
    if (activeBooking) activeBooking = bookingRows.find((item) => item.id === activeBooking.id) || null;
    renderBookingList();
    setStatus(`${bookingRows.length} booking${bookingRows.length === 1 ? '' : 's'} loaded.`);
    if (activeBooking) await selectBooking(activeBooking);
  };

  const renderMessages = async () => {
    if (!activeBooking) return;
    const { data, error } = await supabase.from('booking_messages')
      .select('id, sender_id, sender_role, body, created_at')
      .eq('booking_id', activeBooking.id)
      .order('created_at', { ascending: true });
    messages.replaceChildren();
    if (error) {
      appendText(messages, 'p', 'account-empty-note', error.message);
      return;
    }
    if (!data.length) appendText(messages, 'p', 'account-empty-note', 'No messages yet.');
    data.forEach((message) => {
      const item = document.createElement('article');
      item.className = `conversation-message ${message.sender_role === 'staff' ? 'from-staff' : 'from-customer'}`;
      appendText(item, 'span', 'conversation-sender', message.sender_role === 'staff' ? 'Onchari Group' : 'Customer');
      appendText(item, 'p', '', message.body);
      appendText(item, 'time', '', new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.created_at)));
      messages.appendChild(item);
    });
    messages.scrollTop = messages.scrollHeight;
  };

  const insertDocument = async ({ type, amount, dueDate, paymentReference, paymentDate }) => {
    const kind = type === 'estimate' ? 'EST' : 'INV';
    const docNumber = type === 'receipt'
      ? `${paymentForm.dataset.invoiceNumber}-R`
      : makeDocumentNumber(activeBooking, kind);
    const blob = createPdfBlob({
      booking: activeBooking,
      type,
      docNumber,
      amount,
      dueDate,
      paymentReference,
      paymentDate
    });
    const path = await uploadPdf(activeBooking.owner_id, activeBooking.id, docNumber, blob);

    if (type === 'receipt') {
      const { data: receiptId, error } = await supabase.rpc('record_invoice_payment', {
        p_invoice_id: paymentForm.dataset.invoiceId,
        p_payment_reference: paymentReference,
        p_paid_at: new Date(`${paymentDate}T12:00:00`).toISOString()
      });
      if (error) {
        await supabase.storage.from('customer-documents').remove([path]);
        throw error;
      }
      const { error: updateError } = await supabase.from('documents').update({ file_path: path }).eq('id', receiptId);
      if (updateError) throw updateError;
      return;
    }

    const { error } = await supabase.from('documents').insert({
      booking_id: activeBooking.id,
      owner_id: activeBooking.owner_id,
      doc_number: docNumber,
      doc_type: type,
      status: 'issued',
      amount,
      currency: 'KES',
      due_at: dueDate || null,
      file_path: path
    });
    if (error) {
      await supabase.storage.from('customer-documents').remove([path]);
      throw error;
    }
    const nextStatus = type === 'estimate' ? 'quoted' : 'invoiced';
    await supabase.from('bookings').update({ status: nextStatus }).eq('id', activeBooking.id);
  };

  const renderSession = async (currentSession) => {
    session = currentSession;
    if (!session?.user) {
      accessNotice.hidden = false;
      accessNotice.innerHTML = 'Staff sign-in required. <a href="account.html">Sign in to your account</a>.';
      workspace.hidden = true;
      return;
    }
    const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
    if (error || profile?.role !== 'staff') {
      accessNotice.hidden = false;
      accessNotice.textContent = 'This workspace is restricted to Onchari Group staff accounts.';
      workspace.hidden = true;
      return;
    }
    accessNotice.hidden = true;
    workspace.hidden = false;
    await loadBookings();
  };

  const createDocument = (type, amount, dueDate, paymentReference, paymentDate) => insertDocument({ type, amount, dueDate, paymentReference, paymentDate });

  const issueDocument = async (type) => {
    if (!activeBooking) return;
    const form = type === 'estimate' ? estimateForm : invoiceForm;
    if (!form.reportValidity()) return;
    const amount = Number(form.querySelector('input[type="number"]').value);
    const dueDate = form.querySelector('input[type="date"]').value;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setStatus(`Creating ${type} PDF…`);
    try {
      await createDocument(type, amount, dueDate);
      setStatus(`${type === 'estimate' ? 'Estimated quote' : 'Invoice'} issued and saved to the customer account.`);
      await loadBookings();
    } catch (error) {
      setStatus(`Could not issue ${type}: ${error.message}`, true);
    } finally {
      submit.disabled = false;
    }
  };

  estimateForm.addEventListener('submit', (event) => { event.preventDefault(); issueDocument('estimate'); });
  invoiceForm.addEventListener('submit', (event) => { event.preventDefault(); issueDocument('invoice'); });

  paymentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!paymentForm.reportValidity() || !activeBooking) return;
    const invoice = activeBooking.documents?.find((item) => item.doc_type === 'invoice' && item.status === 'issued');
    if (!invoice) {
      setStatus('An issued invoice is required before recording payment.', true);
      return;
    }
    paymentForm.dataset.invoiceId = invoice.id;
    paymentForm.dataset.invoiceNumber = invoice.doc_number;
    paymentForm.dataset.invoiceAmount = invoice.amount;
    const submit = paymentForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    setStatus('Verify the payment reference, then recording payment and creating the receipt PDF…');
    const paymentReference = document.getElementById('verified-payment-reference').value.trim();
    const paymentDate = document.getElementById('verified-payment-date').value;
    try {
      await createDocument('receipt', invoice.amount, '', paymentReference, paymentDate);
      setStatus('Payment recorded and receipt PDF saved to the customer account.');
      await loadBookings();
    } catch (error) {
      setStatus(`Could not record payment: ${error.message}`, true);
    } finally {
      submit.disabled = false;
    }
  });

  deliverableForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!deliverableForm.reportValidity() || !activeBooking) return;
    const file = document.getElementById('deliverable-file').files[0];
    const title = document.getElementById('deliverable-title').value.trim();
    const description = document.getElementById('deliverable-description').value.trim();
    const submit = deliverableForm.querySelector('button[type="submit"]');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${activeBooking.owner_id}/${activeBooking.id}/${Date.now()}-${safeName}`;
    submit.disabled = true;
    setStatus('Uploading deliverable…');
    const { error: uploadError } = await supabase.storage.from('customer-deliverables').upload(path, file, { upsert: false });
    if (uploadError) {
      setStatus(`Could not upload file: ${uploadError.message}`, true);
      submit.disabled = false;
      return;
    }
    const { error } = await supabase.from('deliverables').insert({
      booking_id: activeBooking.id,
      owner_id: activeBooking.owner_id,
      title,
      description: description || null,
      file_path: path,
      uploaded_by: session.user.id
    });
    if (error) {
      await supabase.storage.from('customer-deliverables').remove([path]);
      setStatus(`Could not share file: ${error.message}`, true);
    } else {
      setStatus('Deliverable uploaded to the customer account.');
      deliverableForm.reset();
      await loadBookings();
    }
    submit.disabled = false;
  });

  messageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = document.getElementById('admin-message').value.trim();
    if (!body || !activeBooking || !session) return;
    const { error } = await supabase.from('booking_messages').insert({
      booking_id: activeBooking.id,
      owner_id: activeBooking.owner_id,
      sender_id: session.user.id,
      sender_role: 'staff',
      body
    });
    if (error) setStatus(`Could not send reply: ${error.message}`, true);
    else {
      document.getElementById('admin-message').value = '';
      await renderMessages();
    }
  });

  document.getElementById('refresh-bookings').addEventListener('click', loadBookings);
  document.getElementById('estimate-valid').min = new Date().toISOString().slice(0, 10);
  document.getElementById('verified-payment-date').value = new Date().toISOString().slice(0, 10);

  if (!supabaseConfigured) {
    setupNotice.hidden = false;
    return;
  }
  supabase.auth.onAuthStateChange((_event, currentSession) => {
    window.setTimeout(() => renderSession(currentSession), 0);
  });
  supabase.auth.getSession().then(({ data }) => renderSession(data.session));
});