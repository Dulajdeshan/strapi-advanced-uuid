import * as React from 'react';

import { useIntl } from 'react-intl';
import { ArrowClockwise } from '@strapi/icons';
import { Field, TextInput, useComposedRefs } from '@strapi/design-system';
import { FieldValue, InputProps, useFocusInputField } from '@strapi/strapi/admin';
import { getTranslation } from '../../utils/getTranslation';
import { generateUUID, getOptions, isValidUUIDValue } from '../../utils/helpers';
import { IconButton } from '@strapi/design-system';

type TProps = InputProps &
  FieldValue & {
    labelAction?: React.ReactNode;
    attribute?: {
      disableAutoFill: boolean;
      disableRegenerate: boolean;
      uuidFormat: string;
    };
  };

const Input = React.forwardRef<HTMLButtonElement, TProps>(
  (
    {
      hint,
      disabled = false,
      labelAction,
      label,
      name,
      required = false,
      onChange,
      value,
      error,
      placeholder,
      attribute,
    },
    forwardedRef
  ) => {
    const { formatMessage } = useIntl();
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const composedRefs = useComposedRefs(forwardedRef, fieldRef);

    const [fieldError, setFieldError] = React.useState<string | undefined>(error);

    const { disableAutoFill, disableRegenerate, uuidFormat } = getOptions(attribute);

    const getFieldError = () =>
      formatMessage({
        id: 'uuid.form.field.error',
        defaultMessage: 'The UUID format is invalid.',
      });

    React.useEffect(() => {
      if (!value && !disableAutoFill) {
        const newUUID = generateUUID(uuidFormat);
        onChange({ target: { value: newUUID, name } } as React.ChangeEvent<HTMLInputElement>);
      }
    }, [value, attribute]);

    React.useEffect(() => {
      const isValid = isValidUUIDValue(uuidFormat, value);
      setFieldError(!isValid ? getFieldError() : undefined);
    }, [value]);

    // Helper function to handle the onChange event
    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;

      const isValid = isValidUUIDValue(uuidFormat, value);
      setFieldError(!isValid ? getFieldError() : undefined);

      onChange(e);
    };

    const handleRegenerate = () => {
      const newUUID = generateUUID(uuidFormat);
      onChange({ target: { value: newUUID, name } } as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <Field.Root name={name} id={name} error={fieldError} hint={hint} required={required}>
        <Field.Label action={labelAction}>{label}</Field.Label>

        <TextInput
          ref={composedRefs}
          aria-label={formatMessage({
            id: getTranslation('form.label'),
            defaultMessage: 'Advanced UUID',
          })}
          disabled={disabled || !disableAutoFill}
          value={value}
          placeholder={placeholder}
          onChange={handleOnChange}
          endAction={
            !disableRegenerate && (
              <Field.Action
                label={formatMessage({
                  id: 'uuid.form.field.generate',
                  defaultMessage: 'Generate',
                })}
                onClick={handleRegenerate}
              >
                <IconButton variant="ghost">
                  <ArrowClockwise fill="neutral400" />
                </IconButton>
              </Field.Action>
            )
          }
        />

        <Field.Hint />
        <Field.Error />
      </Field.Root>
    );
  }
);

export default Input;
