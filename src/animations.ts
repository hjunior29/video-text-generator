import { interpolate, spring, Easing } from "remotion";
import { AnimationConfig, LoopAnimation } from "./types";

// Easing functions mapping
const easingMap = {
  linear: Easing.linear,
  easeIn: Easing.ease,
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  spring: Easing.out(Easing.ease), // Spring handled separately
};

interface AnimationResult {
  opacity: number;
  transform: string;
  filter?: string;
}

/**
 * Calculate enter animation properties
 */
export function getEnterAnimation(
  frame: number,
  fps: number,
  config: AnimationConfig
): AnimationResult {
  const durationInFrames = Math.ceil((config.duration / 1000) * fps);
  const easing = easingMap[config.easing || "easeOut"];

  // Use spring for bouncy animations
  const useSpring = config.type === "bounceIn" || config.easing === "spring";

  let progress: number;
  if (useSpring) {
    progress = spring({
      frame,
      fps,
      config: {
        damping: 12,
        stiffness: 200,
        mass: 0.5,
      },
      durationInFrames,
    });
  } else {
    progress = interpolate(frame, [0, durationInFrames], [0, 1], {
      extrapolateRight: "clamp",
      easing,
    });
  }

  switch (config.type) {
    case "fadeIn":
      return {
        opacity: progress,
        transform: "none",
      };

    case "fadeUp":
      return {
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [50, 0])}px)`,
      };

    case "fadeDown":
      return {
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [-50, 0])}px)`,
      };

    case "fadeLeft":
      return {
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [50, 0])}px)`,
      };

    case "fadeRight":
      return {
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [-50, 0])}px)`,
      };

    case "bounceIn":
      const scale = interpolate(progress, [0, 0.5, 1], [0.3, 1.1, 1]);
      return {
        opacity: Math.min(progress * 2, 1),
        transform: `scale(${scale}) translateY(${interpolate(progress, [0, 1], [30, 0])}px)`,
      };

    case "scaleIn":
      return {
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0, 1])})`,
      };

    case "splitIn":
      return {
        opacity: progress,
        transform: `scaleX(${interpolate(progress, [0, 1], [0, 1])})`,
      };

    case "none":
    default:
      return {
        opacity: 1,
        transform: "none",
      };
  }
}

/**
 * Calculate exit animation properties
 */
export function getExitAnimation(
  frame: number,
  fps: number,
  totalFrames: number,
  config: AnimationConfig
): AnimationResult {
  const durationInFrames = Math.ceil((config.duration / 1000) * fps);
  const exitStartFrame = totalFrames - durationInFrames;
  const exitFrame = frame - exitStartFrame;

  if (exitFrame < 0) {
    return { opacity: 1, transform: "none" };
  }

  const progress = interpolate(exitFrame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  switch (config.type) {
    case "fadeOut":
      return {
        opacity: 1 - progress,
        transform: "none",
      };

    case "fadeUp":
      return {
        opacity: 1 - progress,
        transform: `translateY(${interpolate(progress, [0, 1], [0, -50])}px)`,
      };

    case "fadeDown":
      return {
        opacity: 1 - progress,
        transform: `translateY(${interpolate(progress, [0, 1], [0, 50])}px)`,
      };

    case "scaleOut":
      return {
        opacity: 1 - progress,
        transform: `scale(${interpolate(progress, [0, 1], [1, 0])})`,
      };

    case "blur":
      return {
        opacity: 1 - progress,
        transform: "none",
        filter: `blur(${interpolate(progress, [0, 1], [0, 20])}px)`,
      };

    case "none":
    default:
      return {
        opacity: 1,
        transform: "none",
      };
  }
}

/**
 * Calculate loop animation properties
 */
export function getLoopAnimation(
  frame: number,
  fps: number,
  config: LoopAnimation
): AnimationResult {
  const cycleDuration = Math.ceil((config.duration / 1000) * fps);
  const cycleProgress = (frame % cycleDuration) / cycleDuration;
  const intensity = config.intensity || 1;

  switch (config.type) {
    case "pulse": {
      const pulseScale = 1 + Math.sin(cycleProgress * Math.PI * 2) * 0.05 * intensity;
      return {
        opacity: 1,
        transform: `scale(${pulseScale})`,
      };
    }

    case "shake": {
      const shakeX = Math.sin(cycleProgress * Math.PI * 4) * 3 * intensity;
      const shakeY = Math.cos(cycleProgress * Math.PI * 4) * 2 * intensity;
      return {
        opacity: 1,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      };
    }

    case "glow": {
      const glowIntensity = 0.5 + Math.sin(cycleProgress * Math.PI * 2) * 0.5;
      return {
        opacity: 1,
        transform: "none",
        filter: `brightness(${1 + glowIntensity * 0.3 * intensity})`,
      };
    }

    case "float": {
      const floatY = Math.sin(cycleProgress * Math.PI * 2) * 10 * intensity;
      return {
        opacity: 1,
        transform: `translateY(${floatY}px)`,
      };
    }

    case "rainbow":
      // Rainbow handled in component via hue-rotate
      const hue = cycleProgress * 360;
      return {
        opacity: 1,
        transform: "none",
        filter: `hue-rotate(${hue}deg)`,
      };

    case "none":
    default:
      return {
        opacity: 1,
        transform: "none",
      };
  }
}

/**
 * Combine multiple animation results
 */
export function combineAnimations(...animations: AnimationResult[]): React.CSSProperties {
  let opacity = 1;
  const transforms: string[] = [];
  const filters: string[] = [];

  for (const anim of animations) {
    opacity *= anim.opacity;
    if (anim.transform && anim.transform !== "none") {
      transforms.push(anim.transform);
    }
    if (anim.filter) {
      filters.push(anim.filter);
    }
  }

  return {
    opacity,
    transform: transforms.length > 0 ? transforms.join(" ") : undefined,
    filter: filters.length > 0 ? filters.join(" ") : undefined,
  };
}
