/**
 * The starter library: ten finished, level-checked stories.
 *
 * These are not throwaway fixtures. They are the books a new deployment ships
 * with — the sample a parent reads before trusting the generator, the demo a
 * teacher opens in a meeting — so every one of them must pass `checkDraft` at
 * its level, and `tests/stories.test.ts` enforces that forever.
 *
 * Authoring rules (the same ones the generator lives under):
 * - Every sentence inside the level's word band, refrains included.
 * - Refrains are whole pages, word for word, hitting the level's exact count.
 * - Vocabulary is the level's Dolch lists; anything else is a "new word",
 *   capped per book and repeated enough times to be learned.
 * - The hero solves the problem. Never rescued, never a bystander.
 */

import type { Book, Character } from '@/lib/schema';
import type { LevelId } from '@/lib/levels';

type Mood = 'happy' | 'excited' | 'curious' | 'worried' | 'determined' | 'proud' | 'calm';

interface PageSpec {
  /** The sentence(s) the child reads. */
  t: string;
  /** What the illustration must show. */
  a: string;
  m: Mood;
  /** True when this page is one of the declared refrains. */
  r?: boolean;
}

interface StorySpec {
  id: string;
  title: string;
  subtitle: string;
  levelId: LevelId;
  setting: string;
  characters: Character[];
  pages: PageSpec[];
  refrains: string[];
  quiz: { question: string; options: string[]; answerIndex: number }[];
  wordWall: string[];
}

const character = (
  id: string,
  name: string,
  role: Character['role'],
  appearance: string,
  palette: Character['palette'],
): Character => ({ id, name, role, appearance, palette, sheetUrl: null, sheetRef: null });

function expand(spec: StorySpec): Book {
  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.subtitle,
    levelId: spec.levelId,
    setting: spec.setting,
    characters: spec.characters,
    pages: spec.pages.map((p, index) => ({
      index,
      text: p.t,
      refrain: !!p.r,
      illustration: {
        action: p.a,
        place: spec.setting,
        mood: p.m,
        characterIds: spec.characters.map((c) => c.id),
        imageUrl: null,
        promptUsed: null,
        seed: null,
        status: 'placeholder',
      },
    })),
    quiz: spec.quiz,
    wordWall: spec.wordWall,
    refrains: spec.refrains,
    createdAt: '2026-08-16T12:00:00.000Z',
  };
}

/* ------------------------------------------------------------------ */
/* Just starting — 2–4 words a page, 2 refrains × 4, 80% sight words  */
/* ------------------------------------------------------------------ */

const tess: StorySpec = {
  id: 'story-tess-ball',
  title: 'Tess and the Red Ball',
  subtitle: 'Where did it go?',
  levelId: 'starting',
  setting: 'a sunny back garden',
  characters: [
    character('tess', 'Tess', 'hero',
      'a six-year-old girl with warm brown skin, black curly hair in two puffs, a yellow t-shirt, blue shorts and red shoes',
      { primary: '#F2B33D', secondary: '#155E86', skin: '#8D5B3F', hair: '#1E1611' }),
    character('pip', 'Pip', 'helper',
      'a small scruffy white terrier with one brown ear, a red collar and a stubby wagging tail',
      { primary: '#FFFDF5', secondary: '#C0392B', skin: '#F5F0E6', hair: '#EDE6D6' }),
  ],
  pages: [
    { t: 'Here is Pip.', a: 'Pip the terrier sits in the grass, tail mid-wag', m: 'happy' },
    { t: 'Pip can play.', a: 'Pip bounces after a red ball across the lawn', m: 'excited' },
    { t: 'See the red ball.', a: 'close on the red ball rolling toward a hedge', m: 'curious' },
    { t: 'The ball is away!', a: 'the ball vanishes under the hedge; Pip stares', m: 'worried' },
    { t: 'Where is the ball?', a: 'Tess spreads her hands, asking; Pip looks up at her', m: 'curious', r: true },
    { t: 'Look, Pip, look!', a: 'Tess points across the garden, leading the search', m: 'determined', r: true },
    { t: 'Is it up?', a: 'Tess peers up into the apple tree', m: 'curious' },
    { t: 'Not up!', a: 'only a bird in the tree, no ball', m: 'calm' },
    { t: 'Where is the ball?', a: 'Tess checks behind a flower pot', m: 'curious', r: true },
    { t: 'Look, Pip, look!', a: 'Tess waves Pip over to the other side of the garden', m: 'determined', r: true },
    { t: 'Is it down?', a: 'Tess kneels and looks down a rabbit hole', m: 'curious' },
    { t: 'Not down!', a: 'a surprised rabbit looks back out of the hole', m: 'happy' },
    { t: 'Where is the ball?', a: 'Tess wonders by the toy box on the step', m: 'curious', r: true },
    { t: 'Look, Pip, look!', a: 'Pip sniffs at the toy box, tail going fast', m: 'excited', r: true },
    { t: 'In the box?', a: 'Tess peeks into the wooden toy box by the door', m: 'curious' },
    { t: 'Not in the box!', a: 'only a jump rope and a doll in the box', m: 'calm' },
    { t: 'Where is the ball?', a: 'Tess taps her chin, thinking hard by the hedge', m: 'determined', r: true },
    { t: 'Look, Pip, look!', a: 'Tess lifts the low branch of the hedge to see under', m: 'determined', r: true },
    { t: 'The ball is here!', a: 'the red ball sits under the hedge; Tess reaches in', m: 'excited' },
    { t: 'Play, Pip, play!', a: 'Tess throws the ball and Pip races after it', m: 'happy' },
    { t: 'Funny little Pip!', a: 'Pip rolls in the grass with the ball, Tess laughing', m: 'happy' },
  ],
  refrains: ['Where is the ball?', 'Look, Pip, look!'],
  quiz: [
    { question: 'Who lost the ball?', options: ['Pip', 'A cat'], answerIndex: 0 },
    { question: 'What colour is the ball?', options: ['Red', 'Blue'], answerIndex: 0 },
    { question: 'Who finds the ball?', options: ['Tess', 'A bird'], answerIndex: 0 },
  ],
  wordWall: ['ball', 'look', 'where', 'up', 'down'],
};

