'use strict';

/* Easy Words - the rules engine.

   Pure logic: no canvas, no DOM, no clock of its own. The controller hands it
   a date string and a word; it hands back marks. That is what lets the whole
   game be verified from node with test/rules.test.js instead of by playing it.

   THE COLOURING is where nearly every clone is wrong. It is a strict two pass,
   count limited match, not a per letter lookup:

     1. Every position where guess and answer agree is CORRECT, and that letter's
        remaining count in the answer goes down by one.
     2. Left to right over the other positions: if the letter still has a
        remaining count above zero it is PRESENT and the count goes down,
        otherwise it is ABSENT.

   So with answer APPLE and guess ALLEY: A correct, first L present (the answer
   has one L, elsewhere), second L absent (count exhausted), E present, Y absent.
   About a third of the answers contain a repeated letter, so this path is hit
   constantly and a naive version is wrong constantly.

   THE DAILY WORD. Everyone must get the same word on the same day without a
   server. A per day hash would do, but it can hand out the same answer twice in
   a month. Instead the answer list is shuffled ONCE with a fixed seed and then
   indexed by the day number, so the daily sequence is stable, shared, and does
   not repeat until the list runs out, which is years away.

   TWO LISTS. Answers are common words that are fair to expect anyone to know.
   Accepted guesses are those plus a much larger list of valid but rarer words,
   including plurals and verb forms, so an obscure guess is allowed but is never
   the answer. */

