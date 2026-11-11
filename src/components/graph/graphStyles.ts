import type { StylesheetJson } from "cytoscape";
import type { EntityType } from "@/types/music";

/* keep in sync with the --color-* entity tokens in globals.css */
export const ENTITY_COLORS: Record<EntityType, string> = {
  label: "#f5a524",
  artist: "#2dd4bf",
  "release-group": "#fb7185",
  release: "#a78bfa",
  recording: "#60a5fa",
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  label: "Label",
  artist: "Artist",
  "release-group": "Release group",
  release: "Release",
  recording: "Recording",
};

const ACCENT = "#d6ff57";
const CANVAS = "#101010";
const ELEVATED = "#1c1c1f";
const EDGE_COLOR = "#38383f";
const EDGE_LABEL_COLOR = "#83837f";
const TEXT_COLOR = "#f2f0ea";
const LABEL_CARD = "#e8e4d8";
const LABEL_CARD_INK = "#141412";

// cytoscape accepts the string "null" to mean "no crossOrigin attribute"
// (Discogs images carry no ACAO header, so anonymous CORS would fail to
// load them entirely). The TS types only list the CORS modes — cast.
const NO_CORS = "null" as unknown as "anonymous";

export const cytoscapeStylesheet: StylesheetJson = [
  {
    selector: "node",
    style: {
      label: "data(name)",
      "font-family": "Geist, ui-sans-serif, system-ui, sans-serif",
      "font-size": 12,
      "font-weight": 500,
      color: TEXT_COLOR,
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 10,
      "text-max-width": "150px",
      "text-wrap": "ellipsis",
      "text-background-color": CANVAS,
      "text-background-opacity": 0.8,
      "text-background-padding": "3px",
      "background-color": ELEVATED,
      "border-width": 1.5,
      "border-color": "#101010",
      "transition-property": "opacity, border-width, border-color",
      "transition-duration": 0.15,
    },
  },
  /* artwork only once data("image") resolves to a URL — an empty value
     fails url parsing inside cytoscape's multiple-typed property */
  {
    selector: "node.imaged",
    style: {
      "background-image": "data(image)",
      "background-fit": "cover",
      // no CORS — Discogs serves images without ACAO; drawing taints the
      // canvas, which is fine since pixels are never read back
      "background-image-crossorigin": NO_CORS,
    },
  },
  /* unenriched fallback: type-colored border over the elevated tile */
  {
    selector: "node:not(.imaged)",
    style: {
      "border-color": "data(accent)",
      "border-opacity": 0.55,
    },
  },
  {
    selector: "node.label",
    style: {
      shape: "round-rectangle",
      width: 168,
      height: 66,
      "background-color": LABEL_CARD,
      "border-color": "#101010",
      "border-opacity": 1,
      label: "data(name)",
      "text-valign": "center",
      "text-halign": "center",
      "text-margin-y": 0,
      "text-transform": "uppercase",
      "text-wrap": "wrap",
      "text-max-width": "140px",
      "font-size": 13,
      "font-weight": 600,
      color: LABEL_CARD_INK,
      "text-background-opacity": 0,
    },
  },
  {
    selector: "node.artist",
    style: {
      shape: "ellipse",
      width: 84,
      height: 84,
    },
  },
  {
    selector: "node.release-group",
    style: {
      shape: "round-rectangle",
      width: 104,
      height: 104,
    },
  },
  {
    selector: "node.release",
    style: {
      shape: "round-rectangle",
      width: 118,
      height: 118,
    },
  },
  /* recording = bordered pill sized to its label text */
  {
    selector: "node.recording",
    style: {
      shape: "round-rectangle",
      width: "label",
      height: "label",
      padding: "10px",
      "background-color": "#1a1a1d",
      "border-width": 1,
      "border-color": "#303030",
      "border-opacity": 1,
      "text-valign": "center",
      "text-margin-y": 0,
      "font-size": 10,
      color: "#a3a19b",
      "text-background-opacity": 0,
    },
  },
  {
    selector: "edge",
    style: {
      width: 1,
      "line-color": EDGE_COLOR,
      "curve-style": "bezier",
      label: "data(label)",
      "font-size": 9,
      color: EDGE_LABEL_COLOR,
      "text-rotation": "autorotate",
      "text-background-color": CANVAS,
      "text-background-opacity": 0.85,
      "text-background-padding": "2px",
      "transition-property": "opacity, line-color, width",
      "transition-duration": 0.15,
    },
  },
  /* edge captions only appear on edges touching the selection */
  {
    selector: "edge:not(.neighbor)",
    style: {
      "text-opacity": 0,
    },
  },
  {
    selector: ".selected",
    style: {
      "border-width": 3,
      "border-color": ACCENT,
      "border-opacity": 1,
    },
  },
  {
    selector: "edge.neighbor",
    style: {
      "line-color": "#565660",
      width: 1.5,
      "text-opacity": 1,
    },
  },
  {
    selector: "node.neighbor",
    style: {
      opacity: 1,
    },
  },
  {
    selector: ".dimmed",
    style: { opacity: 0.16, "text-opacity": 0.16 },
  },
  {
    selector: ".has-more",
    style: {
      "border-style": "dashed",
      "border-width": 2,
      "border-color": "data(accent)",
      "border-opacity": 0.85,
    },
  },
  {
    selector: ".loading",
    style: { opacity: 0.55 },
  },
  {
    selector: ".error",
    style: {
      "border-style": "dotted",
      "border-width": 2,
      "border-color": "#f87171",
    },
  },
];
