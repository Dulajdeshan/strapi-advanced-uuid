import { getTranslation } from './utils/getTranslation';
import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import PluginIcon from './components/PluginIcon';

export default {
  register(app: any) {
    app.customFields.register({
      name: 'uuid',
      pluginId: PLUGIN_ID,
      type: 'string',
      intlLabel: {
        id: getTranslation('form.label'),
        defaultMessage: 'Advanced UUID',
      },
      intlDescription: {
        id: getTranslation('form.description'),
        defaultMessage: 'Generates a UUID v4',
      },
      icon: PluginIcon,
      components: {
        Input: async () =>
          import(/* webpackChunkName: "input-uuid-component" */ './components/Input'),
      },
      options: {
        base: [
          {
            intlLabel: {
              id: getTranslation('form.field.uuidFormat'),
              defaultMessage: 'UUID Format',
            },
            name: 'options.uuid-format',
            type: 'text',
          },
          {
            sectionTitle: {
              id: getTranslation('form.field.options'),
              defaultMessage: 'Options',
            },
            items: [
              {
                intlLabel: {
                  id: getTranslation('form.field.disableAutoFill'),
                  defaultMessage: 'Disable Auto Fill',
                },
                name: 'options.disable-auto-fill',
                type: 'checkbox',
                description: {
                  id: 'form.field.disableAutoFill.description',
                  defaultMessage:
                    'Disable initial auto fill of the UUID. UUID field will be editable when this option is enabled.',
                },
              },
              {
                intlLabel: {
                  id: getTranslation('form.field.disableRegenerate'),
                  defaultMessage: 'Disable Regenerate',
                },
                name: 'options.disable-regenerate',
                type: 'checkbox',
                description: {
                  id: 'form.field.disableRegenerate.description',
                  defaultMessage: 'Disable regeneration in the UI',
                },
              },
            ],
          },
        ],
        advanced: [
          {
            sectionTitle: {
              id: 'global.settings',
              defaultMessage: 'Settings',
            },
            items: [
              {
                name: 'required',
                type: 'checkbox',
                intlLabel: {
                  id: getTranslation('form.attribute.item.requiredField'),
                  defaultMessage: 'Required field',
                },
                description: {
                  id: getTranslation('form.attribute.item.requiredField.description'),
                  defaultMessage: "You won't be able to create an entry if this field is empty",
                },
              },
              {
                name: 'private',
                type: 'checkbox',
                intlLabel: {
                  id: 'form.attribute.item.privateField',
                  defaultMessage: 'Private field',
                },
                description: {
                  id: 'form.attribute.item.privateField.description',
                  defaultMessage: 'This field will not show up in the API response',
                },
              },
            ],
          },
        ],
      },
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads(app: any) {
    const { locales } = app;

    const importedTranslations = await Promise.all(
      (locales as string[]).map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: getTranslation(data),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return importedTranslations;
  },
};
