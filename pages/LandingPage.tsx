import React, { useState } from 'react';
import { Landing } from './Landing';
import { LandingChatbot } from '../components/LandingChatbot';
import { VideoIntro } from '../components/VideoIntro';

const INTRO_SEEN_KEY = 'logiload_intro_seen';

export const LandingPage: React.FC = () => {
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return !sessionStorage.getItem(INTRO_SEEN_KEY);
    } catch {
      return true;
    }
  });

  const finishIntro = () => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // ignore
    }
    setShowIntro(false);
  };

  if (showIntro) {
    return <VideoIntro videoSrc="/intro.mp4" onVideoEnd={finishIntro} />;
  }

  return (
    <>
      <Landing />
      <LandingChatbot />
    </>
  );
};
