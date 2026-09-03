# ATS-friendly resume generation

## Workflow

Students open `/student/resume-builder`, select a target role and only the verified projects and certificates they want to include, then generate a preview and downloadable PDF. Every generation creates a new immutable version. Updating the saved configuration marks that version stale; regeneration produces the next version rather than replacing it.

## Data and privacy rules

The generator derives the owner exclusively from the JWT. It fetches the student profile plus selected projects and certificates on the server and rejects any source ID that is not both owned by that student and `Verified`. Rejected and pending records cannot be included. The current data model has no verified experience or achievement entity, so those sections are omitted instead of being filled with claims.

Generated documents are private to their owner. Download, view, update, regeneration, and deletion query by both document ID and authenticated owner ID. No tokens, passwords, prompts, or private credentials are included in content or PDFs.

## Template and PDF

The sole template is a plain, single-column layout with conventional headings. It avoids tables, images, columns, and decorative content. PDF generation uses embedded Helvetica text commands, so the PDF text is selectable and machine-readable. Project descriptions and technology lists are copied from the verified record; the generator does not create metrics or factual claims.

## Freshness and ATS

Each document records the profile timestamp and latest selected portfolio-source timestamp. Reading a document compares those timestamps and marks it `STALE` if its inputs changed. The UI asks the student to regenerate stale versions.

This repository does not currently expose the stated existing ATS analysis service (the `ai-service` is documented as under development), so the generator deliberately does not add a second scoring algorithm. Set `ATS_ANALYSIS_URL` to the existing service endpoint to enable the adapter. It posts the structured generated resume and target-job context, saves the provider result in `atsAnalysis`, and displays its score, matched skills, missing keywords, and recommendations. Without that configuration the UI clearly reports that analysis is unavailable.
