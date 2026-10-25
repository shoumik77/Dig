"use client";

import { useRef } from "react";
import { MusicGraph, type MusicGraphHandle } from "@/components/graph/MusicGraph";
import { GraphControls } from "@/components/graph/GraphControls";
import { useDigGraph } from "@/hooks/useDigGraph";

export default function Home() {
  const { state, selectNode, select, reset } = useDigGraph();
  const graphRef = useRef<MusicGraphHandle>(null);

  return (
    <main className="relative h-screen w-screen">
      <MusicGraph
        ref={graphRef}
        state={state}
        onNodeTap={selectNode}
        onBackgroundTap={() => select(null)}
      />
      <GraphControls
        onZoomIn={() => graphRef.current?.zoomIn()}
        onZoomOut={() => graphRef.current?.zoomOut()}
        onFit={() => graphRef.current?.fit()}
        onReset={reset}
      />
    </main>
  );
}
