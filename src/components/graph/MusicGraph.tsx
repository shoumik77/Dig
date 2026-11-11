"use client";

import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ringPositions, type Position } from "./placement";
import { cytoscapeStylesheet, ENTITY_COLORS } from "./graphStyles";
import { edgeLabel, formatLength } from "@/lib/entityDisplay";
import type { GraphState } from "@/lib/graphState";
import type { EntityType, MusicEntity, RecordingMetadata } from "@/types/music";

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
  /** when non-null, node types outside the set are dimmed */
  visibleTypes?: ReadonlySet<EntityType> | null;
  /** zoom percentage (0–100+); fires on init and every zoom */
  onZoomChange?(pct: number): void;
}

interface BadgePos {
  x: number;
  y: number;
}

export const MusicGraph = forwardRef<MusicGraphHandle, MusicGraphProps>(
  function MusicGraph(
    { state, onNodeTap, onBackgroundTap, activeGenres, visibleTypes, onZoomChange },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);
    const lastRootRef = useRef<string | null>(null);
    const ringCountRef = useRef<Map<string, number>>(new Map());
    const pendingFitRef = useRef(false);
    const [rootBadge, setRootBadge] = useState<BadgePos | null>(null);

    const onNodeTapRef = useRef(onNodeTap);
    const onBackgroundTapRef = useRef(onBackgroundTap);
    const onZoomChangeRef = useRef(onZoomChange);
    useEffect(() => {
      onNodeTapRef.current = onNodeTap;
      onBackgroundTapRef.current = onBackgroundTap;
      onZoomChangeRef.current = onZoomChange;
    }, [onNodeTap, onBackgroundTap, onZoomChange]);

    // ── Cytoscape lifecycle ─────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;
      const cy = cytoscape({
        container: containerRef.current,
        style: cytoscapeStylesheet,
        minZoom: 0.2,
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
      cy.on("zoom", () => {
        onZoomChangeRef.current?.(Math.round(cy.zoom() * 100));
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
          if (cy)
            cy.zoom({
              level: cy.zoom() * 1.25,
              renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
            });
        },
        zoomOut() {
          const cy = cyRef.current;
          if (cy)
            cy.zoom({
              level: cy.zoom() / 1.25,
              renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
            });
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

      const { nodes, edges, rootId, parentOf, expansions } = state;
      const fresh =
        rootId !== lastRootRef.current ||
        (Object.keys(nodes).length === 1 && Object.keys(edges).length === 0);

      if (fresh) {
        ringCountRef.current.clear();
        // defer the fit until the root's first page arrives — a lone root
        // has nothing meaningful to frame
        const rootExpansion = rootId ? expansions[rootId] : undefined;
        pendingFitRef.current =
          !!rootId && (!rootExpansion || rootExpansion.loaded === 0);
      }

      let didInitialFit = false;
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
              data: {
                id: rel.id,
                source: rel.source,
                target: rel.target,
                label: edgeLabel(rel.type),
              },
            });
          }
        }

        // gentle reframe only if every new node landed outside the viewport
        didInitialFit = pendingFitRef.current && newNodeIds.length > 0;
        if (!fresh && !didInitialFit && newNodeIds.length > 0) {
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

      if (didInitialFit) {
        pendingFitRef.current = false;
        cy.fit(undefined, 80);
      } else if (fresh && !pendingFitRef.current) {
        cy.fit(undefined, 80);
      }
      lastRootRef.current = rootId;
    }, [state]);

    // ── Visual classes: selection, has-more, loading, genre + type dim ──
    useEffect(() => {
      const cy = cyRef.current;
      if (!cy) return;
      const { selectedId, expansions, nodes } = state;

      cy.batch(() => {
        cy.elements().removeClass("selected neighbor dimmed has-more loading error");

        // sync artwork data (enrichment arrives after the node was added)
        for (const entity of Object.values(nodes)) {
          const el = cy.getElementById(entity.id);
          if (el.empty()) continue;
          const image =
            entity.enrichment?.discogs?.imageUrl ??
            entity.enrichment?.discogs?.thumbUrl ??
            "";
          if (el.data("image") !== image) el.data("image", image);
          el.toggleClass("imaged", image !== "");
        }

        const dimmedNodes = new Set<string>();

        if (selectedId) {
          const selected = cy.getElementById(selectedId);
          if (selected.nonempty()) {
            selected.addClass("selected");
            const neighborhood = selected.closedNeighborhood();
            neighborhood.addClass("neighbor");
            cy.elements()
              .difference(neighborhood.union(selected))
              .forEach((el) => {
                el.addClass("dimmed");
                if (el.isNode()) dimmedNodes.add(el.id());
              });
          }
        }

        // type filter: dim every node whose type is outside the set
        if (visibleTypes) {
          for (const entity of Object.values(nodes)) {
            if (visibleTypes.has(entity.type)) continue;
            const el = cy.getElementById(entity.id);
            if (el.nonempty()) {
              el.addClass("dimmed");
              dimmedNodes.add(entity.id);
            }
          }
        }

        // genre filter: dim nodes that HAVE genres but match none;
        // nodes without genre data stay undimmed
        if (activeGenres && activeGenres.size > 0) {
          for (const entity of Object.values(nodes)) {
            const genres = entity.metadata?.genres;
            if (!genres?.length) continue;
            if (!genres.some((g) => activeGenres.has(g))) {
              cy.getElementById(entity.id).addClass("dimmed");
              dimmedNodes.add(entity.id);
            }
          }
        }

        // edges fade with either dimmed endpoint (but keep selection edges)
        if (dimmedNodes.size > 0) {
          cy.edges().forEach((edge) => {
            if (edge.hasClass("neighbor")) return;
            if (
              dimmedNodes.has(edge.source().id()) ||
              dimmedNodes.has(edge.target().id())
            ) {
              edge.addClass("dimmed");
            }
          });
        }

        for (const [id, expansion] of Object.entries(expansions)) {
          const el = cy.getElementById(id);
          if (el.empty()) continue;
          if (expansion.nextCursor) el.addClass("has-more");
          if (expansion.status === "loading") el.addClass("loading");
          if (expansion.status === "error") el.addClass("error");
        }
      });
    }, [state, activeGenres, visibleTypes]);

    // ── "START HERE" badge tracking the root node's rendered position ───
    const rootId = state.rootId;
    useEffect(() => {
      const cy = cyRef.current;
      if (!cy || !rootId) {
        setRootBadge(null);
        return;
      }
      let raf = 0;
      const update = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const el = cy.getElementById(rootId);
          if (el.empty()) {
            setRootBadge(null);
            return;
          }
          const rp = el.renderedPosition();
          const h = el.renderedHeight();
          setRootBadge({ x: rp.x, y: rp.y - h / 2 - 14 });
        });
      };
      update();
      cy.on("render pan zoom resize position", update);
      return () => {
        cancelAnimationFrame(raf);
        cy.off("render pan zoom resize position", update);
      };
    }, [rootId, state]);

    return (
      <div className="absolute inset-0">
        {/* cytoscape forces position:relative on its container, so it must
            size itself via h-full rather than absolute inset-0 */}
        <div
          ref={containerRef}
          className="h-full w-full"
          role="img"
          aria-label="Music relationship graph"
        />
        {rootBadge && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-border bg-bg px-2 py-1 text-[9px] font-medium tracking-[0.14em] text-accent"
            style={{ left: rootBadge.x, top: rootBadge.y }}
          >
            START HERE
          </div>
        )}
      </div>
    );
  }
);

function nodeDef(entity: MusicEntity): ElementDefinition {
  const image =
    entity.enrichment?.discogs?.imageUrl ??
    entity.enrichment?.discogs?.thumbUrl ??
    "";
  // recording pill text: "Original mix · 6:32"
  const lengthMs =
    entity.type === "recording"
      ? (entity.metadata as RecordingMetadata | undefined)?.lengthMs
      : undefined;
  const name =
    entity.type === "recording" && typeof lengthMs === "number"
      ? `${entity.name} · ${formatLength(lengthMs)}`
      : entity.name;
  return {
    group: "nodes",
    classes: image ? `${entity.type} imaged` : entity.type,
    data: {
      id: entity.id,
      name,
      type: entity.type,
      provenance: entity.provenance,
      image,
      accent: ENTITY_COLORS[entity.type],
    },
  };
}
