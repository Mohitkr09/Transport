// middleware/roleMiddleware.js

exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // must run AFTER protect middleware
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized — user not authenticated"
        });
      }

      if (!req.user.role) {
        return res.status(403).json({
          success: false,
          message: "User role missing"
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied for role: ${req.user.role}`
        });
      }

      next();
    } catch (err) {
      console.error("ROLE MIDDLEWARE ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Role authorization failed"
      });
    }
  };
};
