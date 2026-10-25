"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  DEFAULT_PAGE_SIZE,
  graphService,
  type GraphService,
} from "@/lib/graphService";
import {
  graphReducer,
  initialGraphState,
  type GraphAction,
} from "@/lib/graphState";

export function useDigGraph(service: GraphService = graphService) {
  const [state, rawDispatch] = useReducer(graphReducer, initialGraphState);
  const requestToken = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = useCallback((action: GraphAction) => {
    if (action.type === "INIT_FROM" || action.type === "RESET") {
      requestToken.current += 1;
    }
    rawDispatch(action);
  }, []);

  const expand = useCallback(
    async (id: string) => {
      const token = requestToken.current;
      dispatch({ type: "EXPAND_START", id });
      const page = await service.getConnections(id, {
        limit: DEFAULT_PAGE_SIZE,
      });
      if (token !== requestToken.current) return;
      dispatch({ type: "EXPAND", id, page });
    },
    [service, dispatch]
  );

  const loadMore = useCallback(
    async (id: string) => {
      const expansion = stateRef.current.expansions[id];
      if (!expansion || !expansion.nextCursor || expansion.status === "loading") {
        return;
      }
      const token = requestToken.current;
      dispatch({ type: "EXPAND_START", id });
      const page = await service.getConnections(id, {
        cursor: expansion.nextCursor,
        limit: DEFAULT_PAGE_SIZE,
      });
      if (token !== requestToken.current) return;
      dispatch({ type: "LOAD_MORE", id, page });
    },
    [service, dispatch]
  );

  const selectNode = useCallback(
    (id: string) => {
      dispatch({ type: "SELECT", id });
      if (!stateRef.current.expansions[id]) {
        void expand(id);
      }
    },
    [dispatch, expand]
  );

  const select = useCallback(
    (id: string | null) => {
      dispatch({ type: "SELECT", id });
    },
    [dispatch]
  );

  const startFrom = useCallback(
    async (id: string) => {
      const entity = await service.getEntity(id);
      if (!entity) return;
      dispatch({ type: "INIT_FROM", entity });
      await expand(id);
    },
    [service, dispatch, expand]
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rootId = await service.getDefaultRootId();
      if (cancelled) return;
      await startFrom(rootId);
    })();
    return () => {
      cancelled = true;
    };
  }, [service, startFrom]);

  return { state, selectNode, expand, loadMore, startFrom, reset, select };
}
