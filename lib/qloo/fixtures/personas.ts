// DEMO FIXTURE — not live Qloo data
import type { Persona, Entity, InsightResult, CultureGapReadout } from "../types.ts";

export const PERSONAS: Record<string, Persona> = {
  amara: {
    id: "amara",
    name: "Amara",
    age: 24,
    origin: "Lagos, Nigeria",
    destination: "Manchester, UK",
    occupation: "MSc Computing Student",
    bio: "Recently arrived international student on a tight budget. Missing home cooking, craving familiar Afrobeats energy, yet curious about Northern British culture.",
    anchors: ["Fela Kuti", "jollof rice", "Nollywood", "Arsenal", "Chimamanda Ngozi Adichie"],
    constraints: ["low budget", "halal"],
    adventure: 65,
    storyBeat: "Food is the steepest stretch (0.31 overlap); music is nearly frictionless (0.62 overlap).",
    avatarSeed: "amara",
  },
  dmitri: {
    id: "dmitri",
    name: "Dmitri",
    age: 38,
    origin: "São Paulo, Brazil",
    destination: "Lisbon, Portugal",
    occupation: "Senior Systems Architect",
    bio: "Relocated tech lead with comfortable budget. High linguistic overlap, but grappling with expat loneliness and longing for community gathering spaces.",
    anchors: ["bossa nova", "churrasco", "Wong Kar-wai", "sci-fi novels", "long-form tech podcasts"],
    constraints: [],
    adventure: 40,
    storyBeat: "Language-adjacent with high baseline overlap, but an isolation hurdle — local gathering places matter most.",
    avatarSeed: "dmitri",
  },
  yuki: {
    id: "yuki",
    name: "Yuki",
    age: 29,
    origin: "Osaka, Japan",
    destination: "Toronto, Canada",
    occupation: "Freelance Illustrator & Trailing Spouse",
    bio: "Navigating a vibrant mega-city while managing physical mobility constraints and strict vegetarian eating.",
    anchors: ["Studio Ghibli", "ramen", "Haruki Murakami", "Japanese city-pop", "true-crime podcasts"],
    constraints: ["vegetarian", "limited mobility"],
    adventure: 30,
    storyBeat: "Constraints bite hardest; the sequence must discover genuinely step-free, vegetarian-certified gems.",
    avatarSeed: "yuki",
  },
};

export const MOCK_CULTURE_GAPS: Record<string, CultureGapReadout> = {
  amara: {
    originCity: "Lagos",
    destinationCity: "Manchester",
    overallOverlap: 0.52,
    summarySentence: "High resonance in contemporary music and club culture; significant divergence in foodways and winter outdoor spaces.",
    breakdown: [
      { category: "music", label: "Music", overlap: 0.62, verdict: "You'll find your feet here fast", level: "easy" },
      { category: "food", label: "Food", overlap: 0.31, verdict: "Expect this to be the steepest stretch", level: "steep" },
      { category: "film", label: "Film & TV", overlap: 0.58, verdict: "Deep shared affinity for urban drama and Nollywood diaspora releases", level: "moderate" },
      { category: "books", label: "Books", overlap: 0.51, verdict: "Rich post-colonial literary networks across Manchester libraries", level: "moderate" },
      { category: "podcasts", label: "Podcasts", overlap: 0.65, verdict: "Strong global listenership for UK-Nigerian diaspora audio shows", level: "easy" },
      { category: "places", label: "Places", overlap: 0.42, verdict: "Industrial architecture and damp climate require intentional discovery", level: "moderate" },
    ],
  },
  dmitri: {
    originCity: "São Paulo",
    destinationCity: "Lisbon",
    overallOverlap: 0.74,
    summarySentence: "Strong cultural kinship and shared linguistic heritage; adjustment lies in pacing and neighborhood micro-cultures.",
    breakdown: [
      { category: "music", label: "Music", overlap: 0.78, verdict: "Lusophone acoustic traditions blend effortlessly into Fado taverns", level: "easy" },
      { category: "food", label: "Food", overlap: 0.71, verdict: "Atlantic seafood and grill customs feel instantly intuitive", level: "easy" },
      { category: "film", label: "Film & TV", overlap: 0.68, verdict: "Thriving arthouse film scene in Bairro Alto and Chiado", level: "easy" },
      { category: "books", label: "Books", overlap: 0.76, verdict: "Shared literary giants from Pessoa to Clarice Lispector", level: "easy" },
      { category: "podcasts", label: "Podcasts", overlap: 0.69, verdict: "Active cross-Atlantic tech and culture commentary", level: "easy" },
      { category: "places", label: "Places", overlap: 0.61, verdict: "Miradouros (lookout spots) provide natural gathering alternatives to SP plazas", level: "moderate" },
    ],
  },
  yuki: {
    originCity: "Osaka",
    destinationCity: "Toronto",
    overallOverlap: 0.48,
    summarySentence: "High media and artistic familiarity offset by North American sprawling transit and dining scale.",
    breakdown: [
      { category: "music", label: "Music", overlap: 0.64, verdict: "Strong underground appetite for Japanese vinyl and indie pop in West Queen West", level: "easy" },
      { category: "food", label: "Food", overlap: 0.39, verdict: "Vegetarian authentic broth requires curated specialty kitchens", level: "steep" },
      { category: "film", label: "Film & TV", overlap: 0.72, verdict: "TIFF Bell Lightbox regularly champions East Asian animation retrospectives", level: "easy" },
      { category: "books", label: "Books", overlap: 0.61, verdict: "Magical realism and speculative fiction have loyal Toronto bookshop circles", level: "moderate" },
      { category: "podcasts", label: "Podcasts", overlap: 0.55, verdict: "North American narrative crime shows match your listening habit", level: "moderate" },
      { category: "places", label: "Places", overlap: 0.33, verdict: "Wheelchair accessibility and indoor winter PATH walkways require vetting", level: "steep" },
    ],
  },
};

