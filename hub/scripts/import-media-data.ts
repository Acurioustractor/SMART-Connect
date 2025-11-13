/**
 * Script to import media data into the database
 * Run with: npx tsx hub/scripts/import-media-data.ts
 * Or from hub/scripts directory: npx tsx import-media-data.ts
 */

// Media data provided by user
const mediaData = [
  {
    title: "Addiction was hiding in plain sight on Cup Day (Interview with April Long)",
    type: "Radio interview (audio)",
    outlet_host: "2GB – Overnights with Mike Jeffreys (Omny Studio)",
    date: "2025-11-09",
    url: "https://omny.fm/shows/overnights-with-mike-jeffreys/addiction-was-hiding-in-plain-sight-on-cup-day",
    why_matters: "Recent 10‑min interview with SRA CEO about gambling harm; downloadable audio."
  },
  {
    title: "SMART Recovery Australia – CEO, April Long",
    type: "Radio interview (audio)",
    outlet_host: "3CR – Living Free",
    date: "2025-10 (approx.)",
    url: "https://www.3cr.org.au/livingfree/episode/smart-recovery-australia-ceo-april-long",
    why_matters: "CEO overview of SRA's approach and programs; full‑length community radio episode."
  },
  {
    title: "SMART Recovery Australia – Dan (National Program Manager)",
    type: "Radio interview (audio)",
    outlet_host: "3CR – Living Free",
    date: "2021-04-29",
    url: "https://www.3cr.org.au/livingfree/episode-202104291300/smart-recovery-australia-dan",
    why_matters: "Program-level explainer; lived experience and tools."
  },
  {
    title: "SMART Recovery Australia – Dan (updated)",
    type: "Podcast",
    outlet_host: "Apple Podcasts – Living Free",
    date: "2022-03-24",
    url: "https://podcasts.apple.com/us/podcast/smart-recovery-australia-dan-on-24mar2022/id1286965140?i=1000555188806",
    why_matters: "Update episode highlighting SRA's Take On Addiction campaign."
  },
  {
    title: "SMART Recovery – Neia Wong (Group Facilitator)",
    type: "Radio interview (audio)",
    outlet_host: "3CR – Living Free",
    date: "2025-10 (approx.)",
    url: "https://www.3cr.org.au/livingfree/episode/smart-recovery-neia-wong-group-facilitator",
    why_matters: "Facilitator perspective on CBT-based peer support in SMART."
  },
  {
    title: "SMART Recovery Australia – Tracy‑Lee",
    type: "Radio interview (audio)",
    outlet_host: "3CR – Living Free",
    date: "2025-11 (approx.)",
    url: "https://www.3cr.org.au/livingfree/episode/smart-recovery-australia-tracy-lee",
    why_matters: "Lived experience advocate and facilitator story; recent episode."
  },
  {
    title: "Yarn SMART (SMART Recovery) – Shaun",
    type: "Radio interview (audio)",
    outlet_host: "3CR – Living Free",
    date: "2024-05-23",
    url: "https://www.3cr.org.au/livingfree/episode/yarn-smart-smart-recovery-shaun",
    why_matters: "First Nations program focus; recovery through yarning."
  },
  {
    title: "Living Free Podcast – SMART Recovery Australia – Dan Raffell",
    type: "Podcast",
    outlet_host: "Podbean – Living Free",
    date: "2025-05 (approx.)",
    url: "https://www.podbean.com/media/share/dir-5barg-25234dcc",
    why_matters: "Long-form interview with SRA National Coordinator & Trainer."
  },
  {
    title: "People of Impact – April Long (CEO, SMART Recovery Australia)",
    type: "Podcast",
    outlet_host: "Spotify – Impact Advising",
    date: "2024-08-05",
    url: "https://open.spotify.com/episode/4xpJDT4zy8CztzcORN3ajC",
    why_matters: "Leadership interview covering strategy and collaboration."
  },
  {
    title: "Using SMART goals to conquer your addictions (Interview with Josette Freeman)",
    type: "Podcast",
    outlet_host: "SoundCloud – Nick Kenstah",
    date: "",
    url: "https://soundcloud.com/nick-kenstah/interview-with-smart-recovery",
    why_matters: "Former SRA Senior National Coordinator explains SMART tools."
  },
  {
    title: "Caring for Carers: Who helps those who care for addicts? (with Josette Freeman)",
    type: "Radio interview (audio)",
    outlet_host: "ABC Radio – Overnights",
    date: "2017 (approx.)",
    url: "https://www.abc.net.au/listen/programs/overnights/caring-for-carers/8789562",
    why_matters: "ABC interview featuring SRA's family & carers support."
  },
  {
    title: "SMART Recovery on 774 ABC Radio Melbourne | AUDIO",
    type: "SRA blog (audio linked)",
    outlet_host: "SRA Blog / ABC Melbourne",
    date: "2016 (approx.)",
    url: "https://smartrecoveryaustralia.com.au/blog/smart-recovery-on-774-abc-radio-melbourne",
    why_matters: "Clare Bowditch interviews Josette Freeman; 'addiction is not a disease' discussion."
  },
  {
    title: "SMART Recovery Australia – YouTube channel (videos & webinars)",
    type: "YouTube channel",
    outlet_host: "SMART Recovery Australia",
    date: "",
    url: "https://www.youtube.com/c/smartrecoveryaustraliahaymarket",
    why_matters: "Official channel: tools, webinars, program explainers."
  },
  {
    title: "SMART Recovery: Choose your own path to a healthier future",
    type: "Video",
    outlet_host: "YouTube – SMART Recovery Australia",
    date: "2022 (approx.)",
    url: "https://www.youtube.com/watch?v=ijHJZHi0ea4",
    why_matters: "Government‑supported public awareness video about SRA."
  },
  {
    title: "Online Addiction Meetings | SMART Recovery Australia",
    type: "Video",
    outlet_host: "YouTube – SMART Recovery Australia",
    date: "2025 (approx.)",
    url: "https://www.youtube.com/watch?v=oYswGRHu94E",
    why_matters: "Explainer on accessing online SMART meetings in Australia."
  },
  {
    title: "SMART Recovery Tools – Activations, Beliefs & Consequences (ABC)",
    type: "Video",
    outlet_host: "YouTube – SMART Recovery Australia",
    date: "2024 (approx.)",
    url: "https://www.youtube.com/watch?v=TGsdWb8igyg",
    why_matters: "Tool explainer (ABC model) for groups and self‑help."
  },
  {
    title: "Yarn SMART – Playlist (First Nations)",
    type: "YouTube playlist",
    outlet_host: "YouTube – SMART Recovery Australia",
    date: "",
    url: "https://www.youtube.com/playlist?list=PLGSwMtV9I0KUhoE9zf7ik7vxQvBtKxJFa",
    why_matters: "Short interviews and explainers for Yarn SMART program."
  },
  {
    title: "LOTL interview: SRA expands addiction support for LGBTQIA+ community (with April Long)",
    type: "Video interview",
    outlet_host: "YouTube – LOTL",
    date: "2023 (approx.)",
    url: "https://www.youtube.com/watch?v=XU5KN6uFB2U",
    why_matters: "CEO interview on tailored services for LGBTQIA+ people."
  },
  {
    title: "Managing Problematic Behaviours – Interview with Josette Freeman",
    type: "Media article (text Q&A)",
    outlet_host: "Sydney Criminal Lawyers",
    date: "2020 (approx.)",
    url: "https://www.sydneycriminallawyers.com.au/blog/managing-problematic-behaviours-an-interview-with-smart-recoverys-josette-freeman/",
    why_matters: "Detailed Q&A on SMART vs 12‑step and harm minimisation."
  },
  {
    title: "SBS News: New PBS listings to save patients millions (SRA comment)",
    type: "Media article (news)",
    outlet_host: "SBS News",
    date: "2022-05-01",
    url: "https://www.sbs.com.au/news/article/new-pharmaceutical-benefits-scheme-listings-to-save-patients-millions/ob8eyrxjh",
    why_matters: "Includes SRA comment from then Executive Director Ryan McGlaughlin."
  },
  {
    title: "ABC News: Finding help online for problem drinking while in coronavirus isolation",
    type: "Media article (opinion)",
    outlet_host: "ABC News (by Jenny Valentish)",
    date: "2020-04-24",
    url: "https://www.abc.net.au/news/2020-04-24/finding-help-online-for-problem-drinking-coronavirus-isolation/12114232",
    why_matters: "Advice piece by SRA board director; points to online mutual aid incl. SMART."
  }
];

async function importMediaData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3080';

  console.log('Starting media import...');
  console.log(`Importing ${mediaData.length} items to ${baseUrl}/api/media/import`);

  try {
    const response = await fetch(`${baseUrl}/api/media/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: mediaData,
        autoProcess: false, // Set to true to auto-download and transcribe
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Import successful!');
      console.log(`Created: ${result.results.created}`);
      console.log(`Skipped: ${result.results.skipped}`);
      console.log(`Errors: ${result.results.errors}`);

      if (result.results.errors > 0) {
        console.log('\nErrors:');
        result.results.items
          .filter((item: any) => item.status === 'error')
          .forEach((item: any) => {
            console.log(`  - ${item.title}: ${item.error}`);
          });
      }
    } else {
      console.error('❌ Import failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during import:', error);
  }
}

export { importMediaData, mediaData };

// Run the import when executed directly
importMediaData();