const sam: StorySpec = {
  id: 'story-sam-sheep',
  title: 'Run, Sam, Run',
  subtitle: 'A sheep gets out',
  levelId: 'starting',
  setting: 'a green hillside farm',
  characters: [
    character('sam', 'Sam', 'hero',
      'a seven-year-old boy with pale skin and freckles, short red hair, a green raincoat, blue jeans and black boots',
      { primary: '#1E7A4B', secondary: '#155E86', skin: '#F0C8A0', hair: '#B5471D' }),
    character('wool', 'Wool', 'helper',
      'a round fluffy white sheep with a black face, black legs and a small blue tag on one ear',
      { primary: '#F5F0E6', secondary: '#16283D', skin: '#F5F0E6', hair: '#EDE6D6' }),
  ],
  pages: [
    { t: 'Sam is here.', a: 'Sam stands at the farm gate in his green coat', m: 'happy' },
    { t: 'See the farm.', a: 'wide view of the hillside farm, barn and fence', m: 'calm' },
    { t: 'See the sheep.', a: 'Wool the sheep grazes by an open gate', m: 'calm' },
    { t: 'The sheep runs away!', a: 'Wool bolts through the open gate; Sam turns', m: 'worried' },
    { t: 'Come here, sheep!', a: 'Sam calls with hands cupped round his mouth', m: 'determined', r: true },
    { t: 'Run, Sam, run!', a: 'Sam sprints across the field after Wool', m: 'excited', r: true },
    { t: 'Up the hill!', a: 'Wool scrambles up the hill, Sam climbing after', m: 'determined' },
    { t: 'Come here, sheep!', a: 'Sam calls from halfway up the hill', m: 'determined', r: true },
    { t: 'Run, Sam, run!', a: 'Sam runs along the hilltop, coat flying', m: 'excited', r: true },
    { t: 'Down the hill!', a: 'Wool trots down the far slope toward the stream', m: 'curious' },
    { t: 'Come here, sheep!', a: 'Sam slides down the grassy slope calling', m: 'determined', r: true },
    { t: 'Run, Sam, run!', a: 'Sam leaps the little stream at the bottom', m: 'excited', r: true },
    { t: 'Sam can help.', a: 'Sam stops still and crouches down low', m: 'calm' },
    { t: 'See the grass.', a: 'Sam holds out a handful of long sweet grass', m: 'calm' },
    { t: 'Come here, sheep!', a: 'Sam waits, hand out; Wool takes one step closer', m: 'calm', r: true },
    { t: 'The sheep comes!', a: 'Wool walks right up and eats from Sam’s hand', m: 'happy' },
    { t: 'Run, Sam, run!', a: 'Sam jogs home and Wool trots beside him', m: 'happy', r: true },
    { t: 'Home, sheep, home!', a: 'Sam shuts the gate behind Wool, both content', m: 'proud' },
  ],
  refrains: ['Come here, sheep!', 'Run, Sam, run!'],
  quiz: [
    { question: 'Who runs away?', options: ['The sheep', 'The dog'], answerIndex: 0 },
    { question: 'Who gets the sheep home?', options: ['Sam', 'The farmer'], answerIndex: 0 },
    { question: 'What does Sam hold out?', options: ['Grass', 'A hat'], answerIndex: 0 },
  ],
  wordWall: ['run', 'sheep', 'up', 'down', 'home'],
};

const nia: StorySpec = {
  id: 'story-nia-cat',
  title: 'Come Down, Cat',
  subtitle: 'Nia to the rescue',
  levelId: 'starting',
  setting: 'a quiet street with one tall tree',
  characters: [
    character('nia', 'Nia', 'hero',
      'a five-year-old girl with deep brown skin, black braided hair with yellow beads, a pink dress and white trainers',
      { primary: '#D66BA0', secondary: '#F2B33D', skin: '#6B4226', hair: '#141210' }),
    character('milo', 'Milo', 'helper',
      'a plump orange tabby cat with white paws, a white chest and wide green eyes',
      { primary: '#D98E32', secondary: '#F5F0E6', skin: '#D98E32', hair: '#C27B22' }),
  ],
  pages: [
    { t: 'Here is Nia.', a: 'Nia skips along the pavement past the tall tree', m: 'happy' },
    { t: 'Nia can play.', a: 'Nia bounces a hopscotch stone on the path', m: 'happy' },
    { t: 'Where is the cat?', a: 'Nia notices the empty windowsill where Milo sits', m: 'curious' },
    { t: 'Look up!', a: 'Nia shades her eyes and looks up the tall tree', m: 'curious' },
    { t: 'The cat is up!', a: 'Milo crouches high on a branch, eyes wide', m: 'worried' },
    { t: 'Up in the tree!', a: 'wide shot: tiny Milo far up the big tree', m: 'worried' },
    { t: 'Come down, cat!', a: 'Nia calls up with hands round her mouth', m: 'determined', r: true },
    { t: 'Nia can help.', a: 'Nia rolls up her sleeves, thinking', m: 'determined', r: true },
    { t: 'Find the box.', a: 'Nia drags a big wooden box toward the tree', m: 'determined' },
    { t: 'Nia can go up.', a: 'Nia stands tall on the box, reaching high', m: 'determined' },
    { t: 'Come down, cat!', a: 'Nia pats the low branch, calling gently', m: 'calm', r: true },
    { t: 'Nia can help.', a: 'Nia holds up Milo’s blue fish toy', m: 'calm', r: true },
    { t: 'The cat can look.', a: 'Milo peers down at the toy, ears forward', m: 'curious' },
    { t: 'Come down, cat!', a: 'Milo edges one paw down the trunk', m: 'curious', r: true },
    { t: 'Nia can help.', a: 'Nia guides Milo to the box with steady hands', m: 'determined', r: true },
    { t: 'The cat comes down!', a: 'Milo lands softly in Nia’s arms', m: 'happy' },
    { t: 'Come down, cat!', a: 'Nia hops off the box with Milo held close', m: 'happy', r: true },
    { t: 'Nia can help.', a: 'Nia carries Milo home along the street', m: 'proud', r: true },
    { t: 'Funny little cat!', a: 'Milo bats the fish toy on the doorstep', m: 'happy' },
    { t: 'Here is Nia!', a: 'Nia takes a bow while Milo purrs beside her', m: 'proud' },
  ],
  refrains: ['Come down, cat!', 'Nia can help.'],
  quiz: [
    { question: 'Where is the cat?', options: ['Up the tree', 'In the house'], answerIndex: 0 },
    { question: 'What does Nia find?', options: ['A box', 'A hat'], answerIndex: 0 },
    { question: 'Who helps the cat?', options: ['Nia', 'A man'], answerIndex: 0 },
  ],
  wordWall: ['cat', 'up', 'down', 'help', 'box'],
};

