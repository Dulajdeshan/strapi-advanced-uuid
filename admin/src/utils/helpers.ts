import RandExp from "randexp";
import { v4, validate } from "uuid";
import pluginId from "../pluginId";

export const getTrad = (id: string) => `${pluginId}.${id}`;

export const generateUUID = (format: string) => {
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

export const validateUUID = (format: string, initialValue: string) => {
  const newFormat = `^${format}$`;
  const regexFormat = new RegExp(newFormat, "i");
  return regexFormat.exec(initialValue);
};

export const getOptions = (attribute: any) => {
  return {
    disableAutoFill:
      (attribute.options && attribute.options["disable-auto-fill"]) ?? false,
    disableRegenerate:
      (attribute.options && attribute.options["disable-regenerate"]) ?? false,
    uuidFormat: attribute.options && attribute.options["uuid-format"],
  };
};
