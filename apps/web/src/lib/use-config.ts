import { useCallback, useEffect, useRef, useState } from "react";
import type { DiagnosedConfig } from "@praxios/core";
import { api } from "@/api";

export interface UseConfigResult {
  config: DiagnosedConfig | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * ローカル JSON 設定（`/config`）を取得する共有フック。
 * 設定画面・ターミナルパネルなど、実効設定を参照する箇所で使い回す。
 */
export function useConfig(): UseConfigResult {
  const [state, setState] = useState<Omit<UseConfigResult, "reload">>({
    config: null,
    loading: true,
    error: null
  });
  const mountedRef = useRef(true);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    api
      .getConfig()
      .then((config) => {
        if (mountedRef.current) {
          setState({ config, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (mountedRef.current) {
          setState({
            config: null,
            loading: false,
            error: error instanceof Error ? error.message : "設定の取得に失敗しました"
          });
        }
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    reload();
    return () => {
      mountedRef.current = false;
    };
  }, [reload]);

  return { ...state, reload };
}
