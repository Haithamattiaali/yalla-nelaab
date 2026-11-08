// The word bank: everyday Egyptian Arabic words that have a picture.
// ar = the word, def = with the article, g = gender (drives "أهي / أهو"),
// emoji = the picture (the device's own emoji), move = how it moves in the garden.
// Every Arabic form here is a draft until the parent approves it.

export const GROUPS = ['food', 'animals', 'toys', 'home', 'outside', 'body'];

export const BANK = [
  // food
  { id: 'water',   ar: 'مَيَّة',      def: 'المَيَّة',      g: 'f', group: 'food',    emoji: '💧', move: 'drip' },
  { id: 'milk',    ar: 'لَبَن',       def: 'اللَّبَن',       g: 'm', group: 'food',    emoji: '🥛', move: 'float' },
  { id: 'bread',   ar: 'عِيش',       def: 'العِيش',       g: 'm', group: 'food',    emoji: '🫓', move: 'bounce' },
  { id: 'banana',  ar: 'مُوزَة',      def: 'المُوزَة',      g: 'f', group: 'food',    emoji: '🍌', move: 'bounce' },
  { id: 'apple',   ar: 'تُفَّاحَة',    def: 'التُّفَّاحَة',    g: 'f', group: 'food',    emoji: '🍎', move: 'roll' },
  { id: 'biscuit', ar: 'بَسْكُوتَة',   def: 'البَسْكُوتَة',   g: 'f', group: 'food',    emoji: '🍪', move: 'circle' },
  { id: 'orange',  ar: 'بُرْتُقَانَة',  def: 'البُرْتُقَانَة',  g: 'f', group: 'food',    emoji: '🍊', move: 'roll' },
  { id: 'egg',     ar: 'بِيضَة',      def: 'البِيضَة',      g: 'f', group: 'food',    emoji: '🥚', move: 'bounce' },
  { id: 'rice',    ar: 'رُزّ',        def: 'الرُّزّ',        g: 'm', group: 'food',    emoji: '🍚', move: 'float' },
  { id: 'juice',   ar: 'عَصِير',      def: 'العَصِير',      g: 'm', group: 'food',    emoji: '🧃', move: 'float' },
  // animals
  { id: 'cat',     ar: 'قُطَّة',      def: 'القُطَّة',      g: 'f', group: 'animals', emoji: '🐈', move: 'walk' },
  { id: 'dog',     ar: 'كَلْب',       def: 'الكَلْب',       g: 'm', group: 'animals', emoji: '🐕', move: 'walk' },
  { id: 'duck',    ar: 'بَطَّة',      def: 'البَطَّة',      g: 'f', group: 'animals', emoji: '🦆', move: 'walk' },
  { id: 'cow',     ar: 'بَقَرَة',     def: 'البَقَرَة',     g: 'f', group: 'animals', emoji: '🐄', move: 'walk' },
  { id: 'chicken', ar: 'فَرْخَة',     def: 'الفَرْخَة',     g: 'f', group: 'animals', emoji: '🐔', move: 'walk' },
  { id: 'bird',    ar: 'عَصْفُورَة',   def: 'العَصْفُورَة',   g: 'f', group: 'animals', emoji: '🐦', move: 'fly' },
  { id: 'fish',    ar: 'سَمَكَة',     def: 'السَّمَكَة',     g: 'f', group: 'animals', emoji: '🐟', move: 'swim' },
  { id: 'horse',   ar: 'حُصَان',      def: 'الحُصَان',      g: 'm', group: 'animals', emoji: '🐎', move: 'walk' },
  { id: 'lion',    ar: 'أَسَد',       def: 'الأَسَد',       g: 'm', group: 'animals', emoji: '🦁', move: 'bounce' },
  { id: 'sheep',   ar: 'خَرُوف',      def: 'الخَرُوف',      g: 'm', group: 'animals', emoji: '🐑', move: 'walk' },
  // toys
  { id: 'ball',    ar: 'كُورَة',      def: 'الكُورَة',      g: 'f', group: 'toys',    emoji: '⚽', move: 'bounce' },
  { id: 'car',     ar: 'عَرَبِيَّة',    def: 'العَرَبِيَّة',    g: 'f', group: 'toys',    emoji: '🚗', move: 'walk' },
  { id: 'plane',   ar: 'طَيَّارَة',    def: 'الطَّيَّارَة',    g: 'f', group: 'toys',    emoji: '✈️', move: 'fly' },
  { id: 'bus',     ar: 'أُتُوبِيس',    def: 'الأُتُوبِيس',    g: 'm', group: 'toys',    emoji: '🚌', move: 'walk' },
  { id: 'balloon', ar: 'بَلُّونَة',    def: 'البَلُّونَة',    g: 'f', group: 'toys',    emoji: '🎈', move: 'float' },
  { id: 'teddy',   ar: 'دَبْدُوب',    def: 'الدَّبْدُوب',    g: 'm', group: 'toys',    emoji: '🧸', move: 'bounce' },
  { id: 'book',    ar: 'كِتَاب',      def: 'الكِتَاب',      g: 'm', group: 'toys',    emoji: '📕', move: 'circle' },
  // home
  { id: 'shoe',    ar: 'جَزْمَة',      def: 'الجَزْمَة',      g: 'f', group: 'home',    emoji: '👟', move: 'bounce' },
  { id: 'socks',   ar: 'شُرَاب',      def: 'الشُّرَاب',      g: 'm', group: 'home',    emoji: '🧦', move: 'float' },
  { id: 'bed',     ar: 'سِرِير',      def: 'السِّرِير',      g: 'm', group: 'home',    emoji: '🛏️', move: 'float' },
  { id: 'door',    ar: 'بَاب',        def: 'البَاب',        g: 'm', group: 'home',    emoji: '🚪', move: 'circle' },
  { id: 'key',     ar: 'مُفْتَاح',     def: 'المُفْتَاح',     g: 'm', group: 'home',    emoji: '🔑', move: 'circle' },
  { id: 'phone',   ar: 'تِلِيفُون',    def: 'التِّلِيفُون',    g: 'm', group: 'home',    emoji: '📱', move: 'bounce' },
  { id: 'light',   ar: 'نُور',        def: 'النُّور',        g: 'm', group: 'home',    emoji: '💡', move: 'float' },
  { id: 'bath',    ar: 'بَانْيُو',     def: 'البَانْيُو',     g: 'm', group: 'home',    emoji: '🛁', move: 'bounce' },
  // outside
  { id: 'sun',     ar: 'شَمْس',       def: 'الشَّمْس',       g: 'f', group: 'outside', emoji: '☀️', move: 'float' },
  { id: 'moon',    ar: 'قَمَر',       def: 'القَمَر',       g: 'm', group: 'outside', emoji: '🌙', move: 'float' },
  { id: 'tree',    ar: 'شَجَرَة',     def: 'الشَّجَرَة',     g: 'f', group: 'outside', emoji: '🌳', move: 'bounce' },
  { id: 'flower',  ar: 'وَرْدَة',     def: 'الوَرْدَة',     g: 'f', group: 'outside', emoji: '🌹', move: 'bounce' },
  // body
  { id: 'eye',     ar: 'عِين',       def: 'العِين',       g: 'f', group: 'body',    emoji: '👁️', move: 'float' },
  { id: 'mouth',   ar: 'بُقّ',        def: 'البُقّ',        g: 'm', group: 'body',    emoji: '👄', move: 'bounce' },
];

// The first six, from the sample paper pack.
export const SAMPLE_IDS = ['banana', 'apple', 'milk', 'water', 'biscuit', 'cat'];

export const MOVES = ['walk', 'bounce', 'roll', 'float', 'drip', 'circle', 'fly', 'swim'];

const byId = new Map(BANK.map(w => [w.id, w]));
export const word = id => byId.get(id);
