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

    // console.log('advanced uuid event', JSON.stringify(event, null, 2));
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
        
        /************** BEFORE CREATE **************/
        if (event.action == 'beforeCreate') {
          // If there is no initial value and disableAutoFill is not enabled, generate a new UUID
          if ((!initialValue || initialValue == '') && !disableAutoFill) {
            event.params.data[attribute] = generateUUID(uuidFormat);
          }

          // If a documentId was provided on create, then this is a locale version of a document.
          if (!(attributeValue as any).pluginOptions?.i18n?.localized && event.params.data.documentId) {
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
        }



        /************** BEFORE UPDATE **************/
        if (event.action == 'beforeUpdate') {
          // Check if this is updating from another document and we were given a documentId and the UUID was not included in the data to update:
          // This can happen when creating or updating a locale version of a document.
          if ((!initialValue || initialValue == '') && event.params.where.documentId) {
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
          
          // if there is an inital value and we are not allowed to regenerate the UUID, just drop the value from the data
          else if (initialValue && disableRegenerate) {
            event.params.data[attribute] = undefined;
          }

          // TODO: If we are updating a document and it has no inital value,
          // either we are updating via api call and not providing a value, or the document has no value stored.
          // Should we check if the document has a stored value? If it doesn't, should we give it one?

          else if ((!initialValue || initialValue == '') && event.params.where.id) {
            // try to get the current value of the document
            const currentDocument = await strapi.db.queryBuilder(event.model.uid as UID.ContentType).select('*').where(event.params.where).first().execute<{ id: string | number, documentId: string }>({ mapResults: false })
            // This should basically never happen if the document was created correctly with the beforeCreate hook.
            if (currentDocument && (!currentDocument[attribute] || currentDocument[attribute] == '')) {
              const documentId = currentDocument.documentId;
              // if event.data.publishedAt is null, then we are updating a draft document
              // if event.data.publishedAt is not null, then we are updating a published document
              const isDraft = !event.params.data.publishedAt;
              const document = await strapi.documents(event.model.uid as UID.ContentType).findOne({
                documentId,
                status: isDraft ? 'draft' : 'published',
                locale: event.params.data.locale // Check the same current locale for the document
              })

              if (document) {
                event.params.data[attribute] = document[attribute];
              } else if (!(attributeValue as any).pluginOptions?.i18n?.localized) {
                // If the document is not found, and the content type is not localized, then we should check the default locale
                let defaultLocaleDocument = await strapi.documents(event.model.uid as UID.ContentType).findOne({
                  documentId,
                  status: 'published'
                })

                if (!defaultLocaleDocument) {
                  defaultLocaleDocument = await strapi.documents(event.model.uid as UID.ContentType).findOne({
                    documentId,
                    status: 'draft'
                  })
                }

                if (defaultLocaleDocument) {
                  event.params.data[attribute] = defaultLocaleDocument[attribute];
                } else {
                  // If the document is not found, and the content type is not localized, then we should check the other locales
                  const locales = await strapi.db.queryBuilder('plugin::i18n.locale').select('*').execute<[{ code: string }] | null>({ mapResults: false })
                  if (locales && locales.length > 0) {
                    for (const locale of locales) {
                      if (locale.code == event.params.data.locale) continue;
                      const localeDocument = await strapi.documents(event.model.uid as UID.ContentType).findOne({
                        documentId,
                        status: 'published',
                        locale: locale.code
                      })

                      if (localeDocument) {
                        event.params.data[attribute] = localeDocument[attribute];
                      }
                      break;
                    }
                  }
                }
              }
            }

          }
      }









        // Validation happens on following conditions:
        // - If disableAutoFill is not enabled
        // - If there is an initial value and disableRegenerate is not enabled 
        // (if disableRegenerate is enabled, and the initial value is not valid, the user has no way to regenerate a valid UUID)
        if (!disableAutoFill || (initialValue && (!disableRegenerate || disableAutoFill))) {
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
