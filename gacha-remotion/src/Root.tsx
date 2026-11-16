import React from "react";
import { Composition } from "remotion";
import { DrawTheme, type DrawThemeProps } from "./Composition";
import { DURATION_S, FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DrawTheme"
      component={DrawTheme as React.FC<DrawThemeProps>}
      durationInFrames={DURATION_S * FPS}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ sound: true }}
    />
  );
};