/* ------------------------------------------------------------------------- */
/* Building confidence — 3–6 words a page, 2 refrains × 3, 75% sight words   */
/* ------------------------------------------------------------------------- */

const leo: StorySpec = {
  id: 'story-leo-egg',
  title: 'Leo and the Lost Egg',
  subtitle: 'A farm mystery',
  levelId: 'building',
  setting: 'a small farm on a spring morning',
  characters: [
    character('leo', 'Leo', 'hero',
      'an eight-year-old boy with light brown skin, short dark curls, hearing aids, an orange jumper and grey dungarees',
      { primary: '#D97B29', secondary: '#155E86', skin: '#C68863', hair: '#241A12' }),
    character('dot', 'Dot', 'friend',
      'a white farm duck with an orange bill, orange feet and one grey feather in her wing',
      { primary: '#F5F0E6', secondary: '#D97B29', skin: '#F5F0E6', hair: '#EDE6D6' }),
  ],
  pages: [
    { t: 'Leo lives on the farm.', a: 'Leo waves from the farmhouse porch at sunrise', m: 'happy' },
    { t: 'The duck has a nest.', a: 'Dot the duck sits proudly on a straw nest', m: 'calm' },
    { t: 'The nest has one egg.', a: 'close on one smooth white egg in the straw', m: 'calm' },
    { t: 'Oh no, look!', a: 'Dot flaps and quacks; the nest is empty', m: 'worried' },
    { t: 'The egg is not there!', a: 'the empty nest, one bit of straw drifting', m: 'worried' },
    { t: 'Where is the egg?', a: 'Leo kneels by the nest, scanning the yard', m: 'curious', r: true },
    { t: 'Leo will find it.', a: 'Leo stands up with a determined nod', m: 'determined', r: true },
    { t: 'Is it under the chicken?', a: 'Leo lifts a puzzled brown hen gently', m: 'curious' },
    { t: 'No egg there.', a: 'the hen settles back down, nothing beneath', m: 'calm' },
    { t: 'Is it in the grass?', a: 'Leo parts the long grass by the fence', m: 'curious' },
    { t: 'No egg there.', a: 'only a beetle walks through the grass', m: 'calm' },
    { t: 'Where is the egg?', a: 'Leo scratches his head by the water trough', m: 'curious', r: true },
    { t: 'Leo will find it.', a: 'Leo checks the ground for clues, Dot behind him', m: 'determined', r: true },
    { t: 'Is it by the water?', a: 'Leo looks along the muddy edge of the pond', m: 'curious' },
    { t: 'No egg there.', a: 'just ripples and a lily pad on the pond', m: 'calm' },
    { t: 'Leo looks down.', a: 'Leo spots a faint round track in the mud', m: 'curious' },
    { t: 'He sees a round thing.', a: 'something white gleams at the foot of the hill', m: 'excited' },
    { t: 'The egg went down a hill!', a: 'the egg’s rolling track winds down the slope', m: 'excited' },
    { t: 'Where is the egg?', a: 'Leo follows the track, Dot waddling after', m: 'determined', r: true },
    { t: 'Leo will find it.', a: 'Leo reaches the bottom of the hill', m: 'determined', r: true },
    { t: 'There it is!', a: 'the egg rests safe against a tuft of grass', m: 'excited' },
    { t: 'The egg is good.', a: 'Leo cups the egg in both hands, checking it', m: 'calm' },
    { t: 'Leo takes it to the nest.', a: 'Leo carries the egg carefully up the hill', m: 'proud' },
    { t: 'The duck says thank you.', a: 'Dot settles on her egg and nuzzles Leo’s hand', m: 'happy' },
    { t: 'Leo did it!', a: 'Leo and Dot beam at the safe, full nest', m: 'proud' },
  ],
  refrains: ['Where is the egg?', 'Leo will find it.'],
  quiz: [
    { question: 'What is lost?', options: ['An egg', 'A hat'], answerIndex: 0 },
    { question: 'Whose egg is it?', options: ['The duck’s', 'The cow’s'], answerIndex: 0 },
    { question: 'Where was the egg?', options: ['Down the hill', 'In the barn'], answerIndex: 0 },
    { question: 'Who finds the egg?', options: ['Leo', 'The chicken'], answerIndex: 0 },
  ],
  wordWall: ['egg', 'nest', 'duck', 'find', 'down'],
};

