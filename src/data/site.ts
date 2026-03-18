export const meta = {
  lang: 'en',
  locale: 'en_US',
  title: 'FullStack Bulletin',
  description:
    'FullStack Bulletin (2017-2026). A farewell to our weekly newsletter for fullstack developers. Browse the full archive of 438 issues.',
  canonicalUrl: 'https://fullstackbulletin.com',
  twitterProfile: 'fstackbulletin',
};

export const navigation = [
  { label: 'Archive', link: '/archive' },
];

export const founders = {
  title: 'The people behind FullStack Bulletin',
  entries: [
    {
      name: 'Luciano Mammino',
      image: 'luciano-mammino.png',
      description: 'Web developer, entrepreneur, fighter, butterfly maker!',
      profiles: [
        { label: '@loige', url: 'https://x.com/loige' },
        { label: 'loige.co', url: 'https://loige.co' },
      ],
    },
    {
      name: 'Andrea Mangano',
      image: 'andrea-mangano.png',
      description:
        'UI/Web developer, food lover, romantic and visionary man, curious about life.',
      profiles: [
        { label: '@andreaman87', url: 'https://x.com/andreaman87' },
        { label: 'andreamangano.com', url: 'https://andreamangano.com' },
      ],
    },
  ],
};

export const sponsors = [
  { name: 'Dashlane', link: 'https://www.dashlane.com', logo: 'dashlane.svg' },
  { name: 'Upstash', link: 'https://upstash.com', logo: 'upstash.svg' },
  {
    name: 'Belka Digital',
    link: 'https://www.belkadigital.com',
    logo: 'belka.svg',
  },
  { name: 'FeedHive', link: 'https://feedhive.io', logo: 'feedhive.svg' },
  { name: 'Nudge', link: 'https://giveitanudge.com', logo: 'nudge.svg' },
  {
    name: 'MisterDA',
    link: 'https://www.misterda.com/',
    logo: 'misterda.svg',
  },
  {
    name: 'ConfigCat',
    link: 'https://configcat.com/',
    logo: 'configcat.svg',
  },
  { name: 'Packt', link: 'https://www.packtpub.com/', logo: 'packt.svg' },
  { name: 'PostHog', link: 'https://posthog.com/', logo: 'posthog.svg' },
  { name: 'Trigger.dev', link: 'https://trigger.dev', logo: 'triggerdev.svg' },
];

export const footer = {
  tagline:
    'Made with passion and a bit of <a href="https://github.com/FullStackBulletin" target="_blank" class="underline hover:text-brand-primary transition-colors"><strong>automation</strong></a>',
  links: [
    { label: 'Archive', url: '/archive' },
    { label: 'loige.co', url: 'https://loige.co' },
    { label: 'andreamangano.com', url: 'https://andreamangano.com' },
  ],
};

export const openSourceProjects = [
  {
    name: 'FullStackBulletin/automation',
    description:
      'The automation pipeline that powered the newsletter: scraping, ranking, and publishing. All open source.',
    url: 'https://github.com/FullStackBulletin/automation',
  },
  {
    name: 'FullStackBulletin/tech-quotes',
    description:
      'A curated collection of inspirational tech quotes. One shipped with every issue.',
    url: 'https://github.com/FullStackBulletin/tech-quotes',
  },
  {
    name: 'FullStackBulletin/fullstack-books',
    description:
      'A hand-picked list of books for fullstack developers. One recommended per issue.',
    url: 'https://github.com/FullStackBulletin/fullstack-books',
  },
];

export const liveRefactoringSessions = {
  title: 'Live refactoring sessions',
  description:
    'A YouTube playlist of live coding sessions where we refactored the FullStack Bulletin automation pipeline. Raw, unscripted, and full of real-world problem solving.',
  url: 'https://www.youtube.com/watch?v=wGLfl4qV4Fw&list=PLbNOKnE-Oyr1tsUft4j0QZDyk5iFcVVy_',
  thumbnailUrl: '/images/live-refactoring-thumbnail.jpg',
};

