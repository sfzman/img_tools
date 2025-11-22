import { ViewConfig, AppMode } from './types';

export const APP_MODES: { id: AppMode; label: string; description: string; icon: string }[] = [
  { 
    id: 'multi-view', 
    label: 'Multi-View Sheet', 
    description: 'Generate 5 angles from one photo',
    icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z'
  },
  { 
    id: 'expressions', 
    label: 'Expressions', 
    description: 'Generate 5 facial expressions',
    icon: 'M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z'
  },
  { 
    id: 'chibi', 
    label: 'Chibi Creator', 
    description: 'Create a Q-version character',
    icon: 'M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z'
  },
  { 
    id: 'remove-bg', 
    label: 'Remove BG', 
    description: 'Extract character on white BG',
    icon: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z'
  }
];

export const MULTI_VIEWS: ViewConfig[] = [
  {
    id: 'left-profile',
    title: 'Left Profile',
    description: 'Strict side view from the left',
    promptInstruction: 'Generate a strict left profile view (side view) of this character. Show the character facing exactly 90 degrees to the left.'
  },
  {
    id: 'left-45',
    title: '45° Left',
    description: 'Three-quarter view from the left',
    promptInstruction: 'Generate a 3/4 angle view of this character turned 45 degrees to the left.'
  },
  {
    id: 'back',
    title: 'Back View',
    description: 'View from behind',
    promptInstruction: 'Generate a direct back view of this character. Show the details of the back of their clothing and hair.'
  },
  {
    id: 'bottom-45',
    title: 'Low Angle (45°)',
    description: 'Looking up at the character (Worm\'s-eye)',
    promptInstruction: 'Generate a low angle shot (worm\'s-eye view) of this character, looking up at them from approximately 45 degrees below.'
  },
  {
    id: 'top-45',
    title: 'High Angle (45°)',
    description: 'Looking down at the character (Bird\'s-eye)',
    promptInstruction: 'Generate a high angle shot (bird\'s-eye view) of this character, looking down at them from approximately 45 degrees above.'
  }
];

export const EXPRESSION_VIEWS: ViewConfig[] = [
  {
    id: 'laughing',
    title: 'Laughing',
    description: 'Big joyful laugh',
    promptInstruction: 'Generate a portrait of this character laughing joyfully (Big Smile/Laugh).'
  },
  {
    id: 'angry',
    title: 'Angry',
    description: 'Furious expression',
    promptInstruction: 'Generate a portrait of this character looking very angry and furious.'
  },
  {
    id: 'crying',
    title: 'Crying',
    description: 'Tears and sadness',
    promptInstruction: 'Generate a portrait of this character crying, looking very sad.'
  },
  {
    id: 'terrified',
    title: 'Terrified',
    description: 'Shock and horror',
    promptInstruction: 'Generate a portrait of this character looking terrified and shocked.'
  },
  {
    id: 'scared',
    title: 'Scared',
    description: 'Fearful and cowering',
    promptInstruction: 'Generate a portrait of this character looking scared, fearful and cowering.'
  }
];