/** Common, concrete, easy-to-visualise nouns for the word-recall test. */
export const WORD_POOL: readonly string[] = `
apple anchor ant arrow axe baby badge bag ball balloon banana bandage barn barrel basket bat bath
beach bead beard bear bed bee bell belt bench bicycle bird blanket boat bone book boot bottle bowl
box bread brick bridge broom brush bucket bull bus butter button cabin cake camel camera candle
canoe cap car carpet carrot castle cat chain chair cheese cherry chicken chimney church cigar
circus clock cloud clown coat coconut coffee coin comb compass cookie corn cow crab crayon crown
cup curtain cushion daisy deer desk diamond dice dog doll dolphin donkey door dragon drum duck
eagle egg elephant envelope eye fan feather fence fern finger fish flag flute fork fountain fox
frog garden garlic gate ghost giraffe glass glove goat grapes guitar hammer hand harp hat hawk
helmet hive hook horn horse hose house iron island jacket jar jeep jelly jewel kettle key kite
kitten knife ladder lake lamb lamp leaf lemon lettuce lighthouse lion lizard lobster lock log
magnet map marble mask match medal melon mirror monkey moon mop mountain mouse mug mushroom nail
necklace needle nest net nose notebook nut oar octopus onion orange owl oyster paddle pail pan
panda parrot peach peanut pear pebble pen pencil penguin pepper piano pig pillow pine pipe pizza
plate plum pocket pony potato pumpkin puppet rabbit radio rail rake rat ribbon ring river robe
robot rock rocket rope rose ruler saddle sail salt sandal saw scarf scissors seal shark sheep
shell ship shirt shoe shovel skate skull sled snail snake sock sofa spider spoon squirrel stamp
star statue stove strawberry sugar suitcase sun swan sword table tank tent thumb tiger toaster
toe tomato tooth torch towel tower tractor train tray tree truck trumpet tulip turtle umbrella
vase violin wagon wallet walnut wand watch whale wheel whistle window wolf worm zebra zipper
acorn apron bagel bamboo beetle blender bonnet bucket cactus candy carriage cello chalk cloak
cobra cork cradle crate dagger dart dove easel faucet ferry flask goose hammock harbor hedge
igloo jug kayak kiwi ladle lantern leash llama mitten moose muffin napkin olive pickle pliers
quilt raft rhino sack scooter shed slipper spinach stool teapot thimble tractor trophy tuba
turkey wig windmill wreath yacht yarn
`
  .split(/\s+/)
  .filter(Boolean)
  .filter((w, i, a) => a.indexOf(w) === i);