export const recommendedNewsletters = [
  { name: "Lee Gilmore's Serverless Advocate", url: 'https://serverlessadvocate.substack.com/' },
  { name: 'Sidebar.io', url: 'https://sidebar.io/' },
  { name: "Sandro & Tobi's AWS Fundamentals", url: 'https://awsfundamentals.com/' },
  { name: "Ale & Manuel's Ship with AI", url: 'https://shipwithai.substack.com/' },
  { name: 'Rust Bytes', url: 'https://weeklyrust.substack.com/' },
  { name: 'AWS News Feed', url: 'https://aws-news.com/' },
  { name: 'Programming Digest', url: 'https://programmingdigest.net' },
  { name: "Matteo Collina's Adventures in Nodeland", url: 'https://adventures.nodeland.dev/' },
  { name: "Jones Zachariah Noel N's The Serverless Terminal", url: 'https://www.theserverlessterminal.com/' },
  { name: "Alfonso Graziano's AI-Native Engineering", url: 'https://ainativeengineering.substack.com/' },
  { name: 'JavaScript Weekly', url: 'https://javascriptweekly.com/' },
  { name: 'Node Weekly', url: 'https://nodeweekly.com/' },
  { name: 'Bytes', url: 'https://bytes.dev/' },
  { name: 'CSS Tricks', url: 'https://css-tricks.com/' },
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/' },
  { name: "Thorsten Ball's Joy & Curiosity", url: 'https://registerspill.thorstenball.com/' },
  { name: 'React Status', url: 'https://react.statuscode.com/' },
  { name: 'Golang Weekly', url: 'https://golangweekly.com/' },
  { name: 'This Week in Rust', url: 'https://this-week-in-rust.org/' },
  { name: 'Web Tools Weekly', url: 'https://webtoolsweekly.com/' },
  { name: "Stefan Judis' Web Weekly", url: 'https://webweekly.email/' },
  { name: 'Frontend Masters', url: 'https://frontendmasters.com/' },
  { name: 'LogRocket Blog', url: 'https://blog.logrocket.com/' },
  { name: 'NodeSource Blog', url: 'https://nodesource.com/blog' },
  { name: 'Evil Martians Chronicles', url: 'https://evilmartians.com/chronicles' },
  { name: 'UX Collective', url: 'https://uxdesign.cc/' },
  { name: 'UX Planet', url: 'https://uxplanet.org/' },
  { name: "Darius Cosden's Import React", url: 'https://importreact.beehiiv.com/' },
  { name: 'Node.js Design Patterns', url: 'https://nodejsdesignpatterns.com/' },
  { name: 'Advanced Web Machinery', url: 'https://advancedweb.hu/' },
  { name: 'Cloud Four Blog', url: 'https://cloudfour.com/' },
  { name: 'OddBird', url: 'https://oddbird.net/' },
  { name: 'Piccalilli', url: 'https://piccalil.li/' },
  { name: 'Fully Stacked', url: 'https://fullystacked.net/' },
  { name: '12 Days of Web', url: 'https://12daysofweb.dev/' },
  { name: 'Web Performance Tips', url: 'https://www.webperf.tips/' },
  { name: 'DuckTyped', url: 'https://www.ducktyped.org/' },
  { name: 'web.dev', url: 'https://web.dev/' },
  { name: 'Pope Tech Blog', url: 'https://blog.pope.tech/' },
];

