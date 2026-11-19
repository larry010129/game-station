"""
Constellation figures (the 42 on class-zodiac-variants.html): name, description, 14 star positions on a 0..10 grid
(y down) and the stick-figure lines between them. Stylised, not exact star charts.

band_six_paths() lays a class's band VI on one: three paths along the figure's lines, each 6 stars long (2 small, the mid
notable, 2 small, then that path's own band VI keystone), sharing no star.
"""
import math

FIGURES = [
    ("Aries", "the ram's curled horn",
     [(1, 7), (2, 5.6), (3.4, 4.6), (5, 4.2), (6.4, 4.6), (7.4, 5.6), (7.6, 7), (6.6, 7.8), (5.4, 7.4), (5.2, 6.2), (6, 5.6), (8.8, 3.6), (9.4, 2.2), (8.6, 1)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (5, 11), (11, 12), (12, 13)]),
    ("Taurus", "the bull's V-shaped face and long horns",
     [(5, 8.6), (4.2, 7), (5.8, 7), (3.4, 5.4), (6.6, 5.4), (2.6, 3.8), (7.4, 3.8), (1.6, 2.4), (8.4, 2.4), (0.8, 1.2), (9.2, 1.2), (5, 6.2), (3.6, 8.4), (6.4, 8.4)],
     [(0, 1), (0, 2), (1, 3), (2, 4), (3, 5), (4, 6), (5, 7), (6, 8), (7, 9), (8, 10), (1, 11), (2, 11), (0, 12), (0, 13)]),
    ("Gemini", "two twin figures standing side by side",
     [(2.6, 1.2), (6.8, 1.2), (2.8, 3), (6.6, 3), (2.2, 5), (7.2, 5), (3.2, 5.2), (6.2, 5.2), (2, 7.2), (7.4, 7.2), (3.4, 7.4), (6, 7.4), (1.8, 9), (7.8, 9)],
     [(0, 2), (1, 3), (2, 4), (3, 5), (2, 6), (3, 7), (4, 8), (5, 9), (6, 10), (7, 11), (8, 12), (9, 13), (2, 3)]),
    ("Cancer", "the crab: an upside-down Y with claws",
     [(5, 5.4), (5, 3.4), (5, 1.4), (3.4, 6.8), (6.6, 6.8), (2, 8.2), (8, 8.2), (1, 7), (9, 7), (0.8, 9.4), (9.2, 9.4), (4, 2.4), (6, 2.4), (5, 0.4)],
     [(0, 1), (1, 2), (0, 3), (0, 4), (3, 5), (4, 6), (5, 7), (6, 8), (5, 9), (6, 10), (1, 11), (1, 12), (2, 13)]),
    ("Leo", "the lion: a sickle head and a triangle body",
     [(2.2, 1), (1.2, 2.2), (1.4, 3.6), (2.6, 4.2), (3.2, 2.8), (2.8, 1.8), (4.4, 5.2), (6.4, 4.4), (8.6, 4), (9.4, 6.4), (7, 6.8), (5, 7.4), (8.2, 8.8), (4.2, 9)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (3, 6), (6, 7), (7, 8), (8, 9), (9, 10), (10, 6), (9, 12), (6, 11), (11, 13)]),
    ("Virgo", "the maiden: a long Y that branches twice",
     [(5, 9.4), (5, 7.6), (5, 5.8), (3.6, 4.6), (6.4, 4.6), (2.2, 3.4), (7.8, 3.4), (1.2, 2), (8.8, 2), (3.2, 2), (6.8, 2), (2.4, 0.8), (7.6, 0.8), (6.4, 7)],
     [(0, 1), (1, 2), (2, 3), (2, 4), (3, 5), (4, 6), (5, 7), (6, 8), (5, 9), (6, 10), (9, 11), (10, 12), (1, 13)]),
    ("Libra", "the scales: a beam with two hanging pans",
     [(5, 1.2), (5, 3.2), (1.6, 3.2), (8.4, 3.2), (3.3, 3.2), (6.7, 3.2), (0.8, 5.8), (2.4, 5.8), (7.6, 5.8), (9.2, 5.8), (1.6, 6.6), (8.4, 6.6), (5, 6.2), (5, 9)],
     [(0, 1), (1, 4), (4, 2), (1, 5), (5, 3), (2, 6), (2, 7), (3, 8), (3, 9), (6, 10), (7, 10), (8, 11), (9, 11), (1, 12), (12, 13)]),
    ("Scorpio", "the scorpion: a long body ending in a curled sting",
     [(1.2, 1.2), (2.2, 2), (3, 3.2), (3.4, 4.6), (3.6, 6), (4.2, 7.4), (5.4, 8.4), (7, 8.8), (8.4, 8.2), (9, 6.8), (8.4, 5.8), (0.4, 0.4), (2.4, 0.6), (0.6, 2.4)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (0, 11), (0, 12), (0, 13)]),
    ("Sagittarius", "the archer, drawn as the teapot",
     [(2.4, 5.4), (4.2, 4), (6, 4), (7.6, 5.4), (6.8, 7.4), (3.2, 7.4), (5.1, 2.4), (9.2, 4.2), (9.4, 6.8), (1, 4.2), (0.6, 6.8), (2, 8.8), (8, 8.8), (5.1, 0.8)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 0), (1, 6), (2, 6), (3, 7), (7, 8), (0, 9), (9, 10), (5, 11), (4, 12), (6, 13)]),
    ("Capricorn", "the sea-goat: a wide wedge",
     [(0.8, 2.6), (2.4, 3.6), (4, 4.6), (5.6, 5.6), (7.2, 6.6), (9, 7.4), (8.2, 5.2), (7.4, 3.4), (6.4, 2), (4.6, 2.2), (2.8, 2.4), (1.6, 1.4), (8.4, 8.8), (5.8, 7.8)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (10, 0), (0, 11), (5, 12), (4, 13)]),
]