const ava: StorySpec = {
  id: 'story-ava-cake',
  title: 'Ava Can Do It',
  subtitle: 'The birthday cake',
  levelId: 'building',
  setting: 'a warm yellow kitchen',
  characters: [
    character('ava', 'Ava', 'hero',
      'a seven-year-old girl with olive skin, long straight black hair in a high ponytail, glasses, a striped apron over a teal dress',
      { primary: '#2A9D8F', secondary: '#F2B33D', skin: '#D9A87C', hair: '#17120E' }),
    character('mama', 'Mama', 'friend',
      'Ava’s mother, olive skin, black hair in a loose bun, rolled-up sleeves and a flour-dusted blue apron',
      { primary: '#155E86', secondary: '#F5F0E6', skin: '#D9A87C', hair: '#17120E' }),
  ],
  pages: [
    { t: 'It is a big day.', a: 'sunlight fills the kitchen; balloons wait in a bag', m: 'happy' },
    { t: 'It is the birthday party.', a: 'a banner and paper hats on the kitchen table', m: 'excited' },
    { t: 'Mama wants to make a cake.', a: 'Mama reads a recipe card, bowls out', m: 'calm' },
    { t: 'But Mama has no help.', a: 'Mama juggles bowls, spoons and the clock', m: 'worried' },
    { t: 'Ava will help her.', a: 'Ava marches in and ties on her striped apron', m: 'determined' },
    { t: 'Ava can do it.', a: 'Ava rolls up her sleeves at the counter', m: 'determined', r: true },
    { t: 'Get the eggs.', a: 'Ava carries two eggs, slow and careful', m: 'determined' },
    { t: 'Get the milk.', a: 'Ava pours milk right up to the line of the cup', m: 'determined' },
    { t: 'Get the apples.', a: 'Ava picks the three reddest apples from the bowl', m: 'happy' },
    { t: 'Mix, mix, mix!', a: 'Ava stirs the big bowl with both hands', m: 'excited', r: true },
    { t: 'Put it all in.', a: 'Ava scrapes the batter into the round tin', m: 'determined' },
    { t: 'Ava can do it.', a: 'Mama slides the tin into the oven; Ava watches', m: 'calm', r: true },
    { t: 'The cake must get big.', a: 'Ava kneels at the oven door, nose to the glass', m: 'curious' },
    { t: 'Ava looks and looks.', a: 'the cake slowly rises behind the glass', m: 'curious' },
    { t: 'It is big now!', a: 'the risen golden cake comes out steaming', m: 'excited' },
    { t: 'Now for the top.', a: 'Ava sets out little bowls of red and white', m: 'determined' },
    { t: 'Mix, mix, mix!', a: 'Ava whips the icing into soft peaks', m: 'excited', r: true },
    { t: 'Red on top.', a: 'Ava spreads red icing in a neat swirl', m: 'determined' },
    { t: 'White on top too.', a: 'Ava dots white icing stars round the edge', m: 'determined' },
    { t: 'Ava can do it.', a: 'Ava places the last star, tongue out in focus', m: 'determined', r: true },
    { t: 'Mix, mix, mix!', a: 'Ava shakes rainbow sprinkles over the top', m: 'happy', r: true },
    { t: 'The cake is pretty!', a: 'the finished cake shines on its stand', m: 'proud' },
    { t: 'Here comes the party!', a: 'family stream in; candles are lit', m: 'excited' },
    { t: 'They all like the cake.', a: 'everyone eats big slices round the table', m: 'happy' },
    { t: 'Ava did it!', a: 'Mama lifts Ava’s hand like a champion’s', m: 'proud' },
  ],
  refrains: ['Ava can do it.', 'Mix, mix, mix!'],
  quiz: [
    { question: 'What do they make?', options: ['A cake', 'A boat'], answerIndex: 0 },
    { question: 'Who helps Mama?', options: ['Ava', 'A dog'], answerIndex: 0 },
    { question: 'What goes on top?', options: ['Red and white', 'Green and blue'], answerIndex: 0 },
    { question: 'Whose party is it?', options: ['The birthday party', 'A school party'], answerIndex: 0 },
  ],
  wordWall: ['cake', 'mix', 'egg', 'milk', 'birthday'],
};

