import { v4, validate } from 'uuid';
import { randString } from 'regex-randstr';

export const generateUUID = (format: string) => {
  try {
    if (!format) {
      return v4();
    }
    const regexFormat = new RegExp(format);
    return randString(regexFormat);
  } catch (error) {
    return null;
  }
};

export const validateUUID = (format: string, initialValue: string) => {
  const newFormat = `^${format}$`;
  const regexFormat = new RegExp(newFormat, 'i');
  return regexFormat.exec(initialValue);
};

export const getOptions = (attribute: any) => {
  return {
    disableAutoFill: (attribute.options && attribute.options['disable-auto-fill']) ?? false,
    disableRegenerate: (attribute.options && attribute.options['disable-regenerate']) ?? false,
    uuidFormat: attribute.options && attribute.options['uuid-format'],
  };
};

export const isValidUUIDValue = (uuidFormat: string, value: string) => {
  const isValidValue = uuidFormat ? validateUUID(uuidFormat, value) : validate(value);

  if (value && !isValidValue) {
    return false;
  }
  return true;
};