FIGURES += [
    ("Aquarius", "the water bearer's zigzag stream",
     [(1, 1), (2.4, 1.8), (3.6, 1.2), (4.8, 2.2), (4, 3.6), (5.2, 4.8), (6.4, 4), (7.6, 5.2), (6.6, 6.6), (7.8, 7.6), (9, 6.8), (5.4, 8.2), (4.2, 9.2), (8.6, 9.2)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (8, 11), (11, 12), (9, 13)]),
    ("Pisces", "two fish tied by a long cord",
     [(1, 1.4), (2.2, 0.8), (2.8, 2), (1.6, 2.6), (2.8, 4), (3.6, 5.8), (4.8, 7.6), (5.6, 9), (6.8, 7.8), (7.8, 6.6), (8.8, 5.4), (8.4, 4), (9.6, 3.4), (9.8, 4.9)],
     [(0, 1), (1, 2), (2, 3), (3, 0), (2, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (10, 11), (11, 12), (12, 13), (13, 10)]),
    ("Orion", "the hunter: shoulders, a three-star belt and a shield",
     [(5, 0.6), (2.6, 1.8), (7.4, 1.6), (4.2, 5), (5, 4.8), (5.8, 4.6), (3, 8.8), (7.4, 8.6), (5, 6.2), (5.1, 7.4), (1.6, 0.4), (8.8, 2.4), (9.2, 3.8), (8.6, 5)],
     [(0, 1), (0, 2), (1, 3), (2, 5), (3, 4), (4, 5), (3, 6), (5, 7), (4, 8), (8, 9), (1, 10), (2, 11), (11, 12), (12, 13)]),
    ("Ursa Major", "the great bear, with the Big Dipper on its back",
     [(6.4, 3.6), (8.6, 3.4), (8.8, 5.4), (6.8, 5.6), (5, 3), (3.4, 2.4), (1.6, 1.4), (7.2, 7.4), (6.2, 8.8), (9, 7.4), (9.6, 9), (4.4, 5.4), (2.6, 6.2), (1.2, 5.6)],
     [(0, 1), (1, 2), (2, 3), (3, 0), (0, 4), (4, 5), (5, 6), (3, 7), (7, 8), (2, 9), (9, 10), (3, 11), (11, 12), (12, 13)]),
    ("Cassiopeia", "the queen's bright W",
     [(0.8, 3), (2.8, 6), (5, 3.6), (7.2, 6.2), (9.2, 3), (1.8, 4.5), (3.9, 4.8), (6.1, 4.9), (8.2, 4.6), (5, 1.8), (5, 0.4), (2.8, 8), (7.2, 8.2), (9.6, 1.4)],
     [(0, 5), (5, 1), (1, 6), (6, 2), (2, 7), (7, 3), (3, 8), (8, 4), (2, 9), (9, 10), (1, 11), (3, 12), (4, 13)]),
    ("Cygnus", "the swan, the northern cross",
     [(5, 0.6), (5, 2.4), (5, 4.2), (5, 6), (5, 7.8), (5, 9.4), (3.2, 4), (1.6, 3.2), (0.6, 4.6), (6.8, 4.4), (8.4, 3.4), (9.4, 4.8), (3.6, 8.8), (6.4, 8.8)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (2, 6), (6, 7), (7, 8), (2, 9), (9, 10), (10, 11), (4, 12), (4, 13)]),
    ("Draco", "the dragon winding through the sky",
     [(8.6, 1), (9.4, 2.2), (8.4, 3), (7.6, 2), (6, 2.6), (4.6, 3.8), (3.4, 5.2), (2.2, 6.6), (2.8, 8), (4.4, 8.6), (6, 8), (7.4, 7), (8.8, 7.4), (9.6, 8.8)],
     [(0, 1), (1, 2), (2, 3), (3, 0), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (10, 11), (11, 12), (12, 13)]),
    ("Pegasus", "the winged horse's great square",
     [(3, 3), (7, 3), (7, 7), (3, 7), (1.8, 2), (0.8, 1.4), (0.4, 0.4), (8.4, 1.8), (9.4, 0.8), (8.4, 8), (9.4, 9.2), (1.6, 8), (0.6, 9.2), (8.8, 4.6)],
     [(0, 1), (1, 2), (2, 3), (3, 0), (0, 4), (4, 5), (5, 6), (1, 7), (7, 8), (2, 9), (9, 10), (3, 11), (11, 12), (1, 13)]),
    ("Lyra", "the harp, hanging from bright Vega",
     [(5, 0.8), (4, 2.4), (6, 2.4), (3.6, 5), (5.6, 5.4), (3.2, 7.6), (5.2, 8.2), (2.2, 3.6), (7.4, 3.4), (1.4, 6), (7.2, 6.6), (2.4, 9.2), (6.6, 9.4), (8.6, 1.6)],
     [(0, 1), (0, 2), (1, 2), (1, 3), (2, 4), (3, 4), (3, 5), (4, 6), (5, 6), (1, 7), (2, 8), (7, 9), (8, 10), (5, 11), (6, 12), (0, 13)]),
    ("Corona Borealis", "the northern crown, a double arc",
     [(0.87, 5.7), (1.8, 4.18), (3.26, 3.16), (5.0, 2.8), (6.74, 3.16), (8.2, 4.18), (9.13, 5.7), (2.82, 6.59), (3.35, 5.85), (4.11, 5.37), (5.0, 5.2), (5.89, 5.37), (6.65, 5.85), (7.18, 6.59)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (7, 8), (8, 9), (9, 10), (10, 11), (11, 12), (13, 12), (0, 7), (6, 13), (3, 10)]),
    ("Aquila", "the eagle with wide-spread wings",
     [(5, 4.8), (5, 3.4), (5, 6.2), (3.2, 3.6), (1.4, 2.8), (0.4, 4), (6.8, 3.6), (8.6, 2.8), (9.6, 4), (5, 7.6), (4, 9.2), (6, 9.2), (5, 2), (5, 0.6)],
     [(0, 1), (0, 2), (0, 3), (3, 4), (4, 5), (0, 6), (6, 7), (7, 8), (2, 9), (9, 10), (9, 11), (1, 12), (12, 13)]),
    ("Perseus", "the hero's long arc, holding Medusa's head",
     [(6.4, 0.6), (6, 2.2), (5.6, 3.8), (4.6, 5.2), (3.2, 6.4), (2, 7.8), (1.4, 9.2), (7.2, 4.6), (8.6, 5.6), (9.2, 7), (5.6, 6.8), (6.8, 7.6), (6, 8.8), (8, 1.4)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (2, 7), (7, 8), (8, 9), (3, 10), (10, 11), (10, 12), (0, 13)]),
]


FIGURES += [
    ("Andromeda", "the chained princess: three long chains fanning from one corner",
     [(1, 9), (2.4, 7.6), (3.8, 6.2), (5.2, 4.8), (6.6, 3.4), (8, 2), (9.2, 0.8), (4.8, 7.4), (6.2, 8), (7.8, 8.4), (4.2, 3.4), (3.6, 2), (2.8, 0.8), (9.4, 2.6)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (2, 7), (7, 8), (8, 9), (3, 10), (10, 11), (11, 12), (5, 13)]),
    ("Auriga", "the charioteer: a pentagon with a tail at four corners",
     [(5, 1), (8.2, 3.2), (7, 7.4), (3, 7.4), (1.8, 3.2), (6.6, 2.1), (7.6, 5.3), (5, 7.4), (2.4, 5.3), (3.4, 2.1), (9.6, 2.4), (8.4, 9), (1.6, 9), (0.4, 2.4)],
     [(0, 5), (5, 1), (1, 6), (6, 2), (2, 7), (7, 3), (3, 8), (8, 4), (4, 9), (9, 0), (1, 10), (2, 11), (3, 12), (4, 13)]),
    ("Bootes", "the herdsman: a tall kite above bright Arcturus",
     [(5, 9.4), (4, 7.6), (6, 7.6), (3.2, 5.6), (6.8, 5.6), (3.6, 3.4), (6.4, 3.4), (5, 1.8), (5, 0.4), (2, 6.6), (8, 6.6), (1, 7.8), (9, 7.8), (5, 6.2)],
     [(0, 1), (0, 2), (1, 3), (2, 4), (3, 5), (4, 6), (5, 7), (6, 7), (7, 8), (3, 9), (4, 10), (9, 11), (10, 12), (1, 13), (2, 13)]),
    ("Canis Major", "the great dog, led by bright Sirius",
     [(3, 2), (4.2, 3), (5.6, 3.8), (5.4, 5.6), (7.2, 6.4), (8.6, 7.6), (4, 7.2), (3.2, 9), (6.4, 8.2), (6.8, 9.6), (2, 1.2), (4.6, 1.4), (9.4, 6.4), (1.6, 3.2)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (3, 6), (6, 7), (4, 8), (8, 9), (0, 10), (0, 11), (5, 12), (0, 13)]),
    ("Cepheus", "the king: a house with a pointed roof",
     [(3, 8), (7, 8), (7, 4.6), (3, 4.6), (5, 2), (5, 0.6), (3, 6.3), (7, 6.3), (5, 8), (1.6, 9.2), (8.4, 9.2), (4, 3.3), (6, 3.3), (5, 4.6)],
     [(0, 8), (8, 1), (1, 7), (7, 2), (2, 12), (12, 4), (4, 11), (11, 3), (3, 6), (6, 0), (4, 5), (0, 9), (1, 10), (3, 13), (13, 2)]),
    ("Crux", "the southern cross, with its arms reaching on",
     [(5, 0.6), (5, 2.4), (5, 4.2), (5, 6), (5, 7.8), (5, 9.4), (1.4, 4.6), (3.2, 4.4), (6.8, 4), (8.6, 3.8), (0.6, 6), (9.4, 2.2), (3.6, 8.6), (6.4, 8.6)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (2, 7), (7, 6), (6, 10), (2, 8), (8, 9), (9, 11), (4, 12), (4, 13)]),
    ("Delphinus", "the dolphin: a small diamond leaping with its tail behind",
     [(3, 4), (4.6, 3), (6, 4), (4.6, 5.2), (5.2, 6.6), (6, 8), (7.2, 9.2), (4.6, 9.2), (1.6, 3.4), (0.6, 2.4), (5, 1.6), (5.6, 0.4), (7.6, 3.2), (8.8, 2.4)],
     [(0, 1), (1, 2), (2, 3), (3, 0), (3, 4), (4, 5), (5, 6), (5, 7), (0, 8), (8, 9), (1, 10), (10, 11), (2, 12), (12, 13)]),
    ("Eridanus", "the river, winding back and forth across the sky",
     [(1, 1), (3, 1.6), (4.6, 0.8), (6.4, 1.6), (8.6, 1.2), (9.2, 3), (7.4, 3.8), (5.2, 3.4), (3, 4.2), (1.4, 5.4), (2.4, 7), (4.4, 7.6), (6.6, 7), (8.4, 8.6)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (10, 11), (11, 12), (12, 13)]),
    ("Hercules", "the hero: a keystone body with arms and legs flung out",
     [(4, 4), (6, 4), (6.4, 6), (3.6, 6), (2.4, 2.6), (1.2, 1.2), (7.6, 2.6), (8.8, 1.2), (2.4, 7.8), (1.4, 9.4), (7.6, 7.8), (8.6, 9.4), (5, 2.2), (5, 0.8)],
     [(0, 1), (1, 2), (2, 3), (3, 0), (0, 4), (4, 5), (1, 6), (6, 7), (3, 8), (8, 9), (2, 10), (10, 11), (0, 12), (12, 13)]),
    ("Hydra", "the water snake: a small head and a very long body",
     [(9, 1), (9.6, 2), (8.8, 2.8), (8.2, 1.8), (7, 3.6), (5.8, 4.8), (4.4, 5.4), (3, 6.4), (2.2, 7.8), (3.4, 8.8), (5, 8.4), (6.6, 9), (8, 8.2), (9.4, 9)],
     [(0, 1), (1, 2), (2, 3), (3, 0), (2, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10), (10, 11), (11, 12), (12, 13)]),
    ("Lepus", "the hare: a round body with two long ears",
     [(3, 6), (5, 6.6), (7, 6), (8.4, 7.4), (6.6, 8.4), (4.4, 8.6), (2.4, 8), (3.4, 4), (2.6, 2), (2, 0.6), (4.6, 4.2), (5, 2.4), (5.6, 0.8), (9.4, 6.4)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 0), (0, 7), (7, 8), (8, 9), (1, 10), (10, 11), (11, 12), (2, 13)]),
    ("Lupus", "the wolf, running on long legs",
     [(2, 2), (3.4, 3.2), (4.6, 4.6), (5.6, 6.2), (6.2, 8), (7, 9.6), (4, 6.8), (2.6, 8.2), (1.8, 9.6), (6.8, 4.2), (8.2, 3), (9.4, 1.6), (3.2, 1), (7.6, 6.2)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (3, 6), (6, 7), (7, 8), (2, 9), (9, 10), (10, 11), (0, 12), (3, 13)]),
    ("Monoceros", "the unicorn: a long back with legs and a horn",
     [(1, 4), (2.6, 4.4), (4.2, 4), (5.8, 4.6), (7.4, 4.2), (9, 3.4), (4.2, 6), (3.8, 8), (3.4, 9.6), (6.4, 6.4), (7, 8.2), (7.4, 9.8), (9.6, 1.8), (0.4, 2.6)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (2, 6), (6, 7), (7, 8), (3, 9), (9, 10), (10, 11), (5, 12), (0, 13)]),
    ("Ophiuchus", "the serpent bearer: a wide ring holding a snake at each side",
     [(5, 1), (7, 2.4), (7.6, 4.8), (6.8, 7.2), (3.2, 7.2), (2.4, 4.8), (3, 2.4), (5.8, 9), (6.2, 9.8), (0.8, 4.4), (0.2, 6.2), (9.2, 4.4), (9.8, 6.2), (4.2, 9)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 0), (3, 7), (7, 8), (5, 9), (9, 10), (2, 11), (11, 12), (4, 13)]),
    ("Ursa Minor", "the little bear: the Little Dipper and the Pole Star",
     [(1, 1), (2.6, 1.8), (4, 2.8), (5.4, 4), (5.2, 5.8), (7, 6.6), (7.4, 4.8), (8.8, 7.8), (9.4, 9.2), (3.6, 6.6), (2.4, 7.8), (1.6, 9.2), (8.8, 3.6), (0.4, 2.6)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 3), (5, 7), (7, 8), (4, 9), (9, 10), (10, 11), (6, 12), (0, 13)]),
    ("Triangulum", "the triangle, with a star trailing from two corners",
     [(5, 1), (8.6, 8), (1.4, 8), (6.8, 4.5), (5, 8), (3.2, 4.5), (5.9, 2.75), (7.7, 6.25), (6.8, 8), (3.2, 8), (2.3, 6.25), (4.1, 2.75), (9.6, 9.4), (0.4, 9.4)],
     [(0, 6), (6, 3), (3, 7), (7, 1), (1, 8), (8, 4), (4, 9), (9, 2), (2, 10), (10, 5), (5, 11), (11, 0), (1, 12), (2, 13)]),
    ("Sagitta", "the arrow: a long shaft, a head and feathered tail",
     [(1, 9), (2.6, 7.6), (4.2, 6.2), (5.8, 4.8), (7.4, 3.4), (9, 2), (7.6, 1.2), (9.8, 3.4), (0.2, 7.6), (1.6, 10), (2.2, 6.2), (3.6, 8.8), (3.8, 4.6), (5.4, 7.4)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (5, 7), (0, 8), (0, 9), (1, 10), (1, 11), (2, 12), (2, 13)]),
    ("Centaurus", "the centaur: a long body with a raised arm and legs",
     [(2, 2), (3.4, 3.4), (4.6, 4.8), (6, 5.4), (7.6, 6.4), (8.8, 8), (9.4, 9.6), (6.4, 7.4), (6, 9.2), (4, 6.6), (3, 8.4), (2.2, 9.8), (1, 3.4), (4.8, 2.6)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (3, 7), (7, 8), (2, 9), (9, 10), (10, 11), (0, 12), (1, 13)]),
    ("Carina", "the keel: a long hull with a mast",
     [(1, 5), (2.6, 4.6), (4.2, 4.2), (5.8, 3.8), (7.4, 3.4), (9, 3), (2.6, 6.4), (4.2, 7.6), (6, 8.4), (7.8, 8.2), (9.2, 7), (5.8, 2), (6.4, 0.6), (9.6, 1.6)],
     [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (0, 6), (6, 7), (7, 8), (8, 9), (9, 10), (10, 5), (3, 11), (11, 12), (5, 13)]),
    ("Phoenix", "the firebird rising with wings spread",
     [(5, 7), (5, 5), (5, 3), (5, 1.4), (3.4, 4.4), (1.8, 3.6), (0.6, 2.2), (6.6, 4.4), (8.2, 3.6), (9.4, 2.2), (3.8, 8.6), (6.2, 8.6), (5, 9.6), (2.8, 1.4)],
     [(0, 1), (1, 2), (2, 3), (1, 4), (4, 5), (5, 6), (1, 7), (7, 8), (8, 9), (0, 10), (0, 11), (0, 12), (5, 13)]),
]



