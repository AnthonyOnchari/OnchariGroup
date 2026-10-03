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

  document.querySelectorAll('.nav-links, .mobile-menu').forEach((navigation) => {
    if (navigation.querySelector('a[href="account.html"]')) return;
    const accountLink = document.createElement('a');
    accountLink.href = 'account.html';
    accountLink.textContent = 'Account';
    if (page === 'account') accountLink.classList.add('active');
    navigation.appendChild(accountLink);
  });

  const menuToggle = document.querySelector('.mobile-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
    });

    document.addEventListener('click', (event) => {
      if (!mobileMenu.classList.contains('open')) return;
      if (!mobileMenu.contains(event.target) && !menuToggle.contains(event.target)) {
        mobileMenu.classList.remove('open');
      }
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  if (page === 'service') {
    const services = {
      website: {
        label: 'Website design',
        title: 'A website that works as hard as you do.',
        intro: 'Polished digital spaces that make your business easier to trust, understand and choose.',
        description: 'From a focused landing page to a complete business website, we build experiences with clear structure and a confident visual direction.',
        items: ['Landing pages and business websites', 'Portfolio and service pages', 'Responsive layouts for every screen'],
        work: [['hero-cover.jpg', 'Brand website', 'A focused digital home for a growing brand.'], ['graphic-design-sample.png', 'Campaign landing page', 'Clear design that supports a strong message.'], ['app-development.svg', 'Digital product', 'A considered experience built around the user.']]
      },
      photography: {
        label: 'Photography',
        title: 'Images that make people stop and look.',
        intro: 'Professional photography for products, people, places and the moments that shape your brand.',
        description: 'We plan and create imagery that feels natural, considered and ready to use across your website, social channels and campaigns.',
        items: ['Portrait and personal brand sessions', 'Product and business photography', 'Event and campaign coverage'],
        work: [['portrait-session.jpg', 'Portrait session', 'Images with warmth, confidence and character.'], ['event-story.jpg', 'Event coverage', 'Visual moments that keep the story moving.'], ['hero-portrait.jpg', 'Production portraits', 'People and process captured with intention.']]
      },
      videography: {
        label: 'Videography',
        title: 'Give your story movement.',
        intro: 'Short-form video and event storytelling designed to hold attention and build connection.',
        description: 'We turn real moments, ideas and launches into focused video content with a clear beginning, feeling and next step.',
        items: ['Short-form social videos', 'Event and production coverage', 'Editing for brand campaigns'],
        work: [['hero-portrait.jpg', 'Production story', 'A visual look at the people behind the work.'], ['event-story.jpg', 'Event film', 'Energy and atmosphere shaped into a clear story.'], ['production-team.jpg', 'Brand content', 'Content made to build attention and trust.']]
      },
      property: {
        label: 'Property marketing',
        title: 'Present the place people want to see.',
        intro: 'Stronger property visuals and digital presentation for listings, agents and growing real estate brands.',
        description: 'We help properties make a better first impression with visual content and marketing that brings the right details forward.',
        items: ['Listing photography and visuals', 'Property-focused landing pages', 'Digital promotion for listings'],
        work: [['production-team.jpg', 'Property campaign', 'A strong visual first impression for a listing.'], ['hero-cover.jpg', 'Property promotion', 'Digital presentation designed to attract attention.'], ['event-story.jpg', 'Location story', 'Details and atmosphere brought forward clearly.']]
      },
      app: {
        label: 'App development',
        title: 'Useful digital products, made human.',
        intro: 'Mobile experiences that help people connect, return and get more from every interaction.',
        description: 'We turn a useful idea into a focused product experience, from the first screen through to a clear path for users.',
        items: ['Mobile product experiences', 'Simple, focused user flows', 'Launch-ready digital thinking'],
        work: [['app-development.svg', 'Chichi app', 'A mobile experience that keeps people connected.'], ['graphic-design-sample.png', 'Product interface', 'A clear visual direction for a useful product.'], ['hero-cover.jpg', 'Digital experience', 'A simple path from interest to action.']]
      },
      design: {
        label: 'Poster, logo & graphic design',
        title: 'Make your visual identity memorable.',
        intro: 'Distinctive graphics and brand assets that give your business a clear point of view.',
        description: 'We create practical visual systems that help your brand feel consistent across posters, logos, campaigns and everyday communication.',
        items: ['Logo and identity direction', 'Posters and campaign graphics', 'Social and marketing design assets'],
        work: [['graphic-design-sample.png', 'Campaign graphic', 'A memorable visual made for attention.'], ['portrait-session.jpg', 'Brand imagery', 'Photography that gives the identity more life.'], ['app-development.svg', 'Visual system', 'A consistent look across every touchpoint.']]
      }
    };
    const service = services[new URLSearchParams(window.location.search).get('service')] || services.website;
    document.title = `${service.label} | Onchari Group`;
  }

  document.querySelectorAll('.crew-gallery-track img').forEach((image) => {
    const markPortrait = () => {
      if (image.naturalHeight > image.naturalWidth) image.classList.add('is-portrait');
      else image.classList.add('is-landscape');
    };
    if (image.complete) markPortrait();
    else image.addEventListener('load', markPortrait, { once: true });
  });

  const serviceShowcases = {
    website: { title: 'Website design', samples: [['hero-cover.jpg', 'Brand website', 'A focused digital home for a growing brand.'], ['graphic-design-sample.png', 'Campaign landing page', 'Clear design that supports a strong message.'], ['app-development.svg', 'Digital product', 'A considered experience built around the user.']] },
    photography: { title: 'Photography', samples: [['portrait-session.jpg', 'Portrait session', 'Images with warmth, confidence and character.'], ['event-story.jpg', 'Event coverage', 'Visual moments that keep the story moving.'], ['hero-portrait.jpg', 'Production portraits', 'People and process captured with intention.']] },
    videography: { title: 'Videography', samples: [['hero-portrait.jpg', 'Production story', 'A visual look at the people behind the work.'], ['event-story.jpg', 'Event film', 'Energy and atmosphere shaped into a clear story.'], ['production-team.jpg', 'Brand content', 'Content made to build attention and trust.']] },
    property: { title: 'Property marketing', samples: [['production-team.jpg', 'Property campaign', 'A strong visual first impression for a listing.'], ['hero-cover.jpg', 'Property promotion', 'Digital presentation designed to attract attention.'], ['event-story.jpg', 'Location story', 'Details and atmosphere brought forward clearly.']] },
    app: { title: 'App development', samples: [['app-development.svg', 'Chichi app', 'A mobile experience that keeps people connected.'], ['graphic-design-sample.png', 'Product interface', 'A clear visual direction for a useful product.'], ['hero-cover.jpg', 'Digital experience', 'A simple path from interest to action.']] },
    design: { title: 'Poster, logo & graphic design', samples: [['graphic-design-sample.png', 'Campaign graphic', 'A memorable visual made for attention.'], ['portrait-session.jpg', 'Brand imagery', 'Photography that gives the identity more life.'], ['app-development.svg', 'Visual system', 'A consistent look across every touchpoint.']] }
  };

  const closeShowcase = () => {
    const showcase = document.querySelector('.service-showcase-modal');
    if (showcase) showcase.remove();
    document.body.classList.remove('showcase-open');
  };

  const openShowcase = (serviceKey) => {
    const service = serviceShowcases[serviceKey];
    if (!service) return;
    closeShowcase();
    const showcase = document.createElement('div');
    showcase.className = 'service-showcase-modal';
    showcase.innerHTML = `<button class="service-showcase-backdrop" type="button" aria-label="Close service showcase"></button><section class="service-showcase-dialog" role="dialog" aria-modal="true" aria-labelledby="service-showcase-title"><button class="service-showcase-close" type="button" aria-label="Close service showcase">&times;</button><span class="kicker">Explore service</span><h2 id="service-showcase-title">${service.title}</h2><div class="service-sample-grid">${service.samples.map(([image, title, copy]) => `<article><div class="service-sample-image"><img src="assets/${image}" alt="${title}" /></div><h3>${title}</h3><p>${copy}</p></article>`).join('')}</div><a class="button" href="contact.html">Start a conversation</a></section>`;
    document.body.appendChild(showcase);
    document.body.classList.add('showcase-open');
    showcase.querySelectorAll('.service-showcase-close, .service-showcase-backdrop').forEach((button) => button.addEventListener('click', closeShowcase));
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-service-showcase]');
    if (!trigger) return;
    event.preventDefault();
    openShowcase(trigger.dataset.serviceShowcase);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeShowcase();
  });

  const modal = document.getElementById('hero-modal');
  const modalTitle = document.getElementById('hero-modal-title');
  const modalCopy = document.getElementById('hero-modal-copy');
  const modalLink = document.getElementById('hero-modal-link');
  const modalContent = {
    project: {
      title: 'Start a project',
      copy: 'Tell us what you are building and we will help shape the right digital direction for it.',
      link: 'contact.html',
      label: 'Continue to contact'
    },
    work: {
      title: 'Explore our work',
      copy: 'See how web design, media production and brand strategy come together across our selected projects.',
      link: 'work.html',
      label: 'View selected work'
    },
    app: {
      title: 'Chichi app',
      copy: 'A simple mobile experience that keeps your favorite people just a tap away.',
      link: 'https://play.google.com/store/apps/details?id=com.onchari.chichi&pcampaignid=web_share',
      label: 'View Chichi on Google Play'
    }
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  };

  window.openHeroModal = (type) => {
    const content = modalContent[type];
    if (!modal || !content) return;
    modalTitle.textContent = content.title;
    modalCopy.textContent = content.copy;
    modalLink.href = content.link;
    modalLink.innerHTML = `${content.label} <span aria-hidden="true">↗</span>`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  };

  window.closeHeroModal = closeModal;

  window.openServiceModal = (trigger) => {
    if (!trigger) return;
    modalTitle.textContent = trigger.dataset.serviceTitle;
    modalCopy.textContent = trigger.dataset.serviceCopy;
    modalLink.href = 'contact.html';
    modalLink.innerHTML = 'Start a conversation <span aria-hidden="true">↗</span>';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  };

  if (modal) {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-modal]');
      if (!trigger) return;
      if (trigger.dataset.modal === 'service') {
        event.preventDefault();
        window.openServiceModal(trigger);
        return;
      }
      event.preventDefault();
      window.openHeroModal(trigger.dataset.modal);
    });

    modal.querySelectorAll('[data-modal-close]').forEach((closeButton) => {
      closeButton.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  const chatWidget = document.createElement('div');
  chatWidget.className = 'chat-widget';
  chatWidget.innerHTML = `
    <button class="chat-launcher" type="button" aria-label="Open Onchari Group Assistant" aria-expanded="false">
      <img src="assets/logo/Onchari Group Logo white bg (1).png" alt="" />
      <span class="chat-launcher-dot"></span>
    </button>
    <button class="chat-backdrop" type="button" aria-label="Close quote chat"></button>
    <section class="chat-panel" aria-label="Onchari Group Assistant" aria-hidden="true">
      <header class="chat-header"><div><strong>Onchari Group Assistant</strong><span><i></i> Built by Anthony Onchari</span></div><button class="chat-close" type="button" aria-label="Close chat">&times;</button></header>
      <div class="chat-messages" aria-live="polite"></div>
      <div class="chat-prompts"><button type="button" data-chat-prompt="What service would suit my business?">Find a service</button><button type="button" data-chat-prompt="I need a quote">Get a quote</button><button type="button" data-chat-prompt="Can I see your work?">See your work</button></div>
      <form class="chat-form"><input type="text" aria-label="Message the Onchari Group Assistant" placeholder="Tell me what you need..." autocomplete="off" /><button type="submit" aria-label="Send message">Send</button></form>
    </section>`;
  document.body.appendChild(chatWidget);

  const chatLauncher = chatWidget.querySelector('.chat-launcher');
  const chatBackdrop = chatWidget.querySelector('.chat-backdrop');
  const chatPanel = chatWidget.querySelector('.chat-panel');
  const chatClose = chatWidget.querySelector('.chat-close');
  const chatMessages = chatWidget.querySelector('.chat-messages');
  const chatForm = chatWidget.querySelector('.chat-form');
  const chatInput = chatWidget.querySelector('input');
  const chatPrompts = chatWidget.querySelectorAll('[data-chat-prompt]');
  let leadStep = 0;
  let lastTopic = 'Onchari Group';
  let lastDestination = '';

  const cleanLeadName = (text) => text.trim().replace(/^(i am|i'm|im|my name is|am)\s+/i, '').replace(/[.!?,]+$/, '').trim() || 'there';
  const looksLikeName = (text) => {
    const value = text.toLowerCase().trim();
    const requestWords = ['quote', 'price', 'cost', 'need', 'help', 'website', 'photo', 'video', 'property', 'design', 'app', 'service', 'my name', 'what name', "what's my", 'who am i'];
    return value.length > 1 && !requestWords.some((word) => value.includes(word)) && cleanLeadName(text).split(/\s+/).length <= 4;
  };

  const addChatMessage = (text, sender = 'assistant') => {
    const message = document.createElement('p');
    message.className = `chat-message ${sender}`;
    message.textContent = text;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const respondTo = (text) => {
    const lower = text.toLowerCase();
    if (leadStep === 1) {
      if (!looksLikeName(text)) {
        addChatMessage('No problem. I still need your name first, then I will help you shape the quote. What should I call you?');
        return;
      }
      leadStep = 2;
      addChatMessage(`Thanks, ${cleanLeadName(text)}. What would you like help with? A website, photos, video, property marketing or something else?`);
      return;
    }
    if (leadStep === 2) {
      leadStep = 3;
      addChatMessage('That sounds like something I can help shape. What is the best email or phone number to reach you on?');
      return;
    }
    if (leadStep === 3) {
      leadStep = 0;
      addChatMessage(`Perfect, I have ${text.trim() || 'your contact'}. Anthony and the team can follow up with a clear next step. You can also reach them at oncharigroup@gmail.com or +254 750 600 715.`);
      return;
    }
    if (lower.includes('who made') || lower.includes('who created') || lower.includes('creator')) {
      addChatMessage('I was created by Anthony Onchari, the person behind Onchari Group. He brings the creative direction, the business sense and the “we can make this work” energy. I am proudly on his team.');
    } else if (lower.includes('who do you work with') || lower.includes('who are your clients') || lower.includes('who do you help') || lower.includes('target audience')) {
      addChatMessage('Onchari works with businesses, creators and personal projects that need a clearer digital or visual presence. That can mean building a first website, refreshing a brand, creating photo or video content, promoting a property, or shaping a focused app experience.');
    } else if (lower.includes('about onchari') || lower.includes('what is onchari') || lower.includes('tell me about the company') || lower.includes('all about us') || lower.includes('about us') || lower === 'company') {
      addChatMessage('Onchari Group is a creative and digital company led by founder Anthony Onchari in Utawala, Nairobi, Kenya. With 5+ years of experience, the team helps businesses, creators and personal projects with website design, photography, videography, property marketing, app development, and logo, poster and graphic design. Work can be handled remotely too. The approach is to understand the goal, clarify the message, then create practical work that fits the brand.');
    } else if (lower.includes('mission') || lower.includes('believe') || lower.includes('approach') || lower.includes('values')) {
      addChatMessage('The Onchari approach is practical and human: understand the real goal, make the message clear, create work that feels like the brand, and keep the next step simple. Looking good matters, but helping the business move matters more.');
    } else if (lower.includes('how long') || lower.includes('years') || lower.includes('experience')) {
      addChatMessage('Onchari Group has more than five years of creative and digital work behind it, with experience across websites, visual content, campaigns, property marketing and brand communication.');
    } else if (lower.includes('founder') || lower.includes('owner') || lower.includes('anthony onchari')) {
      addChatMessage('Anthony Onchari is the founder and person behind Onchari Group. He brings together creative direction, digital execution and a business-first way of thinking to help clients turn ideas into something people can see and use.');
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('pricing') || lower.includes('rates') || lower.includes('packages')) {
      addChatMessage('Pricing depends on the project scope, such as the service, deliverables and level of production. I do not have a current price list to quote from, and I do not want to guess. Share what you need and Anthony’s team can recommend a suitable scope and provide a quote.');
      lastTopic = 'project scope and pricing';
    } else if (lower.includes('recommend') || lower.includes('suit my') || lower.includes('best service') || lower.includes('which service') || lower.includes('what service')) {
      if (lower.includes('property') || lower.includes('real estate') || lower.includes('listing')) {
        lastTopic = 'property marketing';
        addChatMessage('For a property or listing, start with property marketing: strong listing visuals and clear digital presentation. Photography can support that too. Are you promoting one property or building a real estate brand?');
      } else if (lower.includes('social') || lower.includes('content') || lower.includes('visibility') || lower.includes('audience')) {
        lastTopic = 'brand content';
        addChatMessage('If the goal is stronger visibility, a useful mix can be photography or short-form video, with design assets for campaigns. If people also need a place to learn more or enquire, pair that with a clear website. What are you promoting?');
      } else if (lower.includes('website') || lower.includes('online') || lower.includes('launch') || lower.includes('customers') || lower.includes('business')) {
        lastTopic = 'website design';
        addChatMessage('If customers need a clear place to understand your offer and contact you, a business website is a strong starting point. Photography, design or video can support it when the brand also needs stronger visuals. What does your business do, and what should people do next?');
      } else {
        lastTopic = 'choosing a service';
        addChatMessage('I can help narrow it down. Websites help explain an offer and guide enquiries; photography and video create visual content; design builds consistent brand assets; property marketing presents listings; and app development shapes focused mobile experiences. What are you trying to improve?');
      }
    } else if (lower.includes('sell') || lower.includes('pitch') || lower.includes('convince') || lower.includes('why should i choose')) {
      addChatMessage('Here is the honest pitch: Onchari Group helps your business look credible, sound clear and get remembered. Website? Tunai. Photos? Clean. Video? Story iko sawa. You bring the ambition; I will help connect you with Anthony and the team.');
      leadStep = 1;
      addChatMessage('Want me to turn that into a project conversation? Start with your name and what you want to improve.');
    } else if (lower.includes('joke') || lower.includes('funny') || lower.includes('sheng') || lower.includes('swahili')) {
      addChatMessage('Sawa basi: a brand without a clear online presence is like a matatu without a route number, everyone is asking, “inaenda wapi?” Let me help give your business a direction people can actually follow.');
    } else if (lower.includes('trend') || lower.includes('trending') || lower.includes('viral')) {
      addChatMessage('I can borrow the Kenyan internet energy, but I will not pretend to know a live trend without checking it. The smarter move is content that feels current without becoming tomorrow’s “remember that?”');
    } else if (lastDestination && (lower.includes('take me there') || lower.includes('go there') || lower.includes('open it') || lower.includes('show me that page'))) {
      addChatMessage('Taking you there now.');
      window.setTimeout(() => { window.location.href = lastDestination; }, 450);
    } else if (lower.includes("don't know") || lower.includes('cannot know') || lower.includes('what do you not know') || lower.includes('what can you not do') || lower.includes('are you human')) {
      addChatMessage('I am not human, and I do not have feelings, private memories or automatic live access to news, weather, social feeds or the internet. I can still think with you, explain Onchari Group clearly, help shape ideas and say when I am unsure.');
    } else if (lower.includes('latest') || lower.includes('real time') || lower.includes('live news') || lower.includes('weather')) {
      addChatMessage('I cannot verify live information from inside this website. I would rather say that clearly than guess. For an Onchari project, though, I can help you plan, compare options and prepare the right questions.');
    } else if (lower.includes('quote')) {
      leadStep = 1;
      addChatMessage('Absolutely. I can help get the conversation started. What is your name?');
    } else if ((lower.includes('website') || lower.includes('web design') || lower.includes('landing page')) && !lower.includes('find') && !lower.includes('where')) {
      lastTopic = 'website design';
      addChatMessage('For a website, I can help you think through the structure, visual direction, responsive build and the pages your customers need. A good starting point is your goal, audience and the action you want visitors to take.');
    } else if ((lower.includes('photo') || lower.includes('photography') || lower.includes('portrait')) && !lower.includes('find') && !lower.includes('where')) {
      lastTopic = 'photography';
      addChatMessage('Photography can cover portraits, personal brands, products, events and business spaces. I can help you plan natural, useful images for your website and social platforms.');
    } else if ((lower.includes('video') || lower.includes('film') || lower.includes('reel')) && !lower.includes('find') && !lower.includes('where')) {
      lastTopic = 'videography';
      addChatMessage('Onchari creates short-form videos, event coverage and brand stories. I can help shape the idea, then connect you with the team for capture and editing.');
    } else if ((lower.includes('property') || lower.includes('real estate') || lower.includes('house') || lower.includes('listing')) && !lower.includes('find') && !lower.includes('where')) {
      lastTopic = 'property marketing';
      addChatMessage('For property marketing, we combine strong visuals with clear digital presentation so a listing makes a better first impression and attracts serious attention.');
    } else if ((lower.includes('logo') || lower.includes('poster') || lower.includes('graphic') || lower.includes('branding')) && !lower.includes('find') && !lower.includes('where')) {
      lastTopic = 'graphic design';
      addChatMessage('Onchari design includes logos, posters, campaign graphics and practical brand direction. I can help you find a visual identity that feels consistent and easy to remember.');
    } else if ((lower.includes('app') || lower.includes('mobile') || lower.includes('chichi')) && !lower.includes('find') && !lower.includes('where')) {
      lastTopic = 'app development';
      addChatMessage('Onchari also works on focused mobile experiences. Chichi is one of the live app projects, built to keep favorite people just a tap away.');
    } else if (lower.includes('how') && (lower.includes('work') || lower.includes('process'))) {
      addChatMessage('The process is simple: share what you need, I help clarify the scope, then Anthony and the team recommend, build and refine the right direction with you.');
    } else if (lower.includes('find') || lower.includes('where can i') || (lower.includes('where') && !lower.includes('based') && !lower.includes('located')) || lower.includes('looking for') || lower.includes('which page') || lower.includes('navigate')) {
      if (lower.includes('about') || lower.includes('story') || lower.includes('anthony')) {
        lastDestination = 'about.html';
        addChatMessage('You can find the company story and Anthony’s background on the About page: about.html');
      } else if (lower.includes('work') || lower.includes('portfolio') || lower.includes('project')) {
        lastDestination = 'work.html';
        addChatMessage('You can find selected projects on the Work page: work.html');
      } else if (lower.includes('contact') || lower.includes('phone') || lower.includes('email') || lower.includes('quote')) {
        lastDestination = 'contact.html';
        addChatMessage('You can find the contact form and direct details on the Contact page: contact.html. You can also request a quote here and I will guide you.');
      } else if (lower.includes('website')) {
        lastDestination = 'service.html?service=website';
        addChatMessage('You can find the Website Design details here: service.html?service=website');
      } else if (lower.includes('photography') || lower.includes('photo')) {
        lastDestination = 'service.html?service=photography';
        addChatMessage('You can find the Photography details here: service.html?service=photography');
      } else if (lower.includes('video') || lower.includes('videography')) {
        lastDestination = 'service.html?service=videography';
        addChatMessage('You can find the Videography details here: service.html?service=videography');
      } else if (lower.includes('property') || lower.includes('real estate')) {
        lastDestination = 'service.html?service=property';
        addChatMessage('You can find the Property Marketing details here: service.html?service=property');
      } else {
        addChatMessage('I can help you find the About page, Work page, Contact page, quote flow, or a service page. What are you looking for?');
      }
    } else if (lower.includes('where') || lower.includes('location') || lower.includes('nairobi') || lower.includes('kenya')) {
      addChatMessage('Onchari Group is based in Utawala, Nairobi, Kenya, and the team can work with clients remotely too.');
    } else if (lower.includes('contact') || lower.includes('email') || lower.includes('phone') || lower.includes('reach')) {
      if (lower.includes('phone') || lower.includes('number')) {
        addChatMessage('Anthony’s number is +254 750 600 715. You can also email oncharigroup@gmail.com or send your brief through the Contact page.');
      } else {
        addChatMessage('You can reach Anthony and the team at oncharigroup@gmail.com or +254 750 600 715. You can also send your brief through the Contact page.');
      }
    } else if (lower.includes('social') || lower.includes('instagram') || lower.includes('facebook') || lower.includes('tiktok')) {
      addChatMessage('You can find Onchari Group on Facebook, Instagram and TikTok through the social icons in the footer.');
    } else if ((lower.includes('take me') || lower.includes('go to') || lower.includes('show me')) && (lower.includes('service') || lower.includes('offer') || lower.includes('work'))) {
      lastDestination = 'work.html';
      addChatMessage('Taking you to the Services page, also called Work. You can compare each service and open the one that fits your goal.');
      window.setTimeout(() => { window.location.href = lastDestination; }, 450);
    } else if (lower.includes('what you offer') || lower.includes('what do you offer') || lower.includes('services you offer')) {
      lastTopic = 'Onchari Group services';
      addChatMessage('Onchari Group offers website design, photography, videography, property marketing, app development, and poster, logo and graphic design. Tell me what you are trying to achieve and I will help narrow it down.');
    } else if (lower.includes('service') || lower.includes('help') || lower.includes('do you')) {
      addChatMessage('I can guide you through website design, photography, videography, property marketing, app development, and poster, logo and graphic design. What are you hoping to improve?');
    } else if (lower.includes('work') || lower.includes('portfolio') || lower.includes('example')) {
      addChatMessage('You can explore our work from the Work page. If you share what you like, we can suggest an approach for your own project.');
    } else if (lower.includes("don't know") || lower.includes('dont know') || lower.includes('not sure') || lower.includes('no idea') || lower === 'idk') {
      addChatMessage('That is completely fine. You do not need to arrive with a perfect brief. You can tell me what feels stuck, and I will help you untangle it one small step at a time. Is it your website, visuals, content, or the direction of the business?');
    } else if (lower.includes('really') || lower.includes('are you sure') || lower.includes('seriously')) {
      addChatMessage('Really. No pressure and no mysterious agency vocabulary. Start with the messy version of the idea; I can help turn it into something clear.');
    } else if (lower.includes('who are you') || lower.includes('what can you do') || lower.includes('how can you help')) {
      addChatMessage('I am the Onchari Group Assistant, created by Anthony Onchari. I am a digital guide for the website: I can explain the services, help shape a project brief, answer questions about Onchari Group and guide you toward a quote.');
    } else if (lower.includes('thank') || lower.includes('thanks')) {
      addChatMessage('You are welcome. I am here whenever the idea is still half-formed and needs somewhere friendly to land.');
    } else if (lower.includes('how are you') || lower.includes('how is it going')) {
      addChatMessage('I am doing well and fully charged, which is more than I can say for some Nairobi Wi-Fi. What is on your mind?');
    } else if (lower.includes('brainstorm') || lower.includes('idea') || lower.includes('plan') || lower.includes('write') || lower.includes('copy')) {
      addChatMessage('I can help brainstorm, plan or shape the words. Give me the rough thought, the audience and the feeling you want, hata kama ni notes za haraka.');
    } else if (lower.includes('tell me more') || lower.includes('explain') || lower.includes('elaborate') || lower.includes('more about that')) {
      addChatMessage(`Sure. We were talking about ${lastTopic}. I can break down what it includes, suggest a practical starting point, or help you decide whether it fits your goal. Which direction would be most useful?`);
    } else if (lower === 'yes' || lower === 'yeah' || lower === 'okay' || lower === 'ok' || lower.includes('sounds good')) {
      addChatMessage(`Great. Let us keep it simple and build from ${lastTopic}. What would you like to figure out next?`);
    } else if (lower === 'no' || lower === 'nope' || lower.includes('not really')) {
      addChatMessage('No worries. We can change direction completely. What is actually on your mind?');
    } else if (lower.includes('what do you mean') || lower.includes('i do not understand') || lower.includes("i don't understand")) {
      addChatMessage('Fair question. I mean I can help turn a loose idea into a clear next step. You can explain it in your own words, even if it is rough.');
    } else if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('talk later')) {
      addChatMessage('Alright, I will be here when you are ready. Keep the idea safe until then.');
    } else if (lower.includes('sad') || lower.includes('upset') || lower.includes('hurt') || lower.includes('bad day')) {
      addChatMessage('I am sorry you are feeling that way. You do not have to solve everything in one message. I can listen, help you sort the thought out, or simply stay with the conversation for a bit.');
    } else if (lower.includes('frustrat') || lower.includes('stuck') || lower.includes('confus') || lower.includes('overwhel')) {
      addChatMessage('That sounds frustrating, and I get why it feels heavy. Let us make it smaller: what is the one part that is bothering you most right now?');
    } else if (lower.includes('excited') || lower.includes('happy') || lower.includes('amazing') || lower.includes('love it')) {
      addChatMessage('I love that energy. Now we have something to work with. Tell me what you are excited about and I will help turn it into a clear next step.');
    } else if (lower.includes('worried') || lower.includes('scared') || lower.includes('nervous') || lower.includes('afraid')) {
      addChatMessage('It makes sense to feel unsure before starting something important. We can take it slowly, look at the options and choose the smallest sensible next move.');
    } else if (lower.includes('angry') || lower.includes('annoyed') || lower.includes('terrible')) {
      addChatMessage('I hear the frustration. You can say what went wrong plainly; I will not judge you, and I will help look for a practical way forward.');
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      addChatMessage('Hey, welcome to Onchari Group. What are you working on?');
    } else {
      addChatMessage('I can try. I may not know every fact in the universe, but I can help you think, write, plan, compare options or find a practical next step. What would you like to talk through?');
    }
  };

  const queueResponse = (text) => {
    const typing = document.createElement('p');
    typing.className = 'chat-message typing';
    typing.setAttribute('aria-label', 'Assistant is typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    window.setTimeout(() => {
      typing.remove();
      respondTo(text);
    }, Math.min(1200, Math.max(500, text.length * 8)));
  };

  const queueStaticMessage = (text) => {
    const typing = document.createElement('p');
    typing.className = 'chat-message typing';
    typing.setAttribute('aria-label', 'Assistant is typing');
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    window.setTimeout(() => {
      typing.remove();
      addChatMessage(text);
    }, Math.min(1200, Math.max(500, text.length * 8)));
  };

  const openChat = (includeWelcome = true) => {
    chatPanel.classList.add('is-open');
    chatPanel.setAttribute('aria-hidden', 'false');
    chatLauncher.setAttribute('aria-expanded', 'true');
    document.body.classList.add('chat-open');
    if (includeWelcome && !chatMessages.children.length) queueStaticMessage('Hi, I am the Onchari Group Assistant. What can I help you bring to life?');
    chatInput.focus();
  };
  const closeChat = () => {
    chatPanel.classList.remove('is-open');
    chatPanel.classList.remove('quote-mode');
    chatPanel.setAttribute('aria-hidden', 'true');
    chatLauncher.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chat-open');
    document.body.classList.remove('quote-chat-open');
  };
  window.openQuoteChat = () => {
    leadStep = 1;
    chatMessages.innerHTML = '';
    chatPanel.classList.add('quote-mode');
    document.body.classList.add('quote-chat-open');
    openChat(false);
    addChatMessage('Absolutely, I can help you prepare a quote. What name should I use for you?');
  };
  chatLauncher.addEventListener('click', openChat);
  chatBackdrop.addEventListener('click', closeChat);
  chatClose.addEventListener('click', closeChat);
  chatPrompts.forEach((prompt) => prompt.addEventListener('click', () => { addChatMessage(prompt.dataset.chatPrompt, 'visitor'); queueResponse(prompt.dataset.chatPrompt); }));
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addChatMessage(text, 'visitor');
    chatInput.value = '';
    queueResponse(text);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeChat();
  });

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

const photoUrls = Object.values(import.meta.glob('./assets/WorksPhotos/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }));
const photoSlides = document.querySelectorAll('.home-team-photo-slide');

if (photoSlides.length === 2 && photoUrls.length > 1) {
  let current = 0;
  let front = 0;
  const showNext = () => {
    const next = (current + 1) % photoUrls.length;
    const incoming = photoSlides[1 - front];
    const loader = new Image();
    loader.onload = () => {
      incoming.src = photoUrls[next];
      photoSlides[front].classList.remove('is-active');
      incoming.classList.add('is-active');
      front = 1 - front;
      current = next;
    };
    loader.src = photoUrls[next];
  };
  window.setInterval(showNext, 4500);
}
