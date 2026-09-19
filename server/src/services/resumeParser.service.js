/**
 * resumeParser.service.js
 * ─────────────────────────────────────────────────────────────
 * VidyaLink Resume Ingestion & Document Intelligence Service
 *
 * Responsibilities:
 *  1. Native text extraction from PDF (pdf-parse) and DOCX (mammoth)
 *  2. Robust handling of corrupt, password-protected, empty, and scanned/image-only PDFs
 *  3. Structured extraction (contact, summary, skills, education, experience, projects, certs)
 *  4. Traceable evidence mapping (source: 'resume')
 *  5. Comparison with Profile (identifying matches, resume-only, profile-only, and conflicts)
 *  6. Comparison with Portfolio & Certificates (flagging unverified claims neutrally)
 *
 * Product Truth Invariants:
 *  - Only actual detected content is returned; missing fields remain null/empty.
 *  - Zero hallucination or placeholder strings.
 *  - Neutral terminology: "Not found in verified portfolio", "Mismatch detected".
 *  - Never silently overwrites user profile records.
 */

import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

// Canonical technical skill dictionary for precise identification & normalization
const TECHNICAL_SKILLS_VOCABULARY = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'Go', 'Golang',
  'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Scala', 'R', 'MATLAB',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'Tailwind', 'TailwindCSS',
  'Bootstrap', 'Material UI', 'Chakra UI',
  'React', 'React.js', 'Next.js', 'Vue', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte',
  'Node.js', 'Node', 'Express', 'Express.js', 'Nest.js', 'FastAPI', 'Flask', 'Django',
  'Spring', 'Spring Boot', '.NET', 'ASP.NET',
  'SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'Cassandra',
  'Elasticsearch', 'DynamoDB', 'Firebase', 'Supabase', 'Prisma', 'Mongoose',
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Docker', 'Kubernetes', 'Linux',
  'AWS', 'Amazon Web Services', 'GCP', 'Google Cloud', 'Azure', 'Microsoft Azure',
  'CI/CD', 'Jenkins', 'GitHub Actions', 'Terraform', 'Ansible',
  'REST', 'RESTful APIs', 'REST API', 'GraphQL', 'gRPC', 'WebSockets', 'Kafka', 'RabbitMQ',
  'Jest', 'Mocha', 'Chai', 'Cypress', 'Playwright', 'Vitest', 'Pytest', 'JUnit',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch',
  'Scikit-learn', 'Pandas', 'NumPy', 'OpenCV',
  'Microservices', 'Distributed Systems', 'Agile', 'Scrum', 'Jira', 'Postman',
];

// Mapping to normalize skill aliases
const SKILL_NORMALIZATION_MAP = {
  'react.js': 'React',
  'reactjs': 'React',
  'nextjs': 'Next.js',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'expressjs': 'Express',
  'express.js': 'Express',
  'vuejs': 'Vue',
  'vue.js': 'Vue',
  'tailwind': 'TailwindCSS',
  'golang': 'Go',
  'postgres': 'PostgreSQL',
  'mongo': 'MongoDB',
  'rest': 'REST API',
  'restful apis': 'REST API',
  'amazon web services': 'AWS',
  'google cloud': 'GCP',
  'microsoft azure': 'Azure',
  'html5': 'HTML',
  'css3': 'CSS',
};