const WordsRules = (function () {

  const LENGTH = 5;
  const GUESSES = 6;

  /* Puzzle number 1 is 1 January 2026, local time. */
  const EPOCH = { y: 2026, m: 1, d: 1 };
  const DAILY_SALT = 'easywords.daily.v1';

  const MARK = { CORRECT: 'correct', PRESENT: 'present', ABSENT: 'absent' };

  /* Words that may be the answer. Written by hand, common English, no proper
     nouns, nothing offensive, no duplicates, all exactly five letters. The test
     suite checks the shape of the list, not its taste. */
  const ANSWERS = (
    'abbey abide about above abuse actor acute admit adopt adore adult after again agent ' +
    'agile agony agree ahead aisle alarm album alert alias alibi alien align alike alive ' +
    'alley allow alloy alone along aloof aloud alpha altar alter amaze amber amend among ' +
    'ample amuse angel anger angle angry angst ankle annoy anvil apart apple apply april ' +
    'apron arbor arena argue arise armor aroma array arrow ashes aside aspen asset atlas ' +
    'atone attic audio audit avert avoid await awake award aware awful awoke azure bacon ' +
    'badge badly bagel baker balmy banjo barge basic basil basin basis batch bathe beach ' +
    'beard beast beefy began begin begun beige being belch belly below bench berry bible ' +
    'bicep bingo birch birth bison black blade blame bland blank blast blaze bleak bleed ' +
    'blend bless blimp blind blink bliss bloat block bloke blond blood bloom blown blues ' +
    'bluff blunt blurt blush board boast bogus bonus boost booth booze bored bossy bound ' +
    'bowel brace braid brain brake brand brash brass brave brawl bread break breed bribe ' +
    'brick bride brief brine bring brink brisk broad broil broke brood brook broom broth ' +
    'brown brush buddy budge buggy bugle build built bulge bulky bully bunch bunny burly ' +
    'burnt burst buyer cabin cable cache cacti cadet camel canal candy canoe canon cargo ' +
    'carol carry carve catch cater cause cease cedar chain chair chalk champ chant chaos ' +
    'charm chart chase chasm cheap cheat check cheek cheer chess chest chick chief child ' +
    'chili chill chime chimp china chirp choir choke chomp chord chore chose chuck chunk ' +
    'chute cider cigar cinch civic civil claim clamp clang clash clasp class clean clear ' +
    'cleat cleft clerk click cliff climb cling cloak clock clone close cloth cloud clove ' +
    'clown clump clung coach coast cobra cocky cocoa colon color comet comfy comic comma ' +
    'condo coral corny couch cough could count court cover crack craft cramp crane crank ' +
    'crash crate crave crawl crazy creak cream creed creek creep crepe crept crest crime ' +
    'crisp croak crook cross crowd crown crude cruel crumb crush crust crypt cubic cumin ' +
    'cupid curly curry curse curve cycle cynic daily dairy daisy dance dandy dated dealt ' +
    'death debut decal decay decor decoy deity delay delta delve demon denim dense depot ' +
    'depth derby deter devil diary diner dingo dirty disco ditch ditto diver dizzy dodge ' +
    'dogma donor donut dopey doubt dough dowry dozen draft drain drama drank drape drawn ' +
    'dread dream dress dried drift drill drink drive drone drool droop drown drunk dryer ' +
    'dummy dunce dusty dwarf dwell eager eagle early earth easel eaten ebony eerie eight ' +
    'eject elbow elder elect elite elope elude elves email embed ember empty ended enemy ' +
    'enjoy enter entry envoy epoch equal equip erase erect erode error erupt essay ethic ' +
    'evade event every evict evoke exact exalt excel exert exile exist expel extra fable ' +
    'faced facet faint fairy faith false fancy farce fatal fatty fault favor feast feign ' +
    'felon femur fence feral ferry fetal fetch fetus fever fiber field fiend fiery fifth ' +
    'fifty fight filth final finch first fishy fixed fizzy fjord flair flake flaky flame ' +
    'flank flare flash flask fleck fleet flesh flick fling flint flirt float flock flood ' +
    'floor flora floss flour flown fluff fluid fluke flung flunk flush flute foamy focal ' +
    'focus foggy folly foray force forge forgo forth forty forum found foyer frail frame ' +
    'frank fraud freak fresh friar fried frill frock front frost froth frown froze fruit ' +
    'fudge fully funky funny fuzzy gaffe gamer gamma gassy gator gauge gaunt gauze gavel ' +
    'gawky gecko geeky genie genre ghost ghoul giant giddy girth given giver gizmo glade ' +
    'gland glare glass glaze gleam glide glint gloat globe gloom glory gloss glove glued ' +
    'gnome godly gooey goofy goose gorge gouge gourd grace grade graft grain grand grant ' +
    'grape graph grasp grass grave gravy graze great greed green greet grief grill grime ' +
    'grimy grind gripe groan groom grope gross group grove growl grown gruel gruff grump ' +
    'grunt guard guess guest guide guild guilt guise gully gumbo gummy gusto gusty gutsy ' +
    'habit hairy halve handy happy hardy harsh haste hasty hatch haunt haven havoc hazel ' +
    'heard heart heath heave heavy hedge hefty heist helix hello hence heron hinge hippo ' +
    'hoard hobby hoist holly honey honor horde horse hotel hound house hovel hover howdy ' +
    'hubby human humid humor hunch hurry husky hutch hydra hyena hymns icing ideal idiom ' +
    'idiot igloo image imply inane inbox incur index inept inert infer inlet inner input ' +
    'intro irate irony issue itchy ivory jaded jaunt jazzy jelly jerky jetty jewel jiffy ' +
    'joint joker jolly joust judge juice juicy jumbo jumpy juror kaput karma kayak kebab ' +
    'kiosk kitty knack kneel knelt knife knock knoll known koala kooky kudos label labor ' +
    'laden ladle lager lance lanky lapel lapse large larva laser lasso latch later latex ' +
    'latte laugh layer leafy leapt learn lease leash least leave ledge leech lefty legal ' +
    'legit lemon lemur levee level lever light liken lilac limbo limit linen liner lingo ' +
    'liver livid llama loath lobby local lodge lofty logic loose lorry loser lotus lousy ' +
    'loved lover lower lowly loyal lucid lucky lumpy lunar lunch lunge lurch lurid lynch ' +
    'lyric macaw macho macro madam madly mafia magic magma maize major maker mango mania ' +
    'manic manly manor maple march marry marsh match mauve maxim mayor meant medal media ' +
    'medic melon mercy merge merit merry messy metal meter metro midst might mimic mince ' +
    'miner minor minty minus mirth miser mocha model modem mogul moist molar moldy money ' +
    'month moody moose moral motel motif motor motto mould mound mount mourn mouse mouth ' +
    'mover movie mucky mucus muddy muggy mulch mummy mumps munch mural murky mushy music ' +
    'musty nacho naive naked nanny nasal nasty naval navel needy nerdy nerve never newer ' +
    'newly nexus niche niece nifty night ninja ninth noble noise noisy nomad noose north ' +
    'notch novel nudge nurse nutty nylon nymph oasis obese occur ocean octet oddly offer ' +
    'often olive omega onion onset opera optic orbit order organ other otter ought ounce ' +
    'outdo outer ovary overt owing owner oxide ozone pacer paddy pagan paint palsy panda ' +
    'panel panic pansy paper parka parry parse party pasta paste pasty patch patio patty ' +
    'pause payee peace peach pearl pecan pedal penny perch peril perky pesky petal petty ' +
    'phase phone photo piano piece piety piggy pilot pinch pinky pinto pious piper pitch ' +
    'pivot pixel pixie pizza place plaid plain plait plane plank plant plate plaza plead ' +
    'pleat pluck plumb plump plush poach point poise poker polar polka polyp poppy porch ' +
    'poser posse potty pouch pound pouty power prank prawn press price pride prime print ' +
    'prior prism privy prize probe prone prong proof prose proud prove prowl proxy prude ' +
    'prune psalm puffy pulse punch pupil puppy purer purge purse pushy putty pylon quack ' +
    'quail quake qualm quart queen quell query quest queue quick quiet quill quilt quirk ' +
    'quite quota quote rabbi racer radar radio rainy raise rally ranch range rapid ratio ' +
    'ratty raven rayon razor reach react ready realm rebel recap refer rehab reign relax ' +
    'relay relic remit remix renew repay repel reply rerun reset resin retro revel rhino ' +
    'rhyme rider ridge rifle right rigid rinse ripen risen risky rival river rivet roast ' +
    'robin robot rocky rodeo rogue roost rotor rouge rough round rouse route rover rowdy ' +
    'royal ruble ruddy rugby ruler rumba rumor runny rupee rural rusty sadly saint salad ' +
    'salon salsa salty salve samba sandy sassy satin sauce saucy sauna savor savvy scald ' +
    'scale scalp scamp scant scare scarf scary scene scent scoff scold scone scoop scoot ' +
    'scope score scorn scour scout scowl scram scrap screw scrub scuba scuff sedan seedy ' +
    'seize sense sepia serum serve setup seven sever sewer shack shade shady shaft shake ' +
    'shaky shale shall shame shank shape shard share shark sharp shave shawl shear sheen ' +
    'sheep sheer sheet shelf shell shift shine shiny shire shirt shock shone shook shoot ' +
    'shore short shout shove shown showy shred shrew shrub shrug shyly sieve sight silky ' +
    'silly since sinew singe sinus siren sixth sixty skate skier skiff skill skimp skirt ' +
    'skull skunk slack slain slang slant slash slate slave sleek sleep sleet slept slice ' +
    'slick slide slime slimy sling slink sloop slope sloth slump slung slurp slush slyly ' +
    'smack small smart smash smear smell smelt smile smirk smith smock smoke smoky snack ' +
    'snail snake snare snarl sneak sneer snide sniff snipe snoop snore snort snout snowy ' +
    'snuck snuff soapy sober soggy solar solid solve sonar sonic sooty sorry sound south ' +
    'space spade spank spare spark spasm spawn speak spear speck speed spell spelt spend ' +
    'spent spice spicy spied spiel spike spiky spill spine spire spite splat split spoil ' +
    'spoke spoof spook spool spoon spore sport spout spray spree sprig spurt squad squat ' +
    'squid stack staff stage staid stain stair stake stale stalk stall stamp stand stank ' +
    'stare stark start stash state stave stead steak steal steam steed steel steep steer ' +
    'stern stick stiff still stilt sting stink stint stoat stock stoic stoke stole stomp ' +
    'stone stony stood stool stoop store stork storm story stout stove strap straw stray ' +
    'strip strut stuck study stuff stump stung stunt style suave suede sugar suite sulky ' +
    'sunny super surge surly swami swamp swank swarm swear sweat sweep sweet swell swept ' +
    'swift swing swipe swirl swish swoon swoop sword swore sworn swung syrup tabby table ' +
    'tacit tacky taffy taint taken tally talon tango tangy taper tapir tardy tarot taste ' +
    'tasty taunt tawny teach teary tease teddy teeny teeth tempo tenet tenor tense tenth ' +
    'tepee tepid terse testy thank theft their theme there these thick thief thigh thing ' +
    'think third thong thorn those three threw throb throw thumb thump thyme tiara tidal ' +
    'tiger tight timer timid tinge tinny tipsy titan title tizzy toast today token tonal ' +
    'toner tonic tooth topaz topic torch torso total totem touch tough towel tower toxic ' +
    'toxin trace track trade trail train trait tramp trash trawl tread treat trend trial ' +
    'tribe trick tried trill trite troll troop trout trove truce truck truly trunk truss ' +
    'trust truth tubby tulip tummy tumor tuner tunic turbo tutor twang tweak tweet twerp ' +
    'twice twine twirl twist udder ulcer ultra uncle uncut under undid undue unfit unify ' +
    'union unite unity unlit untie until unzip upend upper upset urban usage usher usual ' +
    'utter vague valet valid valor value valve vapid vapor vault vegan venom venue verge ' +
    'verse vicar video vigil vigor villa vinyl viola viper viral virus visit visor vista ' +
    'vital vivid vixen vocal vodka vogue voice vomit voter vouch vowel wacky wafer wager ' +
    'wagon waist waive waltz waste watch water waxen weary weave wedge weedy weigh weird ' +
    'whack whale wharf wheat wheel where which whiff while whine whiny whirl whisk white ' +
    'whole whoop whose widen wider widow width wield wimpy wince winch windy wiser wispy ' +
    'witch witty woken woman women wonky woody woozy wordy world worry worse worst worth ' +
    'would wound woven wrath wreck wring wrist write wrong wrote wryly xenon yacht yearn ' +
    'yeast yield yodel yokel young youth yucky yummy zebra zesty zilch zippy '
  ).trim().split(' ');

  /* Accepted as a guess but never chosen as the answer. */
  const EXTRA = (
    'aback abase abate abbot abhor abler abode abort abuzz abyss ached aches acids acorn ' +
    'acres acrid adage adapt added adder addle adept adieu adios adman admin adobe adorn ' +
    'aegis affix afire afoot afoul agape agate agave aging aglow aided aider aides ailed ' +
    'aimed aired alder algae alkyl allay allot aloft amass amble amigo amino amiss amity ' +
    'amped amply anime anion anise annex annul anode antic antsy aorta apace aphid aping ' +
    'apnea appal aptly ardor argon arias armed arose arson artsy ascot ashen asked askew ' +
    'aspic assay aster astir atoll attar augur aunts aunty aural avail avian awash axial ' +
    'axiom axles babes backs baddy bails baits baked bakes baldy bales balls balms balsa ' +
    'banal bands bangs banks barbs bards bared barer bares barks barns baron basal based ' +
    'baser bases basks baste bated baths batik baton batty bawdy bawls bayou beads beady ' +
    'beaks beams beans bears beats beaus beech beeps beers beets befit beget begot belie ' +
    'belle bells belts bends bento beret berth beset besot bevel bezel biddy bided bides ' +
    'bight bigot biked bikes bilge bills bimbo binds binge biome biped birds bites bitty ' +
    'blabs blahs blare bleat bleep bling blips blitz blobs blocs blogs blots blurb blurs ' +
    'boars boats bobby bodes bogey boggy boils bolts bombs bonds boned bones boney bongo ' +
    'bonny booed books booms boons boors boots booty borax borer bores borne boron bosom ' +
    'bosun botch bough boule bouts bowed bowls boxed boxer boxes brags brats brawn brays ' +
    'bream breve brews briar briny brows bruin brunt buffs bulbs bulks bumps bumpy bunks ' +
    'bunts buoys burns burps burro busts busty butch butte buxom bylaw byway cabal cabby ' +
    'cacao caddy cadre cafes caged cages cairn cakes calls calms calve camps campy caned ' +
    'canes canny caped caper capes carat cards cared cares caret carts cased cases casks ' +
    'caste casts catty caulk caved caves cavil cedes cello cells cents chafe chaff chaps ' +
    'chard chars chats chefs chews chewy chide chins chips chits chive chock chops chuff ' +
    'chump chums cilia circa cited cites civet clack clads clams clank claps claws clays ' +
    'clefs clime clink clips clods clogs clomp clops clots clout clubs cluck clued clues ' +
    'coals coats coded coder codes codex coils coins coked cokes colas colds colic colts ' +
    'comas combo combs cones conic cooks cools coops copes copse cords cores corks corps ' +
    'costs cotta coupe coups coven coves cowed cower coyly crabs crags crass craze credo ' +
    'creme cress crews cribs crick cried crier cries crimp crits crock crone crony crops ' +
    'croup crows cubed cubes cuffs culls cults cured cures curio curls curvy cushy cutie ' +
    'dados daffy dales dally dames damns damps dared dares darks darts dates datum daunt ' +
    'dawns deals deans dears debit debts decaf decks deeds deems deeps defer deign demur ' +
    'dents detox deuce dials diced dices dicey digit dimes dimly dined dines dingy diode ' +
    'dirge discs dishy ditty divan dives divot docks dodgy doers doggy doing doles dolls ' +
    'dolly domed domes dooms doors dorky dorms doses doted dotes dotty doves dowdy dowel ' +
    'downy doyen dozed dozer drabs drags drake drams draws drays dregs drier dries drips ' +
    'droit drops dross drove druid drums dryly ducal ducks ducts dudes duels duets dukes ' +
    'dulls dully dumps dumpy dunes dunks duped dupes dusky dusts dwelt dying eased eases ' +
    'eater eaves ebook edged edger edges edict edify egret eking elate elegy elfin elide ' +
    'emcee emits emote endow enema ennui enrol ensue eosin epoxy ester ether ethos etude ' +
    'evens exams exits extol exult eying faces facts faded fades fails fairs fakes fakir ' +
    'falls famed fangs fared fares farms fauna fawns faxed fazed fears feats fecal feeds ' +
    'feels feint fells fends ferns feted fetid feuds fibre fiche fifes filed filer files ' +
    'fills films filmy finds fined finer fines fired fires firms fists fixer fixes flabs ' +
    'flack flags flail flaps flats flaws flays fleas flees flier flies flips flits floes ' +
    'flogs flops flows flubs flues flume flyer foals foams foils foist folds folio folks ' +
    'fonts foods fools fords forks forms forte forts fouls fowls foxes frays freed freer ' +
    'frees frisk frizz frogs frond frump fryer fuels fugue fumed fumes funds fungi funks ' +
    'furor furry fused fuses fussy fusty futon gains gaits gales galls gamed games gangs ' +
    'gaped gapes gases gasps gated gates gawks gazed gazer gazes gears geeks geese genes ' +
    'gents germs getup gibes gifts gilds gills gilts girls gists glean glens globs glops ' +
    'glows glues gluey gnarl gnash gnats goads goals goats goers gofer going golds golfs ' +
    'golly gonad goner gongs goods goody goofs gouty gowns grabs grads grams grate grays ' +
    'greys grids grins grips grist grits groat groin grout grubs guano guava gulch gulfs ' +
    'gulls gulps gunky guppy gurus gushy gusts gyros hacks hails hairs halls halos halts ' +
    'hands hangs hanky harem hares harks harms harps harpy hater hates hauls hawks hazed ' +
    'hazes heads heals heaps hears heats heeds heels hefts helms helps hemps herbs herds ' +
    'hertz hewed hexed hexes hicks hides hikes hills hilly hilts hinds hints hippy hired ' +
    'hires hitch hives hoary hobos hocks holds holed holes homer homes honed hones honks ' +
    'hoods hoofs hooks hoops hoots hoped hopes horns hosed hoses hosts hotly howls huffs ' +
    'huffy hulks hulls humps humus hunks hunts hurls hurts hyped hyper hypes icily icons ' +
    'ideas idled idler idles idols idyll imbue impel inapt indie infix ingot inked inlay ' +
    'inset inter ionic irked irons islet items ivies jacks jails jambs jeans jeeps jeers ' +
    'jerks jests jilts jinks jived jives jocks joins joist jokes jokey jolts jowls joyed ' +
    'kappa karat keels keeps kempt kicks kills kilns kilts kinds kings kinks kinky kited ' +
    'kites kiwis knave kneed knees knits knobs knots laced laces lacks lairs lakes lamas ' +
    'lambs lamed lamps lands lanes lards lardy lasts lathe lauds lawns leach leads leaks ' +
    'leaky leans leaps leeks leers lends leper liars libel licks liege liens lifts liked ' +
    'liker likes lilts limbs limes limps lined lines links lints lipid lisps lists lithe ' +
    'lived liven lives loads loafs loams loamy loans lobed lobes locks locus lofts logos ' +
    'loins lolls lolly longs looks looms loons loony loops loopy loots lopes lords lores ' +
    'loris loses lotto louse louts loves lucre lulls lumps lungs lupus lured lures lurks ' +
    'lusts lusty lutes lying lymph lyres maced mages maids mails maims mains males malls ' +
    'malty mamas mambo mamma manes mange mangy manse marks marts masks mason masts mated ' +
    'mates matey maths matte mauls maxed mazes meads meals means meaty mecca meets melds ' +
    'melts memos mends menus meows mesas mewls micro miles milks milky mills mimed mimes ' +
    'minds mined mines minim minks mints mired mires mists misty mites mitts mixed mixer ' +
    'mixes moans moats mocks modes molds moles molts momma mommy monks moods moons moors ' +
    'moped mopes morph mossy motes moths moult mousy moved moves mowed mower mules mused ' +
    'muses musks musky mutes mutts myrrh myths nadir nails names napes nappy natty nears ' +
    'neath necks needs neigh neons nerds nests newel newts nicer nicks nines nippy nixed ' +
    'nobly nodal nodes noels nooks noons norms nosed noses nosey notes nouns nudes nuked ' +
    'nukes nulls numbs oaken oaths obeys oboes octal odder odors ogled ogles ogres oiled ' +
    'oiler oinks okapi oldie omens omits oozed oozes opals opens opine opium opted orals ' +
    'orcas outgo ovals ovate ovens overs ovoid owned oxbow paced paces packs pacts padre ' +
    'paged pager pages pails pains pairs paled paler pales palms panes pangs pants papal ' +
    'papas pared pares parks parts pates paths patsy pawed pawns payer peaks peals pears ' +
    'peaty pecks peeks peels peeps peers pekoe pelts penal pence perks perms pesos pests ' +
    'phlox picks picky piers piked pikes piles pills pines pings pinks pints piped pipes ' +
    'pique pitas piths pithy plans plays pleas plebs plied plies plods plops plots plows ' +
    'ploys plugs plums plunk poems poets poked pokes polls ponds pools popes pores ports ' +
    'posed poses posit posts pouts prams prays preen preps pried pries prigs prima primp ' +
    'prods proms props prows pucks puffs pulls pulps pulpy pumas pumps punks punts pupae ' +
    'pupal pupas puree purrs putts pygmy quays quids quiff quips quits quoth raced races ' +
    'racks radii rafts raged rages raids rails rains rajah rakes ramps rangy rants rasps ' +
    'raspy rated rates raved ravel raves razed reals reams reaps rearm rears recon recur ' +
    'redid reeds reefs reeks reels refit regal reins relit renal rends rents reran resit ' +
    'rests reuse revue rides rifts riled riles rinds rings rinks riots riper riser rises ' +
    'rites ritzy roads roams roars robed robes rocks roles rolls romps roofs rooks rooms ' +
    'roots roped ropes roses rosin routs roved roves rowed rower ruder ruffs ruing ruins ' +
    'ruled rules rumps runes rungs runts ruses rusts sabre sacks safer safes sagas sages ' +
    'saggy sails salts sands saner sappy saris saute saved saver saves sawed scabs scams ' +
    'scans scarp scars scion scree scrum seals seams seamy seats sects seeds seeks seems ' +
    'seeps seers sells semis sends serfs sewed sexes shalt shams sheaf sheds sheik shied ' +
    'shies shims shins ships shirk shoal shoed shoes shoos shops shorn shots shows shuck ' +
    'shuns shunt shuts shyer sided sides sidle sifts sighs signs silks silos silts sings ' +
    'sinks sired sires sitar sites sixes sized sizer sizes skids skied skies skims skins ' +
    'skips skits skulk slabs slags slams slaps slats slays sleds slews slims slips slits ' +
    'slobs sloes slogs slops slosh slots slows slugs slums slurs smite smote snaps snips ' +
    'snobs snoot snows soaks soaps soars socks sodas sofas softy soils solos songs sonny ' +
    'sooth soppy sores sorts souls soups soupy sours souse sowed sower spams spans spars ' +
    'spats spays spews spies spilt spins spits splay spots spuds spume spurn spurs squab ' +
    'squib stabs stags stats stays stems steps stews sties stile stirs stops strew stubs ' +
    'studs stuns sucks sudsy sulks sumac sumps surfs swabs swags swans swaps swash swath ' +
    'swats sways swigs swill swims swine sylph synod tacks tacos tails takes talks tamed ' +
    'tamer tames tamps tangs tanks tapas taped tapes tarps tarry tarts tasks tater taxed ' +
    'taxes taxis teams tears teems teens tells temps tends tents terms terns texts thaws ' +
    'theta thine thuds thugs tibia ticks tides tiers tiffs tiled tiler tiles tills tilts ' +
    'times tines tints tired tires tithe toads toady toils tolls tombs tomes toned tones ' +
    'tongs tools toots torts torus toted totes tours touts towed towns toyed trams traps ' +
    'trays treks tress triad tries trike trims trios tripe trope trots truer tryst tubas ' +
    'tubed tubes tucks tufts tulle tunas tuned tunes turfs turns tusks tutus twain twigs ' +
    'twins twits tying tykes typed types typos umbra uncap unfed unmet unpin unset unwed ' +
    'urged urges urine usurp uvula vales vamps vanes vases veers veils veins veiny vends ' +
    'vents verbs vests vetch vexed vials vibes vices views viler vines visas voids voles ' +
    'volts voted votes vowed vying wades wafts wages wails waits waked wakes walks walls ' +
    'wands wanes wants wards wares warms warns warps warts warty wasps waxed waxes weans ' +
    'wears weeds weeks weeps weepy weirs welds wells welts wends whams whats whelk whelp ' +
    'whets whims whips whirs whist whizz whorl wilds wiles wills wilts wimps winds winks ' +
    'wipes wired wires wisps wives wombs woods wooed wools works worms wormy wowed wrack ' +
    'wraps wrens wrest writs wrung yanks yards yarns yawns years yells yelps yetis yikes ' +
    'yogis yokes yolks zines zonal zoned zones zooms '
  ).trim().split(' ');

  const ANSWER_SET = new Set(ANSWERS);
  const ALLOWED = new Set(ANSWERS.concat(EXTRA));

  /* ---------- randomness ---------- */

  /** FNV-1a. Small, portable and good enough to turn a string into a seed. */
  function hashString(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /** mulberry32: a tiny seeded generator returning floats in [0, 1). */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(list, seed) {
    const rng = makeRng(seed);
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  let dailyOrder = null;
  function dailySequence() {
    if (!dailyOrder) dailyOrder = seededShuffle(ANSWERS, hashString(DAILY_SALT));
    return dailyOrder;
  }

  /* ---------- dates ---------- */

  /** 'YYYY-MM-DD' in the player's local time. The daily word changes at the
      player's own midnight, which is what everyone expects of a daily puzzle. */
  function dateKey(date) {
    const d = date || new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /** Days since the epoch for a 'YYYY-MM-DD' key. Done in UTC on purpose: a
      local Date arithmetic crosses DST and drifts by an hour, which floors to
      the wrong day twice a year. */
  function dayNumber(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!m) throw new Error('bad date key ' + key);
    const a = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const b = Date.UTC(EPOCH.y, EPOCH.m - 1, EPOCH.d);
    return Math.round((a - b) / 86400000);
  }

  function puzzleNumber(key) { return dayNumber(key) + 1; }

  function dailyWord(key) {
    const seq = dailySequence();
    const n = dayNumber(key);
    return seq[((n % seq.length) + seq.length) % seq.length];
  }

  /** A practice word. Takes a generator so tests can be deterministic. */
  function randomWord(rng) {
    const r = rng || Math.random;
    return ANSWERS[Math.floor(r() * ANSWERS.length)];
  }

  /* ---------- scoring ---------- */

  function isValid(word) {
    return typeof word === 'string' && word.length === LENGTH && ALLOWED.has(word.toLowerCase());
  }

  function isAnswer(word) { return ANSWER_SET.has(String(word).toLowerCase()); }

  /** Marks for a guess against an answer. See the header for the two passes. */
  function score(guess, answer) {
    const g = guess.toLowerCase(), a = answer.toLowerCase();
    const marks = new Array(LENGTH).fill(MARK.ABSENT);
    const left = Object.create(null);
    for (let i = 0; i < LENGTH; i++) {
      if (g[i] === a[i]) marks[i] = MARK.CORRECT;
      else left[a[i]] = (left[a[i]] || 0) + 1;
    }
    for (let i = 0; i < LENGTH; i++) {
      if (marks[i] === MARK.CORRECT) continue;
      if (left[g[i]] > 0) { marks[i] = MARK.PRESENT; left[g[i]]--; }
    }
    return marks;
  }

  const RANK = { absent: 1, present: 2, correct: 3 };

  /** The best thing known about each letter, for colouring the keyboard. A
      letter shown correct anywhere stays correct even if a later guess used it
      in a place where it was absent. */
  function keyStates(guesses, marks) {
    const out = Object.create(null);
    for (let r = 0; r < guesses.length; r++) {
      for (let i = 0; i < LENGTH; i++) {
        const ch = guesses[r][i], m = marks[r][i];
        if (!out[ch] || RANK[m] > RANK[out[ch]]) out[ch] = m;
      }
    }
    return out;
  }

  const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th'];

  /** Hard mode: every revealed hint must be reused. Returns a reason string
      when the guess breaks that, null when it is fine. Correct letters must stay
      in place, and present letters must appear at least as often as revealed. */
  function hardModeViolation(guess, guesses, marks) {
    const g = guess.toLowerCase();
    for (let r = 0; r < guesses.length; r++) {
      const need = Object.create(null);
      for (let i = 0; i < LENGTH; i++) {
        const ch = guesses[r][i], m = marks[r][i];
        if (m === MARK.CORRECT && g[i] !== ch) return ORDINAL[i] + ' letter must be ' + ch.toUpperCase();
        if (m !== MARK.ABSENT) need[ch] = (need[ch] || 0) + 1;
      }
      for (const ch in need) {
        let have = 0;
        for (let i = 0; i < LENGTH; i++) if (g[i] === ch) have++;
        if (have < need[ch]) return 'Guess must contain ' + ch.toUpperCase();
      }
    }
    return null;
  }

  /* ---------- a game ---------- */

  /** opts: { answer, hard, mode }. The answer is stored in lower case. */
  function makeGame(opts) {
    const o = opts || {};
    return {
      answer: String(o.answer || randomWord()).toLowerCase(),
      hard: !!o.hard,
      mode: o.mode || 'free',
      guesses: [],
      marks: [],
      status: 'play'          // play | won | lost
    };
  }

  /** Submit a word. Returns { ok: true, marks, status } or { ok: false, reason }.
      Reasons are short, player facing sentences. */
  function submit(game, word) {
    if (game.status !== 'play') return { ok: false, reason: 'The game is over' };
    const w = String(word || '').toLowerCase();
    if (w.length < LENGTH) return { ok: false, reason: 'Not enough letters' };
    if (!isValid(w)) return { ok: false, reason: 'Not in the word list' };
    if (game.hard) {
      const why = hardModeViolation(w, game.guesses, game.marks);
      if (why) return { ok: false, reason: why };
    }
    const marks = score(w, game.answer);
    game.guesses.push(w);
    game.marks.push(marks);
    if (marks.every((m) => m === MARK.CORRECT)) game.status = 'won';
    else if (game.guesses.length >= GUESSES) game.status = 'lost';
    return { ok: true, marks, status: game.status };
  }

  return {
    LENGTH, GUESSES, MARK, EPOCH, ANSWERS, EXTRA,
    hashString, makeRng, seededShuffle,
    dateKey, dayNumber, puzzleNumber, dailyWord, dailySequence, randomWord,
    isValid, isAnswer, score, keyStates, hardModeViolation,
    makeGame, submit
  };
})();
