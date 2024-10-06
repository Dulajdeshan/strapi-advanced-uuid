import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { generateUUID, validateUUID } from '../../../admin/src/utils/helpers';

const { YupValidationError } = errors;

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Strapi 🚀';
  },
  handleCRUDOperation(event: any) {
    const errorMessages: any = {
      inner: [],
    };

    Object.keys(event.model.attributes).forEach((attribute) => {
      if (event.model.attributes[attribute].customField === 'plugin::strapi-advanced-uuid.uuid') {
        // Get the initial value of the attribute
        const initialValue = event.params.data[attribute];

        // Get the options of the attribute
        const options = event.model.attributes
          ? event.model.attributes[attribute]['options']
          : null;

        // Get the uuid-format option, if it is set
        const uuidFormat = options ? options['uuid-format'] : null;
        // Get the disable-auto-fill option, if it is set
        const disableAutoFill = options ? options['disable-auto-fill'] : false;

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
              name: 'ValidationError', // Always set to ValidationError
              path: attribute, // Name of field we want to show input validation on
              message: 'The UUID format is invalid.', // Input validation message
            });
          }
        }
      }
    });

    if (errorMessages.inner.length > 0) {
      throw new YupValidationError(errorMessages, 'You have some issues');
    }
  },
});

export default service;
