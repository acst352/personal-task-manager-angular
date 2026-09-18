module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Desactivado: los nombres propios de productos (ESLint, GitHub,
    // InsForge, Playwright, etc.) rompen tanto lower-case como
    // sentence-case. Mantenemos los demás rules del config-conventional
    // que sí aportan valor: type-enum, header-max-length, etc.
    'subject-case': [0],
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [2, 'always', 200],
  },
};
