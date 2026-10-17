const logoUrl = new URL('./assets/logo/onchari-mark.png', import.meta.url).href;

const termsModal = document.querySelector('.terms-name-modal');
const termsDownload = document.querySelector('.terms-download');
const termsForm = document.querySelector('.terms-name-card');
const termsClose = document.querySelector('.terms-name-close');
const termsName = document.querySelector('#download-name');
const closeTermsModal = () => {
  termsModal.classList.remove('is-open');
  termsModal.setAttribute('aria-hidden', 'true');
};

const loadJsPdf = async () => {
  if (import.meta.env?.MODE) {
    return (await import('jspdf')).jsPDF;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('./node_modules/jspdf/dist/jspdf.umd.min.js', import.meta.url).href;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the PDF library.'));
    document.head.append(script);
  });
  if (!window.jspdf?.jsPDF) throw new Error('The PDF library did not initialize.');
  return window.jspdf.jsPDF;
};

const loadLogo = async () => {
  const image = new Image();
  image.src = logoUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext('2d').drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
};

const createTermsPdf = async (name) => {
  const jsPDF = await loadJsPdf();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const textWidth = pageWidth - margin * 2;
  const logo = await loadLogo();
  let y = 39;

  const addPageHeader = (isFirstPage = false) => {
    pdf.addImage(logo, 'PNG', margin, 10, 25, 25);
    pdf.setTextColor(11, 79, 68);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('ONCHARI GROUP', margin + 31, 17);
    pdf.setFontSize(10);
    pdf.text('GENERAL TERMS', pageWidth - margin, 17, { align: 'right' });
    pdf.setDrawColor(220, 226, 222);
    pdf.line(margin, 29, pageWidth - margin, 29);
    if (isFirstPage) {
      pdf.setTextColor(80, 90, 96);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Prepared for: ${name}`, margin + 31, 23);
    }
    y = 37;
  };

  const ensureSpace = (height) => {
    if (y + height > pageHeight - margin) {
      pdf.addPage();
      addPageHeader();
    }
  };

  const writeText = (text, { bold = false, fontSize = 9, lineHeight = 4.8, gap = 3 } = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(bold ? 30 : 75, bold ? 40 : 82, bold ? 38 : 88);
    const lines = pdf.splitTextToSize(text, textWidth);
    ensureSpace(lines.length * lineHeight + gap);
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + gap;
  };

  pdf.setProperties({ title: 'Onchari Group General Terms' });
  addPageHeader(true);

  const termsDocument = document.querySelector('.terms-document');
  for (const item of termsDocument.children) {
    if (item.classList.contains('terms-greeting')) {
      writeText(item.innerText, { bold: true, fontSize: 10, lineHeight: 5.2, gap: 5 });
    } else if (item.matches('section')) {
      const heading = item.querySelector('h2');
      if (heading) writeText(heading.innerText, { bold: true, fontSize: 11, lineHeight: 5.5, gap: 2 });
      for (const paragraph of item.querySelectorAll('p')) {
        writeText(paragraph.innerText, { gap: 3 });
      }
      y += 3;
    } else if (item.classList.contains('terms-contact')) {
      for (const line of item.querySelectorAll('strong, span')) {
        writeText(line.innerText, { bold: line.tagName === 'STRONG', gap: 2 });
      }
    }
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(110, 110, 110);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }
  pdf.save('Onchari-Group-General-Terms.pdf');
};

termsDownload.addEventListener('click', () => {
  termsModal.classList.add('is-open');
  termsModal.setAttribute('aria-hidden', 'false');
  termsName.focus();
});
termsClose.addEventListener('click', closeTermsModal);
document.querySelector('.terms-name-backdrop').addEventListener('click', closeTermsModal);
termsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = termsName.value.trim();
  if (!name) return;
  try {
    await createTermsPdf(name);
    closeTermsModal();
  } catch (error) {
    console.error('Could not generate the terms PDF.', error);
    window.alert('The PDF could not be generated. Please try again.');
  }
});
