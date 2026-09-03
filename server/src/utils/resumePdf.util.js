const sanitize = (value) => String(value ?? '')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[^\x20-\x7E]/g, '');

const escapePdfText = (value) => sanitize(value).replace(/([\\()])/g, '\\$1');

const wrap = (value, length = 92) => {
  const words = sanitize(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    if (`${line} ${word}`.trim().length > length && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

const resumeLines = (content) => {
  const lines = [
    { text: content.header.name, size: 18, bold: true },
    { text: content.header.contact.join(' | '), size: 9 },
  ];
  Object.entries(content.sections || {}).forEach(([heading, section]) => {
    if (!section?.items?.length) return;
    lines.push({ text: heading.toUpperCase(), size: 11, bold: true, gap: 9 });
    section.items.forEach((item) => {
      if (typeof item === 'string') wrap(item).forEach((text) => lines.push({ text, size: 9 }));
      else {
        if (item.title) lines.push({ text: item.title, size: 10, bold: true });
        if (item.meta) lines.push({ text: item.meta, size: 9 });
        (item.bullets || []).forEach((bullet) => wrap(`- ${bullet}`).forEach((text) => lines.push({ text, size: 9 })));
      }
    });
  });
  return lines;
};

/** Produces a standards-compliant, selectable-text PDF without a rendering dependency. */
export const createResumePdf = (content) => {
  const allLines = resumeLines(content);
  const pageHeight = 792;
  const margin = 48;
  const usableHeight = pageHeight - margin * 2;
  const pages = [];
  let page = [];
  let used = 0;
  allLines.forEach((line) => {
    const lineHeight = line.size + 4 + (line.gap || 0);
    if (page.length && used + lineHeight > usableHeight) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(line);
    used += lineHeight;
  });
  if (page.length) pages.push(page);

  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const pageRefs = [];
  pages.forEach((lines) => {
    const contentId = objects.length + 1;
    const pageId = contentId + 1;
    pageRefs.push(`${pageId} 0 R`);
    let y = pageHeight - margin;
    const commands = ['BT'];
    lines.forEach((line) => {
      y -= line.gap || 0;
      commands.push(`/${line.bold ? 'F2' : 'F1'} ${line.size} Tf`, `1 0 0 1 ${margin} ${y} Tm`, `(${escapePdfText(line.text)}) Tj`);
      y -= line.size + 4;
    });
    commands.push('ET');
    const stream = commands.join('\n');
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
  });
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.join(' ')}] >>`;
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
};
