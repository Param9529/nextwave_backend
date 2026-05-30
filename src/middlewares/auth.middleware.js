const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 401,
      code: "UNAUTHORIZED",
      message: "Access token is missing or invalid"
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, orgId }
    next();
  } catch (error) {
    return res.status(403).json({
      status: 403,
      code: "FORBIDDEN",
      message: "Token is expired or invalid"
    });
  }
};

module.exports = {
  verifyToken
};
