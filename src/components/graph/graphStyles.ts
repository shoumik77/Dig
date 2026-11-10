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

const ACCENT = "#c4f56d";
const EDGE_COLOR = "#34343c";
const TEXT_COLOR = "#d9d9de";
const BG_COLOR = "#0b0b0d";

export const cytoscapeStylesheet: StylesheetJson = [
  {
    selector: "node",
    style: {
      label: "data(name)",
      "font-family": "Geist, ui-sans-serif, system-ui, sans-serif",
      "font-size": 11,
      "font-weight": 500,
      color: TEXT_COLOR,
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 7,
      "text-max-width": "120px",
      "text-wrap": "ellipsis",
      "text-background-color": BG_COLOR,
      "text-background-opacity": 0.75,
      "text-background-padding": "2px",
      "border-width": 1.5,
      "border-color": BG_COLOR,
      "transition-property": "opacity, border-width, border-color",
      "transition-duration": 0.15,
    },
  },
  {
    selector: "node.label",
    style: {
      shape: "round-rectangle",
      width: 46,
      height: 46,
      "background-color": ENTITY_COLORS.label,
    },
  },
  {
    selector: "node.artist",
    style: {
      shape: "ellipse",
      width: 36,
      height: 36,
      "background-color": ENTITY_COLORS.artist,
    },
  },
  {
    selector: "node.release-group",
    style: {
      shape: "round-rectangle",
      width: 38,
      height: 38,
      "background-color": ENTITY_COLORS["release-group"],
    },
  },
  {
    selector: "node.release",
    style: {
      shape: "ellipse",
      width: 30,
      height: 30,
      "background-color": ENTITY_COLORS.release,
    },
  },
  {
    selector: "node.recording",
    style: {
      shape: "ellipse",
      width: 22,
      height: 22,
      "background-color": ENTITY_COLORS.recording,
    },
  },
  {
    selector: "edge",
    style: {
      width: 1.25,
      "line-color": EDGE_COLOR,
      "curve-style": "bezier",
      label: "",
      "transition-property": "opacity, line-color, width",
      "transition-duration": 0.15,
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
      "line-color": "#4a4a55",
      width: 1.75,
    },
  },
  {
    selector: "node.neighbor",
    style: {
      "border-width": 2,
      "border-color": "data(accent)",
      "border-opacity": 0.7,
      opacity: 1,
    },
  },
  {
    selector: ".dimmed",
    style: { opacity: 0.22 },
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
