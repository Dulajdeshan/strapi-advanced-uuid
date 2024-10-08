import bootstrap from "../server/bootstrap";
import { handleYupError } from '@strapi/utils'; // Mock this function as needed

jest.mock('@strapi/utils', () => ({
  handleYupError: jest.fn(),
}));

describe('Strapi Lifecycle Methods for Different Models', () => {
  let strapiMock;

  beforeEach(() => {
    // Clear any mocks before each test
    jest.clearAllMocks();

    // Mock the Strapi object
    strapiMock = {
      db: {
        lifecycles: {
          subscribe: jest.fn(),
        },
      },
      contentTypes: {
        'api::article.article': {
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
      },
    };

    // Call the bootstrap method to set up lifecycle hooks
    bootstrap({ strapi: strapiMock });
  });

  test('should subscribe to beforeCreate and beforeUpdate hooks', () => {
    // Ensure the subscribe method is called
    expect(strapiMock.db.lifecycles.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        models: expect.arrayContaining(['api::article.article', 'api::product.product']),
        beforeCreate: expect.any(Function),
        beforeUpdate: expect.any(Function),
      })
    );
  });

  test('beforeCreate generates UUID for article if not provided', () => {
    // Extract the beforeCreate hook
    const lifecycleHook = strapiMock.db.lifecycles.subscribe.mock.calls[0][0].beforeCreate;

    // Mock the event for creating an article
    const event = {
      model: strapiMock.contentTypes['api::article.article'],
      params: { data: { title: 'New Article' } }, // uuidField not provided
    };

    // Invoke the lifecycle hook
    lifecycleHook(event);

    // Assert that UUID is generated and matches the expected format
    expect(event.params.data.uuidField).toMatch(/^[A-Za-z0-9]{5}$/);
  });

  test('beforeCreate validates SKU format for product', () => {
    // Extract the beforeCreate hook
    const lifecycleHook = strapiMock.db.lifecycles.subscribe.mock.calls[0][0].beforeCreate;

    // Mock the event for creating a product with an invalid SKU
    const event = {
      model: strapiMock.contentTypes['api::product.product'],
      params: { data: { sku: 'invalidsku' } }, // Doesn't match format ^[0-9a-zA-Z-]{8}$
    };

    // Invoke the lifecycle hook
    lifecycleHook(event);

    // Assert that handleYupError is called due to invalid SKU format
    expect(handleYupError).toHaveBeenCalledWith(
      expect.objectContaining({ inner: expect.any(Array) }),
      'You have some issues'
    );
  });

  test('beforeCreate does not auto-generate UUID if disableAutoFill is true', () => {
    // Mock model with disableAutoFill set to true
    const userModel = {
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
      model: userModel,
      params: { data: { username: 'testuser' } }, // userId not provided
    };

    // Invoke the lifecycle hook
    lifecycleHook(event);

    // Assert that userId is not generated
    expect(event.params.data.userId).toBeUndefined();
  });
});