// Type definitions for the text layer system

export interface Position {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  anchor:
    | "topLeft"
    | "top"
    | "topRight"
    | "left"
    | "center"
    | "right"
    | "bottomLeft"
    | "bottom"
    | "bottomRight";
}

export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  letterSpacing?: number;
  highlightColor?: string; // For karaoke effect
  preset?: "tiktok" | "capcut" | "minimal" | "bold" | "neon" | "gradient";
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface AnimationConfig {
  type:
    | "fadeIn"
    | "fadeOut"
    | "fadeUp"
    | "fadeDown"
    | "fadeLeft"
    | "fadeRight"
    | "bounceIn"
    | "scaleIn"
    | "scaleOut"
    | "typewriter"
    | "splitIn"
    | "blur"
    | "none";
  duration: number; // in ms
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "spring";
}

export interface LoopAnimation {
  type: "pulse" | "shake" | "glow" | "float" | "rainbow" | "none";
  duration: number;
  intensity?: number;
  repeat?: boolean;
}

export interface LayerAnimation {
  enter?: AnimationConfig;
  exit?: AnimationConfig;
  loop?: LoopAnimation;
}

export interface TextLayer {
  id: string;
  type: "text";
  content: string;
  startMs: number;
  endMs: number;
  position: Position;
  style: TextStyle;
  animation?: LayerAnimation;
}

export interface CaptionLayer {
  id: string;
  type: "caption";
  source: "whisper";
  position: Position;
  style: TextStyle;
  animation?: LayerAnimation;
  karaoke?: boolean;
}

export type Layer = TextLayer | CaptionLayer;

export interface LayersConfig {
  layers: Layer[];
}

export interface WordTimestamp {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

// Style presets
export const STYLE_PRESETS = {
  tiktok: {
    fontFamily: "TheBoldFont",
    textTransform: "uppercase" as const,
    strokeWidth: 5,
    strokeColor: "#000000",
    letterSpacing: 2,
  },
  capcut: {
    fontFamily: "TheBoldFont",
    textTransform: "uppercase" as const,
    strokeWidth: 4,
    strokeColor: "#000000",
    letterSpacing: 1,
  },
  minimal: {
    fontFamily: "TheBoldFont",
    textTransform: "none" as const,
    strokeWidth: 2,
    strokeColor: "#000000",
    letterSpacing: 0,
  },
  bold: {
    fontFamily: "TheBoldFont",
    textTransform: "uppercase" as const,
    strokeWidth: 6,
    strokeColor: "#000000",
    letterSpacing: 3,
  },
  neon: {
    fontFamily: "TheBoldFont",
    textTransform: "uppercase" as const,
    strokeWidth: 0,
    letterSpacing: 4,
  },
  gradient: {
    fontFamily: "TheBoldFont",
    textTransform: "uppercase" as const,
    strokeWidth: 3,
    strokeColor: "#000000",
    letterSpacing: 1,
  },
};
