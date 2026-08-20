import endorsementService from '../services/endorsement.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class EndorsementController {
  createEndorsement = asyncHandler(async (req, res) => {
    const endorsement = await endorsementService.createEndorsement(req.user._id, req.body);
    return ApiResponse.created(res, 'Skill endorsement created successfully', { endorsement });
  });

  getStudentEndorsements = asyncHandler(async (req, res) => {
    const endorsements = await endorsementService.getStudentEndorsements(req.params.studentId);
    return ApiResponse.ok(res, 'Endorsements fetched successfully', { endorsements });
  });

  deleteEndorsement = asyncHandler(async (req, res) => {
    await endorsementService.deleteEndorsement(req.user._id, req.params.id);
    return ApiResponse.ok(res, 'Endorsement deleted successfully');
  });
}

export default new EndorsementController();
