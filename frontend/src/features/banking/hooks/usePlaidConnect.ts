import * as React from "react";
import { usePlaidLink as usePlaidLinkHook } from "react-plaid-link";
import { BankingAPI } from "@/api/banking.api";
import { messageForSecurityFlowError } from "../security/securityFlowErrors";

type UsePlaidConnectParams = {
  onConnected?: () => void | Promise<void>;
};

type UsePlaidConnectReturn = {
  startConnect: () => void;
  isPreparingLink: boolean;
  isExchanging: boolean;
  linkError: string | null;
};

/**
 * Low-level Plaid link-token + exchange.
 *
 * **SECURITY — internal hook only:** Do not import this from screens, routes, or feature components.
 * All user-facing bank connections must go through {@link useSecureBankConnect}, which enforces
 * `refreshMfa()` (auth assurance), consent, and a fresh MFA re-check before link-token.
 *
 * This module is **not** re-exported from `@/features/banking` (public API). If you add a new call site
 * here, keep it inside `useSecureBankConnect.ts` only.
 *
 * @internal
 */
export function usePlaidConnect(params: UsePlaidConnectParams = {}): UsePlaidConnectReturn {
  const { onConnected } = params;
  const [linkToken, setLinkToken] = React.useState<string | null>(null);
  const [isPreparingLink, setIsPreparingLink] = React.useState(false);
  const [isExchanging, setIsExchanging] = React.useState(false);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const onSuccessCallback = React.useCallback(
    async (publicToken: string) => {
      setIsExchanging(true);
      setLinkError(null);
      try {
        await BankingAPI.exchangePublicToken(publicToken);
        setLinkToken(null);
        await onConnected?.();
    } catch (e) {
      setLinkError(messageForSecurityFlowError(e, "Failed to connect bank"));
      } finally {
        setIsExchanging(false);
      }
    },
    [onConnected]
  );

  const { open, ready } = usePlaidLinkHook({
    token: linkToken,
    onSuccess: onSuccessCallback,
    onExit: (err) => {
      if (err) {
        setLinkError(err.error_message ?? "Plaid Link exited with an error");
      }
      setLinkToken(null);
      setIsPreparingLink(false);
    },
  });

  const startConnect = React.useCallback(async () => {
    setIsPreparingLink(true);
    setLinkError(null);
    try {
      const { link_token } = await BankingAPI.createLinkToken();
      setLinkToken(link_token);
      setIsPreparingLink(false);
    } catch (e) {
      setLinkError(messageForSecurityFlowError(e, "Failed to prepare bank connection"));
      setIsPreparingLink(false);
    }
  }, []);

  React.useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  return {
    startConnect,
    isPreparingLink,
    isExchanging,
    linkError,
  };
}
