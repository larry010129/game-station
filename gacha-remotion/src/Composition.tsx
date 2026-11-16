import React from "react";
import { Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "./Scene";

export type DrawThemeProps = {
  /** Play the concept soundtrack. Turn off when embedding in the app. */
  sound: boolean;
};

/** Frame in, picture out: the scene is a pure function of time, so a Player can seek it from the user's brush. */
export const DrawTheme: React.FC<DrawThemeProps> = ({ sound }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <Scene t={frame / fps} />
      {sound ? <Audio src={staticFile("draw-theme.wav")} /> : null}
    </>
  );
};
