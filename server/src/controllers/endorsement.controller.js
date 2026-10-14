import mongoose from 'mongoose';
import endorsementService from '../services/endorsement.service.js';
import Mentorship from '../models/mentorship.model.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

class EndorsementController {
  createEndorsement = asyncHandler(async (req, res) => {
    const alumniId = req.user._id;
    let targetStudentId = req.body.studentId;

    // Handle endpoint /mentorship/:id/endorse where :id could be mentorshipId or studentId
    if (req.params.id) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw ApiError.badRequest('Invalid identifier provided');
      }
      const mentorship = await Mentorship.findById(req.params.id);
      if (mentorship) {
        targetStudentId = mentorship.student.toString();
      } else {
        targetStudentId = req.params.id;
      }
    }

    if (!targetStudentId) {
      throw ApiError.badRequest('Student identifier is required to endorse a skill');
    }

    const { skill, notes } = req.body;
    const endorsement = await endorsementService.endorseSkill({
      alumniId,
      studentId: targetStudentId,
      skill,
      notes,
    });

    return ApiResponse.created(res, 'Skill endorsed successfully', endorsement);
  });

  getStudentEndorsements = asyncHandler(async (req, res) => {
    const studentId = req.params.studentId || req.params.id;
    const endorsements = await endorsementService.getStudentEndorsements(studentId);
    return ApiResponse.ok(res, 'Student endorsements retrieved successfully', endorsements);
  });

  getMyEndorsements = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;
    const endorsements = await endorsementService.getMyEndorsements(userId, role);
    return ApiResponse.ok(res, 'Endorsements retrieved successfully', endorsements);
  });
}

export default new EndorsementController();
