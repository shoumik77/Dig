"use client";

import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { ringPositions, type Position } from "./placement";
import { cytoscapeStylesheet, ENTITY_COLORS } from "./graphStyles";
import type { GraphState } from "@/lib/graphState";
import type { EntityType, LabelMetadata } from "@/types/music";

export interface MusicGraphHandle {
  fit(): void;
  zoomIn(): void;
  zoomOut(): void;
  center(id: string): void;
}

interface MusicGraphProps {
  state: GraphState;
  onNodeTap(id: string): void;
  onBackgroundTap(): void;
  activeGenres?: ReadonlySet<string>;
}

export const MusicGraph = forwardRef<MusicGraphHandle, MusicGraphProps>(
  function MusicGraph({ state, onNodeTap, onBackgroundTap, activeGenres }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);
    const lastRootRef = useRef<string | null>(null);
    const ringCountRef = useRef<Map<string, number>>(new Map());

    const onNodeTapRef = useRef(onNodeTap);
    const onBackgroundTapRef = useRef(onBackgroundTap);
    useEffect(() => {
      onNodeTapRef.current = onNodeTap;
      onBackgroundTapRef.current = onBackgroundTap;
    }, [onNodeTap, onBackgroundTap]);

    // ── Cytoscape lifecycle ─────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;
      const cy = cytoscape({
        container: containerRef.current,
        style: cytoscapeStylesheet,
        minZoom: 0.3,
        maxZoom: 2.5,
        wheelSensitivity: 0.2,
        boxSelectionEnabled: false,
        autounselectify: true,
      });
      cyRef.current = cy;

      cy.on("tap", "node", (evt) => {
        onNodeTapRef.current(evt.target.id());
      });
      cy.on("tap", (evt) => {
        if (evt.target === cy) onBackgroundTapRef.current();
      });
      cy.on("mouseover", "node", () => {
        if (containerRef.current) containerRef.current.style.cursor = "pointer";
      });
      cy.on("mouseout", "node", () => {
        if (containerRef.current) containerRef.current.style.cursor = "";
      });

      return () => {
        cy.removeAllListeners();
        cy.destroy();
        cyRef.current = null;
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        fit() {
          cyRef.current?.fit(undefined, 80);
        },
        zoomIn() {
          const cy = cyRef.current;
          if (cy) cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
        },
        zoomOut() {
          const cy = cyRef.current;
          if (cy) cy.zoom({ level: cy.zoom() / 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
        },
        center(id: string) {
          const cy = cyRef.current;
          const node = cy?.getElementById(id);
          if (cy && node && node.nonempty()) {
            cy.animate({ center: { eles: node }, duration: 200 });
          }
        },
      }),
      []
    );

    // ── Element sync: add/remove nodes+edges, ring-place new nodes ──────
    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;

      const { nodes, edges, rootId, parentOf } = state;
      const fresh =
        rootId !== lastRootRef.current ||
        (Object.keys(nodes).length === 1 && Object.keys(edges).length === 0);

      if (fresh) ringCountRef.current.clear();

      cy.batch(() => {
        // remove anything no longer in state
        cy.nodes().forEach((el) => {
          if (!(el.id() in nodes)) cy.remove(el);
        });
        cy.edges().forEach((el) => {
          if (!(el.id() in edges)) cy.remove(el);
        });

        const existingPositions = (): Position[] =>
          cy.nodes().map((n) => n.position());

        // fresh graph: pin the root at origin
        if (fresh && rootId && nodes[rootId]) {
          let rootEl = cy.getElementById(rootId);
          if (rootEl.empty()) {
            rootEl = cy.add(nodeDef(nodes[rootId]));
          }
          rootEl.position({ x: 0, y: 0 });
        }

        // group new nodes by the parent that revealed them
        const groups = new Map<string, string[]>();
        for (const id of Object.keys(nodes)) {
          if (id === rootId || cy.getElementById(id).nonempty()) continue;
          const parentId = parentOf[id] ?? rootId ?? id;
          const list = groups.get(parentId) ?? [];
          list.push(id);
          groups.set(parentId, list);
        }

        const newNodeIds: string[] = [];
        for (const [parentId, ids] of groups) {
          const parentEl = cy.getElementById(parentId);
          const center: Position = parentEl.nonempty()
            ? parentEl.position()
            : { x: 0, y: 0 };
          const ring = ringCountRef.current.get(parentId) ?? 0;
          ringCountRef.current.set(parentId, ring + 1);

          const positions = ringPositions({
            center,
            count: ids.length,
            ring,
            existing: existingPositions(),
            seed: parentId,
          });
          ids.forEach((id, i) => {
            cy.add({ ...nodeDef(nodes[id]), position: positions[i] });
            newNodeIds.push(id);
          });
        }

        for (const rel of Object.values(edges)) {
          if (cy.getElementById(rel.id).empty()) {
            cy.add({
              group: "edges",
              data: { id: rel.id, source: rel.source, target: rel.target },
            });
          }
        }

        // gentle reframe only if every new node landed outside the viewport
        if (!fresh && newNodeIds.length > 0) {
          const extent = cy.extent();
          const allOffscreen = newNodeIds.every((id) => {
            const p = cy.getElementById(id).position();
            return (
              p.x < extent.x1 ||
              p.x > extent.x2 ||
              p.y < extent.y1 ||
              p.y > extent.y2
            );
          });
          if (allOffscreen) {
            const firstParent = parentOf[newNodeIds[0]];
            const parentEl = firstParent ? cy.getElementById(firstParent) : null;
            if (parentEl && parentEl.nonempty()) {
              cy.animate({
                fit: { eles: parentEl.closedNeighborhood(), padding: 60 },
                duration: 300,
              });
            }
          }
        }
      });

      if (fresh) {
        cy.fit(undefined, 80);
      }
      lastRootRef.current = rootId;
    }, [state]);

    // ── Visual classes: selection highlight, has-more, loading, genres ──
    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      const { selectedId, expansions, nodes } = state;

      cy.batch(() => {
        cy.elements().removeClass("selected neighbor dimmed has-more loading");

        if (selectedId) {
          const selected = cy.getElementById(selectedId);
          if (selected.nonempty()) {
            selected.addClass("selected");
            const neighborhood = selected.closedNeighborhood();
            neighborhood.addClass("neighbor");
            cy.elements().difference(neighborhood.union(selected)).addClass("dimmed");
          }
        }

        // genre filter: dim label nodes with no overlapping genres
        if (activeGenres && activeGenres.size > 0) {
          for (const entity of Object.values(nodes)) {
            if (entity.type !== "label") continue;
            const genres = (entity.metadata as LabelMetadata | undefined)?.genres ?? [];
            if (!genres.some((g) => activeGenres.has(g))) {
              cy.getElementById(entity.id).addClass("dimmed");
            }
          }
        }

        for (const [id, expansion] of Object.entries(expansions)) {
          const el = cy.getElementById(id);
          if (el.empty()) continue;
          if (expansion.nextCursor) el.addClass("has-more");
          if (expansion.status === "loading") el.addClass("loading");
        }
      });
    }, [state, activeGenres]);

    return (
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="img"
        aria-label="Music relationship graph"
      />
    );
  }
);

function nodeDef(entity: {
  id: string;
  name: string;
  type: EntityType;
  provenance: string;
}): ElementDefinition {
  return {
    group: "nodes",
    classes: entity.type,
    data: {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      provenance: entity.provenance,
      accent: ENTITY_COLORS[entity.type],
    },
  };
}
