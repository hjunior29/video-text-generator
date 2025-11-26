import React from "react";
import { AbsoluteFill } from "remotion";

export const NoCaptionFile: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.8)",
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: 32,
          fontFamily: "sans-serif",
          textAlign: "center",
          padding: 40,
          maxWidth: "80%",
        }}
      >
        <div style={{ marginBottom: 20, fontSize: 48 }}>No Caption File Found</div>
        <div style={{ opacity: 0.7 }}>
          Please ensure the subtitle JSON file exists in the public folder.
        </div>
      </div>
    </AbsoluteFill>
  );
};
