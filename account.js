import { supabase, supabaseConfigured } from './supabase-client.js';
import { countryFlag, countryList, countryName } from './countries.js';

document.addEventListener('DOMContentLoaded', () => {
  const setupNotice = document.getElementById('account-setup-notice');
  const authPanel = document.getElementById('account-auth-panel');
  const dashboard = document.getElementById('account-dashboard');
  const authStatus = document.getElementById('account-auth-status');
  const dashboardStatus = document.getElementById('account-dashboard-status');
  const bookingsContainer = document.getElementById('account-bookings');
  const conversation = document.getElementById('account-conversation');
  const conversationMessages = document.getElementById('conversation-messages');
  const conversationForm = document.getElementById('conversation-form');
  const conversationInput = document.getElementById('conversation-message');
  const staffLink = document.getElementById('staff-workspace-link');
  let session = null;
  let activeBooking = null;
  let messageChannel = null;

  const setStatus = (element, message, isError = false) => {
    element.textContent = message;
    element.classList.toggle('is-error', isError);
  };

  const addText = (parent, tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  };

  const formatDate = (value) => value
    ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
    : 'Date to be agreed';

  const formatAmount = (amount, currency) => new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency || 'KES',
    maximumFractionDigits: 0
  }).format(amount);

  const createFileLink = async (bucket, path, label) => {
    const link = document.createElement('a');
    link.className = 'account-file-link';
    link.textContent = 'Preparing secure file link…';
    link.setAttribute('aria-disabled', 'true');
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300, { download: label });
    if (error) {
      link.textContent = `File unavailable: ${label}`;
      return link;
    }
    link.href = data.signedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    link.removeAttribute('aria-disabled');
    return link;
  };

  const renderDocuments = async (booking, card) => {
    const heading = addText(card, 'h4', 'account-subheading', 'Documents and files');
    const list = document.createElement('div');
    list.className = 'account-file-list';
    card.append(heading, list);

    (booking.documents || []).forEach((documentRecord) => {
      const row = document.createElement('div');
      row.className = 'account-file-row';
      const label = `${documentRecord.doc_type === 'estimate' ? 'Estimated quote' : documentRecord.doc_type === 'receipt' ? 'Receipt' : 'Invoice'} · ${formatAmount(documentRecord.amount, documentRecord.currency)} · ${documentRecord.status.replaceAll('_', ' ')}`;
      addText(row, 'span', '', label);
      if (documentRecord.file_path) {
        createFileLink('customer-documents', documentRecord.file_path, 'Download PDF').then((link) => row.appendChild(link));
      } else {
        addText(row, 'span', 'account-file-pending', 'PDF being prepared');
      }
      if (documentRecord.doc_type === 'estimate' && documentRecord.status === 'issued') {
        const accept = document.createElement('button');
        accept.type = 'button';
        accept.className = 'text-action';
        accept.textContent = 'Accept estimate';
        accept.addEventListener('click', async () => {
          accept.disabled = true;
          const { error } = await supabase.rpc('accept_estimate', { p_document_id: documentRecord.id });
          if (error) {
            setStatus(dashboardStatus, error.message, true);
            accept.disabled = false;
            return;
          }
          setStatus(dashboardStatus, 'Estimate accepted. The team can now prepare your invoice.');
          await loadBookings();
        });
        row.appendChild(accept);
      }
      list.appendChild(row);
    });

    (booking.deliverables || []).forEach((file) => {
      const row = document.createElement('div');
      row.className = 'account-file-row';
      const label = file.description ? `${file.title} · ${file.description}` : file.title;
      addText(row, 'span', '', label);
      createFileLink('customer-deliverables', file.file_path, 'Download file').then((link) => row.appendChild(link));
      list.appendChild(row);
    });

    if (!(booking.documents || []).length && !(booking.deliverables || []).length) {
      addText(list, 'p', 'account-empty-note', 'Quotes, invoices, receipts and deliverables will appear here as your project moves forward.');
    }
  };

  const avatarUrl = (path) => path ? supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl : '';
  const initialsAvatar = (name) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'><rect width='96' height='96' fill='#0f6b5c'/><text x='48' y='62' font-size='42' text-anchor='middle' fill='#fff' font-family='sans-serif'>${(name || '?').trim().charAt(0).toUpperCase().replace(/[^A-Z0-9]/gi, '?')}</text></svg>`)}`;

  const attachReceipt = (booking, card) => {
    const receipt = (booking.documents || []).find((d) => d.doc_type === 'receipt' && d.file_path);
    if (receipt) createFileLink('customer-documents', receipt.file_path, 'Download receipt').then((link) => card.appendChild(link));
  };

  const renderPurchases = (bookings) => {
    const container = document.getElementById('account-purchases');
    container.replaceChildren();
    const paid = bookings.filter((b) => (b.documents || []).some((d) => d.doc_type === 'invoice' && d.status === 'paid'));
    if (!paid.length) {
      addText(container, 'p', 'account-empty-note', 'Completed purchases and receipts will appear here once a payment is confirmed.');
      return;
    }
    paid.forEach((booking) => {
      const invoice = booking.documents.find((d) => d.doc_type === 'invoice' && d.status === 'paid');
      const card = document.createElement('article');
      card.className = 'account-booking-card';
      const top = document.createElement('div');
      top.className = 'account-booking-topline';
      addText(top, 'h4', '', booking.project_title || booking.service);
      addText(top, 'span', 'booking-status-pill', 'paid');
      card.appendChild(top);
      addText(card, 'p', 'account-booking-meta', `${booking.reference} · ${formatAmount(invoice.amount, invoice.currency)}${invoice.paid_at ? ` · ${formatDate(invoice.paid_at)}` : ''}`);
      attachReceipt(booking, card);
      container.appendChild(card);
    });
  };

  const renderSaved = async () => {
    const container = document.getElementById('account-saved');
    container.replaceChildren();
    const { data, error } = await supabase.from('saved_items').select('id, service, project_title, created_at').eq('owner_id', session.user.id).order('created_at', { ascending: false });
    if (error) {
      addText(container, 'p', 'account-empty-note', `Could not load saved items: ${error.message}`);
      return;
    }
    if (!data.length) {
      document.getElementById('stat-saved').textContent = '0';
      addText(container, 'p', 'account-empty-note', 'Nothing saved yet. Use "Save to my cart" on the booking page to keep a request for later.');
      return;
    }
    document.getElementById('stat-saved').textContent = String(data.length);
    data.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'account-booking-card';
      addText(card, 'h4', '', item.project_title || item.service);
      addText(card, 'p', 'account-booking-meta', `${item.service} · saved ${formatDate(item.created_at)}`);
      const open = document.createElement('a');
      open.className = 'button-ghost account-message-button';
      open.href = `booking.html?draft=${encodeURIComponent(item.id)}`;
      open.textContent = 'Continue booking';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'text-action';
      remove.textContent = 'Remove';
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        const { error: deleteError } = await supabase.from('saved_items').delete().eq('id', item.id);
        if (deleteError) setStatus(dashboardStatus, deleteError.message, true);
        await renderSaved();
      });
      card.append(open, remove);
      container.appendChild(card);
    });
  };

  const renderBookings = async () => {
    const run = renderRun;
    bookingsContainer.replaceChildren();
    setStatus(dashboardStatus, 'Loading your projects…');
    const { data, error } = await supabase
      .from('bookings')
      .select('id, reference, service, project_title, preferred_date, preferred_time, project_format, brief, status, created_at, documents(id, doc_number, doc_type, status, amount, currency, due_at, file_path, issued_at, paid_at), deliverables(id, title, description, file_path, created_at)')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(dashboardStatus, `Could not load your project history: ${error.message}`, true);
      return;
    }
    setStatus(dashboardStatus, '');
    renderPurchases(data);
    const paidInvoices = data.flatMap((b) => b.documents || []).filter((d) => d.doc_type === 'invoice' && d.status === 'paid');
    document.getElementById('stat-bookings').textContent = String(data.length);
    document.getElementById('stat-purchases').textContent = String(paidInvoices.length);
    document.getElementById('stat-spent').textContent = formatAmount(paidInvoices.reduce((sum, d) => sum + Number(d.amount), 0), 'KES');
    if (!data.length) {
      addText(bookingsContainer, 'p', 'account-empty-note', 'No bookings yet. When you schedule a project, its updates and files will be kept here.');
      return;
    }

    for (const booking of data) {
      if (run !== renderRun) return;
      const card = document.createElement('article');
      card.className = 'account-booking-card';
      const top = document.createElement('div');
      top.className = 'account-booking-topline';
      const title = booking.project_title || booking.service;
      addText(top, 'h4', '', title);
      addText(top, 'span', 'booking-status-pill', booking.status.replaceAll('_', ' '));
      card.appendChild(top);
      addText(card, 'p', 'account-booking-meta', `${booking.reference} · ${booking.service} · ${formatDate(booking.preferred_date)} · ${booking.preferred_time}`);
      addText(card, 'p', 'account-booking-brief', booking.brief);
      await renderDocuments(booking, card);

      const messageButton = document.createElement('button');
      messageButton.type = 'button';
      messageButton.className = 'button-ghost account-message-button';
      messageButton.textContent = 'Open project conversation';
      messageButton.addEventListener('click', () => openConversation(booking));
      card.appendChild(messageButton);
      if (run !== renderRun) return;
      bookingsContainer.appendChild(card);
    }
  };

  const renderMessages = async () => {
    if (!activeBooking) return;
    const { data, error } = await supabase
      .from('booking_messages')
      .select('id, sender_id, sender_role, body, created_at')
      .eq('booking_id', activeBooking.id)
      .order('created_at', { ascending: true });
    conversationMessages.replaceChildren();
    if (error) {
      addText(conversationMessages, 'p', 'account-empty-note', `Messages could not be loaded: ${error.message}`);
      return;
    }
    if (!data.length) addText(conversationMessages, 'p', 'account-empty-note', 'No messages yet. Send a note to the Onchari team to start the conversation.');
    data.forEach((message) => {
      const item = document.createElement('article');
      item.className = `conversation-message ${message.sender_role === 'staff' ? 'from-staff' : 'from-customer'}`;
      addText(item, 'span', 'conversation-sender', message.sender_role === 'staff' ? 'Onchari Group' : 'You');
      addText(item, 'p', '', message.body);
      addText(item, 'time', '', new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.created_at)));
      conversationMessages.appendChild(item);
    });
    conversationMessages.scrollTop = conversationMessages.scrollHeight;
  };

  const openConversation = async (booking) => {
    activeBooking = booking;
    conversation.hidden = false;
    document.getElementById('conversation-title').textContent = booking.project_title || booking.service;
    if (messageChannel) await supabase.removeChannel(messageChannel);
    await renderMessages();
    messageChannel = supabase.channel(`customer-messages-${booking.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'booking_messages', filter: `booking_id=eq.${booking.id}`
      }, renderMessages)
      .subscribe();
    conversation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  let renderRun = 0;
  let editingProfile = false;
  const renderSession = async (currentSession) => {
    const run = ++renderRun;
    session = currentSession;
    const signedIn = Boolean(session?.user);
    authPanel.hidden = signedIn;
    dashboard.hidden = !signedIn;
    if (!signedIn) {
      if (messageChannel) await supabase.removeChannel(messageChannel);
      messageChannel = null;
      return;
    }

    const user = session.user;
    const { data: profile } = await supabase.from('profiles').select('display_name, role, phone, username, avatar_path, country').eq('id', user.id).maybeSingle();
    const countrySelect = document.getElementById('profile-country');
    if (countrySelect.options.length < 2) {
      countryList().forEach(({ code, name }) => countrySelect.add(new Option(`${countryFlag(code)} ${name}`, code)));
    }
    countrySelect.value = profile?.country || '';
    const flag = document.getElementById('profile-flag');
    flag.hidden = !profile?.country;
    flag.textContent = countryFlag(profile?.country);
    flag.title = countryName(profile?.country);
    if (!profile?.country) setStatus(document.getElementById('profile-status'), 'Please select your country to continue.', true);
    const shownName = profile?.display_name || user.user_metadata?.full_name || user.email || 'there';
    document.getElementById('account-welcome').textContent = profile?.display_name
      ? `Welcome, ${profile.display_name}`
      : `Welcome, ${user.email || user.phone || 'back'}`;
    document.getElementById('profile-signed-in-text').textContent = `Signed in as ${profile?.username ? `@${profile.username}` : user.email || shownName}`;
    document.getElementById('profile-name').value = profile?.display_name || user.user_metadata?.full_name || '';
    document.getElementById('profile-username').value = profile?.username || '';
    document.getElementById('profile-phone').value = profile?.phone || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-avatar').src = avatarUrl(profile?.avatar_path) || user.user_metadata?.avatar_url || initialsAvatar(shownName);
    staffLink.hidden = profile?.role !== 'staff';

    const complete = Boolean(profile?.country && (profile?.display_name || user.user_metadata?.full_name));
    document.getElementById('summary-avatar').src = document.getElementById('profile-avatar').src;
    const summaryFlag = document.getElementById('summary-flag');
    summaryFlag.hidden = !profile?.country;
    summaryFlag.textContent = countryFlag(profile?.country);
    summaryFlag.title = countryName(profile?.country);
    document.getElementById('summary-name').textContent = shownName;
    if (profile?.phone) {
      const tick = document.createElement('span');
      tick.className = 'verified-tick';
      tick.textContent = '✓';
      tick.title = 'Phone number added';
      document.getElementById('summary-name').appendChild(tick);
    }
    document.getElementById('summary-meta').textContent = [profile?.username && `@${profile.username}`, user.email, profile?.phone, countryName(profile?.country)].filter(Boolean).join(' · ');
    document.getElementById('summary-role').hidden = profile?.role !== 'staff';
    editingProfile = editingProfile && complete;
    document.getElementById('profile-summary').hidden = !complete || editingProfile;
    document.getElementById('profile-card').hidden = complete && !editingProfile;
    if (run !== renderRun) return;
    await Promise.all([renderBookings(), renderSaved()]);
  };

  document.getElementById('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('profile-status');
    const username = document.getElementById('profile-username').value.trim();
    const { error } = await supabase.from('profiles').update({
      display_name: document.getElementById('profile-name').value.trim() || null,
      phone: document.getElementById('profile-phone').value.trim() || null,
      username: username || null,
      country: document.getElementById('profile-country').value
    }).eq('id', session.user.id);
    if (error) {
      setStatus(status, error.code === '23505' ? 'That username is already taken.' : error.message, true);
      return;
    }
    setStatus(status, 'Profile saved.');
    editingProfile = false;
    await renderSession(session);
  });

  document.getElementById('edit-profile').addEventListener('click', () => {
    editingProfile = true;
    document.getElementById('profile-summary').hidden = true;
    document.getElementById('profile-card').hidden = false;
    setStatus(document.getElementById('profile-status'), '');
  });

  document.getElementById('profile-avatar-input').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    const status = document.getElementById('profile-status');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setStatus(status, 'Choose a JPG, PNG or WebP image under 2 MB.', true);
      return;
    }
    const path = `${session.user.id}/avatar-${Date.now()}.${file.type.split('/')[1]}`;
    setStatus(status, 'Uploading photo…');
    const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type });
    if (error) {
      setStatus(status, error.message, true);
      return;
    }
    const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', session.user.id);
    if (updateError) {
      setStatus(status, updateError.message, true);
      return;
    }
    setStatus(status, 'Photo updated.');
    await renderSession(session);
  });

  document.getElementById('google-sign-in').addEventListener('click', async () => {
    setStatus(authStatus, 'Redirecting to Google…');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL('account.html', window.location.href).href }
    });
    if (error) setStatus(authStatus, error.message, true);
  });

  document.getElementById('account-sign-out').addEventListener('click', async () => {
    sessionStorage.removeItem('og-chat-visitor');
    sessionStorage.removeItem('og-chat-session');
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      setStatus(dashboardStatus, error.message, true);
      return;
    }
    // Reload so the nav chip, chat widget and cached state all reset.
    window.location.href = 'account.html';
  });

  conversationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = conversationInput.value.trim();
    if (!body || !activeBooking || !session) return;
    const { error } = await supabase.from('booking_messages').insert({
      booking_id: activeBooking.id,
      owner_id: session.user.id,
      sender_id: session.user.id,
      sender_role: 'customer',
      body
    });
    if (error) {
      setStatus(dashboardStatus, error.message, true);
      return;
    }
    conversationInput.value = '';
    await renderMessages();
  });

  document.getElementById('close-conversation').addEventListener('click', async () => {
    conversation.hidden = true;
    activeBooking = null;
    if (messageChannel) await supabase.removeChannel(messageChannel);
    messageChannel = null;
  });

  if (!supabaseConfigured) {
    setupNotice.hidden = false;
    return;
  }

  supabase.auth.onAuthStateChange((_event, currentSession) => {
    window.setTimeout(() => renderSession(currentSession), 0);
  });
  supabase.auth.getSession().then(({ data }) => renderSession(data.session));
});