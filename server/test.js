const bcrypt = require("bcryptjs");

(async () => {
  const result = await bcrypt.compare("090909", "$2b$10$KsZIYEiSnYggGH9X1Bes/3Nwd.E9UudmzvL/yHcUtMTy1iqC0a");

  console.log("Match:", result);
})();