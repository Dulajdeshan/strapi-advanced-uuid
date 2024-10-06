import { prefixPluginTranslations } from "@strapi/helper-plugin";
import { attributeOptions } from "@strapi/design-system";
import * as yup from "yup";

import pluginPkg from "../../package.json";
import pluginId from "./pluginId";
import Initializer from "./components/Initializer";
import InputIcon from "./components/InputIcon";
import { getTrad } from "./utils/helpers";

const name = pluginPkg.strapi.name;

export default {
  register(app: any) {
    app.customFields.register({
      name: "uuid",
      pluginId,
      type: "string",
      intlLabel: {
        id: getTrad("form.label"),
        defaultMessage: "Advanced UUID",
      },
      intlDescription: {
        id: getTrad("form.description"),
        defaultMessage: "Generates a UUID v4",
      },
      icon: InputIcon,
      components: {
        Input: async () =>
          import(
            /* webpackChunkName: "input-uuid-component" */ "./components/Input"
          ),
      },
      options: {
        base: [
          {
            intlLabel: {
              id: getTrad("form.field.uuidFormat"),
              defaultMessage: "UUID Format",
            },
            name: "options.uuid-format",
            type: "text",
          },
          {
            sectionTitle: {
              id: getTrad("form.field.options"),
              defaultMessage: "Options",
            },
            items: [
              {
                intlLabel: {
                  id: getTrad("form.field.disableAutoFill"),
                  defaultMessage: "Disable Auto Fill",
                },
                name: "options.disable-auto-fill",
                type: "checkbox",
                description: {
                  id: "form.field.disableAutoFill.description",
                  defaultMessage:
                    "Disable initial auto fill of the UUID. UUID field will be editable when this option is enabled.",
                },
              },
              {
                intlLabel: {
                  id: getTrad("form.field.disableRegenerate"),
                  defaultMessage: "Disable Regenerate",
                },
                name: "options.disable-regenerate",
                type: "checkbox",
                description: {
                  id: "form.field.disableRegenerate.description",
                  defaultMessage: "Disable regeneration in the UI",
                },
              },
            ],
          },
        ],
        advanced: [
          {
            sectionTitle: {
              id: "global.settings",
              defaultMessage: "Settings",
            },
            items: [
              {
                name: "required",
                type: "checkbox",
                intlLabel: {
                  id: getTrad("form.attribute.item.requiredField"),
                  defaultMessage: "Required field",
                },
                description: {
                  id: getTrad("form.attribute.item.requiredField.description"),
                  defaultMessage:
                    "You won't be able to create an entry if this field is empty",
                },
              },
              {
                name: "private",
                type: "checkbox",
                intlLabel: {
                  id: "form.attribute.item.privateField",
                  defaultMessage: "Private field",
                },
                description: {
                  id: "form.attribute.item.privateField.description",
                  defaultMessage:
                    "This field will not show up in the API response",
                },
              },
            ],
          },
        ],
      },
    });

    const plugin = {
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    };

    app.registerPlugin(plugin);
  },

  bootstrap(app: any) {},

  async registerTrads(app: any) {
    const { locales } = app;

    const importedTrads = await Promise.all(
      (locales as any[]).map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
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

    return Promise.resolve(importedTrads);
  },
};
