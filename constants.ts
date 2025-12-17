
import { ViewConfig, AppMode } from './types';

export const APP_MODES: { id: AppMode; label: string; description: string; icon: string }[] = [
  { 
    id: 'remove-bg', 
    label: '自动抠图', 
    description: '一键提取角色，去除背景',
    icon: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z'
  },
  {
    id: 'object-erase',
    label: '智能擦除',
    description: '点击物体，AI 自动擦除并补全',
    icon: 'M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42'
  },
  { 
    id: 'multi-view', 
    label: '多视图生成', 
    description: '从单张图生成多角度视图',
    icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z'
  },
  { 
    id: 'expressions', 
    label: '表情包生成', 
    description: '生成多种不同的人脸表情',
    icon: 'M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z'
  },
  { 
    id: 'chibi', 
    label: 'Q版形象', 
    description: '一键生成可爱的Q版风格',
    icon: 'M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z'
  }
];

export const MULTI_VIEWS: ViewConfig[] = [
  {
    id: 'left-profile',
    title: '左侧视图',
    description: '正左侧面 (90°)',
    promptInstruction: 'Generate a strict left profile view (side view) of this character. Show the character facing exactly 90 degrees to the left.'
  },
  {
    id: 'left-45',
    title: '左前 3/4',
    description: '左前方 45° 视角',
    promptInstruction: 'Generate a 3/4 angle view of this character turned 45 degrees to the left (facing slightly towards the camera).'
  },
  {
    id: 'left-75',
    title: '左后 3/4',
    description: '左后方视角 (偏背面)',
    promptInstruction: 'Generate a rear-side view (approx 135 degrees) turned to the left. CRITICAL: The character must be facing AWAY from the camera. The head MUST follow the body orientation and look into the distance. Do NOT look back at the camera.'
  },
  {
    id: 'left-top-45',
    title: '左前俯视 45°',
    description: '左前高角度 (鸟瞰视角)',
    promptInstruction: 'Generate a high angle bird\'s-eye view (high angle shot) of this character turned 45 degrees to the left. The camera is looking down from above, emphasizing the top of the head and shoulders with strong downward perspective.'
  },
  {
    id: 'left-bottom-45',
    title: '左前仰视 45°',
    description: '左前低角度 (抬头 45°)',
    promptInstruction: 'Generate a distinct low-angle perspective (worm\'s-eye view) of the character turned 45 degrees to the left. CRITICAL POSE: The head is physically tilted upwards at a 45-degree angle. The underside of the chin and the front of the neck must be clearly visible and prominent. The eyes are directed upwards. Show strong perspective foreshortening from below.'
  },
  {
    id: 'right-profile',
    title: '右侧视图',
    description: '正右侧面 (90°)',
    promptInstruction: 'Generate a strict right profile view (side view) of this character. Show the character facing exactly 90 degrees to the right.'
  },
  {
    id: 'right-45',
    title: '右前 3/4',
    description: '右前方 45° 视角',
    promptInstruction: 'Generate a 3/4 angle view of this character turned 45 degrees to the right (facing slightly towards the camera).'
  },
  {
    id: 'right-75',
    title: '右后 3/4',
    description: '右后方视角 (偏背面)',
    promptInstruction: 'Generate a rear-side view (approx 135 degrees) turned to the right. CRITICAL: The character must be facing AWAY from the camera. The head MUST follow the body orientation and look into the distance. Do NOT look back at the camera.'
  },
  {
    id: 'right-top-45',
    title: '右前俯视 45°',
    description: '右前高角度 (鸟瞰视角)',
    promptInstruction: 'Generate a high angle bird\'s-eye view (high angle shot) of this character turned 45 degrees to the right. The camera is looking down from above, emphasizing the top of the head and shoulders with strong downward perspective.'
  },
  {
    id: 'right-bottom-45',
    title: '右前仰视 45°',
    description: '右前低角度 (抬头 45°)',
    promptInstruction: 'Generate a distinct low-angle perspective (worm\'s-eye view) of the character turned 45 degrees to the right. CRITICAL POSE: The head is physically tilted upwards at a 45-degree angle. The underside of the chin and the front of the neck must be clearly visible and prominent. The eyes are directed upwards. Show strong perspective foreshortening from below.'
  },
  {
    id: 'back',
    title: '正背面视图',
    description: '严格正背面 (180°)',
    promptInstruction: 'Generate a direct back view of this character. Show the details of the back of their clothing and hair clearly.'
  },
  {
    id: 'back-left-45',
    title: '背面左 45°',
    description: '背面偏左视角',
    promptInstruction: 'Generate a view from behind, angled slightly to the left. The character is facing COMPLETELY AWAY from the viewer. The face should NOT be visible. The gaze is directed forward into the distance. Do NOT turn the head towards the camera.'
  },
  {
    id: 'back-right-45',
    title: '背面右 45°',
    description: '背面偏右视角',
    promptInstruction: 'Generate a view from behind, angled slightly to the right. The character is facing COMPLETELY AWAY from the viewer. The face should NOT be visible. The gaze is directed forward into the distance. Do NOT turn the head towards the camera.'
  },
  {
    id: 'back-bottom',
    title: '背面仰视',
    description: '背面低角度视角',
    promptInstruction: 'Generate a low angle shot (worm\'s-eye view) from the back of this character, looking up with strong perspective.'
  },
  {
    id: 'back-top',
    title: '背面俯视',
    description: '背面高角度视角',
    promptInstruction: 'Generate a high angle shot (bird\'s-eye view) from the back of this character, looking down with strong perspective.'
  },
  {
    id: 'bottom',
    title: '正前仰视',
    description: '正面低角度 (抬头 45°)',
    promptInstruction: 'Generate an extreme low-angle perspective (worm\'s-eye view) from the front. CRITICAL POSE: The character\'s head is tilted upwards at a sharp 45-degree angle. The camera looks up from beneath the chin, making the underside of the jaw and the neck the central focus. The eyes are looking up towards the top of the frame. This creates a powerful sense of height and upward gaze.'
  },
  {
    id: 'top',
    title: '正前俯视',
    description: '高角度俯视',
    promptInstruction: 'Generate a high angle shot (bird\'s-eye view) of this character from the front, looking down at them from above with strong perspective.'
  }
];

