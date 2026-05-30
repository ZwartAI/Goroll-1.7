// FASE 7: Sound effects utility for the Battle Map
const AUDIO_PATHS = {
  dice: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Generic dice roll
  move: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Soft slide
  chalk: 'https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3', // Chalk scribble
  click: 'https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3', // Interface click
};

export const playMapSound = (type: keyof typeof AUDIO_PATHS) => {
  try {
    const audio = new Audio(AUDIO_PATHS[type]);
    audio.volume = 0.2;
    audio.play().catch(() => {
      // Browser might block autoplay without user interaction, ignore
    });
  } catch (e) {
    console.warn("Sound play failed", e);
  }
};
