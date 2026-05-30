const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: 401,
        code: "UNAUTHORIZED",
        message: "User information is missing"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action"
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles
};
