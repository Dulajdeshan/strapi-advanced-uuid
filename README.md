![Tests](https://github.com/Dulajdeshan/strapi-advanced-uuid/actions/workflows/main.yml/badge.svg)

# Strapi Advanced UUID Plugin

The Strapi Advanced UUID Plugin is a custom plugin for Strapi that automatically generates a unique UUID for your content. It also allows you to generate UUID based on your regular expressions.

## Installation

To install the Strapi Advanced UUID Plugin, simply run one of the following command:

```
npm install strapi-advanced-uuid
```
```
yarn add strapi-advanced-uuid
```

## Usage

Once the plugin is installed, you can add a new custom type to your Strapi content types, no configuration needed. The custom type uses the Strapi UID structure, ensuring that each UUID generated is unique.

You can create new records via the Admin panel, API or GraphQL, and the plugin will automatically generate a UUID for each new record created.

## Example

Here's an example of how to use the Strapi Auto UUID Plugin:

1. Install the plugin using `npm install strapi-advanced-uuid`
2. Create a new Strapi model with the custom type `advancedUUID`, like this:

```javascript
module.exports = {
  attributes: {
    title: {
      type: 'string',
      required: true,
    },
    uuid: {
      type: "customField",
      customField: "plugin::strapi-advanced-uuid.uuid"
    },
  },
};
```

3. When you create a new record in this model via the Strapi API or GraphQL, the plugin will automatically generate a unique UUID for the `uuid` field.

That's it! With the Strapi Advanced UUID Plugin, you can easily add UUIDs to your Strapi content without having to worry about generating them yourself.

## License
This plugin is licensed under the MIT License. See the LICENSE file for more information.