const finn: StorySpec = {
  id: 'story-finn-rain',
  title: 'Finn and the Rain',
  subtitle: 'The best wet day',
  levelId: 'building',
  setting: 'a cosy living room on a rainy day',
  characters: [
    character('finn', 'Finn', 'hero',
      'a six-year-old boy with tan skin, messy brown hair, a yellow raincoat he refuses to take off, and odd socks',
      { primary: '#F2B33D', secondary: '#1E7A4B', skin: '#E0B08A', hair: '#4A3520' }),
    character('rory', 'Rory', 'friend',
      'Finn’s little brother, age four, tan skin, brown hair sticking straight up, dinosaur pyjamas',
      { primary: '#1E7A4B', secondary: '#D97B29', skin: '#E0B08A', hair: '#4A3520' }),
  ],
  pages: [
    { t: 'Finn wants to play out.', a: 'Finn presses his nose to the window, ball under arm', m: 'excited' },
    { t: 'His brother wants to play too.', a: 'Rory drags a kite twice his size to the door', m: 'excited' },
    { t: 'But look at that!', a: 'both boys stare at the streaming window', m: 'worried' },
    { t: 'Rain, rain, rain!', a: 'heavy rain pours off the roof into puddles', m: 'worried', r: true },
    { t: 'They can not play out.', a: 'the kite droops; the ball rolls to a corner', m: 'worried' },
    { t: 'Finn is sad.', a: 'Finn slumps on the sofa arm', m: 'worried' },
    { t: 'His brother is sad too.', a: 'Rory flops face-down on the rug', m: 'worried' },
    { t: 'Finn has a good idea.', a: 'Finn sits bolt upright, finger raised', m: 'excited', r: true },
    { t: 'We can play in here!', a: 'Finn spreads his arms wide at the living room', m: 'excited' },
    { t: 'They make a little house.', a: 'the boys drape a blanket between two chairs', m: 'determined' },
    { t: 'A house of chairs!', a: 'a grand blanket fort with cushion walls', m: 'proud' },
    { t: 'Rain, rain, rain!', a: 'rain streams outside; fairy lights glow in the fort', m: 'calm', r: true },
    { t: 'But they are in the house.', a: 'the boys grin out of the fort door flap', m: 'happy' },
    { t: 'Finn has a good idea.', a: 'Finn holds up a sheet of paper, folding it', m: 'excited', r: true },
    { t: 'Now they make a boat.', a: 'four small hands fold a paper boat', m: 'determined' },
    { t: 'A boat of paper!', a: 'the finished paper boat sits proud on the rug', m: 'proud' },
    { t: 'The boat can ride the water.', a: 'the boat sails the bathtub sea, boys steering waves', m: 'excited' },
    { t: 'Rain, rain, rain!', a: 'the window still streams; nobody minds now', m: 'happy', r: true },
    { t: 'They play and play.', a: 'fort, boat, dinosaurs — the whole room is a game', m: 'happy' },
    { t: 'Finn has a good idea.', a: 'Finn points to the kitchen with a grin', m: 'excited', r: true },
    { t: 'Milk and cake time!', a: 'two mugs of milk and slices of cake in the fort', m: 'happy' },
    { t: 'The rain stops.', a: 'sun breaks through; drips sparkle on the glass', m: 'calm' },
    { t: 'Out they go!', a: 'the boys splash out into the shining puddles', m: 'excited' },
    { t: 'What a good day!', a: 'both boys mid-jump over the biggest puddle', m: 'happy' },
  ],
  refrains: ['Rain, rain, rain!', 'Finn has a good idea.'],
  quiz: [
    { question: 'Why can they not play out?', options: ['Rain', 'Snow'], answerIndex: 0 },
    { question: 'What do they make first?', options: ['A house of chairs', 'A boat'], answerIndex: 0 },
    { question: 'What is the boat made of?', options: ['Paper', 'Wood'], answerIndex: 0 },
    { question: 'Who has the good ideas?', options: ['Finn', 'The cat'], answerIndex: 0 },
  ],
  wordWall: ['rain', 'house', 'boat', 'paper', 'play'],
};

/* --------------------------------------------------------------------- */
/* Growing — 5–10 words, 2 sentences a page, 1 refrain × 3, 70% sight    */
/* --------------------------------------------------------------------- */

const ruby: StorySpec = {
  id: 'story-ruby-garden',
  title: 'The School Garden',
  subtitle: 'Ruby works it out',
  levelId: 'growing',
  setting: 'a small school garden with raised beds',
  characters: [
    character('ruby', 'Ruby', 'hero',
      'a nine-year-old girl with medium brown skin, dark hair in a thick side plait, a denim jacket covered in flower pins, and green wellies',
      { primary: '#1E7A4B', secondary: '#D66BA0', skin: '#A9714B', hair: '#241A12' }),
    character('mo', 'Mo', 'friend',
      'an eight-year-old boy with pale skin, curly black hair, round glasses and a watering can he carries everywhere',
      { primary: '#155E86', secondary: '#F2B33D', skin: '#F0C8A0', hair: '#141210' }),
  ],
  pages: [
    { t: 'Ruby has a little garden at school.', a: 'Ruby stands proud by a raised bed with her name sign', m: 'happy' },
    { t: 'Ruby and Mo put little seeds in the ground.', a: 'two friends press seeds into dark soil', m: 'determined' },
    { t: 'Now they want the seeds to come up.', a: 'both stare hopefully at the flat, bare soil', m: 'curious' },
    { t: 'Come up, little seeds, come up!', a: 'Ruby cups her hands and whispers to the bed', m: 'happy', r: true },
    { t: 'But the seeds do not come up.', a: 'the bed is still bare a week on; Mo frowns', m: 'worried' },
    { t: 'Ruby looks at the garden every day.', a: 'a strip of days: Ruby checking, morning after morning', m: 'determined' },
    { t: 'Where are the little green things?', a: 'Ruby kneels close, nose almost in the soil', m: 'curious' },
    { t: 'Ruby sits down to think and think. What do little seeds want?', a: 'Ruby sits on an upturned pot, chin in hands', m: 'curious' },
    { t: 'Mo says the seeds may want water.', a: 'Mo lifts his beloved watering can', m: 'calm' },
    { t: 'But look at the big water can. It has water right up the top.', a: 'the can brims; the soil is already damp', m: 'curious' },
    { t: 'The seeds have all the water they want. So what can it be?', a: 'Ruby paces the path, thinking hard', m: 'determined' },
    { t: 'Come up, little seeds, come up!', a: 'Mo tries the whisper too, cap in hand', m: 'happy', r: true },
    { t: 'Then one day Ruby looks up and up. And then she sees it!', a: 'Ruby’s eyes go from soil to sky', m: 'excited' },
    { t: 'A big tree is over the garden. The sun can not get in there.', a: 'a broad oak throws deep shade over the bed', m: 'curious' },
    { t: 'The garden is always in the dark. Dark is not good for little seeds.', a: 'the raised bed sits in full shadow', m: 'worried' },
    { t: 'Little seeds want the sun!', a: 'Ruby points at a bright sunny patch nearby', m: 'excited' },
    { t: 'Ruby and Mo ask for help.', a: 'the two explain their plan to the teacher', m: 'determined' },
    { t: 'They all pull the big box to the sun.', a: 'class and teacher drag the planter into the light', m: 'determined' },
    { t: 'Now the garden is warm and light. The warm sun gives it light all day.', a: 'the bed basks in golden afternoon sun', m: 'calm' },
    { t: 'Come up, little seeds, come up!', a: 'Ruby and Mo chant together at the sunny bed', m: 'happy', r: true },
    { t: 'One morning Ruby runs to look.', a: 'Ruby sprints across the yard at first bell', m: 'excited' },
    { t: 'Little green things are up in the garden!', a: 'a row of tiny seedlings stands in the soil', m: 'excited' },
    { t: 'The seeds just wanted the sun. Ruby was the one who found it out!', a: 'Ruby beams; Mo waters the seedlings gently', m: 'proud' },
    { t: 'Soon there are pretty flowers all around.', a: 'the bed overflows with colour; both take a bow', m: 'proud' },
  ],
  refrains: ['Come up, little seeds, come up!'],
  quiz: [
    { question: 'What do Ruby and Mo plant?', options: ['Seeds', 'Rocks'], answerIndex: 0 },
    { question: 'What did the seeds want?', options: ['The sun', 'More water'], answerIndex: 0 },
    { question: 'What was over the garden?', options: ['A big tree', 'A house'], answerIndex: 0 },
    { question: 'Who worked it out?', options: ['Ruby', 'The teacher'], answerIndex: 0 },
  ],
  wordWall: ['seed', 'garden', 'sun', 'green', 'water'],
};

