import { config, fields, singleton } from '@keystatic/core';

// Local storage during development; switch to GitHub storage for production
// (requires a GitHub App — see README) so staff can edit from the live site.
const storage =
  import.meta.env.KEYSTATIC_STORAGE === 'github'
    ? ({
        kind: 'github',
        repo: {
          owner: import.meta.env.KEYSTATIC_GITHUB_REPO_OWNER,
          name: import.meta.env.KEYSTATIC_GITHUB_REPO_NAME,
        },
      } as const)
    : ({ kind: 'local' } as const);

export default config({
  storage,
  ui: {
    brand: { name: "Pa's Place" },
  },
  singletons: {
    settings: singleton({
      label: 'Site Settings',
      path: 'src/content/settings',
      format: { data: 'json' },
      schema: {
        siteName: fields.text({
          label: 'Site name',
          defaultValue: "Pa's Place",
          validation: { isRequired: true },
        }),
        contact: fields.object(
          {
            phone: fields.text({ label: 'Phone number' }),
            email: fields.text({ label: 'Email address' }),
            address: fields.text({ label: 'Physical address', multiline: true }),
          },
          { label: 'Contact details' }
        ),
      },
    }),
  },
});