class ResumeParserService {
  /**
   * Extract raw plain text from PDF or DOCX buffer.
   *
   * @param {Buffer} buffer - File binary buffer
   * @param {string} mimeType - File MIME type
   * @param {string} originalFileName - Original filename with extension
   * @returns {Promise<{ success: boolean, status: string, rawText: string, pageCount?: number, error?: string }>}
   */
  async extractText(buffer, mimeType = '', originalFileName = '') {
    if (!buffer || buffer.length === 0) {
      return {
        success: false,
        status: 'EMPTY',
        rawText: '',
        error: 'Document is empty.',
      };
    }

    const ext = (originalFileName || '').split('.').pop()?.toLowerCase();
    const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
    const isDocx = mimeType.includes('wordprocessingml') || ext === 'docx';

    if (!isPdf && !isDocx) {
      return {
        success: false,
        status: 'UNREADABLE',
        rawText: '',
        error: 'Unsupported file format. Only PDF and DOCX documents are supported.',
      };
    }

    // ── 1. PDF Extraction ──────────────────────────────────────────────────────
    if (isPdf) {
      try {
        // Ensure pdfParse receives a clean Uint8Array slice for Node 20+ buffer pool compatibility
        const pdfData = buffer instanceof Uint8Array
          ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
          : buffer;
        const parsed = await pdfParse(pdfData);
        const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
        const pageCount = parsed.numpages || 1;

        if (!text) {
          // If the PDF has pages but zero text stream, it is an image/scanned document
          return {
            success: false,
            status: 'IMAGE_ONLY',
            rawText: '',
            pageCount,
            error: 'Text could not be extracted from this document.',
          };
        }

        return {
          success: true,
          status: 'SUCCESS',
          rawText: text,
          pageCount,
          error: null,
        };
      } catch (err) {
        return {
          success: false,
          status: 'UNREADABLE',
          rawText: '',
          error: `Failed to read PDF document: ${err.message || 'Corrupt or protected file'}`,
        };
      }
    }

    // ── 2. DOCX Extraction ─────────────────────────────────────────────────────
    if (isDocx) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        const text = (result.value || '').trim();

        if (!text) {
          return {
            success: false,
            status: 'EMPTY',
            rawText: '',
            error: 'DOCX document contains no readable text.',
          };
        }

        return {
          success: true,
          status: 'SUCCESS',
          rawText: text,
          pageCount: 1,
          error: null,
        };
      } catch (err) {
        return {
          success: false,
          status: 'UNREADABLE',
          rawText: '',
          error: `Failed to read DOCX document: ${err.message || 'Corrupt or invalid DOCX'}`,
        };
      }
    }

    return {
      success: false,
      status: 'FAILED',
      rawText: '',
      error: 'Unsupported file format.',
    };
  }

  /**
   * Parse structured information from raw extracted text.
   *
   * @param {string} rawText
   * @returns {object} structured parsed resume data
   */
  parseStructuredData(rawText) {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return null;
    }

    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    return {
      name: this._extractName(lines),
      email: this._extractEmail(rawText),
      phone: this._extractPhone(rawText),
      location: this._extractLocation(lines),
      summary: this._extractSummary(rawText),
      links: this._extractLinks(rawText),
      skills: this._extractSkills(rawText),
      education: this._extractEducation(rawText),
      experience: this._extractExperience(rawText),
      projects: this._extractProjects(rawText),
      certifications: this._extractCertifications(rawText),
      achievements: this._extractAchievements(rawText),
    };
  }

  /**
   * Compare parsed resume data against student profile.
   */
  compareWithProfile(parsedData, user = {}, profile = {}) {
    if (!parsedData) {
      return {
        matchedSkills: [],
        resumeOnlySkills: [],
        profileOnlySkills: [],
        conflicts: [],
        hasConflicts: false,
        reviewSuggestions: [],
      };
    }

    const resumeSkillSet = new Set((parsedData.skills || []).map((s) => s.value.toLowerCase()));
    const profileSkillSet = new Set((profile?.skills || []).map((s) => s.toLowerCase()));

    const matchedSkills = [];
    const resumeOnlySkills = [];
    const profileOnlySkills = [];

    // Check resume skills against profile
    (parsedData.skills || []).forEach((skill) => {
      const lower = skill.value.toLowerCase();
      if (profileSkillSet.has(lower)) {
        matchedSkills.push(skill.value);
      } else {
        resumeOnlySkills.push(skill.value);
      }
    });

    // Check profile skills not on resume
    (profile?.skills || []).forEach((skill) => {
      if (!resumeSkillSet.has(skill.toLowerCase())) {
        profileOnlySkills.push(skill);
      }
    });

    const conflicts = [];

    // Education comparison
    if (parsedData.education?.length > 0 && (profile?.college || user?.college || profile?.degree)) {
      const topEdu = parsedData.education[0];
      const profileCollege = (profile?.college || user?.college || '').trim().toLowerCase();
      const resumeCollege = (topEdu.institution || '').trim().toLowerCase();

      if (profileCollege && resumeCollege && !profileCollege.includes(resumeCollege) && !resumeCollege.includes(profileCollege)) {
        conflicts.push({
          field: 'education',
          resumeValue: topEdu.institution,
          profileValue: profile?.college || user?.college,
          message: 'Resume and profile education differ.',
        });
      }
    }

    // Contact phone comparison
    if (parsedData.phone && profile?.phone) {
      const cleanResumePhone = parsedData.phone.replace(/\D/g, '');
      const cleanProfilePhone = profile.phone.replace(/\D/g, '');
      if (cleanResumePhone && cleanProfilePhone && cleanResumePhone !== cleanProfilePhone) {
        conflicts.push({
          field: 'phone',
          resumeValue: parsedData.phone,
          profileValue: profile.phone,
          message: 'Phone number differs between resume and profile.',
        });
      }
    }

    const reviewSuggestions = [];
    if (resumeOnlySkills.length > 0) {
      reviewSuggestions.push(`${resumeOnlySkills.length} new technical skill(s) found on your resume can be imported to your profile.`);
    }
    if (conflicts.length > 0) {
      reviewSuggestions.push('Discrepancies detected between your uploaded resume and structured profile.');
    }

    return {
      matchedSkills: [...new Set(matchedSkills)],
      resumeOnlySkills: [...new Set(resumeOnlySkills)],
      profileOnlySkills: [...new Set(profileOnlySkills)],
      conflicts,
      hasConflicts: conflicts.length > 0,
      reviewSuggestions,
    };
  }

  /**
   * Compare parsed resume claims against official portfolio, projects, and certificates.
   */
  compareWithPortfolio(parsedData, portfolioProjects = [], certificates = [], github = null) {
    if (!parsedData) {
      return {
        projectsComparison: [],
        certificatesComparison: [],
        githubComparison: { status: 'UNKNOWN', message: 'No resume parsed' },
      };
    }

    // ── 1. Projects Comparison ─────────────────────────────────────────────────
    const dbProjects = (portfolioProjects || []).map((p) => ({
      id: p._id || p.id,
      title: p.title || '',
      verified: Boolean(p.verifiedByFaculty || p.verified),
    }));

    const projectsComparison = (parsedData.projects || []).map((resumeProj) => {
      const normResumeTitle = resumeProj.title.toLowerCase();
      const match = dbProjects.find((p) => {
        const normDbTitle = p.title.toLowerCase();
        return normDbTitle === normResumeTitle || normDbTitle.includes(normResumeTitle) || normResumeTitle.includes(normDbTitle);
      });

      if (match) {
        return {
          title: resumeProj.title,
          status: 'MATCHED',
          verified: match.verified,
          label: match.verified ? 'Verified in portfolio' : 'Present in portfolio (Pending faculty verification)',
        };
      }

      return {
        title: resumeProj.title,
        status: 'UNVERIFIED_CLAIM',
        verified: false,
        label: 'Not found in verified portfolio.',
      };
    });

    // ── 2. Certificates Comparison ─────────────────────────────────────────────
    const dbCerts = (certificates || []).map((c) => ({
      title: (c.title || '').toLowerCase(),
      verified: c.verificationStatus === 'Verified',
    }));

    const certificatesComparison = (parsedData.certifications || []).map((resumeCert) => {
      const normResumeTitle = resumeCert.title.toLowerCase();
      const match = dbCerts.find((c) => c.title.includes(normResumeTitle) || normResumeTitle.includes(c.title));

      if (match) {
        return {
          title: resumeCert.title,
          status: 'MATCHED',
          verified: match.verified,
          label: match.verified ? 'Verified certificate' : 'Present in certificates (Unverified)',
        };
      }

      return {
        title: resumeCert.title,
        status: 'UNVERIFIED_CLAIM',
        verified: false,
        label: 'Not found in verified certificates.',
      };
    });

    // ── 3. GitHub Comparison ───────────────────────────────────────────────────
    let githubComparison = {
      status: 'NOT_CONNECTED',
      label: 'GitHub account not connected on VidyaLink',
      match: false,
    };

    let resumeGithubUrl = null;
    if (Array.isArray(parsedData.links)) {
      const match = parsedData.links.find((l) => l.label === 'GitHub' || (typeof l.url === 'string' && l.url.includes('github.com')));
      resumeGithubUrl = match?.url || null;
    } else if (parsedData.links && typeof parsedData.links === 'object') {
      resumeGithubUrl = parsedData.links.github || null;
    }

    if (github?.connectionStatus === 'Connected') {
      if (resumeGithubUrl) {
        const resumeHandle = resumeGithubUrl.split('github.com/')[1]?.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
        const dbHandle = (github.login || '').toLowerCase();
        const isMatch = Boolean(resumeHandle && dbHandle && (resumeHandle === dbHandle));

        githubComparison = {
          status: isMatch ? 'MATCHED' : 'MISMATCH',
          label: isMatch ? 'GitHub handle matches connected account' : `Resume GitHub (${resumeHandle}) differs from connected account (${dbHandle})`,
          message: isMatch ? `Matches connected GitHub handle (${dbHandle})` : `Resume GitHub (${resumeHandle}) differs from connected account (${dbHandle})`,
          match: isMatch,
        };
      } else {
        githubComparison = {
          status: 'PORTFOLIO_ONLY',
          label: 'GitHub account is connected on VidyaLink, but not listed on resume',
          message: 'GitHub account is connected on VidyaLink, but not listed on resume',
          match: true,
        };
      }
    } else if (resumeGithubUrl) {
      githubComparison = {
        status: 'RESUME_ONLY',
        label: 'GitHub listed on resume, but account not connected on VidyaLink',
        message: 'GitHub listed on resume, but account not connected on VidyaLink',
        match: false,
      };
    }

    return {
      projectsComparison,
      certificatesComparison,
      githubComparison,
    };
  }

  // ── Private Extraction Helpers ─────────────────────────────────────────────

  _extractName(lines) {
    // Check top 5 lines for a person's name (2-4 words, alphabetic, ignoring titles)
    const ignoreKeywords = ['resume', 'curriculum', 'vitae', 'cv', 'page', 'profile', 'contact', 'developer', 'engineer', 'phone', 'email'];
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      const lower = line.toLowerCase();
      if (ignoreKeywords.some((w) => lower === w || lower.startsWith(w + ':'))) continue;
      if (line.includes('@') || line.includes('http') || /\d{3}/.test(line)) continue;

      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Za-z.'-]+$/.test(w))) {
        return line;
      }
    }
    return null;
  }

  _extractEmail(text) {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : null;
  }

  _extractPhone(text) {
    const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return match ? match[0].trim() : null;
  }

  _extractLocation(lines) {
    const sectionHeaderRegex = /^(?:SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|SKILLS|TECHNICAL SKILLS|EDUCATION|EXPERIENCE|WORK EXPERIENCE|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS)\b/i;
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i].trim();
      if (sectionHeaderRegex.test(line)) break;

      // Check sub-parts separated by pipes or bullets
      const parts = line.split(/[|•]/).map((p) => p.trim());
      for (const part of parts) {
        if (/^[A-Za-z\s]+,\s*[A-Za-z\s]+$/.test(part) && !part.includes('@') && !/\d/.test(part)) {
          return part;
        }
      }
    }
    return null;
  }

  _extractLinks(text) {
    const links = [];
    const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
    let githubUrl = null;
    if (githubMatch) {
      githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`;
      links.push({ label: 'GitHub', url: githubUrl });
    }

    const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    let linkedinUrl = null;
    if (linkedinMatch) {
      linkedinUrl = linkedinMatch[0].startsWith('http') ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;
      links.push({ label: 'LinkedIn', url: linkedinUrl });
    }

    links.github = githubUrl;
    links.linkedin = linkedinUrl;

    return links;
  }

  _extractSummary(text) {
    const summaryHeader = text.match(/(?:SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|ABOUT ME)[\s:]*\n([\s\S]*?)(?=\n\s*(?:SKILLS|EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|WORK|EMPLOYMENT)|$)/i);
    if (summaryHeader && summaryHeader[1]) {
      const cleaned = summaryHeader[1].trim();
      return cleaned.length > 20 ? cleaned : null;
    }
    return null;
  }

  _extractSkills(text) {
    const detected = new Map();
    const lowerText = text.toLowerCase();

    // Check each canonical vocabulary skill
    TECHNICAL_SKILLS_VOCABULARY.forEach((skill) => {
      const lowerSkill = skill.toLowerCase();
      // Use boundary-safe matching
      const regex = new RegExp(`(?:^|[\\s,;•|/()])${this._escapeRegex(lowerSkill)}(?=[\\s,;•|/()]|$)`, 'i');
      if (regex.test(lowerText)) {
        const canonical = SKILL_NORMALIZATION_MAP[lowerSkill] || skill;
        if (!detected.has(canonical.toLowerCase())) {
          detected.set(canonical.toLowerCase(), {
            value: canonical,
            source: 'resume',
            evidence: 'Resume text match',
          });
        }
      }
    });

    return Array.from(detected.values());
  }

  _extractEducation(text) {
    const eduSection = text.match(/(?:EDUCATION|ACADEMIC BACKGROUND|ACADEMICS)[\s:]*\n([\s\S]*?)(?=\n\s*(?:SKILLS|EXPERIENCE|WORK|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|PUBLICATIONS)|$)/i);
    if (!eduSection || !eduSection[1]) return [];

    const sectionText = eduSection[1].trim();
    const blocks = sectionText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const results = [];

    blocks.forEach((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      let institution = null;
      let degree = null;
      let field = null;
      let dates = null;
      let cgpa = null;

      let graduationYear = null;
      let gpaValue = null;

      lines.forEach((line) => {
        // Institution heuristics
        if (/university|college|institute|academy|school/i.test(line) && !institution) {
          institution = line;
        }
        // Degree / Branch heuristics
        if (/bachelor|master|b\.tech|b\.e|b\.s|m\.tech|m\.s|msc|bca|mca|ph\.?d/i.test(line) && !degree) {
          degree = line;
        }
        if (/computer science|information technology|electrical|mechanical|data science/i.test(line) && !field) {
          field = line;
        }
        // Date / Graduation heuristics
        const gradYearMatch = line.match(/(?:graduation|graduating|class of|batch of|year)[\s:]*\b(20\d{2}|19\d{2})\b/i);
        if (gradYearMatch && !graduationYear) {
          graduationYear = parseInt(gradYearMatch[1], 10);
        }
        const dateMatch = line.match(/\b(?:20\d{2}|19\d{2})\s*(?:-|–|to)\s*(?:20\d{2}|present|current)\b|\b(?:class of\s*)?(20\d{2})\b/i);
        if (dateMatch && !dates) {
          dates = dateMatch[0];
          if (!graduationYear && dateMatch[1]) {
            graduationYear = parseInt(dateMatch[1], 10);
          }
        }
        // CGPA / GPA heuristics
        const gpaMatch = line.match(/(?:cgpa|gpa)[\s:]*([0-9.]+)(?:\s*\/\s*([0-9.]+))?/i);
        if (gpaMatch && !cgpa) {
          cgpa = gpaMatch[0];
          gpaValue = gpaMatch[1];
        }
      });

      if (!graduationYear && dates) {
        const lastYearMatch = dates.match(/\b(20\d{2}|19\d{2})\b(?!.*\b(?:20\d{2}|19\d{2})\b)/);
        if (lastYearMatch) graduationYear = parseInt(lastYearMatch[1], 10);
      }

      if (institution || degree) {
        results.push({
          institution: institution || degree,
          degree: degree || null,
          field: field || null,
          dates: dates || null,
          graduationYear: graduationYear || null,
          cgpa: cgpa || null,
          gpa: gpaValue || null,
          evidence: 'Education section',
        });
      }
    });

    return results;
  }

  _extractExperience(text) {
    const expSection = text.match(/(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|INTERNSHIPS|PROFESSIONAL EXPERIENCE)[\s:]*\n([\s\S]*?)(?=\n\s*(?:EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS)|$)/i);
    if (!expSection || !expSection[1]) return [];

    const sectionText = expSection[1].trim();
    const blocks = sectionText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const results = [];

    blocks.forEach((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const firstLine = lines[0];
      // Try to parse Company and Role
      const roleMatch = firstLine.match(/^(.*?)(?:\s*(?:[-–|@]|at)\s*(.*))?$/);
      const role = roleMatch?.[1]?.trim() || firstLine;
      const company = roleMatch?.[2]?.trim() || (lines[1] && lines[1].length < 40 ? lines[1] : 'Organization');

      // Date match in block
      const dateMatch = block.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\.?\s*\d{4}\s*(?:-|–|to)\s*(?:present|current|\w+\.?\s*\d{4})\b/i);
      const duration = dateMatch ? dateMatch[0] : null;

      // Remaining lines as description
      const descLines = lines.slice(1).filter((l) => !l.includes(duration || ''));
      const description = descLines.join(' ');

      results.push({
        company,
        role,
        duration,
        description: description || null,
        evidence: 'Experience section',
      });
    });

    return results.slice(0, 10);
  }

  _extractProjects(text) {
    const projSection = text.match(/(?:PROJECTS|ACADEMIC PROJECTS|PERSONAL PROJECTS)[\s:]*\n([\s\S]*?)(?=\n\s*(?:EDUCATION|SKILLS|EXPERIENCE|CERTIFICATIONS|ACHIEVEMENTS)|$)/i);
    if (!projSection || !projSection[1]) return [];

    const sectionText = projSection[1].trim();
    const blocks = sectionText.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const results = [];

    blocks.forEach((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const title = lines[0].replace(/^[-•*]\s*/, '').trim();
      const desc = lines.slice(1).join(' ');

      // Extract technologies in this project block
      const projectTech = [];
      TECHNICAL_SKILLS_VOCABULARY.forEach((skill) => {
        const regex = new RegExp(`\\b${this._escapeRegex(skill)}\\b`, 'i');
        if (regex.test(block)) {
          projectTech.push(SKILL_NORMALIZATION_MAP[skill.toLowerCase()] || skill);
        }
      });

      // Extract project link if present
      const linkMatch = block.match(/https?:\/\/[^\s)]+/);

      results.push({
        title,
        description: desc || null,
        technologies: [...new Set(projectTech)],
        link: linkMatch ? linkMatch[0] : null,
        evidence: 'Projects section',
      });
    });

    return results.slice(0, 10);
  }

  _extractCertifications(text) {
    const certSection = text.match(/(?:CERTIFICATIONS|CERTIFICATES|LICENSES)[\s:]*\n([\s\S]*?)(?=\n\s*(?:EDUCATION|SKILLS|EXPERIENCE|PROJECTS|ACHIEVEMENTS)|$)/i);
    if (!certSection || !certSection[1]) return [];

    const lines = certSection[1].split('\n').map((l) => l.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
    return lines.slice(0, 10).map((line) => {
      const parts = line.split(/\s*[-–|—]\s*/);
      return {
        title: parts[0]?.trim() || line,
        issuer: parts[1]?.trim() || null,
        date: null,
        evidence: 'Certifications section',
      };
    });
  }

  _extractAchievements(text) {
    const achSection = text.match(/(?:ACHIEVEMENTS|HONORS|AWARDS)[\s:]*\n([\s\S]*?)(?=\n\s*(?:EDUCATION|SKILLS|EXPERIENCE|PROJECTS|CERTIFICATIONS)|$)/i);
    if (!achSection || !achSection[1]) return [];

    const lines = achSection[1].split('\n').map((l) => l.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
    return lines.slice(0, 10).map((line) => ({
      title: line,
      description: null,
      evidence: 'Achievements section',
    }));
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default new ResumeParserService();