const owen: StorySpec = {
  id: 'story-owen-dark',
  title: 'The Night the Lights Went Out',
  subtitle: 'Owen leads the way',
  levelId: 'growing',
  setting: 'a family house on a stormy night',
  characters: [
    character('owen', 'Owen', 'hero',
      'an eight-year-old boy with black skin, a short high-top fade, star-print pyjamas and a small silver torch on a lanyard',
      { primary: '#155E86', secondary: '#F2B33D', skin: '#5C3A21', hair: '#0E0B09' }),
    character('bella', 'Bella', 'friend',
      'Owen’s big sister, age eleven, black skin, long braids with gold cuffs, a purple dressing gown',
      { primary: '#6B4FA0', secondary: '#F2B33D', skin: '#5C3A21', hair: '#0E0B09' }),
  ],
  pages: [
    { t: 'It is night and the rain comes down fast.', a: 'the house glows warm under a storm sky', m: 'calm' },
    { t: 'Owen is in bed with his little light.', a: 'Owen reads under the covers by torchlight', m: 'calm' },
    { t: 'Then the house goes dark. All the lights are out!', a: 'every window goes black at once', m: 'worried' },
    { t: 'Bella calls out but no one can see.', a: 'Bella feels along the hallway wall', m: 'worried' },
    { t: 'Owen is not afraid of the dark. He has his little light.', a: 'a small beam clicks on in the dark', m: 'determined', r: true },
    { t: 'Owen gets up because he knows what to do.', a: 'Owen swings his feet out of bed, torch up', m: 'determined' },
    { t: 'He finds Bella first and takes her hand.', a: 'Owen takes Bella’s hand in the torch beam', m: 'calm' },
    { t: 'They walk down the stairs one at a time.', a: 'two figures descend, the beam on each step', m: 'determined' },
    { t: 'Owen is not afraid of the dark. He has his little light.', a: 'the beam leads on through the dark hall', m: 'determined', r: true },
    { t: 'They find Mother who can not see a thing.', a: 'Mother reaches out; the beam finds her', m: 'calm' },
    { t: 'Come with us, says Owen, and they do.', a: 'Owen waves them along the hallway', m: 'determined' },
    { t: 'Father is by the door. He walked into a chair!', a: 'Father rubs his knee, laughing in the gloom', m: 'happy' },
    { t: 'Now they are all together. But it is very dark.', a: 'four faces in one small pool of light', m: 'calm' },
    { t: 'Owen knows where the big lights are.', a: 'Owen points his beam at a kitchen drawer', m: 'excited' },
    { t: 'He finds the big light and all the candles.', a: 'the drawer opens on torches and candles', m: 'excited' },
    { t: 'Owen is not afraid of the dark. He has his little light.', a: 'Owen hands out lights to every one', m: 'proud', r: true },
    { t: 'Soon the room is warm with all the candles.', a: 'candles glow; shadows dance on the walls', m: 'calm' },
    { t: 'They all sit together and sing in the warm room.', a: 'the family circle round the candle glow', m: 'happy' },
    { t: 'Bella makes little hand birds fly all around.', a: 'shadow birds swoop over the sofa', m: 'happy' },
    { t: 'Then the lights come back on!', a: 'the whole room floods bright again', m: 'excited' },
    { t: 'Every one looks at Owen and calls his name.', a: 'the family points at Owen, cheering', m: 'proud' },
    { t: 'The little light did a very big thing.', a: 'close on the small torch on its lanyard', m: 'proud' },
    { t: 'Owen goes back up the stairs to bed.', a: 'Owen tucked in, torch on the pillow beside him', m: 'calm' },
    { t: 'Good night, Owen, and good night, little light.', a: 'the house quiet and dark, one soft glow upstairs', m: 'calm' },
  ],
  refrains: ['Owen is not afraid of the dark. He has his little light.'],
  quiz: [
    { question: 'What went out?', options: ['The lights', 'The rain'], answerIndex: 0 },
    { question: 'What did Owen have?', options: ['A little light', 'A big dog'], answerIndex: 0 },
    { question: 'Who found the candles?', options: ['Owen', 'Father'], answerIndex: 0 },
    { question: 'Was Owen afraid?', options: ['No', 'Yes'], answerIndex: 0 },
  ],
  wordWall: ['light', 'dark', 'night', 'together', 'candles'],
};