def lay_out(trio, h, lat, length):
    """The three paths in band-gap units, (radial, lateral) from the band V keystone, each padded to `length` nodes."""
    used = [k for p in trio for k in p]
    lo, hi = min(h(k) for k in used), max(h(k) for k in used)
    wide = max(abs(lat(k)) for k in used) or 1
    world = lambda k: (0.3 + (h(k) - lo) / ((hi - lo) or 1) * 1.6, lat(k) / wide * 0.9)
    out = []
    for p in sorted(trio, key=lambda p: world(p[len(p) // 2])[1]):                 # left, middle, right
        mid = p[len(p) // 2]
        pts = [world(k) for k in p]
        cuts = [0] * (len(p) - 1)                       # small nodes added on each line, longest lines first
        for _ in range(length - len(p)):
            i = max(range(len(cuts)), key=lambda i: math.dist(pts[i], pts[i + 1]) / (cuts[i] + 1))
            cuts[i] += 1
        nodes = []
        for i, k in enumerate(p):
            if i:
                a, b = pts[i - 1], pts[i]
                for e in range(1, cuts[i - 1] + 1):
                    f = e / (cuts[i - 1] + 1)
                    nodes.append(((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), "small"))
            nodes.append((pts[i], "key" if i == len(p) - 1 else "mid" if k == mid else "small"))
        out.append(nodes)
    return out


def seg_dist(p, a, b):
    """Distance from point p to the segment a-b."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / ((dx * dx + dy * dy) or 1)))
    return math.dist(p, (a[0] + t * dx, a[1] + t * dy))


def clean(paths, clearance=0.10):
    """No link crosses another, and no link passes closer than `clearance` (band gaps) to a node it does not join."""
    pts = [(0.0, 0.0)] + [q for path in paths for q, _ in path]
    segs = [s for path in paths for s in zip([(0.0, 0.0)] + [q for q, _ in path], [q for q, _ in path])]
    side = lambda a, b, c: (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    for i, (a, b) in enumerate(segs):
        if any(seg_dist(p, a, b) < clearance for p in pts if p != a and p != b):
            return False
        for c, d in segs[i + 1:]:
            if not ({a, b} & {c, d}) and side(a, b, c) * side(a, b, d) < 0 and side(c, d, a) * side(c, d, b) < 0:
                return False
    return True


def band_six_paths(figure, length=8):
    """Lays a class's band VI on a figure: three paths along its lines that share no star, using as many of the figure's
    stars as possible. Every path has the same number of nodes (`length`, so the same cost) but its own shape: its stars,
    with small nodes added along its longest lines to make up the count. Each path
    has one mid notable (its middle star) and ends on its own band VI keystone (its last star).
    Returns (fit, [path a, b, c]) where a path is a list of ((radial, lateral), kind) from the band V keystone outward, kind
    one of "small", "mid", "key", in band-gap units; or (0, None)."""
    _, _, stars, lines = figure
    adj = {i: set() for i in range(len(stars))}
    for a, b in lines:
        adj[a].add(b)
        adj[b].add(a)
    found = set()

    def walk(path):
        if len(path) > length:
            return
        if len(path) >= 3:
            found.add(tuple(path) if path[0] < path[-1] else tuple(reversed(path)))
        for n in adj[path[-1]]:
            if n not in path:
                walk(path + [n])

    for s0 in adj:
        walk([s0])
    # Three star-disjoint paths: the shortest as long as possible (padding a short path crowds it), then most stars used.
    paths = sorted(found, key=len, reverse=True)
    sets = [set(p) for p in paths]
    best = None
    for i, p in enumerate(paths):
        for j in range(i + 1, len(paths)):
            if sets[i] & sets[j]:
                continue
            if best and (len(paths[j]), len(p) + 2 * len(paths[j])) <= best[0]:
                break
            for k in range(j + 1, len(paths)):
                score = (len(paths[k]), len(p) + len(paths[j]) + len(paths[k]))
                if best and score <= best[0]:
                    break
                if not (sets[k] & (sets[i] | sets[j])):
                    best = (score, (p, paths[j], paths[k]))
                    break
    if not best:
        return 0, None
    trio = best[1]
    used_stars = best[0][1]
    # Turn the figure so the three paths start low (near the band V keystone) and end high: of 16 directions, the best one
    # where no link runs over a node or crosses another link (counting the links out from the band V keystone).
    cx, cy = sum(x for x, _ in stars) / len(stars), sum(y for _, y in stars) / len(stars)

    def oriented(theta):
        ux, uy = math.cos(theta), math.sin(theta)
        h = lambda k: -((stars[k][0] - cx) * ux + (stars[k][1] - cy) * uy)
        out = [p if h(p[0]) <= h(p[-1]) else tuple(reversed(p)) for p in trio]
        return sum(h(p[-1]) - h(p[0]) for p in out) - 0.5 * sum(h(p[0]) for p in out), out, h, (ux, uy)

    for _, ordered, h, (ux, uy) in sorted((oriented(math.radians(22.5 * k)) for k in range(16)), key=lambda t: -t[0]):
        out = lay_out(ordered, h, lambda k, ux=ux, uy=uy: (stars[k][0] - cx) * -uy + (stars[k][1] - cy) * ux, length)
        if clean(out):
            break
    else:
        return 0, None
    return used_stars / len(stars), out
