import ApiError from '../utils/ApiError.js';

const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication is required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. Required role(s): ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

export default authorize;