// Candidate pools per persona: ≥ 40 items per domain so sequencing engine can satisfy quotas without duplicate items
export function generateMockCandidatePool(personaId: string): Entity[] {
  if (personaId === "amara") {
    return [
      // MUSIC (10 items)
      { id: "am-m1", name: "Burna Boy Live at Co-op Live", type: "urn:entity:artist", category: "music", tags: ["afrobeats", "nigerian", "dancehall", "fela kuti"], locality: "Manchester", subtitle: "Afrobeats titan headlining Manchester arena" },
      { id: "am-m2", name: "Asake - Lungu Boy UK Tour", type: "urn:entity:artist", category: "music", tags: ["amapiano", "afrobeats", "fuji"], locality: "Manchester", subtitle: "High-energy street-pop fusion at O2 Victoria Warehouse" },
      { id: "am-m3", name: "Femi Kuti & The Positive Force", type: "urn:entity:artist", category: "music", tags: ["afrobeat", "brass", "political", "fela kuti"], locality: "Manchester", subtitle: "Direct legacy of Fela Kuti carrying the historic Shrine pulse" },
      { id: "am-m4", name: "Little Simz - No Thank You", type: "urn:entity:artist", category: "music", tags: ["uk hip-hop", "conscious", "diaspora"], locality: "Manchester", subtitle: "British-Nigerian lyricism bridging London and the North" },
      { id: "am-m5", name: "Northern Soul Sessions at Band on the Wall", type: "urn:entity:artist", category: "music", tags: ["soul", "manchester heritage", "dance"], locality: "Manchester", subtitle: "Legendary Manchester music venue celebrating 1970s uptempo soul" },
      { id: "am-m6", name: "Tiwa Savage - Water & Garri Lounge", type: "urn:entity:artist", category: "music", tags: ["r&b", "afrobeats", "soul"], locality: "Manchester", subtitle: "Velvety R&B crossover bridging Lagos and UK soul" },
      { id: "am-m7", name: "The Stone Roses - Manchester Echoes", type: "urn:entity:artist", category: "music", tags: ["manchester indie", "baggy", "anthem"], locality: "Manchester", subtitle: "Quintessential Manchester guitar groove that shaped the city" },
      { id: "am-m8", name: "Omah Lay - Boy Alone Acoustic Night", type: "urn:entity:artist", category: "music", tags: ["afro-pop", "melodic"], locality: "Manchester", subtitle: "Melodic storytelling at Manchester Academy" },
      { id: "am-m9", name: "Joy Division / New Order Walking Echoes", type: "urn:entity:artist", category: "music", tags: ["post-punk", "synth-pop", "history"], locality: "Manchester", subtitle: "Audio journey through Haçienda club origins" },
      { id: "am-m10", name: "Bugzy Malone - The Resurrection", type: "urn:entity:artist", category: "music", tags: ["grime", "manchester rap", "raw"], locality: "Manchester", subtitle: "Mancunian pride and urban storytelling from Crumpsall" },

      // FOOD (10 items)
      { id: "am-f1", name: "Suya Republic (Cheetham Hill)", type: "urn:entity:place", category: "food", tags: ["halal", "suya", "west african", "low budget", "jollof rice"], locality: "Manchester", subtitle: "Charcoal-grilled spiced beef skewers with yaji pepper" },
      { id: "am-f2", name: "Jollof House Kitchen (Moss Side)", type: "urn:entity:place", category: "food", tags: ["halal", "jollof", "plantain", "low budget", "jollof rice"], locality: "Manchester", subtitle: "Smoky firewood-style party jollof with fried goat meat" },
      { id: "am-f3", name: "This & That (Northern Quarter)", type: "urn:entity:place", category: "food", tags: ["halal", "rice and three", "curry", "low budget"], locality: "Manchester", subtitle: "Manchester institution serving daily 'rice and three' curries since 1984" },
      { id: "am-f4", name: "Habesha Ethiopian Restaurant", type: "urn:entity:place", category: "food", tags: ["halal", "ethiopian", "injera", "communal", "low budget"], locality: "Manchester", subtitle: "Rich communal stews on sourdough injera" },
      { id: "am-f5", name: "Koffee Pot (Northern Quarter)", type: "urn:entity:place", category: "food", tags: ["breakfast", "manchester classic", "brunch", "low budget"], locality: "Manchester", subtitle: "Hearty Northern fry-ups and buttered baps" },
      { id: "am-f6", name: "Afrikana Soul Food (Wilmslow Road)", type: "urn:entity:place", category: "food", tags: ["halal", "grilled chicken", "african fusion", "low budget"], locality: "Manchester", subtitle: "Contemporary African peri-peri chicken and seasoned yam chips" },
      { id: "am-f7", name: "Pollen Bakery (Ancoats)", type: "urn:entity:place", category: "food", tags: ["bakery", "pastry", "sourdough", "artisan"], locality: "Manchester", subtitle: "Canal-side sourdough bakery famous for kouign-amann" },
      { id: "am-f8", name: "Chakalaka (Northern Quarter)", type: "urn:entity:place", category: "food", tags: ["south african", "braai", "casual", "low budget"], locality: "Manchester", subtitle: "South African braai-inspired kitchen with communal benches" },
      { id: "am-f9", name: "Comptoir Libanais (Spinningfields)", type: "urn:entity:place", category: "food", tags: ["halal", "lebanese", "mezze"], locality: "Manchester", subtitle: "Lebanese canteen serving fragrant tagines and flatbreads" },
      { id: "am-f10", name: "Wong Wong Bakery (Chinatown)", type: "urn:entity:place", category: "food", tags: ["chinese bakery", "buns", "low budget"], locality: "Manchester", subtitle: "Sweet barbecue buns and egg tarts in Manchester Chinatown" },

      // FILM & TV (8 items)
      { id: "am-fl1", name: "The Wedding Party (Dir. Kemi Adetiba)", type: "urn:entity:movie", category: "film", tags: ["nollywood", "rom-com", "lagos"], subtitle: "Showcase of high-society Nigerian wedding dynamics" },
      { id: "am-fl2", name: "Lionheart (Dir. Genevieve Nnaji)", type: "urn:entity:movie", category: "film", tags: ["nollywood", "drama", "family"], subtitle: "Family bus transit enterprise in southeastern Nigeria" },
      { id: "am-fl3", name: "Top Boy (Netflix UK)", type: "urn:entity:tv_show", category: "film", tags: ["british drama", "london", "gritty"], subtitle: "British street realism with African diaspora representation" },
      { id: "am-fl4", name: "Rye Lane (Dir. Raine Allen-Miller)", type: "urn:entity:movie", category: "film", tags: ["rom-com", "south london", "stylized"], subtitle: "Joyful rom-com celebrating South London's Black cultural tapestry" },
      { id: "am-fl5", name: "HOME Manchester Arthouse Screenings", type: "urn:entity:place", category: "film", tags: ["independent cinema", "diaspora films", "culture"], locality: "Manchester", subtitle: "Five independent screens spotlighting international retrospectives" },
      { id: "am-fl6", name: "Aníkúlápó (Dir. Kunle Afolayan)", type: "urn:entity:movie", category: "film", tags: ["nollywood", "folklore", "epic"], subtitle: "Yoruba mythological fantasy exploring ancestral lore" },
      { id: "am-fl7", name: "24 Hour Party People", type: "urn:entity:movie", category: "film", tags: ["manchester music", "comedy", "cult"], subtitle: "Biopic of Tony Wilson and the Factory Records explosion" },
      { id: "am-fl8", name: "I May Destroy You (Michaela Coel)", type: "urn:entity:tv_show", category: "film", tags: ["drama", "acclaimed", "modern"], subtitle: "Masterpiece on consent, friendship, and London creative life" },

      // BOOKS (6 items)
      { id: "am-b1", name: "Half of a Yellow Sun by Chimamanda Ngozi Adichie", type: "urn:entity:book", category: "books", tags: ["nigerian history", "biafra", "chimamanda ngozi adichie"], subtitle: "Chronicle of love and war through Biafran struggle" },
      { id: "am-b2", name: "Things Fall Apart by Chinua Achebe", type: "urn:entity:book", category: "books", tags: ["african classic", "colonialism", "igbo"], subtitle: "Foundational landmark novel of African literature" },
      { id: "am-b3", name: "Open Water by Caleb Azumah Nelson", type: "urn:entity:book", category: "books", tags: ["british-ghanaian", "romance", "music"], subtitle: "Poetic London love story infused with jazz and vulnerability" },
      { id: "am-b4", name: "The Famished Road by Ben Okri", type: "urn:entity:book", category: "books", tags: ["magical realism", "booker prize"], subtitle: "Journey of an abiku spirit child in pre-independence Nigeria" },
      { id: "am-b5", name: "The Condition of the Working Class in England", type: "urn:entity:book", category: "books", tags: ["manchester history", "non-fiction", "politics"], subtitle: "Seminal study written in Manchester's Chetham's Library" },
      { id: "am-b6", name: "Americanah by Chimamanda Ngozi Adichie", type: "urn:entity:book", category: "books", tags: ["immigrant", "romance", "chimamanda ngozi adichie"], subtitle: "Exploration of race, identity, and returning home" },

      // PODCASTS (5 items)
      { id: "am-p1", name: "I Said What I Said (ISWIS)", type: "urn:entity:podcast", category: "podcasts", tags: ["nigerian", "humor", "culture", "lagos"], subtitle: "FK & Jola's weekly banter on Lagos life and adulthood" },
      { id: "am-p2", name: "Receipts Podcast", type: "urn:entity:podcast", category: "podcasts", tags: ["uk diaspora", "women", "relationships"], subtitle: "Conversations on dating and navigating 20s in the UK" },
      { id: "am-p3", name: "Guardian Football Weekly", type: "urn:entity:podcast", category: "podcasts", tags: ["premier league", "arsenal", "football"], subtitle: "Wry, intelligent weekly breakdown of Premier League fixtures" },
      { id: "am-p4", name: "A Nation of Immigrants (Manchester Stories)", type: "urn:entity:podcast", category: "podcasts", tags: ["oral history", "manchester", "belonging"], subtitle: "Oral histories documenting four generations of migration" },
      { id: "am-p5", name: "Arseblog - The Arsenal Podcast", type: "urn:entity:podcast", category: "podcasts", tags: ["arsenal", "football", "premier league"], subtitle: "Passionate and insightful commentary for Arsenal supporters" },

      // PLACES (5 items)
      { id: "am-pl1", name: "Chetham's Library & Medieval Cloister", type: "urn:entity:place", category: "places", tags: ["historic", "peaceful", "architecture"], locality: "Manchester", subtitle: "Oldest free public reference library in the English-speaking world" },
      { id: "am-pl2", name: "Moss Side Community Millennium Green", type: "urn:entity:place", category: "places", tags: ["green space", "community", "diaspora"], locality: "Manchester", subtitle: "Peaceful community green near Caribbean & African bakeries" },
      { id: "am-pl3", name: "Manchester Central Library Reading Dome", type: "urn:entity:place", category: "places", tags: ["study", "neoclassical", "grand"], locality: "Manchester", subtitle: "Quiet circular dome library with free warm study desks" },
      { id: "am-pl4", name: "Castlefield Urban Heritage Park & Viaduct", type: "urn:entity:place", category: "places", tags: ["canals", "heritage", "industrial"], locality: "Manchester", subtitle: "Victorian canal basins turned into Manchester's high line park" },
      { id: "am-pl5", name: "Emirates Stadium Matchday Train", type: "urn:entity:place", category: "places", tags: ["football", "arsenal", "sport"], subtitle: "Pilgrimage experience connecting Manchester Piccadilly to London" },
    ];
  }

  if (personaId === "dmitri") {
    return [
      // MUSIC (10 items)
      { id: "dm-m1", name: "António Zambujo & Yamandu Costa", type: "urn:entity:artist", category: "music", tags: ["bossa nova", "fado", "acoustic"], locality: "Lisbon", subtitle: "Bossa nova acoustic virtuosity meets Portuguese fado guitars" },
      { id: "dm-m2", name: "Clube do Choro de Lisboa", type: "urn:entity:artist", category: "music", tags: ["choro", "brazilian", "live", "bossa nova"], locality: "Lisbon", subtitle: "Weekly Sunday acoustic circle in historic Mouraria tavern" },
      { id: "dm-m3", name: "Caetano Veloso - Transa Live Retrospective", type: "urn:entity:artist", category: "music", tags: ["mpb", "tropicalia", "bossa nova"], locality: "Lisbon", subtitle: "Celebration of landmark MPB exile songs recorded in Europe" },
      { id: "dm-m4", name: "Dino D'Santiago - Mundu Nôbu", type: "urn:entity:artist", category: "music", tags: ["kizomba", "lisbon", "electronic"], locality: "Lisbon", subtitle: "Lisbon creole electronic beats uniting Angola, Cape Verde, and Portugal" },
      { id: "dm-m5", name: "João Gilberto - Chega de Saudade Sessions", type: "urn:entity:artist", category: "music", tags: ["bossa nova", "classic", "brazilian"], locality: "Lisbon", subtitle: "Foundational bossa nova whisper style celebrated at Hot Clube" },
      { id: "dm-m6", name: "Mariza & Brazilian Guest Duets", type: "urn:entity:artist", category: "music", tags: ["fado", "lisbon heritage", "vocal"], locality: "Lisbon", subtitle: "Contemporary fado queen blending Portuguese soul with Brazilian warmth" },
      { id: "dm-m7", name: "Seu Jorge - The Life Aquatic Acoustic Tour", type: "urn:entity:artist", category: "music", tags: ["samba", "acoustic", "bossa nova"], locality: "Lisbon", subtitle: "David Bowie classics reimagined in Portuguese acoustic samba" },
      { id: "dm-m8", name: "Bateu Matou Live at Musicbox", type: "urn:entity:artist", category: "music", tags: ["drums", "electronic", "cais do sodre"], locality: "Lisbon", subtitle: "Percussive supergroup blending Lisbon bass and Brazilian rhythms" },
      { id: "dm-m9", name: "Hot Clube de Portugal Jazz Sessions", type: "urn:entity:artist", category: "music", tags: ["jazz", "instrumental", "historic"], locality: "Lisbon", subtitle: "Europe's oldest functioning jazz club nestled in Praça da Alegria" },
      { id: "dm-m10", name: "Chico Buarque - Caravanas ao Vivo", type: "urn:entity:artist", category: "music", tags: ["mpb", "poetry", "brazilian"], locality: "Lisbon", subtitle: "Poetic songwriting celebrating the Rio-Lisbon emotional bridge" },

      // FOOD (10 items)
      { id: "dm-f1", name: "Churrasqueira da Paz (Bairro Alto)", type: "urn:entity:place", category: "food", tags: ["churrasco", "meat", "traditional", "charcoal"], locality: "Lisbon", subtitle: "Charcoal grill house serving prime cuts with garlic and sea salt" },
      { id: "dm-f2", name: "Fogo de Chão Rodízio (Lisboa)", type: "urn:entity:place", category: "food", tags: ["churrasco", "brazilian", "picanha"], locality: "Lisbon", subtitle: "Traditional Brazilian gaúcho rodízio cuts with farofa and feijoada" },
      { id: "dm-f3", name: "Time Out Market Lisboa", type: "urn:entity:place", category: "food", tags: ["gourmet", "social", "lisbon"], locality: "Lisbon", subtitle: "Curated culinary hall under historic Mercado da Ribeira" },
      { id: "dm-f4", name: "Pastéis de Belém", type: "urn:entity:place", category: "food", tags: ["pastry", "heritage", "custard"], locality: "Lisbon", subtitle: "Warm custard tarts dusted with cinnamon, baked since 1837" },
      { id: "dm-f5", name: "Cervejaria Ramiro (Intendente)", type: "urn:entity:place", category: "food", tags: ["seafood", "bustling", "prego"], locality: "Lisbon", subtitle: "Legendary seafood tavern famous for tiger prawns and garlic butter steak rolls" },
      { id: "dm-f6", name: "Solar dos Presuntos", type: "urn:entity:place", category: "food", tags: ["portuguese", "traditional", "cured ham"], locality: "Lisbon", subtitle: "Northern Portuguese gastronomic temple celebrated for presunto and suckling pig" },
      { id: "dm-f7", name: "Taberna da Rua das Flores", type: "urn:entity:place", category: "food", tags: ["taberna", "chalkboard", "petiscos"], locality: "Lisbon", subtitle: "Intimate Chiado chalkboard bistro serving modern takes on historic petiscos" },
      { id: "dm-f8", name: "A Cevicheria (Príncipe Real)", type: "urn:entity:place", category: "food", tags: ["seafood", "pisco", "contemporary"], locality: "Lisbon", subtitle: "South American ceviche and Atlantic seafood beneath a giant octopus sculpture" },
      { id: "dm-f9", name: "Churrascaria Gaúcha (Campolide)", type: "urn:entity:place", category: "food", tags: ["churrasco", "meat", "brazilian"], locality: "Lisbon", subtitle: "Casual Brazilian neighborhood barbecue joint serving skirt steak and black beans" },
      { id: "dm-f10", name: "Manteigaria Chiado", type: "urn:entity:place", category: "food", tags: ["pastry", "espresso", "quick"], locality: "Lisbon", subtitle: "Artisanal bakery where you watch bakers fold puff pastry at the counter" },

      // FILM & TV (8 items)
      { id: "dm-fl1", name: "In the Mood for Love (Dir. Wong Kar-wai)", type: "urn:entity:movie", category: "film", tags: ["wong kar-wai", "masterpiece", "cinema"], subtitle: "Melancholic masterpiece of unfulfilled longing and visual poetry" },
      { id: "dm-fl2", name: "Chungking Express (Dir. Wong Kar-wai)", type: "urn:entity:movie", category: "film", tags: ["wong kar-wai", "urban", "romance"], subtitle: "Electric kinetic portraits of urban isolation and fleeting connections" },
      { id: "dm-fl3", name: "Cinemateca Portuguesa 35mm Screenings", type: "urn:entity:place", category: "film", tags: ["arthouse", "classic cinema", "lisbon"], locality: "Lisbon", subtitle: "National film archive screening pristine international 35mm prints" },
      { id: "dm-fl4", name: "Cinema Ideal (Bairro Alto)", type: "urn:entity:place", category: "film", tags: ["independent cinema", "diaspora", "chiado"], locality: "Lisbon", subtitle: "Lisbon's oldest functioning cinema screening world independent films" },
      { id: "dm-fl5", name: "City of God (Dir. Fernando Meirelles)", type: "urn:entity:movie", category: "film", tags: ["brazilian classic", "cinema", "crime"], subtitle: "Oscar-nominated landmark of Brazilian contemporary cinema" },
      { id: "dm-fl6", name: "Blade Runner 2049 (Dir. Denis Villeneuve)", type: "urn:entity:movie", category: "film", tags: ["sci-fi", "dystopian", "visual"], subtitle: "Neo-noir science fiction masterpiece exploring memory and humanity" },
      { id: "dm-fl7", name: "Happy Together (Dir. Wong Kar-wai)", type: "urn:entity:movie", category: "film", tags: ["wong kar-wai", "argentina", "drama"], subtitle: "Tender, tempestuous journey of two Hong Kong lovers in Buenos Aires" },
      { id: "dm-fl8", name: "Central Station (Dir. Walter Salles)", type: "urn:entity:movie", category: "film", tags: ["brazilian", "heartfelt", "journey"], subtitle: "Deeply moving odyssey across Brazil's interior" },

      // BOOKS (6 items)
      { id: "dm-b1", name: "The Three-Body Problem by Liu Cixin", type: "urn:entity:book", category: "books", tags: ["sci-fi novels", "sci-fi", "physics"], subtitle: "Hard science fiction epic exploring first contact and cosmic sociology" },
      { id: "dm-b2", name: "Livraria Bertrand (Chiado - Oldest Bookstore)", type: "urn:entity:place", category: "books", tags: ["bookshop", "historic", "lisbon"], locality: "Lisbon", subtitle: "World's oldest operating bookstore, holding readers since 1732" },
      { id: "dm-b3", name: "The Book of Disquiet by Fernando Pessoa", type: "urn:entity:book", category: "books", tags: ["lisbon literature", "philosophy", "classic"], subtitle: "Introspective masterpiece reflecting solitary walks through Lisbon's Baixa" },
      { id: "dm-b4", name: "Dune by Frank Herbert", type: "urn:entity:book", category: "books", tags: ["sci-fi novels", "sci-fi", "worldbuilding"], subtitle: "Monumental science fiction epic of ecology, politics, and destiny" },
      { id: "dm-b5", name: "Neuromancer by William Gibson", type: "urn:entity:book", category: "books", tags: ["sci-fi novels", "cyberpunk", "tech"], subtitle: "Groundbreaking cyberpunk novel that coined the term cyberspace" },
      { id: "dm-b6", name: "The Hour of the Star by Clarice Lispector", type: "urn:entity:book", category: "books", tags: ["brazilian literature", "modernist"], subtitle: "Poetic, piercing novella on urban migration and inner light" },

      // PODCASTS (5 items)
      { id: "dm-p1", name: "Lex Fridman Podcast", type: "urn:entity:podcast", category: "podcasts", tags: ["long-form tech podcasts", "tech", "ai", "engineering"], subtitle: "3-hour deep dives into artificial intelligence, computing, and physics" },
      { id: "dm-p2", name: "Hardcore History by Dan Carlin", type: "urn:entity:podcast", category: "podcasts", tags: ["long-form tech podcasts", "history", "deep-dive"], subtitle: "Epic cinematic examinations of civilizational crises and warfare" },
      { id: "dm-p3", name: "Acquired (Tech & Business Deep Dives)", type: "urn:entity:podcast", category: "podcasts", tags: ["long-form tech podcasts", "tech", "startups"], subtitle: "Comprehensive 4-hour historical retrospectives on computing companies" },
      { id: "dm-p4", name: "Fumaça Podcast (Independent Portuguese Journalism)", type: "urn:entity:podcast", category: "podcasts", tags: ["journalism", "lisbon", "investigative"], subtitle: "In-depth Portuguese investigative podcast exploring social currents" },
      { id: "dm-p5", name: "Huberman Lab", type: "urn:entity:podcast", category: "podcasts", tags: ["long-form tech podcasts", "neuroscience", "systems"], subtitle: "Rigorous science-backed discussions on neural architecture and performance" },

      // PLACES (5 items)
      { id: "dm-pl1", name: "Miradouro de Santa Catarina (Adamastor)", type: "urn:entity:place", category: "places", tags: ["scenic", "sunset", "social", "community"], locality: "Lisbon", subtitle: "Sunset viewpoint over the Tagus river where musicians gather spontaneously" },
      { id: "dm-pl2", name: "LX Factory Arts & Creative Precinct", type: "urn:entity:place", category: "places", tags: ["industrial", "arts", "creative", "coworking"], locality: "Lisbon", subtitle: "19th-century fabric plant transformed into design studios and eateries" },
      { id: "dm-pl3", name: "Miradouro da Senhora do Monte", type: "urn:entity:place", category: "places", tags: ["panoramic", "highest view", "peaceful"], locality: "Lisbon", subtitle: "Highest viewpoint in Lisbon offering quiet sunset views of the castle" },
      { id: "dm-pl4", name: "Jardim da Estrela & Historic Kiosk", type: "urn:entity:place", category: "places", tags: ["park", "green space", "reading"], locality: "Lisbon", subtitle: "Romantic 19th-century park with duck ponds, towering ficus trees, and book kiosks" },
      { id: "dm-pl5", name: "Fundação Calouste Gulbenkian Gardens", type: "urn:entity:place", category: "places", tags: ["architecture", "peaceful", "arts"], locality: "Lisbon", subtitle: "Mid-century brutalist architecture surrounded by amphitheater lakes and birdsong" },
    ];
  }

  // Yuki (Toronto, vegetarian, limited mobility)
  return [
    // MUSIC (10 items)
    { id: "yk-m1", name: "Tatsuro Yamashita Vinyl Listening Salon", type: "urn:entity:artist", category: "music", tags: ["japanese city-pop", "city-pop", "vinyl", "japanese"], locality: "Toronto", subtitle: "80s Japanese city-pop and funk vinyl session in downtown Toronto" },
    { id: "yk-m2", name: "BADBADNOTGOOD Live at History", type: "urn:entity:artist", category: "music", tags: ["jazz", "instrumental", "toronto"], locality: "Toronto", subtitle: "Homegrown genre-bending jazz trio known for lush anime soundtrack tributes" },
    { id: "yk-m3", name: "Taeko Onuki - Mignonne Remaster Night", type: "urn:entity:artist", category: "music", tags: ["japanese city-pop", "city-pop", "soul"], locality: "Toronto", subtitle: "Lush orchestral city-pop classic spun at a dedicated audio café" },
    { id: "yk-m4", name: "Joe Hisaishi Symphonic Film Music", type: "urn:entity:artist", category: "music", tags: ["studio ghibli", "orchestral", "soundtrack"], locality: "Toronto", subtitle: "Toronto Symphony Orchestra performing iconic Hayao Miyazaki melodies" },
    { id: "yk-m5", name: "Charlotte Day Wilson - Alpha Acoustic", type: "urn:entity:artist", category: "music", tags: ["r&b", "toronto sound", "intimate"], locality: "Toronto", subtitle: "Hypnotic contemporary Toronto soul recorded in quiet West End studios" },
    { id: "yk-m6", name: "Miki Matsubara - Stay With Me Tribute", type: "urn:entity:artist", category: "music", tags: ["japanese city-pop", "city-pop", "anthem"], locality: "Toronto", subtitle: "Vibrant global retro pop celebration at Queen West indie music hall" },
    { id: "yk-m7", name: "Beverly Glenn-Copeland - Keyboard Fantasies", type: "urn:entity:artist", category: "music", tags: ["ambient", "toronto legend", "gentle"], locality: "Toronto", subtitle: "Deeply calming synthesizer ambient music crafted in Northern Ontario" },
    { id: "yk-m8", name: "Anri - Timely!! Summer Grooves", type: "urn:entity:artist", category: "music", tags: ["japanese city-pop", "city-pop", "breeze"], locality: "Toronto", subtitle: "Breezy seaside retro jazz-funk rhythms connecting Osaka and Toronto" },
    { id: "yk-m9", name: "Toronto Sound Festival Ambient Lawn", type: "urn:entity:artist", category: "music", tags: ["ambient", "peaceful", "step-free"], locality: "Toronto", subtitle: "Relaxed outdoor acoustic and ambient listening on barrier-free lawns" },
    { id: "yk-m10", name: "Haruomi Hosono - Philharmony Reverie", type: "urn:entity:artist", category: "music", tags: ["japanese city-pop", "electronic", "experimental"], locality: "Toronto", subtitle: "Yellow Magic Orchestra co-founder's quirky synth classic" },

    // FOOD (10 items - ALL WITH POSITIVE VEGETARIAN SIGNALS)
    { id: "yk-f1", name: "Ramen Isshin (College St - Vegetarian Broth)", type: "urn:entity:place", category: "food", tags: ["vegetarian", "ramen", "step-free", "plant-based"], locality: "Toronto", subtitle: "Dedicated vegetarian roasted garlic sesame broth made fresh without animal stock" },
    { id: "yk-f2", name: "Planta Queen (Queen West)", type: "urn:entity:place", category: "food", tags: ["vegan", "vegetarian", "asian", "barrier-free"], locality: "Toronto", subtitle: "100% plant-based East Asian dining with step-free street level entrance" },
    { id: "yk-f3", name: "Kinton Ramen Vegetarian Selection", type: "urn:entity:place", category: "food", tags: ["vegetarian", "ramen", "accessible", "plant-based"], locality: "Toronto", subtitle: "Accessible downtown ramen bar serving rich soy-milk based vegetable broth" },
    { id: "yk-f4", name: "Kojin at Momofuku (Vegetable Counter)", type: "urn:entity:place", category: "food", tags: ["vegetarian", "fusion", "step-free", "plant-based"], locality: "Toronto", subtitle: "Accessible dining room featuring creative wood-fired vegetable cooking" },
    { id: "yk-f5", name: "Fresh Kitchen + Juice Bar (Crawford)", type: "urn:entity:place", category: "food", tags: ["vegan", "vegetarian", "healthy", "barrier-free"], locality: "Toronto", subtitle: "Longstanding plant-based institution serving warm grain bowls and squash tacos" },
    { id: "yk-f6", name: "Ramen Raijin (Wellesley - Vegan Broth)", type: "urn:entity:place", category: "food", tags: ["vegan", "vegetarian", "ramen", "step-free"], locality: "Toronto", subtitle: "Hearty ginger vegetable miso ramen with step-free entrance" },
    { id: "yk-f7", name: "Bloomer's Vegan Bakeshop & Coffee", type: "urn:entity:place", category: "food", tags: ["vegan", "vegetarian", "bakery", "accessible"], locality: "Toronto", subtitle: "Warm hand-crafted plant-based donuts and matcha lattes with wide ramped door" },
    { id: "yk-f8", name: "Buddha's Vegetarian Restaurant", type: "urn:entity:place", category: "food", tags: ["vegetarian", "vegan", "chinese", "low budget"], locality: "Toronto", subtitle: "Generations-old Chinatown favorite serving authentic vegetable and tofu stir-fries" },
    { id: "yk-f9", name: "Musoshin Ramen (Vegetable Paitan)", type: "urn:entity:place", category: "food", tags: ["vegetarian", "ramen", "kyoto style", "step-free"], locality: "Toronto", subtitle: "Kyoto-origin ramen bar with rich vegetable broth and flat entrance" },
    { id: "yk-f10", name: "Gia Restaurant (Plant-Forward Italian)", type: "urn:entity:place", category: "food", tags: ["vegetarian", "vegan", "pasta", "accessible"], locality: "Toronto", subtitle: "Handmade plant-based pastas with truffle butter and wild mushrooms" },

    // FILM & TV (8 items)
    { id: "yk-fl1", name: "TIFF Bell Lightbox - Studio Ghibli Retrospective", type: "urn:entity:place", category: "film", tags: ["studio ghibli", "ghibli", "anime", "step-free"], locality: "Toronto", subtitle: "Barrier-free world-class cinema celebrating Hayao Miyazaki's hand-drawn animation" },
    { id: "yk-fl2", name: "Spirited Away 35mm Screening", type: "urn:entity:movie", category: "film", tags: ["studio ghibli", "ghibli", "animation", "classic"], subtitle: "Academy Award-winning masterpiece of magic, spirits, and resilience" },
    { id: "yk-fl3", name: "My Neighbor Totoro (Dir. Hayao Miyazaki)", type: "urn:entity:movie", category: "film", tags: ["studio ghibli", "ghibli", "family", "nostalgia"], subtitle: "Heartwarming pastoral fable set in lush Japanese countryside" },
    { id: "yk-fl4", name: "Princess Mononoke Symphonic Presentation", type: "urn:entity:movie", category: "film", tags: ["studio ghibli", "ghibli", "epic", "environmental"], subtitle: "Powerful epic exploring the balance between human industry and nature" },
    { id: "yk-fl5", name: "Drive My Car (Dir. Ryusuke Hamaguchi)", type: "urn:entity:movie", category: "film", tags: ["haruki murakami", "murakami", "drama", "oscar"], subtitle: "Acclaimed adaptation of Haruki Murakami's introspective short story" },
    { id: "yk-fl6", name: "The Boy and the Heron (Studio Ghibli)", type: "urn:entity:movie", category: "film", tags: ["studio ghibli", "ghibli", "fantasy", "latest"], subtitle: "Hayao Miyazaki's semi-autobiographical visual poem on grief and renewal" },
    { id: "yk-fl7", name: "Hotokegi Arthouse Cinema (Bloor)", type: "urn:entity:place", category: "film", tags: ["independent cinema", "accessible", "east asian"], locality: "Toronto", subtitle: "Community cinema with step-free seating spotlighting East Asian indie directors" },
    { id: "yk-fl8", name: "Kiki's Delivery Service Cozy Screening", type: "urn:entity:movie", category: "film", tags: ["studio ghibli", "ghibli", "coming-of-age"], subtitle: "Gentle story of independence, self-doubt, and finding one's craft in a new town" },

    // BOOKS (6 items)
    { id: "yk-b1", name: "Norwegian Wood by Haruki Murakami", type: "urn:entity:book", category: "books", tags: ["haruki murakami", "murakami", "novel"], subtitle: "Poignant coming-of-age novel set against late 1960s Tokyo" },
    { id: "yk-b2", name: "Kafka on the Shore by Haruki Murakami", type: "urn:entity:book", category: "books", tags: ["haruki murakami", "murakami", "magical realism"], subtitle: "Surrealist puzzle of cats, prophecies, and labyrinthine memory" },
    { id: "yk-b3", name: "The Wind-Up Bird Chronicle by Haruki Murakami", type: "urn:entity:book", category: "books", tags: ["haruki murakami", "murakami", "masterpiece"], subtitle: "Hypnotic psychological epic set in quiet suburban Tokyo alleyways" },
    { id: "yk-b4", name: "Typewriter Books & Tea (West Queen West)", type: "urn:entity:place", category: "books", tags: ["bookshop", "step-free", "accessible", "japanese"], locality: "Toronto", subtitle: "Wheelchair-accessible indie bookshop specializing in translated Japanese fiction" },
    { id: "yk-b5", name: "Station Eleven by Emily St. John Mandel", type: "urn:entity:book", category: "books", tags: ["speculative", "toronto author", "art"], subtitle: "Lyrical Toronto-written novel on how Shakespeare and music endure across time" },
    { id: "yk-b6", name: "Before the Coffee Gets Cold by Toshikazu Kawaguchi", type: "urn:entity:book", category: "books", tags: ["japanese fiction", "gentle", "café"], subtitle: "Tender Tokyo café fable about time travel, regret, and closure" },

    // PODCASTS (5 items)
    { id: "yk-p1", name: "Casefile True Crime Audio", type: "urn:entity:podcast", category: "podcasts", tags: ["true-crime podcasts", "true crime", "deep dive"], subtitle: "Meticulously researched narrative crime documentaries narrated anonymously" },
    { id: "yk-p2", name: "My Favorite Murder with Karen & Georgia", type: "urn:entity:podcast", category: "podcasts", tags: ["true-crime podcasts", "true crime", "comedy"], subtitle: "Conversational true crime show emphasizing empathy and community advocacy" },
    { id: "yk-p3", name: "Someone Knows Something (CBC Toronto)", type: "urn:entity:podcast", category: "podcasts", tags: ["true-crime podcasts", "canadian", "investigative"], subtitle: "David Ridgen's sensitive and award-winning Canadian investigative audio series" },
    { id: "yk-p4", name: "Criminal with Phoebe Judge", type: "urn:entity:podcast", category: "podcasts", tags: ["true-crime podcasts", "thoughtful", "short-form"], subtitle: "Stories of people who've done wrong, been wronged, or gotten caught in the middle" },
    { id: "yk-p5", name: "Ghibliotheque (Ghibli Film Guide)", type: "urn:entity:podcast", category: "podcasts", tags: ["studio ghibli", "film analysis", "companion"], subtitle: "Warm, episode-by-episode companion guide to the films of Studio Ghibli" },

    // PLACES (5 items - ALL WITH POSITIVE ACCESSIBLE/STEP-FREE SIGNALS)
    { id: "yk-pl1", name: "Toronto PATH & Roy Thomson Hall Walk", type: "urn:entity:place", category: "places", tags: ["indoor", "step-free", "accessible", "barrier-free"], locality: "Toronto", subtitle: "Fully climate-controlled, wheelchair-accessible subterranean cultural promenade" },
    { id: "yk-pl2", name: "Toronto Music Garden (Harbourfront)", type: "urn:entity:place", category: "places", tags: ["step-free", "scenic", "nature", "accessible"], locality: "Toronto", subtitle: "Accessible paved waterfront landscape designed with cellist Yo-Yo Ma" },
    { id: "yk-pl3", name: "Art Gallery of Ontario (AGO - Barrier-Free)", type: "urn:entity:place", category: "places", tags: ["arts", "museum", "step-free", "accessible"], locality: "Toronto", subtitle: "Frank Gehry-designed art museum with smooth elevators and wide galleries" },
    { id: "yk-pl4", name: "Toronto Public Library Reference Centre (Yonge)", type: "urn:entity:place", category: "places", tags: ["library", "step-free", "quiet", "accessible"], locality: "Toronto", subtitle: "Soaring 5-story glass atrium library with seamless barrier-free access" },
    { id: "yk-pl5", name: "Allan Gardens Conservatory Paved Glasshouses", type: "urn:entity:place", category: "places", tags: ["greenhouse", "step-free", "peaceful", "accessible"], locality: "Toronto", subtitle: "Historic indoor tropical conservatory with wide accessible paved paths" },
  ];
}