export const SYMMETRIC_PAIRS: [string, string][] = [
  ['left-profile', 'right-profile'],
  ['left-45', 'right-45'],
  ['left-75', 'right-75'],
  ['left-top-45', 'right-top-45'],
  ['left-bottom-45', 'right-bottom-45'],
  ['back-left-45', 'back-right-45']
];

export const EXPRESSION_VIEWS: ViewConfig[] = [
  // 基础通用表情 (保留原来的多样性)
  {
    id: 'laughing',
    title: '大笑',
    description: '非常开心的表情',
    promptInstruction: 'Generate a portrait of this character with a wide, joyful laugh. Eyes crinkled and mouth open in a big smile showing happiness.'
  },
  {
    id: 'angry',
    title: '愤怒',
    description: '生气的表情',
    promptInstruction: 'Generate a portrait of this character looking very angry. Furrowed brows, intense eyes, and a stern or shouting mouth expression.'
  },
  {
    id: 'surprised',
    title: '惊讶',
    description: '意外的表情',
    promptInstruction: 'Generate a portrait of this character with a surprised and shocked expression. Wide eyes, raised eyebrows, and slightly open mouth.'
  },
  {
    id: 'fearful',
    title: '恐惧',
    description: '害怕的表情',
    promptInstruction: 'Generate a portrait of this character looking scared and fearful. Wide pupils, trembling lips, and a worried facial tension.'
  },
  // 用户指定加入的表情
  {
    id: 'smiling',
    title: '微笑',
    description: '温和友善的表情',
    promptInstruction: 'Generate a portrait of this character with a gentle, friendly smile. Closed mouth or slightly parted lips, eyes looking warm and kind.'
  },
  {
    id: 'sad',
    title: '难过',
    description: '忧郁伤感的表情',
    promptInstruction: 'Generate a portrait of this character looking sad and melancholy. Downward-turned mouth, slightly furrowed eyebrows, and a sorrowful gaze.'
  },
  {
    id: 'disgust',
    title: '厌恶',
    description: '强烈排斥的表情',
    promptInstruction: 'Generate a portrait of this character showing a look of disgust and revulsion. Wrinkled nose, curled upper lip, and narrowed eyes as if seeing something unpleasant.'
  },
  {
    id: 'contempt',
    title: '轻蔑',
    description: '傲慢不屑的表情',
    promptInstruction: 'Generate a portrait of this character showing contempt and disdain. A subtle sneer with one corner of the mouth raised, eyes slightly squinting in an arrogant manner.'
  },
  {
    id: 'gritting-teeth',
    title: '咬牙切齿',
    description: '极度忍耐或愤怒',
    promptInstruction: 'Generate a portrait of this character gritting their teeth. Visible clenched jaw, exposed teeth, and intense facial muscles showing great strain or suppressed fury.'
  }
];
