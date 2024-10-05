import { useEffect, useState, forwardRef } from "react";
import { useIntl } from "react-intl";
import styled from "styled-components";
import { Refresh } from "@strapi/icons";
import { validate } from "uuid";
import {
  Box,
  Field,
  FieldAction,
  FieldError,
  FieldHint,
  FieldInput,
  FieldLabel,
  Stack,
  Flex,
} from "@strapi/design-system";
import { generateUUID, getOptions, validateUUID } from "../../utils/helpers";

export const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: 1rem;
    width: 1rem;
    path {
      fill: ${({ theme }) => theme.colors.neutral400};
    }
  }

  svg:hover {
    path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const isValidValue = (uuidFormat: string, value: string) => {
  const isValidValue = uuidFormat
    ? validateUUID(uuidFormat, value)
    : validate(value);

  if (value && !isValidValue) {
    return false;
  }
  return true;
};

const Input = forwardRef<HTMLInputElement, any>(
  (
    {
      attribute,
      description,
      disabled,
      error,
      intlLabel,
      labelAction,
      name,
      onChange,
      required,
      value: initialValue = "",
      ...props
    },
    ref
  ) => {
    const { formatMessage } = useIntl();
    const [fieldError, setFieldError] = useState<string | null>(error);

    const { disableAutoFill, disableRegenerate, uuidFormat } =
      getOptions(attribute);

    const getFieldError = () => {
      return formatMessage({
        id: "uuid.form.field.error",
        defaultMessage: "The UUID format is invalid.",
      });
    };

    useEffect(() => {
      if (!initialValue && !disableAutoFill) {
        const newUUID = generateUUID(uuidFormat);
        onChange({ target: { value: newUUID, name } });
      }
    }, [initialValue, attribute]);

    useEffect(() => {
      const isValid = isValidValue(uuidFormat, initialValue);
      setFieldError(!isValid ? getFieldError() : null);
    }, [initialValue]);

    // Helper function to handle the onChange event
    const handleChange = (e) => {
      const { value } = e.target;

      const isValid = isValidValue(uuidFormat, value);
      setFieldError(!isValid ? getFieldError() : null);

      onChange(e);
    };

    return (
      <Box>
        <Field
          id={name}
          name={name}
          hint={description && formatMessage(description)}
          required={required}
          error={fieldError}
        >
          <Stack spacing={1}>
            <Flex>
              <FieldLabel>{formatMessage(intlLabel)}</FieldLabel>
            </Flex>
            <FieldInput
              ref={ref}
              onChange={handleChange}
              disabled={disabled || !disableAutoFill}
              value={initialValue}
              required={required}
              endAction={
                !disableRegenerate && (
                  <FieldActionWrapper
                    onClick={() => {
                      const newUUID = generateUUID(uuidFormat);
                      onChange({ target: { value: newUUID, name } });
                    }}
                    label={formatMessage({
                      id: "uuid.form.field.generate",
                      defaultMessage: "Generate",
                    })}
                  >
                    <Refresh />
                  </FieldActionWrapper>
                )
              }
              {...props}
            />
            <FieldHint />
            <FieldError />
          </Stack>
        </Field>
      </Box>
    );
  }
);

export default Input;
