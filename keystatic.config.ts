import { collection, config, fields, singleton } from '@keystatic/core';

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
        tagline: fields.text({
          label: 'Tagline',
          description: 'Short line shown in the footer and page metadata.',
        }),
        contact: fields.object(
          {
            person: fields.text({ label: 'Contact person' }),
            phone: fields.text({ label: 'Phone number (display)' }),
            phoneLink: fields.text({
              label: 'Phone number (dialable, e.g. +27731234567)',
            }),
            email: fields.text({ label: 'Email address' }),
            address: fields.text({ label: 'Physical address', multiline: true }),
            mapUrl: fields.url({ label: 'Google Maps link' }),
          },
          { label: 'Contact details' }
        ),
        pricing: fields.object(
          {
            accommodation: fields.text({
              label: 'Accommodation rate',
              description: 'e.g. "R200 per person per night (minimum 4 people)"',
            }),
            venue: fields.text({
              label: 'Venue hire rate',
              description: 'e.g. "R80 per person (minimum 10 people, R500 deposit)"',
            }),
          },
          { label: 'Pricing' }
        ),
      },
    }),
    homepage: singleton({
      label: 'Home Page',
      path: 'src/content/homepage',
      format: { data: 'json' },
      schema: {
        heroEyebrow: fields.text({ label: 'Hero eyebrow (small top line)' }),
        heroTitle: fields.text({ label: 'Hero headline', multiline: true }),
        heroSubtitle: fields.text({ label: 'Hero subtitle', multiline: true }),
        heroImage: fields.image({
          label: 'Hero photo',
          description:
            'The big photo at the top of the home page. Currently an AI placeholder — replace with a real photo any time.',
          directory: 'src/assets/images',
          publicPath: '/src/assets/images/',
        }),
      },
    }),
  },
  collections: {
    gallery: collection({
      label: 'Photo Gallery',
      slugField: 'title',
      path: 'src/content/gallery/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        image: fields.image({
          label: 'Photo',
          description:
            'Currently AI placeholders — replace with real photos of Pa’s Place any time.',
          directory: 'src/assets/images/gallery',
          publicPath: '/src/assets/images/gallery/',
          validation: { isRequired: true },
        }),
        alt: fields.text({
          label: 'Image description (for screen readers)',
          validation: { isRequired: true },
        }),
        caption: fields.text({ label: 'Caption (shown under the photo)' }),
        order: fields.integer({
          label: 'Display order',
          description: 'Lower numbers show first.',
          defaultValue: 0,
        }),
      },
    }),
  },
});
