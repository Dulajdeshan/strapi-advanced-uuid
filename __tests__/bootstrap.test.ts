// @ts-nocheck
import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import bootstrap from '../server/src/bootstrap';
import services from '../server/src/services';

// Define a type for document mock to avoid type errors
interface DocumentMock {
  id?: number;
  immutableId?: string;
  uuidField?: string;
  sku?: string;
  [key: string]: any;
}

describe('Strapi Lifecycle Methods for Different Models', () => {
  let strapiMock;

  beforeEach(() => {
    // Clear any mocks before each test
    jest.clearAllMocks();

    // Mock the Strapi object
    strapiMock = {
      plugin: jest.fn().mockReturnValue({
        ...services,
      }),
      db: {
        lifecycles: {
          subscribe: jest.fn(),
        },
        queryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          first: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(null),
        }),
      },
      documents: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      }),
      contentTypes: {
        'api::article.article': {
          uid: 'api::article.article',
          attributes: {
            uuidField: {
              customField: 'plugin::strapi-advanced-uuid.uuid',
              options: { 'uuid-format': '^[A-Za-z0-9]{5}$', 'disable-auto-fill': false },
            },
            title: {
              type: 'string',
            },
          },
        },
        'api::product.product': {
          uid: 'api::product.product',
          attributes: {
            sku: {
              customField: 'plugin::strapi-advanced-uuid.uuid',
              options: { 'uuid-format': '^[0-9a-zA-Z-]{8}$', 'disable-auto-fill': false },
            },
            name: {
              type: 'string',
            },
          },
        },
        'api::immutable.immutable': {
          uid: 'api::immutable.immutable',
          attributes: {
            immutableId: {
              customField: 'plugin::strapi-advanced-uuid.uuid',
              options: { 'uuid-format': '^[A-Z0-9]{6}$', 'disable-auto-fill': false, 'disable-regenerate': true },
            },
            name: {
              type: 'string',
            },
          },
        },
        'api::localized-content.localized-content': {
          uid: 'api::localized-content.localized-content',
          attributes: {
            contentId: {
              customField: 'plugin::strapi-advanced-uuid.uuid',
              options: { 'uuid-format': '^[A-Z]{4}$', 'disable-auto-fill': false },
            },
            content: {
              type: 'string',
            },
          },
        },
        'api::multi-locale.multi-locale': {
          uid: 'api::multi-locale.multi-locale',
          attributes: {
            multiId: {
              customField: 'plugin::strapi-advanced-uuid.uuid',
              options: { 'uuid-format': '^[A-Z0-9]{6}$', 'disable-auto-fill': false },
            },
            title: {
              type: 'string',
            },
          },
        },
      },
    };

    // Call the bootstrap method to set up lifecycle hooks
    bootstrap({ strapi: strapiMock });
  });

  test('should subscribe to beforeCreate and beforeUpdate hooks', () => {
    // Ensure the subscribe method is called
    expect(strapiMock.db.lifecycles.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        models: expect.arrayContaining([
          'api::article.article', 
          'api::product.product', 
          'api::immutable.immutable',
          'api::localized-content.localized-content'
        ]),
        beforeCreate: expect.any(Function),
        beforeUpdate: expect.any(Function),
      })
    );
  });

  test('beforeCreate generates UUID for article if not provided', async () => {
    // Extract the beforeCreate hook
    const lifecycleHook = strapiMock.db.lifecycles.subscribe.mock.calls[0][0].beforeCreate;

    // Mock the event for creating an article
    const event = {
      action: 'beforeCreate',
      model: strapiMock.contentTypes['api::article.article'],
      params: { data: { title: 'New Article' } }, // uuidField not provided
    };

    // Invoke the lifecycle hook
    await lifecycleHook(event);

    // Assert that UUID is generated and matches the expected format
    expect(event.params.data).toMatchObject({
      uuidField: expect.stringMatching(/^[A-Za-z0-9]{5}$/),
      title: 'New Article',
    });
  });

  test('beforeCreate validates SKU format for product', async () => {
    // Extract the beforeCreate hook
    const lifecycleHook = strapiMock.db.lifecycles.subscribe.mock.calls[0][0].beforeCreate;

    // Mock the event for creating a product with an invalid SKU
    const event = {
      action: 'beforeCreate',
      model: strapiMock.contentTypes['api::product.product'],
      params: { data: { sku: 'invalidsku' } }, // Doesn't match format ^[0-9a-zA-Z-]{8}$
    };

    // Assert that YupValidationError is thrown
    await expect(lifecycleHook(event)).rejects.toThrow('You have some issues');
  });

  test('beforeCreate does not auto-generate UUID if disableAutoFill is true', async () => {
    // Mock model with disableAutoFill set to true
    const userModel = {
      uid: 'api::user.user',
      attributes: {
        userId: {
          customField: 'plugin::strapi-advanced-uuid.uuid',
          options: { 'uuid-format': '^[0-9]{6}$', 'disable-auto-fill': true },
        },
        username: {
          type: 'string',
        },
      },
    };

    // Update strapiMock to add the userModel
    strapiMock.contentTypes['api::user.user'] = userModel;

    // Call the bootstrap method to update lifecycle hooks
    bootstrap({ strapi: strapiMock });

    // Extract the beforeCreate hook
    const lifecycleHook = strapiMock.db.lifecycles.subscribe.mock.calls[1][0].beforeCreate;

    // Mock the event for creating a user
    const event = {
      action: 'beforeCreate',
      model: userModel,
      params: { data: { username: 'testuser' } }, // userId not provided
    };

    // Invoke the lifecycle hook
    await lifecycleHook(event);

    // Assert that userId is not generated
    expect(event.params.data).not.toHaveProperty('userId');
  });

  test('beforeUpdate preserves existing UUID when documentId is provided', async () => {
    // Override the default mock with our specific behavior for this test
    strapiMock.db.queryBuilder.mockImplementation((model) => {
      return {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          id: 1,
          immutableId: 'ABC123'
        })
      };
    });

    // Also create service manually - this could help diagnose the issue better
    const service = services.service({ strapi: strapiMock });

    // Create the event object directly
    const event = {
      action: 'beforeUpdate',
      model: strapiMock.contentTypes['api::immutable.immutable'],
      params: { 
        data: { name: 'Updated Name' }, // immutableId not provided
        where: { documentId: 'doc123' },
      },
    };

    // Call the service directly instead of going through the hook
    await service.handleCRUDOperation(event);

    // Check if the immutableId is set correctly
    expect(event.params.data.immutableId).toBe('ABC123');
  });

  test('beforeUpdate removes initialValue when disableRegenerate is true', async () => {
    // Create service manually
    const service = services.service({ strapi: strapiMock });

    // Create the event object with an initialValue for the immutableId
    const event = {
      action: 'beforeUpdate',
      model: strapiMock.contentTypes['api::immutable.immutable'],
      params: { 
        data: { 
          name: 'Updated Name',
          immutableId: 'NEW456', // Attempt to change the UUID
        },
        where: { id: 1 },
      },
    };

    // Call the service directly
    await service.handleCRUDOperation(event);

    // Check that the immutableId was removed from the data
    expect(event.params.data.immutableId).toBeUndefined();
    // But other data should remain
    expect(event.params.data.name).toBe('Updated Name');
  });

  test('beforeCreate preserves UUID across locales when document exists', async () => {
    // Set up mocks for documents to return a document with an existing UUID
    const existingEnglishDocument = {
      id: 5,
      contentId: 'ABCD',
      locale: 'en'
    };
    
    strapiMock.documents = jest.fn().mockImplementation(() => {
      return {
        findOne: jest.fn().mockImplementation(params => {
          if (params.documentId === 'shared-doc-123' && params.status === 'published') {
            return Promise.resolve(existingEnglishDocument);
          }
          return Promise.resolve(null);
        })
      };
    });

    // Create service manually
    const service = services.service({ strapi: strapiMock });

    // Create event for a French version of the document
    const event = {
      action: 'beforeCreate',
      model: strapiMock.contentTypes['api::localized-content.localized-content'],
      params: { 
        data: { 
          content: 'Contenu en français',
          locale: 'fr',
          documentId: 'shared-doc-123' // Same document ID as English version
        }
      },
    };

    // Call the service directly
    await service.handleCRUDOperation(event);

    // The UUID should be copied from the English version
    expect(event.params.data.contentId).toBe('ABCD');
  });

  test('beforeUpdate finds UUID from another document version when current document has missing UUID', async () => {
    // Set up the current document with a missing UUID
    const currentDocument = {
      id: 10,
      title: 'Draft Article',
      documentId: 'article-123',
      uuidField: '', // Missing UUID
      locale: 'en',
      publishedAt: null // Draft version
    };
    
    // Set up the published version with a UUID
    const publishedDocument = {
      id: 11,
      title: 'Published Article',
      documentId: 'article-123',
      uuidField: 'ABC12', // Has a UUID
      locale: 'en',
      publishedAt: '2023-01-01T00:00:00.000Z' // Published version
    };
    
    // Mock the database queries
    strapiMock.db.queryBuilder = jest.fn().mockImplementation((model) => {
      if (model === 'plugin::i18n.locale') {
        return {
          select: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue([
            { code: 'en' },
            { code: 'fr' }
          ])
        };
      }
      
      return {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(currentDocument)
      };
    });
    
    // Mock the documents API
    strapiMock.documents = jest.fn().mockImplementation(() => {
      return {
        findOne: jest.fn().mockImplementation(params => {
          // Return the published document when asking for a published version
          if (params.documentId === 'article-123' && params.status === 'published') {
            return Promise.resolve(publishedDocument);
          }
          return Promise.resolve(null);
        })
      };
    });
    
    // Create service manually
    const service = services.service({ strapi: strapiMock });
    
    // Create event for updating the draft with some changes
    const event = {
      action: 'beforeUpdate',
      model: strapiMock.contentTypes['api::article.article'],
      params: { 
        data: { 
          title: 'Updated Draft Title',
          publishedAt: null // Still draft
        },
        where: { id: 10 } // The ID of the draft version
      }
    };
    
    // Call the service directly
    await service.handleCRUDOperation(event);
    
    // The UUID should be copied from the published version
    expect(event.params.data.uuidField).toBe('ABC12');
  });

  test('beforeUpdate can find UUID from localized versions when primary locale has no UUID', async () => {
    // Mock a document missing a UUID but with a documentId
    const frenchDocument = {
      id: 15,
      content: 'Contenu sans UUID',
      documentId: 'content-456',
      locale: 'fr',
      contentId: '' // Missing UUID
    };
    
    // Mock an English document with the same documentId that has a UUID
    const englishDocument = {
      id: 16,
      content: 'Content with UUID',
      documentId: 'content-456',
      locale: 'en',
      contentId: 'WXYZ' // Has UUID
    };
    
    // Set up the database mocks
    strapiMock.db.queryBuilder = jest.fn().mockImplementation((model) => {
      if (model === 'plugin::i18n.locale') {
        return {
          select: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue([
            { code: 'en' },
            { code: 'fr' },
            { code: 'es' }
          ])
        };
      }
      
      return {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(frenchDocument)
      };
    });
    
    // Mock document retrieval to find the English version with UUID
    let findOneCallCount = 0;
    strapiMock.documents = jest.fn().mockImplementation(() => {
      return {
        findOne: jest.fn().mockImplementation(params => {
          findOneCallCount++;
          
          // First few calls look for the document in current locale and default locale - return null
          if (findOneCallCount < 4) {
            return Promise.resolve(null);
          }
          
          // For the English locale, return the document with UUID
          if (params.locale === 'en') {
            return Promise.resolve(englishDocument);
          }
          
          return Promise.resolve(null);
        })
      };
    });
    
    // Create service manually
    const service = services.service({ strapi: strapiMock });
    
    // Create event for updating the French document
    const event = {
      action: 'beforeUpdate',
      model: strapiMock.contentTypes['api::localized-content.localized-content'],
      params: { 
        data: { 
          content: 'Contenu français mis à jour',
          locale: 'fr'
        },
        where: { id: 15 } // The ID of the French version
      }
    };
    
    // Call the service directly
    await service.handleCRUDOperation(event);
    
    // The UUID should be copied from the English version
    expect(event.params.data.contentId).toBe('WXYZ');
  });

  test('beforeCreate with non-localized content searches multiple locales for existing UUID', async () => {
    // Mock the locales query to return multiple locales
    strapiMock.db.queryBuilder = jest.fn().mockImplementation((model) => {
      if (model === 'plugin::i18n.locale') {
        return {
          select: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue([
            { code: 'en' },
            { code: 'fr' },
            { code: 'es' }
          ])
        };
      }
      
      return {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(null)
      };
    });
    
    // Mock the documents API to not find published/draft versions in default locale
    // but find a version in the Spanish locale
    let findOneCallCount = 0;
    strapiMock.documents = jest.fn().mockImplementation(() => {
      return {
        findOne: jest.fn().mockImplementation(params => {
          findOneCallCount++;
          
          // First two calls check for published/draft in default locale - return null
          if (findOneCallCount <= 2) {
            return Promise.resolve(null);
          }
          
          // When checking the Spanish locale, return a document with UUID
          if (params.locale === 'es') {
            return Promise.resolve({
              id: 20,
              title: 'Contenido español',
              documentId: 'shared-content-789',
              locale: 'es',
              multiId: 'XYZ123'
            });
          }
          
          return Promise.resolve(null);
        })
      };
    });
    
    // Create service manually
    const service = services.service({ strapi: strapiMock });
    
    // Create event for creating a new French version using same documentId
    const event = {
      action: 'beforeCreate',
      model: strapiMock.contentTypes['api::multi-locale.multi-locale'],
      params: { 
        data: { 
          title: 'Nouveau contenu français',
          locale: 'fr',
          documentId: 'shared-content-789'
        }
      }
    };
    
    // Call the service directly
    await service.handleCRUDOperation(event);
    
    // The UUID should be copied from the Spanish version
    expect(event.params.data.multiId).toBe('XYZ123');
  });

  test('validation handles edge cases correctly', async () => {
    // Create custom model with special validation requirements
    const validationModel = {
      uid: 'api::validation.validation',
      attributes: {
        validationId: {
          customField: 'plugin::strapi-advanced-uuid.uuid',
          options: { 
            'uuid-format': '^[A-Z]{3}$', 
            'disable-auto-fill': false, // Changed to false to ensure validation happens
            'disable-regenerate': false
          },
        },
        name: {
          type: 'string',
        },
      },
    };
    
    // Add model to strapi
    strapiMock.contentTypes['api::validation.validation'] = validationModel;
    
    // Create service manually
    const service = services.service({ strapi: strapiMock });
    
    // Test 1: Valid UUID with valid format
    const validEvent = {
      action: 'beforeCreate',
      model: validationModel,
      params: { 
        data: { 
          name: 'Valid UUID Test',
          validationId: 'ABC'  // Valid format
        }
      }
    };
    
    // This should work without errors
    await service.handleCRUDOperation(validEvent);
    expect(validEvent.params.data.validationId).toBe('ABC');
    
    // Test 2: Invalid UUID format - should fail validation
    const invalidEvent = {
      action: 'beforeCreate',
      model: validationModel,
      params: { 
        data: { 
          name: 'Invalid UUID Test',
          validationId: 'abc'  // Invalid format (should be uppercase)
        }
      }
    };
    
    // This should throw a validation error
    await expect(service.handleCRUDOperation(invalidEvent)).rejects.toThrow('You have some issues');
  });
});
