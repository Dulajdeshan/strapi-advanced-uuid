import * as React from 'react';

import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { ArrowClockwise } from '@strapi/icons';
import { Field, TextInput, useComposedRefs } from '@strapi/design-system';
import { FieldValue, InputProps, useFocusInputField } from '@strapi/strapi/admin';
import { getTranslation } from '../../utils/getTranslation';
import { generateUUID, getOptions, isValidUUIDValue } from '../../utils/helpers';

type TProps = InputProps &
  FieldValue & {
    labelAction?: React.ReactNode;
    attribute?: {
      disableAutoFill: boolean;
      disableRegenerate: boolean;
      uuidFormat: string;
      allowRegenerateOnCreate: boolean;
      allowEditableOnCreate: boolean;
    };
  };

export const EndAction = styled(Field.Action)`
  svg {
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
      initialValue,
    },
    forwardedRef
  ) => {
    const { formatMessage } = useIntl();
    const fieldRef = useFocusInputField<HTMLInputElement>(name);
    const composedRefs = useComposedRefs(forwardedRef, fieldRef);
    
    // Track if we've generated a temporary UUID
    const generatedTempValue = React.useRef(false);
    
    // Track the previous initialValue to detect changes
    const prevInitialValue = React.useRef(initialValue);
    
    // Track if we're in create mode (no initial value yet)
    const [isCreateMode, setIsCreateMode] = React.useState(initialValue === undefined);

    const [fieldError, setFieldError] = React.useState<string | undefined>(error);

    const { disableAutoFill, disableRegenerate, uuidFormat, allowRegenerateOnCreate = false, allowEditableOnCreate = false } = getOptions(attribute);

    // Generate a temporary UUID if the field is empty
    const tempUUID = React.useRef(generateUUID(uuidFormat));
    
    // Determine if regeneration should be enabled based on mode and settings
    const effectiveDisableRegenerate = isCreateMode && allowRegenerateOnCreate ? false : disableRegenerate;
    
    // Determine if the field should be disabled based on mode and settings
    const effectiveDisabled = isCreateMode && allowEditableOnCreate ? false : (disabled || !disableAutoFill);

    const getFieldError = () =>
      formatMessage({
        id: 'uuid.form.field.error',
        defaultMessage: 'The UUID format is invalid.',
      });

    // Handle initial value generation
    // This is a workaround to handle the case where the field is not populated with a value when the component is mounted
    React.useEffect(() => {
      // Use setTimeout to allow any pending initialValue changes to process first
      setTimeout(() => {
        // Double-check if we still need to generate a value
        if (!value && !initialValue && !disableAutoFill && !generatedTempValue.current) {
          generatedTempValue.current = true;
          onChange({ target: { value: tempUUID.current, name } } as React.ChangeEvent<HTMLInputElement>);
        }
      }, 250);
    }, [value]);
    
    React.useEffect(() => {
      if (initialValue && initialValue !== prevInitialValue.current) {
        // set the tempUUID to the initialValue so even if the timeout still runs, it will use the initialValue
        tempUUID.current = initialValue;
        onChange({ target: { value: initialValue, name } } as React.ChangeEvent<HTMLInputElement>);
        generatedTempValue.current = false; // Reset the flag since we're now using the real value
        setIsCreateMode(false); // We now have an initial value, so we're no longer in create mode
      }
      
      // Update previous initialValue ref
      prevInitialValue.current = initialValue;
    }, [value, initialValue, attribute]);

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
          disabled={effectiveDisabled}
          value={value}
          placeholder={placeholder}
          onChange={handleOnChange}
          endAction={
            !effectiveDisableRegenerate && (
              <EndAction
                label={formatMessage({
                  id: 'uuid.form.field.generate',
                  defaultMessage: 'Generate',
                })}
                onClick={handleRegenerate}
              >
                <ArrowClockwise />
              </EndAction>
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
