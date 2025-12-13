import * as React from 'react';

export function getStrictContext<T>(name: string) {
  const Context = React.createContext<T | undefined>(undefined);

  function useContext() {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error(`useContext must be used within a ${name} Provider`);
    }
    return context;
  }

  function Provider({ children, value }: { children: React.ReactNode; value: T }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  return [Provider, useContext] as const;
}