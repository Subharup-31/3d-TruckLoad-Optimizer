import React, { useState, useRef, useEffect } from 'react';

interface VideoIntroProps {
    videoSrc: string;
    onVideoEnd: () => void;
}

export const VideoIntro: React.FC<VideoIntroProps> = ({ videoSrc, onVideoEnd }) => {
    const [isPlaying, setIsPlaying] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        console.log('🎬 VideoIntro: Loading video from:', videoSrc);

        // Auto-play the video when component mounts
        if (videoRef.current) {
            console.log('▶️ Attempting to play video...');
            const video = videoRef.current;
            
            // Try to load and play
            video.load();
            video.play().catch((error) => {
                console.error('❌ Error auto-playing video:', error);
            });
        }
    }, [videoSrc]);

    const handleVideoEnd = () => {
        console.log('✅ Video ended naturally');
        setIsPlaying(false);
        onVideoEnd();
    };

    const handleSkip = () => {
        console.log('⏭️ User skipped video');
        setIsPlaying(false);
        onVideoEnd();
    };

    const handleError = (e: any) => {
        console.error('❌ Video playback error:', e);
        console.error('Video source:', videoSrc);
    };

    const handleLoadStart = () => {
        console.log('📥 Video loading started...');
    };

    const handleCanPlay = () => {
        console.log('✅ Video can play - duration:', videoRef.current?.duration);
        setIsLoading(false);
    };

    const handleLoadedData = () => {
        console.log('✅ Video data loaded');
        setIsLoading(false);
    };

    const handlePlaying = () => {
        console.log('▶️ Video is playing');
        setIsLoading(false);
    };

    if (!isPlaying) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                onEnded={handleVideoEnd}
                onError={handleError}
                onLoadStart={handleLoadStart}
                onCanPlay={handleCanPlay}
                onLoadedData={handleLoadedData}
                onPlaying={handlePlaying}
                playsInline
                muted
                autoPlay
                preload="auto"
            >
                <source src={videoSrc} type="video/mp4" />
                <source src={videoSrc.replace('.mp4', '.webm')} type="video/webm" />
                Your browser does not support the video tag.
            </video>

            {/* Loading indicator - only show while loading */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black">
                    <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="text-lg">Loading video...</p>
                    </div>
                </div>
            )}

            {/* Skip button */}
            <button
                onClick={handleSkip}
                className="absolute top-8 right-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 border border-white/30 hover:border-white/50 hover:scale-105"
            >
                Skip Intro
            </button>
        </div>
    );
};