export const recommendedCreators = [
  { name: 'Josh W. Comeau', url: 'https://joshwcomeau.com/' },
  { name: 'Ahmad Shadeed', url: 'https://ishadeed.com/' },
  { name: 'Valeri Karpov', url: 'https://thecodebarbarian.com/' },
  { name: 'Martin Fowler', url: 'https://martinfowler.com/' },
  { name: 'Addy Osmani', url: 'https://addyosmani.com/' },
  { name: 'Robin Wieruch', url: 'https://robinwieruch.de/' },
  { name: 'Axel Rauschmayer', url: 'https://2ality.com/' },
  { name: 'Jake Archibald', url: 'https://jakearchibald.com/' },
  { name: 'Dan Abramov', url: 'https://overreacted.io/' },
  { name: 'Julia Evans', url: 'https://jvns.ca/' },
  { name: 'Kent C. Dodds', url: 'https://kentcdodds.com/' },
  { name: 'Raymond Camden', url: 'https://raymondcamden.com/' },
  { name: 'Amos (fasterthanlime)', url: 'https://fasterthanli.me/' },
  { name: 'Harry Roberts', url: 'https://csswizardry.com/' },
  { name: 'James Sinclair', url: 'https://jrsinclair.com/' },
  { name: 'David Walsh', url: 'https://davidwalsh.name/' },
  { name: 'Dominik (TkDodo)', url: 'https://tkdodo.eu/' },
  { name: 'Adam Argyle', url: 'https://nerdy.dev/' },
  { name: 'Jhey Tompkins', url: 'https://www.jhey.dev/' },
  { name: 'John Arundel', url: 'https://bitfieldconsulting.com/' },
  { name: 'Dmitri Pavlutin', url: 'https://dmitripavlutin.com/' },
  { name: 'Zach Leatherman', url: 'https://zachleat.com/' },
  { name: 'Ire Aderinokun', url: 'https://bitsofco.de/' },
  { name: 'Josh Collinsworth', url: 'https://joshcollinsworth.com/' },
  { name: 'Brad Frost', url: 'https://bradfrost.com/' },
  { name: 'Zell Liew', url: 'https://zellwk.com/' },
  { name: 'Salma Alam-Naylor', url: 'https://whitep4nth3r.com/' },
  { name: 'Lea Verou', url: 'https://lea.verou.me/' },
  { name: 'Una Kravets', url: 'https://una.im/' },
  { name: 'Wes Bos', url: 'https://wesbos.com/' },
  { name: 'Scott Tolinski', url: 'https://tolin.ski/' },
  { name: 'Kevin Powell', url: 'https://www.kevinpowell.co/' },
  { name: 'Adam Wathan', url: 'https://adamwathan.me/' },
  { name: 'Ania Kubow', url: 'https://aniakubow.com/' },
  { name: 'Cassidy Williams', url: 'https://cassidoo.co/' },
  { name: 'Kyle Cook (Web Dev Simplified)', url: 'https://blog.webdevsimplified.com/' },
  { name: 'Julia Miocene', url: 'https://miocene.io/' },
  { name: 'Ben Hong', url: 'https://www.bencodezen.io/' },
  { name: 'Bree Hall', url: 'https://www.bytesofbree.com/' },
  { name: 'Chris Coyier', url: 'https://chriscoyier.net/' },
  { name: 'Jason Lengstorf', url: 'https://jason.energy/' },
  { name: 'Amy Dutton', url: 'https://www.amydutton.me/' },
  { name: 'Bramus Van Damme', url: 'https://www.bram.us/' },
  { name: 'Massimo Artizzu', url: 'https://dev.to/maxart2501' },
  { name: 'Armin Ronacher', url: 'https://lucumr.pocoo.org/' },
  { name: 'Mario Zechner', url: 'https://mariozechner.at/' },
  { name: 'Matthias Ott', url: 'https://matthiasott.com/' },
  { name: 'David Bushell', url: 'https://dbushell.com/' },
  { name: 'James Long', url: 'https://jlongster.com/' },
  { name: 'Patrick Brosset', url: 'https://patrickbrosset.com/' },
  { name: 'Jim Nielsen', url: 'https://blog.jim-nielsen.com/' },
  { name: 'Alex MacArthur', url: 'https://macarthur.me/' },
  { name: 'Anthony Fu', url: 'https://antfu.me/' },
  { name: 'Pawel Grzybek', url: 'https://pawelgrzybek.com/' },
  { name: 'Evert Pot', url: 'https://evertpot.com/' },
  { name: 'Andrea Giammarchi', url: 'https://medium.com/@WebReflection' },
  { name: 'Tania Rascia', url: 'https://www.taniarascia.com/' },
  { name: 'Maximiliano Firtman', url: 'https://firt.dev/' },
  { name: 'Monica Dinculescu', url: 'https://meowni.ca/' },
  { name: 'Michael Di Prisco', url: 'https://cadienvan.github.io/' },
  { name: 'Erik Runyon', url: 'https://erikrunyon.com/' },
  { name: 'Max Böck', url: 'https://mxb.at/' },
  { name: 'Kyle Shevlin', url: 'https://kyleshevlin.com/' },
  { name: 'Surma', url: 'https://dassur.ma/' },
  { name: 'Chris Ferdinandi', url: 'https://gomakethings.com/' },
  { name: 'Valentino Gagliardi', url: 'https://www.valentinog.com/blog' },
  { name: 'Max Stoiber', url: 'https://mxstbr.com/' },
  { name: 'Will Boyd', url: 'https://codersblock.com/' },
  { name: 'Shawn Wang (swyx)', url: 'https://www.swyx.io/' },
  { name: 'Marvin Hagemeister', url: 'https://marvinh.dev/' },
  { name: 'Malte Ubl', url: 'https://www.industrialempathy.com/' },
  { name: 'Ben Howdle', url: 'https://benhowdle.im/' },
];
