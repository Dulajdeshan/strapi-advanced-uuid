import React, { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import styled from "styled-components";
import { Refresh } from "@strapi/icons";
import { v4, validate } from "uuid";
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
import { generateUUID, validateUUID } from "../../utils/helpers";

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

const Input = ({
  attribute,
  description,
  placeholder,
  disabled,
  error,
  intlLabel,
  labelAction,
  name,
  onChange,
  value: initialValue = ""
}: {
  attribute: any;
  description: any;
  placeholder: string;
  disabled: boolean;
  error: boolean;
  intlLabel: any;
  labelAction: string;
  name: string;
  onChange(v: any): void;
  value: string;
}) => {
  const { formatMessage } = useIntl();
  const [invalidUUID, setInvalidUUID] = useState<boolean>(false);
  const ref = useRef("");

  const getUUIDFormat = () => {
    if (attribute.options && attribute.options["uuid-format"]) {
      return attribute.options["uuid-format"];
    }
    return null;
  };

  const generateNewUUID = () => {
    const uuidFormat = getUUIDFormat();
    return uuidFormat ? generateUUID(uuidFormat) : v4();
  };

  useEffect(() => {
    const uuidFormat = getUUIDFormat();
    if (!initialValue) {
      const newUUID = generateNewUUID();
      onChange({ target: { value: newUUID, name } });
    }

    if (initialValue && initialValue !== ref.current)
      ref.current = initialValue;
    const validateValue = uuidFormat
      ? validateUUID(uuidFormat, initialValue)
      : validate(initialValue);
    if (!validateValue) return setInvalidUUID(true);
    setInvalidUUID(false);
  }, [initialValue, attribute]);

  return (
    <Box>
      <Field
        id={name}
        name={name}
        hint={description && formatMessage(description)}
        error={
          error ??
          (invalidUUID
            ? formatMessage({
                id: "uuid.form.field.error",
                defaultMessage: "The UUID format is invalid.",
              })
            : null)
        }
      >
        <Stack spacing={1}>
          <Flex>
            <FieldLabel>{formatMessage(intlLabel)}</FieldLabel>
          </Flex>
          <FieldInput
            onChange={onChange}
            labelAction={labelAction}
            placeholder={placeholder}
            disabled={disabled || true}
            required
            value={initialValue}
            ref={ref}
            endAction={
              <FieldActionWrapper
                onClick={() => {
                  const newUUID = generateNewUUID();
                  onChange({ target: { value: newUUID, name } });
                }}
                label={formatMessage({
                  id: "uuid.form.field.generate",
                  defaultMessage: "Generate",
                })}
              >
                <Refresh />
              </FieldActionWrapper>
            }
          />
          <FieldHint />
          <FieldError />
        </Stack>
      </Field>
    </Box>
  );
};

export default Input;
