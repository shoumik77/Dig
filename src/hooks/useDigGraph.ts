"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { graphService, type GraphService } from "@/lib/graphService";
import {
  createGraphController,
  type GraphController,
} from "@/lib/graphController";
import { graphReducer, initialGraphState } from "@/lib/graphState";

export function useDigGraph(service: GraphService = graphService) {
  const [state, rawDispatch] = useReducer(graphReducer, initialGraphState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const getState = useCallback(() => stateRef.current, []);
  const controllerRef = useRef<GraphController | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = createGraphController({
      service,
      dispatch: rawDispatch,
      getState,
    });
    controllerRef.current = controller;
    void (async () => {
      controller.clear();
      const root = await service.getDefaultRootId();
      if (cancelled || !root) return;
      await controller.startFrom(root);
    })();
    return () => {
      cancelled = true;
      controller.dispose();
      controllerRef.current = null;
    };
  }, [service, getState]);

  const selectNode = useCallback((id: string) => {
    controllerRef.current?.selectNode(id);
  }, []);
  const select = useCallback((id: string | null) => {
    controllerRef.current?.select(id);
  }, []);
  const expand = useCallback(
    (id: string) => controllerRef.current?.expand(id) ?? Promise.resolve(),
    []
  );
  const loadMore = useCallback(
    (id: string) => controllerRef.current?.loadMore(id) ?? Promise.resolve(),
    []
  );
  const startFrom = useCallback(
    (id: string) =>
      controllerRef.current?.startFrom(id) ?? Promise.resolve(false),
    []
  );
  const reset = useCallback(() => {
    controllerRef.current?.reset();
  }, []);
  const clear = useCallback(() => {
    controllerRef.current?.clear();
  }, []);

  return {
    state,
    selectNode,
    select,
    expand,
    loadMore,
    startFrom,
    reset,
    clear,
  };
}
