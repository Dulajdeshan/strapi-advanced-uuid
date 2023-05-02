import { v4, validate } from "uuid";
import bootstrap from "../server/bootstrap";

const strapi = {
  db: {
    lifecycles: {
      subscribe: jest.fn(),
    },
  },
  contentTypes: {
    'api::firstTestModel': {
      attributes: {
        actualUUID: {
          customField: "plugin::strapi-advanced-uuid.uuid",
        },
        baitUUID: {},
      },
    },
    'api::secondTestModel': {
      attributes: {
        title: {},
        uid: {},
      },
    },
    'api::thirdTestModel': {
      attributes: {
        actualUUID: {
          customField: "plugin::strapi-advanced-uuid.uuid",
        },
      },
    },
  },
};

describe("bootstrap", () => {
  it("should subscribe to lifecycles for models that have uuid fields", () => {
    bootstrap({ strapi });

    expect(strapi.db.lifecycles.subscribe).toHaveBeenCalledTimes(1);
    expect(strapi.db.lifecycles.subscribe).toHaveBeenCalledWith(expect.any(Function));

    const uuid = v4()
    const subscribeCallback = strapi.db.lifecycles.subscribe.mock.calls[0][0];
    const event = {
      action: "beforeCreate",
      model: {
        uid: "api::firstTestModel",
      },
      params: {
        data: {
          baitUUID: "invalid-uuid",
          actualUUID: uuid,
        },
      },
    };
    subscribeCallback(event);

    expect(event.params.data.baitUUID).toBe("invalid-uuid");
    expect(validate(event.params.data.actualUUID)).toBe(true);
    expect(event.params.data.actualUUID).toBe(uuid);
  });

  it("should not subscribe to lifecycles for models that don't have uuid fields", () => {
    bootstrap({ strapi });

    expect(strapi.db.lifecycles.subscribe).toHaveBeenCalledTimes(1);
    expect(strapi.db.lifecycles.subscribe).toHaveBeenCalledWith(expect.any(Function));

    const subscribeCallback = strapi.db.lifecycles.subscribe.mock.calls[0][0];
    const event = {
      action: "beforeCreate",
      model: {
        uid: "api::secondTestModel",
      },
      params: {
        data: {
          title: "name",
          uid: "another-uid"
        },
      },
    };
    subscribeCallback(event);

    expect(event.params.data.title).toBe("name");
    expect(event.params.data.uid).toBe("another-uid");
  });

  it("should generate v4 uuid for empty uuid fields", () => {
    bootstrap({ strapi });

    expect(strapi.db.lifecycles.subscribe).toHaveBeenCalledTimes(1);
    expect(strapi.db.lifecycles.subscribe).toHaveBeenCalledWith(expect.any(Function));

    const subscribeCallback = strapi.db.lifecycles.subscribe.mock.calls[0][0];
    const event = {
      action: "beforeCreate",
      model: {
        uid: "api::thirdTestModel",
      },
      params: {
        data: {
          actualUUID: ""
        },
      },
    };
    subscribeCallback(event);
    expect(validate(event.params.data.actualUUID)).toBe(true);
  });
});