/* ------------------------------------------------------------------- */
/* Flying — 6–14 words, 3 sentences a page, 1 refrain × 2, 65% sight   */
/* ------------------------------------------------------------------- */

const zara: StorySpec = {
  id: 'story-zara-snow',
  title: 'Zara and the Snow Day',
  subtitle: 'The party must go on',
  levelId: 'flying',
  setting: 'a snowed-in town on a winter morning',
  characters: [
    character('zara', 'Zara', 'hero',
      'a ten-year-old girl with light brown skin, dark wavy hair under a red bobble hat, a puffy blue coat and striped mittens',
      { primary: '#C0392B', secondary: '#155E86', skin: '#C68863', hair: '#241A12' }),
    character('sami', 'Sami', 'friend',
      'Zara’s little brother, age five, light brown skin, huge brown eyes, a green snowsuit a size too big',
      { primary: '#1E7A4B', secondary: '#F2B33D', skin: '#C68863', hair: '#241A12' }),
  ],
  pages: [
    { t: 'Zara gets up and runs to look out of the window.', a: 'Zara throws back the curtain on a white world', m: 'curious' },
    { t: 'Snow is over the house and the street and every thing.', a: 'rooftops and cars buried in deep snow', m: 'excited' },
    { t: 'Today is Sami’s birthday party and six little friends want to come.', a: 'a party banner over a table of six paper hats', m: 'happy' },
    { t: 'But the snow is too deep and no one can get to the house!', a: 'the lane outside is a wall of white', m: 'worried' },
    { t: 'Sami is very sad and looks at his birthday cake.', a: 'Sami’s lip trembles by the untouched cake', m: 'worried' },
    { t: 'Zara never, never, never gives up!', a: 'Zara plants her fists on her hips', m: 'determined', r: true },
    { t: 'She puts on her big coat and gets the snow shovel.', a: 'Zara zips up, shovel taller than Sami', m: 'determined' },
    { t: 'Zara starts to dig a way down the walk with the shovel.', a: 'Zara digs a channel through deep snow', m: 'determined' },
    { t: 'She digs and digs and the snow is up over her legs!', a: 'snow flies; the path grows a metre at a time', m: 'determined' },
    { t: 'A kind man from over the way comes out to help her dig.', a: 'a neighbour waves his own shovel', m: 'happy' },
    { t: 'Soon many hands are working together and the way gets long and clean.', a: 'a neat path stretches down the lane, diggers in a row', m: 'excited' },
    { t: 'But then the way stops at the big white hill.', a: 'the cleared path ends at a steep white slope', m: 'worried' },
    { t: 'No car can get up that hill today and Sami is sad.', a: 'the hill looms, slick and white', m: 'worried' },
    { t: 'Zara looks at the hill and then she looks at the little red sled.', a: 'Zara’s gaze lands on a red sled by the door', m: 'curious' },
    { t: 'Zara never, never, never gives up!', a: 'Zara grabs the sled rope with both hands', m: 'determined', r: true },
    { t: 'She calls the friends one by one and tells them to bring their sleds!', a: 'Zara on the phone, pointing at the hill', m: 'excited' },
    { t: 'One by one the friends come down the big hill on their sleds!', a: 'six sleds swoop down the slope, scarves flying', m: 'excited' },
    { t: 'Zara helps every one get off and stop by the house.', a: 'Zara catches sleds at the path’s end', m: 'happy' },
    { t: 'Six friends made it to the party and Sami jumps up and down!', a: 'Sami bounces as friends pile in the door', m: 'excited' },
    { t: 'It is the best party of all and there is cake and hot milk.', a: 'party games round the fire, cheeks pink from snow', m: 'happy' },
    { t: 'Then they all go out to play in the deep white snow.', a: 'snow angels and a snowman with a party hat', m: 'happy' },
    { t: 'They make a big snow man and Sami gives him his party hat.', a: 'the snowman crowned with a gold paper hat', m: 'happy' },
    { t: 'The sun goes down and the friends sled home up the big hill.', a: 'sleds pulled up the dusk-blue hill, waving', m: 'calm' },
    { t: 'Sami holds Zara and says this is the best day of all.', a: 'a big hug in the doorway, snow falling soft', m: 'proud' },
    { t: 'Mother tells Zara she did a very kind and very big thing.', a: 'Mother tucks a hot drink into Zara’s hands', m: 'proud' },
    { t: 'That night Zara thinks about the long snow day in her warm bed.', a: 'Zara smiles at the ceiling, hat still on', m: 'calm' },
    { t: 'Out the window the snow man has his party hat on.', a: 'out the window, the snowman keeps watch', m: 'calm' },
    { t: 'Some days do not go the way you think they will. But if you never give up, they can go better!', a: 'the moon lights the whole white, happy town', m: 'happy' },
  ],
  refrains: ['Zara never, never, never gives up!'],
  quiz: [
    { question: 'Whose birthday is it?', options: ['Sami’s', 'Zara’s'], answerIndex: 0 },
    { question: 'What stopped the friends coming?', options: ['Deep snow', 'Rain'], answerIndex: 0 },
    { question: 'How did the friends get there?', options: ['On sleds', 'By car'], answerIndex: 0 },
    { question: 'Who cut the way through the snow first?', options: ['Zara', 'The friends'], answerIndex: 0 },
    { question: 'What did the snowman get?', options: ['A party hat', 'A coat'], answerIndex: 0 },
  ],
  wordWall: ['snow', 'sled', 'party', 'hill', 'together'],
};

