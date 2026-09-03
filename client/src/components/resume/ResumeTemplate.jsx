import React from 'react';

const ResumeTemplate = ({ content }) => {
  if (!content) return <p className="text-sm text-slate-500">Generate a resume to see its ATS-friendly preview.</p>;
  return (
    <article className="bg-white text-slate-900 mx-auto max-w-[8.5in] min-h-[11in] p-8 shadow-2xl font-sans text-sm leading-relaxed">
      <header className="border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{content.header?.name}</h1>
        <p className="text-xs mt-1 break-words">{content.header?.contact?.join(' | ')}</p>
      </header>
      {Object.entries(content.sections || {}).map(([heading, section]) => (
        <section key={heading} className="mb-4 break-inside-avoid">
          <h2 className="text-xs font-bold tracking-widest border-b border-slate-400 pb-1 mb-2">{heading.toUpperCase()}</h2>
          {section.items.map((item, index) => typeof item === 'string' ? (
            <p key={`${heading}-${index}`} className="mb-1">{item}</p>
          ) : (
            <div key={`${heading}-${index}`} className="mb-2">
              <p className="font-bold">{item.title}</p>
              {item.meta && <p className="text-xs">{item.meta}</p>}
              {item.bullets?.length > 0 && <ul className="list-disc pl-5 mt-1">{item.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul>}
            </div>
          ))}
        </section>
      ))}
    </article>
  );
};

export default ResumeTemplate;
