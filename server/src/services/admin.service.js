import mongoose from 'mongoose';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const PUBLIC_USER_FIELDS = [
  '_id',
  'fullName',
  'email',
  'role',
  'status',
  'avatar',
  'college',
  'branch',
  'graduationYear',
  'isEmailVerified',
  'createdAt',
  'updatedAt',
].join(' ');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getUserOrThrow = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw ApiError.badRequest('Invalid user ID');
  }

  const user = await User.findById(userId).select(PUBLIC_USER_FIELDS);
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

const ensureNotSelfModification = (actorId, targetId) => {
  if (String(actorId) === String(targetId)) {
    throw ApiError.badRequest('Administrators cannot change their own role or account status');
  }
};

const ensureUsableAdminRemains = async (target, nextValues) => {
  const removesUsableAdmin = target.role === 'admin'
    && target.status === 'active'
    && (nextValues.role !== 'admin' || nextValues.status !== 'active');

  if (!removesUsableAdmin) return;

  const remainingAdmins = await User.countDocuments({
    _id: { $ne: target._id },
    role: 'admin',
    status: 'active',
  });

  if (remainingAdmins === 0) {
    throw ApiError.conflict('This change would remove the last active administrator');
  }
};

class AdminService {
  async getUsers({ page, limit, search, role, status, sortBy, sortOrder }) {
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      // Anchored, escaped queries avoid operator injection and can use indexes where available.
      const searchRegex = new RegExp(`^${escapeRegExp(search)}`, 'i');
      filter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: -1 };
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(PUBLIC_USER_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUser(userId) {
    return getUserOrThrow(userId);
  }

  async updateUserStatus(actorId, userId, status) {
    ensureNotSelfModification(actorId, userId);
    const user = await getUserOrThrow(userId);
    await ensureUsableAdminRemains(user, { role: user.role, status });

    if (user.status === status) return user;

    user.status = status;
    await user.save();
    logger.info('Administrator changed account status', {
      actorId: String(actorId),
      targetUserId: String(user._id),
      status,
    });
    return user;
  }

  async updateUserRole(actorId, userId, role) {
    ensureNotSelfModification(actorId, userId);
    const user = await getUserOrThrow(userId);
    await ensureUsableAdminRemains(user, { role, status: user.status });

    if (user.role === role) return user;

    user.role = role;
    await user.save();
    logger.info('Administrator changed account role', {
      actorId: String(actorId),
      targetUserId: String(user._id),
      role,
    });
    return user;
  }
}

export default new AdminService();
