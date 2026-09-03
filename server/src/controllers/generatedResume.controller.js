import resumeGeneratorService from '../services/resumeGenerator.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const generate = asyncHandler(async (req, res) => ApiResponse.created(res, 'Resume generated successfully', await resumeGeneratorService.generate(req.user, req.body)));
const list = asyncHandler(async (req, res) => ApiResponse.ok(res, 'Generated resumes fetched successfully', await resumeGeneratorService.list(req.user._id)));
const get = asyncHandler(async (req, res) => ApiResponse.ok(res, 'Generated resume fetched successfully', await resumeGeneratorService.get(req.user._id, req.params.id)));
const update = asyncHandler(async (req, res) => ApiResponse.ok(res, 'Resume settings updated. Regenerate to create a new version.', await resumeGeneratorService.update(req.user._id, req.params.id, req.body)));
const remove = asyncHandler(async (req, res) => { await resumeGeneratorService.remove(req.user._id, req.params.id); return ApiResponse.ok(res, 'Generated resume deleted successfully'); });
const regenerate = asyncHandler(async (req, res) => ApiResponse.created(res, 'New resume version generated successfully', await resumeGeneratorService.regenerate(req.user, req.params.id)));
const download = asyncHandler(async (req, res) => {
  const { document, pdf } = await resumeGeneratorService.download(req.user._id, req.params.id);
  const safeName = document.content.header.name.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '') || 'resume';
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${safeName}-resume-v${document.version}.pdf"`, 'Content-Length': pdf.length });
  return res.status(200).send(pdf);
});

export default { generate, list, get, update, remove, regenerate, download };
