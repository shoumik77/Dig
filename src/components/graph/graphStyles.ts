import type { StylesheetJson } from "cytoscape";
import type { EntityType } from "@/types/music";

export const ENTITY_COLORS: Record<EntityType, string> = {
  label: "#f5a524",
  artist: "#2dd4bf",
  release: "#a78bfa",
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  label: "Label",
  artist: "Artist",
  release: "Release",
};

const EDGE_COLOR = "#2a2a31";
const TEXT_COLOR = "#d4d4d8";

export const cytoscapeStylesheet: StylesheetJson = [
  {
    selector: "node",
    style: {
      label: "data(name)",
      "font-size": 11,
      color: TEXT_COLOR,
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 6,
      "text-max-width": "110px",
      "text-wrap": "ellipsis",
      "text-background-color": "#0b0b0d",
      "text-background-opacity": 0.7,
      "text-background-padding": "2px",
      "border-width": 0,
      "transition-property": "opacity, border-width, border-color",
      "transition-duration": 0.15,
    },
  },
  {
    selector: "node.label",
    style: {
      shape: "round-rectangle",
      width: 44,
      height: 44,
      "background-color": ENTITY_COLORS.label,
    },
  },
  {
    selector: "node.artist",
    style: {
      shape: "ellipse",
      width: 34,
      height: 34,
      "background-color": ENTITY_COLORS.artist,
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
    selector: "edge",
    style: {
      width: 1.5,
      "line-color": EDGE_COLOR,
      "curve-style": "bezier",
      label: "",
      "transition-property": "opacity",
      "transition-duration": 0.15,
    },
  },
  {
    selector: ".selected",
    style: {
      "border-width": 3,
      "border-color": "#fafafa",
      "border-opacity": 0.95,
    },
  },
  {
    selector: "node.neighbor",
    style: {
      "border-width": 2,
      "border-color": "data(accent)",
      opacity: 1,
    },
  },
  {
    selector: ".dimmed",
    style: { opacity: 0.25 },
  },
  {
    selector: ".has-more",
    style: {
      "border-style": "dashed",
      "border-width": 2,
      "border-color": "data(accent)",
    },
  },
  {
    selector: ".loading",
    style: { opacity: 0.6 },
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
