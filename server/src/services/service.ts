import { Core, Schema, UID } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { generateUUID, isValidUUIDValue } from '../../../admin/src/utils/helpers';
import type { Event } from '@strapi/database/dist/lifecycles/types';

const { YupValidationError } = errors;

function isAdvancedUUIDField(attribute: Record<string, any>): attribute is Schema.Attribute.CustomField<'uid', {
  "disable-auto-fill": boolean, 
  "disable-regenerate": boolean,
  "uuid-format": string
}> {
  return attribute.customField === 'plugin::strapi-advanced-uuid.uuid';
}

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Strapi 🚀';
  },
  async handleCRUDOperation(event: Event) {
    const errorMessages: any = {
      inner: [],
    };

    for (const attribute of Object.keys(event.model.attributes)) {
      const attributeValue = event.model.attributes[attribute];
      if (isAdvancedUUIDField(attributeValue)) {
        // Get the initial value of the attribute
        const initialValue = event.params.data[attribute];

        // Get the options of the attribute
        const options = attributeValue['options'];

        // Get the uuid-format option, if it is set
        const uuidFormat = options ? options['uuid-format'] : null;
        // Get the disable-auto-fill option, if it is set
        const disableAutoFill = options ? options['disable-auto-fill'] : false;

        // Get the disable-regenerate option, if it is set
        const disableRegenerate = options ? options['disable-regenerate'] : false;

        // Philosophy: With the correct configuration, the UUID for a resource should be completely constant and never change.
        // We should be able to use a UUID to point to a specific resource, or more specifically, a group of resources.
        // Strapis documentId does exactly this, but is not customizable. 
        // They can also change over time due to database migrations that strapi runs in the background.
        // We effectively want to replicate the behavior of documentId but make it customizable and predictable.
        // Once generated, The UUID should be immutable unless it becomes invalid.
        // It should be the same across all locales (if localized is disabled) and across both published and draft versions of a resource.
        // It should not be able to be replaced with another value once generated unless the regex was changed.

        // Check if this is updating from another document and we were given a documentId and the UUID was not included in the data to update:
        if ((!initialValue || initialValue == '') && event.action == 'beforeUpdate' && event.params.where.documentId) {
          try {
            const existingDocument = await strapi.db.queryBuilder(event.model.uid as UID.ContentType).select('*').where(event.params.where).first().execute<{ id: string | number }>({ mapResults: false })

            if (existingDocument) {
              const existingUUID = existingDocument[attribute];
              if (existingUUID) {
                event.params.data[attribute] = existingUUID;
              }
            }
          } catch (error) {
            console.error('Error fetching document:', error);
          }
        }

        if (event.action == 'beforeCreate' && !(attributeValue as any).pluginOptions?.i18n?.localized && event.params.data.documentId) {
          // Check the default locale entry first
          let document = await strapi.documents(event.model.uid as UID.ContentType).findOne({
            documentId: event.params.data.documentId,
            status: 'published'
          });

          // If no document was found, also check for a draft document
          if (!document) {
            document = await strapi.documents(event.model.uid as UID.ContentType).findOne({
              documentId: event.params.data.documentId,
              status: 'draft'
            });
          }

          if (document) {
            event.params.data[attribute] = document[attribute];
          } else {
            const locales = await strapi.db.queryBuilder('plugin::i18n.locale').select('*').execute<[{ code: string }] | null>({ mapResults: false })
            
            // If we have locales, lets loop through them and find documents for each locale until we find one with a value for the attribute
            if (locales && locales.length > 0) {
              for (const locale of locales) {
                // If the locale is the same as the current locale we are creating, skip it
                if (locale.code == event.params.data.locale) continue;

                try {
                  let document = await strapi.documents(event.model.uid as UID.ContentType).findOne({
                    documentId: event.params.data.documentId,
                    locale: locale.code,
                    status: 'published'
                  });

                  // If no document was found, also check for a draft document
                  if (!document) {
                    document = await strapi.documents(event.model.uid as UID.ContentType).findOne({
                      documentId: event.params.data.documentId,
                      locale: locale.code,
                      status: 'draft'
                    });
                  }

                  if (document) {
                    const existingUUID = document[attribute];
                    if (existingUUID) {
                      event.params.data[attribute] = existingUUID;
                    }
                    break;
                  }
                } catch (error) {
                  console.error('Error fetching document:', error);
                }
              }
            }
          }
        }

        // If there is no initial value and disableAutoFill is not enabled, generate a new UUID
        if (!event.params.data[attribute] && !disableAutoFill) {
          event.params.data[attribute] = generateUUID(uuidFormat);
        }

        // If there is an initial value and disableRegenerate is enabled,
        // we don't want to change the UUID from the current value, if the current value is valid
        if (event.action == 'beforeUpdate' && event.params.data.documentId && disableRegenerate) {
          // Check the default locale entry first
          let document = await strapi.documents(event.model.uid as UID.ContentType).findOne({
            documentId: event.params.data.documentId,
            status: 'published'
          });

          // If no document was found, also check for a draft document
          if (!document) {
            document = await strapi.documents(event.model.uid as UID.ContentType).findOne({
              documentId: event.params.data.documentId,
              status: 'draft'
            });
          }

          if (document) {
            const existingUUID = document[attribute];
            if (existingUUID && isValidUUIDValue(uuidFormat, existingUUID)) {
              event.params.data[attribute] = existingUUID;
            }
          }
        }

        // Validation happens on following conditions:
        // - If disableAutoFill is not enabled
        // - If there is an initial value
        if (!disableAutoFill || initialValue) {
          if (!isValidUUIDValue(uuidFormat, event.params.data[attribute])) {
            errorMessages.inner.push({
              name: 'ValidationError', // Always set to ValidationError
              path: attribute, // Name of field we want to show input validation on
              message: 'The UUID format is invalid.', // Input validation message
            });
          }
        }
      }
    }

    if (errorMessages.inner.length > 0) {
      throw new YupValidationError(errorMessages, 'You have some issues');
    }
  },
});

export default service;
