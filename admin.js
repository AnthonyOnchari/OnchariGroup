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

  let activeFilter = 'all';
  const filterStatuses = ['all', 'requested', 'approved', 'quoted', 'quote_accepted', 'invoiced', 'paid', 'in_progress', 'completed', 'declined', 'cancelled'];

  const showPanel = (name) => {
    document.querySelectorAll('.console-panel').forEach((panel) => { panel.hidden = panel.id !== `panel-${name}`; });
    document.querySelectorAll('.console-tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.panel === name));
  };
  document.querySelectorAll('.console-tab').forEach((tab) => tab.addEventListener('click', () => showPanel(tab.dataset.panel)));

  const setCount = (id, value) => {
    const badge = document.getElementById(id);
    badge.textContent = String(value);
    badge.hidden = !value;
  };

  const renderOverview = () => {
    const pending = bookingRows.filter((b) => b.status === 'requested');
    setCount('tab-bookings-count', pending.length);
    const pendingBox = document.getElementById('overview-pending');
    pendingBox.replaceChildren();
    if (!pending.length) appendText(pendingBox, 'p', 'account-empty-note', 'Nothing waiting. You are all caught up.');
    pending.slice(0, 5).forEach((booking) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-booking-button';
      appendText(button, 'strong', '', booking.project_title || booking.service);
      appendText(button, 'span', '', `${booking.contact_name} \u00b7 ${formatDate(booking.preferred_date)}`);
      button.addEventListener('click', () => { showPanel('bookings'); selectBooking(booking); });
      pendingBox.appendChild(button);
    });
    const openChats = chatSessions.filter((chat) => chat.followup?.status !== 'followed_up');
    setCount('tab-chats-count', openChats.length);
    const chatBox = document.getElementById('overview-chats');
    chatBox.replaceChildren();
    if (!openChats.length) appendText(chatBox, 'p', 'account-empty-note', 'No chats waiting for follow-up.');
    openChats.slice(0, 5).forEach((chat) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'admin-booking-button';
      appendText(button, 'strong', '', chat.name || chat.contact || chat.title);
      appendText(button, 'span', '', chat.contact || chat.title);
      button.addEventListener('click', () => { showPanel('chats'); activeChat = chat; renderChatList(); renderChatDetail(); });
      chatBox.appendChild(button);
    });
  };

  const renderStats = () => {
    renderOverview();
    const stats = document.getElementById('admin-stats');
    stats.replaceChildren();
    const paidTotal = bookingRows.flatMap((b) => b.documents || [])
      .filter((d) => d.doc_type === 'invoice' && d.status === 'paid')
      .reduce((sum, d) => sum + Number(d.amount), 0);
    [
      ['Total bookings', bookingRows.length],
      ['Awaiting approval', bookingRows.filter((b) => b.status === 'requested').length],
      ['In progress', bookingRows.filter((b) => ['approved', 'quoted', 'quote_accepted', 'invoiced', 'paid', 'in_progress'].includes(b.status)).length],
      ['Completed', bookingRows.filter((b) => b.status === 'completed').length],
      ['Revenue received', formatMoney(paidTotal)]
    ].forEach(([label, value]) => {
      const box = document.createElement('div');
      box.className = 'admin-stat';
      appendText(box, 'strong', '', String(value));
      appendText(box, 'span', '', label);
      stats.appendChild(box);
    });
    const filters = document.getElementById('admin-filters');
    filters.replaceChildren();
    filterStatuses.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = value.replaceAll('_', ' ');
      button.classList.toggle('is-active', value === activeFilter);
      button.addEventListener('click', () => { activeFilter = value; renderBookingList(); });
      filters.appendChild(button);
    });
  };

  const setBookingStatus = async (status) => {
    const { error } = await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', activeBooking.id);
    if (error) {
      setStatus(`Could not update booking: ${error.message}`, true);
      return;
    }
    setStatus(`Booking marked ${status.replaceAll('_', ' ')}.`);
    await loadBookings();
  };

  const renderApproval = () => {
    const box = document.getElementById('admin-approval');
    box.replaceChildren();
    const actions = {
      requested: [['Approve request', 'approved', 'button'], ['Decline', 'declined', 'button-ghost']],
      approved: [['Mark in progress', 'in_progress', 'button-ghost'], ['Cancel', 'cancelled', 'button-ghost']],
      paid: [['Mark in progress', 'in_progress', 'button-ghost']],
      in_progress: [['Mark completed', 'completed', 'button']],
      declined: [['Reopen', 'requested', 'button-ghost']],
      cancelled: [['Reopen', 'requested', 'button-ghost']]
    }[activeBooking.status] || [];
    actions.forEach(([label, status, cls]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = cls;
      button.textContent = label;
      button.addEventListener('click', async () => {
        button.disabled = true;
        await setBookingStatus(status);
      });
      box.appendChild(button);
    });
  };

  const renderBookingList = () => {
    renderStats();
    bookingList.replaceChildren();
    const visibleRows = activeFilter === 'all' ? bookingRows : bookingRows.filter((b) => b.status === activeFilter);
    if (!visibleRows.length) {
      appendText(bookingList, 'p', 'account-empty-note', 'No booking requests here.');
      return;
    }
    visibleRows.forEach((booking) => {
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
    renderApproval();
    const { data: profile } = await supabase.from('profiles').select('display_name, username, phone, avatar_path').eq('id', booking.owner_id).maybeSingle();
    const customer = document.getElementById('admin-customer');
    customer.replaceChildren();
    appendText(customer, 'span', 'booking-step-label', 'Customer account');
    const line = document.createElement('div');
    line.className = 'admin-customer-line';
    if (profile?.avatar_path) {
      const image = document.createElement('img');
      image.alt = '';
      image.src = supabase.storage.from('avatars').getPublicUrl(profile.avatar_path).data.publicUrl;
      line.appendChild(image);
    }
    appendText(line, 'span', '', `${profile?.display_name || booking.contact_name}${profile?.username ? ` (@${profile.username})` : ''} · ${profile?.phone || booking.contact_phone}`);
    if (profile?.phone) appendText(line, 'span', 'verified-tick', '✓').title = 'Phone number added';
    customer.appendChild(line);
    const orderCount = bookingRows.filter((b) => b.owner_id === booking.owner_id).length;
    appendText(customer, 'p', '', `${orderCount} booking${orderCount === 1 ? '' : 's'} with Onchari Group`);
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
    await loadChats(activeChat?.id);
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

  let chatSessions = [];
  let activeChat = null;

  const renderChatList = () => {
    renderOverview();
    const list = document.getElementById('admin-chat-list');
    list.replaceChildren();
    if (!chatSessions.length) {
      appendText(list, 'p', 'account-empty-note', 'No assistant chats yet.');
      return;
    }
    chatSessions.forEach((chat) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `admin-booking-button${activeChat?.id === chat.id ? ' is-active' : ''}`;
      appendText(button, 'strong', '', chat.name || chat.contact || chat.title);
      appendText(button, 'span', '', `${chat.title} \u00b7 ${chat.messages.length} messages \u00b7 ${new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(chat.last))}`);
      appendText(button, 'span', 'booking-status-pill', chat.followup?.status === 'followed_up' ? 'followed up' : 'open');
      button.addEventListener('click', () => { activeChat = chat; renderChatList(); renderChatDetail(); });
      list.appendChild(button);
    });
  };

  const renderChatDetail = () => {
    const transcript = document.getElementById('admin-chat-transcript');
    const form = document.getElementById('admin-chat-followup');
    transcript.replaceChildren();
    document.getElementById('admin-chat-contact').replaceChildren();
    form.hidden = !activeChat;
    if (!activeChat) return;
    const contactBox = document.getElementById('admin-chat-contact');
    contactBox.replaceChildren();
    appendText(contactBox, 'span', 'booking-step-label', 'Visitor contact');
    appendText(contactBox, 'h3', '', activeChat.name || 'Name not given');
    if (activeChat.contact) {
      const link = document.createElement('a');
      link.textContent = activeChat.contact;
      link.href = activeChat.contact.includes('@') ? `mailto:${encodeURIComponent(activeChat.contact)}` : `tel:${activeChat.contact.replace(/[^\d+]/g, '')}`;
      const p = document.createElement('p');
      p.appendChild(link);
      contactBox.appendChild(p);
    } else {
      appendText(contactBox, 'p', '', 'No contact left.');
    }
    activeChat.messages.forEach((message) => {
      const item = document.createElement('article');
      item.className = `conversation-message ${message.sender === 'assistant' ? 'from-staff' : 'from-customer'}`;
      appendText(item, 'span', 'conversation-sender', message.sender === 'assistant' ? 'Assistant' : (activeChat.name || 'Visitor'));
      appendText(item, 'p', '', message.body);
      appendText(item, 'time', '', new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.created_at)));
      transcript.appendChild(item);
    });
    document.getElementById('chat-note').value = activeChat.followup?.note || '';
    document.getElementById('chat-toggle-followed').textContent = activeChat.followup?.status === 'followed_up' ? 'Reopen' : 'Mark followed up';
  };

  const saveFollowup = async (status) => {
    const note = document.getElementById('chat-note').value.trim() || null;
    const { error } = await supabase.from('chat_followups').upsert({
      session_id: activeChat.id,
      status: status || activeChat.followup?.status || 'open',
      note,
      updated_at: new Date().toISOString()
    });
    if (error) {
      setStatus(`Could not save follow-up: ${error.message}`, true);
      return;
    }
    setStatus('Chat follow-up saved.');
    await loadChats(activeChat.id);
  };

  const loadChats = async (keepId) => {
    const { data, error } = await supabase.from('chat_logs')
      .select('id, session_id, user_id, sender, body, page, created_at, visitor_name, visitor_contact')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) {
      document.getElementById('admin-chat-list').replaceChildren();
      appendText(document.getElementById('admin-chat-list'), 'p', 'account-empty-note', `Could not load chats: ${error.message}`);
      return;
    }
    const { data: followups } = await supabase.from('chat_followups').select('session_id, status, note');
    const userIds = [...new Set(data.map((row) => row.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
      : { data: [] };
    const groups = new Map();
    [...data].reverse().forEach((row) => {
      if (!groups.has(row.session_id)) groups.set(row.session_id, { id: row.session_id, messages: [], user_id: row.user_id });
      const group = groups.get(row.session_id);
      group.messages.push(row);
      group.last = row.created_at;
      if (row.user_id) group.user_id = row.user_id;
      if (row.visitor_name) group.visitorName = row.visitor_name;
      if (row.visitor_contact) group.contact = row.visitor_contact;
    });
    chatSessions = [...groups.values()].map((group) => {
      const first = group.messages.find((m) => m.sender === 'visitor');
      return {
        ...group,
        title: (first?.body || group.messages[0].body).slice(0, 60),
        name: group.visitorName || profiles?.find((p) => p.id === group.user_id)?.display_name || '',
        followup: followups?.find((f) => f.session_id === group.id)
      };
    }).sort((a, b) => new Date(b.last) - new Date(a.last));
    activeChat = chatSessions.find((chat) => chat.id === keepId) || null;
    renderChatList();
    renderChatDetail();
  };

  document.getElementById('admin-chat-followup').addEventListener('submit', (event) => { event.preventDefault(); saveFollowup(); });
  document.getElementById('chat-toggle-followed').addEventListener('click', () => saveFollowup(activeChat.followup?.status === 'followed_up' ? 'open' : 'followed_up'));
  document.getElementById('refresh-chats').addEventListener('click', () => loadChats(activeChat?.id));

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