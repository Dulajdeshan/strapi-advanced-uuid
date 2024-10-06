import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { PLUGIN_ID } from '../../admin/src/pluginId';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  const { contentTypes } = strapi;

  const models = Object.keys(contentTypes).reduce((acc, key) => {
    const contentType = contentTypes[key];

    // Filter out content types that have the custom field "plugin::strapi-advanced-uuid.uuid"
    const attributes = Object.keys(contentType.attributes).filter((attrKey) => {
      const attribute = contentType.attributes[attrKey];
      if (attribute.customField === 'plugin::strapi-advanced-uuid.uuid') {
        return true;
      }
    });

    if (attributes.length > 0) {
      return { ...acc, [key]: attributes };
    }

    return acc;
  }, {}) as { [key: string]: string[] };

  // Get the models to subscribe
  const modelsToSubscribe = Object.keys(models);

  if (strapi.db) {
    strapi.db.lifecycles.subscribe({
      models: modelsToSubscribe,
      beforeCreate(event) {
        strapi.plugin(PLUGIN_ID).service('service').handleCRUDOperation(event);
      },
      beforeUpdate(event) {
        strapi.plugin(PLUGIN_ID).service('service').handleCRUDOperation(event);
      },
    });
  }
};

export default bootstrap;
