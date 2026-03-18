// middleware/roleMiddleware.js

exports.authorize = (...allowedRoles) => {

  return (req, res, next) => {

    try {

      /* =========================================
      AUTH CHECK
      ========================================= */

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized — please login"
        });
      }

      /* =========================================
      ROLE NORMALIZATION
      ========================================= */

      const userRole = req.user.role?.toLowerCase();

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: "User role missing"
        });
      }

      /* =========================================
      VALIDATE INPUT
      ========================================= */

      if (!allowedRoles.length) {
        console.warn("⚠ authorize() called without roles");
        return next();
      }

      const normalizedRoles = allowedRoles.map(r => r.toLowerCase());

      /* =========================================
      ACCESS CHECK
      ========================================= */

      if (!normalizedRoles.includes(userRole)) {

        console.warn(
          `🚫 Access denied → role: ${userRole}, allowed: ${normalizedRoles.join(", ")}`
        );

        return res.status(403).json({
          success: false,
          message: `Access denied: ${userRole} not allowed`
        });
      }

      /* =========================================
      ACCESS GRANTED
      ========================================= */

      next();

    } catch (err) {

      console.error("ROLE MIDDLEWARE ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Role authorization failed"
      });

    }

  };

};