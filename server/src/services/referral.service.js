import Referral from '../models/referral.model.js';
import ApiError from '../utils/ApiError.js';

class ReferralService {
  async createReferral(alumniId, data) {
    const { company, role, description, requirements, applyUrl, contactEmail } = data;

    if (!company || !role) {
      throw ApiError.badRequest('Company and role are required for referral opportunities');
    }

    const referral = await Referral.create({
      alumni: alumniId,
      company: company.trim(),
      role: role.trim(),
      description: description ? description.trim() : '',
      requirements: Array.isArray(requirements)
        ? requirements.map((r) => String(r).trim()).filter(Boolean)
        : [],
      applyUrl: applyUrl ? applyUrl.trim() : null,
      contactEmail: contactEmail ? contactEmail.trim() : null,
      status: 'active',
    });

    return referral;
  }

  async getActiveReferrals() {
    return Referral.find({ status: 'active' })
      .populate('alumni', 'fullName email avatar college organization title')
      .sort({ createdAt: -1 });
  }

  async getMyReferrals(alumniId) {
    return Referral.find({ alumni: alumniId })
      .sort({ createdAt: -1 });
  }

  async deleteReferral(alumniId, referralId) {
    const referral = await Referral.findOne({
      _id: referralId,
      alumni: alumniId,
    });

    if (!referral) {
      throw ApiError.notFound('Referral opportunity not found');
    }

    await Referral.deleteOne({ _id: referralId });
    return { deleted: true };
  }
}

export default new ReferralService();
