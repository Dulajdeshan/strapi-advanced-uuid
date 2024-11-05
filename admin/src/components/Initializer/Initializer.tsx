import { useEffect, useRef } from 'react';

import { PLUGIN_ID } from '../../pluginId';

type InitializerProps = {
  setPlugin: (id: string) => void;
};

export default function Initializer({ setPlugin }: InitializerProps) {
  const ref = useRef(setPlugin);

  useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);

  return null;
}
