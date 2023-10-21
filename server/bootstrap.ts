"use strict";

import type { Strapi } from "@strapi/strapi";
import { v4 } from "uuid";
import RandExp from "randexp";

export const generateUUID = (format: string) => {
  try {
    const regexFormat = new RegExp(format);
    return new RandExp(regexFormat).gen();
  } catch (error) {
    return null;
  }
};

export default ({ strapi }: { strapi: Strapi }) => {
  const { contentTypes } = strapi;
  const models = Object.keys(contentTypes).reduce((acc, key) => {
    const contentType = contentTypes[key];

    if (!key.startsWith("api")) return acc;

    const attributes = Object.keys(contentType.attributes).filter((attrKey) => {
      const attribute = contentType.attributes[attrKey];
      if (attribute.customField === "plugin::strapi-advanced-uuid.uuid") {
        return true;
      }
    });

    if (attributes.length > 0) {
      return { ...acc, [key]: attributes };
    }

    return acc;
  }, {}) as { [key: string]: string[] };

  const modelsToSubscribe = Object.keys(models);

  if (strapi.db) {
    strapi.db.lifecycles.subscribe((event) => {
      if (
        event.action === "beforeCreate" &&
        modelsToSubscribe.includes(event.model.uid)
      ) {
        models[event.model.uid].forEach((attribute) => {
          if (!event.params.data[attribute]) {
            if (event.model.attributes) {
              const options = event.model.attributes[attribute]["options"];
              if (options) {
                const uuidFormat = options["uuid-format"];
                event.params.data[attribute] = uuidFormat
                  ? generateUUID(uuidFormat)
                  : v4();
              } else {
                event.params.data[attribute] = v4();
              }
            } else {
              event.params.data[attribute] = v4();
            }
          }
        });
      }
    });
  }
};