const kai: StorySpec = {
  id: 'story-kai-boat',
  title: 'The Great Paper Boat Race',
  subtitle: 'Kai plays fair',
  levelId: 'flying',
  setting: 'a park stream on a bright Saturday',
  characters: [
    character('kai', 'Kai', 'hero',
      'a nine-year-old boy with East Asian features, straight black hair, a yellow cap worn backwards, a blue hoodie and rolled-up jeans',
      { primary: '#F2B33D', secondary: '#155E86', skin: '#EDC9A3', hair: '#141210' }),
    character('june', 'June', 'rival',
      'a nine-year-old girl with East Asian features, black hair in a sharp bob, a red windbreaker and an always-ready stopwatch',
      { primary: '#C0392B', secondary: '#F5F0E6', skin: '#EDC9A3', hair: '#141210' }),
  ],
  pages: [
    { t: 'Today the park has its great paper boat race.', a: 'a banner over the stream: THE GREAT PAPER BOAT RACE', m: 'excited' },
    { t: 'Kai has worked on his boat for seven days. It is yellow with a big star.', a: 'Kai folds the last crease of a yellow boat', m: 'proud' },
    { t: 'June is here too with her fast red boat. Her red boat always comes in first.', a: 'June sets down a sleek red boat, stopwatch ready', m: 'calm' },
    { t: 'Kai says hi to June but June only looks at the water.', a: 'Kai offers a handshake; June eyes the stream', m: 'calm' },
    { t: 'They set the boats down in the water and then they go!', a: 'two paper boats hit the water together', m: 'excited' },
    { t: 'The little boats fly down the water, first red, then yellow, then red!', a: 'the boats trade the lead through ripples', m: 'excited' },
    { t: 'Go, little boat, go, go, go!', a: 'Kai jogs the bank, cheering his boat on', m: 'excited', r: true },
    { t: 'Then the wind comes up fast and takes June’s boat into the rocks!', a: 'a gust shoves the red boat toward grey rocks', m: 'worried' },
    { t: 'The red boat is stuck on the rocks and starts to go under.', a: 'the red boat pinned, tipping, taking water', m: 'worried' },
    { t: 'June calls out because seven days of work may go down under the water.', a: 'June’s stopwatch hand drops to her side', m: 'worried' },
    { t: 'Kai looks at his yellow boat because it is out in first now.', a: 'the yellow boat sails clear, ahead of everyone', m: 'curious' },
    { t: 'But then he looks at June and thinks about her seven days of work.', a: 'Kai’s eyes move from the finish line to June', m: 'determined' },
    { t: 'Kai walks right into the cold water to get to the stuck boat.', a: 'Kai wades in, jeans soaked to the knee', m: 'determined' },
    { t: 'He picks the red boat up out of the water. The red boat is wet but it is not done.', a: 'Kai raises the dripping red boat overhead', m: 'excited' },
    { t: 'Kai sets it down on the water again and away it goes.', a: 'the red boat wobbles, then rights itself and sails', m: 'happy' },
    { t: 'Go, little boat, go, go, go!', a: 'both boats racing, the crowd leaning in', m: 'excited', r: true },
    { t: 'Every one calls out and jumps up and down. What a great boat race this is!', a: 'kids and parents cheer along both banks', m: 'excited' },
    { t: 'The yellow boat comes in first and the race is over!', a: 'the yellow boat crosses under the finish string', m: 'proud' },
    { t: 'But Kai does not jump or laugh because he looks for June first.', a: 'Kai scans the crowd, prize in hand', m: 'calm' },
    { t: 'June walks over with her wet red boat and puts out her hand.', a: 'June offers the handshake this time', m: 'calm' },
    { t: 'You gave up the race for my boat, she says. Why did you do that for me?', a: 'the two rivals face each other on the bank', m: 'curious' },
    { t: 'A race is only good if we both get to sail our boats.', a: 'Kai shrugs with an easy grin', m: 'happy' },
    { t: 'June laughs for the first time all day and holds up her boat.', a: 'June grins, holding up the red boat', m: 'happy' },
    { t: 'Then they let the two little boats sail and sail in the park.', a: 'two paper boats drying on a warm rock', m: 'calm' },
    { t: 'The best thing about today is not the race at all.', a: 'Kai walks home with a small gold cup', m: 'happy' },
    { t: 'The best thing is a new friend to race boats with.', a: 'Kai and June wave from the park gate', m: 'proud' },
    { t: 'That night Kai puts the little yellow boat up in his window.', a: 'the yellow boat on a shelf, a little bent, a lot loved', m: 'calm' },
    { t: 'By it he puts a little red paper star from his new friend June.', a: 'a red paper star leans against the boat', m: 'happy' },
  ],
  refrains: ['Go, little boat, go, go, go!'],
  quiz: [
    { question: 'What are the boats made of?', options: ['Paper', 'Wood'], answerIndex: 0 },
    { question: 'Whose boat got stuck?', options: ['June’s', 'Kai’s'], answerIndex: 0 },
    { question: 'What did Kai do?', options: ['Saved June’s boat', 'Kept racing'], answerIndex: 0 },
    { question: 'Who won the race?', options: ['Kai', 'June'], answerIndex: 0 },
    { question: 'What was the best part?', options: ['A new friend', 'The prize'], answerIndex: 0 },
  ],
  wordWall: ['boat', 'race', 'water', 'wind', 'star'],
};

/* ------------------------------------------------------- */

export const STORIES: Book[] = [
  tess, sam, nia,          // just starting
  leo, ava, finn,          // building confidence
  ruby, owen,              // growing
  zara, kai,               // flying
].map(expand);
