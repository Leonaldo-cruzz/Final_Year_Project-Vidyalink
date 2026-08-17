import Shortlist from '../models/shortlist.model.js';
import Profile from '../models/profile.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';

class ShortlistService {
  /**
   * Shortlist a student candidate for the authenticated recruiter.
   * @param {string} recruiterId
   * @param {string} studentId
   * @param {string|null} notes
   * @returns {Promise<Object>}
   */
  async shortlistCandidate(recruiterId, studentId, notes = null) {
    // 1. Verify candidate is a valid active student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student' || student.status === 'blocked') {
      throw ApiError.notFound('Student candidate not found or unavailable for recruitment');
    }

    // 2. Check existing shortlist record
    const existing = await Shortlist.findOne({ recruiterId, studentId });

    if (existing) {
      if (existing.status === 'SHORTLISTED') {
        throw ApiError.conflict('Candidate is already in your active shortlist');
      }

      // Re-activate previously removed candidate
      existing.status = 'SHORTLISTED';
      if (notes !== undefined) existing.notes = notes;
      await existing.save();

      return existing;
    }

    // 3. Create new shortlist record
    const newShortlist = await Shortlist.create({
      recruiterId,
      studentId,
      notes: notes || null,
      status: 'SHORTLISTED',
    });

    return newShortlist;
  }

  /**
   * Get all candidates shortlisted by the authenticated recruiter with pagination.
   * @param {string} recruiterId
   * @param {Object} queryOptions
   * @returns {Promise<{shortlists: Array, pagination: Object}>}
   */
  async getShortlists(recruiterId, queryOptions = {}) {
    const page = Number.parseInt(queryOptions.page, 10) || 1;
    const limit = Number.parseInt(queryOptions.limit, 10) || 20;
    const { status = 'SHORTLISTED' } = queryOptions;

    const query = { recruiterId };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [total, shortlists] = await Promise.all([
      Shortlist.countDocuments(query),
      Shortlist.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'studentId',
          select: 'fullName email avatar college branch role',
        })
        .lean(),
    ]);

    // Fetch corresponding student profiles in batch
    const studentUserIds = shortlists
      .map((s) => s.studentId?._id)
      .filter(Boolean);

    const profiles = await Profile.find({ user: { $in: studentUserIds } })
      .select('user fullName headline college branch graduationYear skills profilePicture')
      .lean();

    const profileMap = new Map(profiles.map((p) => [String(p.user), p]));

    const formattedShortlists = shortlists.map((entry) => {
      const studentUser = entry.studentId;
      const studentProfile = studentUser ? profileMap.get(String(studentUser._id)) : null;

      return {
        id: String(entry._id),
        studentId: studentUser ? String(studentUser._id) : null,
        candidateName: studentProfile?.fullName || studentUser?.fullName || 'Unknown Candidate',
        email: studentUser?.email || null,
        profilePhoto: studentProfile?.profilePicture || studentUser?.avatar || null,
        headline: studentProfile?.headline || null,
        college: studentProfile?.college || studentUser?.college || 'Not specified',
        branch: studentProfile?.branch || studentUser?.branch || 'Not specified',
        graduationYear: studentProfile?.graduationYear || null,
        skills: studentProfile?.skills || [],
        notes: entry.notes,
        status: entry.status,
        shortlistedAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      shortlists: formattedShortlists,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Remove a student candidate from recruiter shortlist.
   * @param {string} recruiterId
   * @param {string} studentId
   * @returns {Promise<Object>}
   */
  async removeFromShortlist(recruiterId, studentId) {
    const entry = await Shortlist.findOne({
      recruiterId,
      studentId,
      status: 'SHORTLISTED',
    });

    if (!entry) {
      throw ApiError.notFound('Candidate is not currently in your active shortlist');
    }

    entry.status = 'REMOVED';
    await entry.save();

    return {
      message: 'Candidate successfully removed from shortlist',
      studentId,
      status: 'REMOVED',
    };
  }
}

const shortlistService = new ShortlistService();
export default shortlistService;
