export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (message) => /^\s*\[(ImgBot|dependabot|bot)\]/i.test(message.trim()),
  ],
  rules: {
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [1, "always", 100],
    "footer-max-line-length": [1, "always", 100],
  },
};

