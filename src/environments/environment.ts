/**
 * Environment configuration.
 *
 * IMPORTANT — security model:
 * The InsForge anonKey is a PUBLISHABLE client-side credential (same
 * model as Supabase's anon key). It's designed to be visible in the
 * browser bundle. The actual data protection comes from RLS policies
 * on the backend, NOT from hiding this key.
 *
 * If this key ever leaks into a place you don't control (e.g. a public
 * commit history), rotate it via the InsForge dashboard. RLS keeps your
 * data safe regardless of who has the key.
 *
 * If you want stricter hygiene (e.g. you have other secrets like a CI
 * deploy token), use the docs/environment-management.md guide.
 */
export const environment = {
  production: false,
  insforge: {
    baseUrl: 'https://re3mwsvq.us-east.insforge.app',
    anonKey: 'ik_b91c9f0f0c6e8824e0b7242d56609ad1',
  },
};
