import * as React from "react";

type PanelStateContextValue = {
  isRightPanelOpen: boolean;
};

type PanelActionsContextValue = {
  setRightPanelOpen: (v: boolean) => void;
};

const PanelStateContext = React.createContext<PanelStateContextValue>({
  isRightPanelOpen: false,
});
const PanelActionsContext = React.createContext<PanelActionsContextValue>({
  setRightPanelOpen: () => {},
});

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [isRightPanelOpen, setRightPanelOpen] = React.useState(false);
  const stateValue = React.useMemo(() => ({ isRightPanelOpen }), [isRightPanelOpen]);
  const actionsValue = React.useMemo(() => ({ setRightPanelOpen }), []);

  return (
    <PanelActionsContext.Provider value={actionsValue}>
      <PanelStateContext.Provider value={stateValue}>{children}</PanelStateContext.Provider>
    </PanelActionsContext.Provider>
  );
}

export function usePanelState() {
  return React.useContext(PanelStateContext);
}

export function usePanelActions() {
  return React.useContext(PanelActionsContext);
}
