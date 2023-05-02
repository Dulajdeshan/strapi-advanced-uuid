import RandExp from "randexp";
import pluginId from "../pluginId";

export const getTrad = (id: string) => `${pluginId}.${id}`;

export const generateUUID = (format: string) => {
  try {
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
