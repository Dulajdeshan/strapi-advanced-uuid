"use strict";

import type { Strapi } from "@strapi/strapi";
import { v4 } from "uuid";
import * as RandExp from "randexp";
import { handleYupError } from "@strapi/utils";

// Helper function to generate a UUID based on a format
export const generateUUID = (format?: string) => {
  try {
    if (!format) {
      return v4();
    }
    const regexFormat = new RegExp(format);
    return new RandExp(regexFormat).gen();
  } catch (error) {
    return null;
  }
};

// Helper function to validate a UUID based on a format
export const validateUUID = (format: string, initialValue: string) => {
  if (format) {
    const newFormat = `^${format}$`;
    const regexFormat = new RegExp(newFormat, "i");
    return regexFormat.exec(initialValue);
  }
  return true;
};

function handleCRUDValidation(event) {
  const errorMessages: any = {
    inner: [],
  };

  Object.keys(event.model.attributes).forEach((attribute) => {
    if (
      event.model.attributes[attribute].customField ===
      "plugin::strapi-advanced-uuid.uuid"
    ) {
      // Get the initial value of the attribute
      const initialValue = event.params.data[attribute];

      // Get the options of the attribute
      const options = event.model.attributes
        ? event.model.attributes[attribute]["options"]
        : null;

      // Get the uuid-format option, if it is set
      const uuidFormat = options ? options["uuid-format"] : null;
      // Get the disable-auto-fill option, if it is set
      const disableAutoFill = options ? options["disable-auto-fill"] : false;

      // If there is no initial value and disableAutoFill is not enabled, generate a new UUID
      if (!event.params.data[attribute] && !disableAutoFill) {
        event.params.data[attribute] = generateUUID(uuidFormat);
      }

      // Validation happens on following conditions:
      // - If disableAutoFill is not enabled
      // - If there is an initial value
      if (!disableAutoFill || initialValue) {
        if (!validateUUID(uuidFormat, event.params.data[attribute])) {
          errorMessages.inner.push({
            name: "ValidationError", // Always set to ValidationError
            path: attribute, // Name of field we want to show input validation on
            message: "The UUID format is invalid.", // Input validation message
          });
        }
      }
    }
  });

  if (errorMessages.inner.length > 0) {
    handleYupError(errorMessages, "You have some issues");
  }
}

export default ({ strapi }: { strapi: Strapi }) => {
  const { contentTypes } = strapi;

  const models = Object.keys(contentTypes).reduce((acc, key) => {
    const contentType = contentTypes[key];

    if (!key.startsWith("api")) return acc;

    // Filter out content types that have the custom field "plugin::strapi-advanced-uuid.uuid"
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

  // Get the models to subscribe
  const modelsToSubscribe = Object.keys(models);

  if (strapi.db) {
    strapi.db.lifecycles.subscribe({
      models: modelsToSubscribe,
      beforeCreate(event) {
        handleCRUDValidation(event);
      },
      beforeUpdate(event) {
        handleCRUDValidation(event);
      },
    });
  }
};
