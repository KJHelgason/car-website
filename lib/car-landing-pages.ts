interface CarLandingLocalizedCopy {
  heroTitle?: string;
  overview?: string;
  marketPosition?: string;
  buyerHighlights?: string[];
  considerations?: string[];
}

export interface CarLandingPageConfig {
  makeSlug: string;
  modelSlug: string;
  displayMake: string;
  displayModel: string;
  makeQuery: string;
  modelQuery: string;
  heroTitle: string;
  overview: string;
  marketPosition: string;
  buyerHighlights: string[];
  considerations: string[];
  competitorModels: string[];
  localized?: Partial<Record<'en' | 'is', CarLandingLocalizedCopy>>;
}

export const CAR_LANDING_PAGES: CarLandingPageConfig[] = [
  {
    makeSlug: 'toyota',
    modelSlug: 'corolla',
    displayMake: 'Toyota',
    displayModel: 'Corolla',
    makeQuery: 'toyota',
    modelQuery: 'corolla',
    heroTitle: 'Toyota Corolla Price Trends in Iceland',
    overview:
      'The Corolla remains one of the most requested compact cars for Icelandic buyers thanks to reliable drivetrains, frugal fuel use, and an active network of authorised service partners. Our data tracks listings from franchise dealers and private sellers to surface realistic pricing bands.',
    marketPosition:
      'Within the compact segment the Corolla competes directly with the Volkswagen Golf and Hyundai i30. Demand for hybrids continues to boost resale values, and well-kept examples under 100,000 km rarely stay on the market for long.',
    buyerHighlights: [
      'Hybrid trims command a 8-12% premium over comparable petrol models but deliver lower running costs.',
      'Fleet imports from mainland Europe can offer better equipment but often carry higher mileage; check service documentation.',
      'LED headlights and adaptive cruise packages introduced after 2020 add resale appeal, especially for winter commuting.'
    ],
    considerations: [
      'Verify battery health on hybrid models and request official Toyota service printouts when available.',
      'Salt exposure from coastal driving accelerates corrosion on suspension components - underbody inspections are worth the effort.',
      'Insurance rates remain low, but parts availability can stretch repair timelines in smaller towns.'
    ],
    competitorModels: ['Volkswagen Golf', 'Hyundai i30', 'Mazda 3'],
    localized: {
      is: {
        heroTitle: 'Verðþróun Toyota Corolla á Íslandi',
        overview:
          'Corolla heldur áfram að vera einn vinsælasti smábíllinn hjá íslenskum kaupendum þökk sé áreiðanlegum driflínum, hóflegri eldsneytisnotkun og virku neti viðurkenndra þjónustuaðila. Gögnin okkar safna auglýsingum frá bæði umboðum og einkasölum svo við getum sýnt raunhæf verðbil.',
        marketPosition:
          'Í flokki smærri fjölskyldubíla keppir Corolla beint við Volkswagen Golf og Hyundai i30. Eftirspurn eftir tvinnbílum heldur áfram að hækka endursöluverð og vel með farnir bílar undir 100.000 km eru fljótir að seljast.',
        buyerHighlights: [
          'Tvinnútfærslur kosta að jafnaði 8-12% meira en sambærileg bensínlíkön en skila lægri rekstrarkostnaði.',
          'Flotainnfluttir bílar frá meginlandi Evrópu eru oft betur útbúnir en geta haft meiri kílómetrafjölda; farðu yfir þjónustusögu vandlega.',
          'LED-aðalljós og aðlöguð hraðastilling sem bættust við eftir 2020 styrkja endursöluverð, sérstaklega fyrir vetrarakstur.'
        ],
        considerations: [
          'Athugaðu heilsu drifrafhlaðna í tvinnbílum og fáðu prentaða þjónustusögu frá Toyota þegar það er hægt.',
          'Saltmengun frá strandsvæðum flýtir upp tæringu í fjöðrunarhlutum – undirvagnsskoðun borgar sig.',
          'Tryggingaverð helst lágt en rými fyrir varahluti getur lengt viðgerðartíma utan höfuðborgarsvæðisins.'
        ],
      },
    },
  },
  {
    makeSlug: 'volkswagen',
    modelSlug: 'golf',
    displayMake: 'Volkswagen',
    displayModel: 'Golf',
    makeQuery: 'volkswagen',
    modelQuery: 'golf',
    heroTitle: 'Volkswagen Golf Market Overview',
    overview:
        'The RAV4 is a go-to choice for families and outdoor enthusiasts needing dependable AWD performance. Hybrid powertrains dominate Icelandic listings, aligning with the country\'s emphasis on fuel efficiency and low emissions.',
    marketPosition:
      'Diesel variants still appeal to long-distance commuters, while mild-hybrid eTSI models attract urban buyers. The Golf competes with the Toyota Corolla, Ford Focus, and Mazda3 for market share.',
    buyerHighlights: [
      'DSG gearboxes on 1.5 TSI models require documented maintenance; proof of fluid changes keeps resale value strong.',
      'Winter wheel packages add roughly 150,000 ISK to asking prices when included.',
      'Estate (Variant) bodies hold their value thanks to cargo practicality for Icelandic families.'
    ],
    considerations: [
      'Check for software updates on infotainment systems - some imports arrive with unsupported EU-only services.',
      'Adaptive chassis control components can be expensive to replace; scan for warning lights during inspection.',
      'Rust protection is solid, but rear hatch wiring harness wear is common on older Mk7 vehicles.'
    ],
    competitorModels: ['Toyota Corolla', 'Ford Focus', 'Mazda3'],
    localized: {
      is: {
        heroTitle: 'Volkswagen Golf markaðsyfirlit',
        overview:
          'Golf hefur lengi verið traust val fyrir fjölskyldur og daglega akstursþarfir þökk sé fjölbreyttu driflínuframboði og háu byggingargæðum. Fjöldi undirtegunda og búnaðarstiga tryggir að íslenskir kaupendur finna útfærslu sem hentar bæði borg og sveit.',
        marketPosition:
          'Golf keppir í sama flokki og Toyota Corolla, Ford Focus og Mazda3. Eftirspurn eftir tvinn- og mildhybrid TSI gerðum heldur verði stöðugu og tryggir sterkt endursöluverð.',
        buyerHighlights: [
          'DSG skiptingar á 1.5 TSI þurfa reglulegt viðhald með olíuskiptum á réttum þjónustutímum.',
          'Vetrarhjólapakkar bæta að jafnaði 150.000 ISK ofan á verð þegar þeir fylgja með samningnum.',
          'Variant (station) útfærslur halda verðgildi vel þar sem farangursrýmið nýtist íslenskum fjölskyldum.',
        ],
        considerations: [
          'Gakktu úr skugga um að hugbúnaðaruppfærslur fyrir upplýsingakerfi hafi verið settar inn; sumar innfluttar gerðir styðja aðeins EU þjónustur.',
          'Aðlöguð undirvagnsstýring getur verið kostnaðarsöm í viðhaldi; athugaðu viðvörunarljós áður en þú kaupir.',
          'Raflögn í afturhlera getur slitnað á eldri Mk7 bílum; skoðaðu sérstaklega ef bíllinn er mikið notaður.',
        ],
      },
    },
  },
  {
    makeSlug: 'mazda',
    modelSlug: 'cx-5',
    displayMake: 'Mazda',
    displayModel: 'CX-5',
    makeQuery: 'mazda',
    modelQuery: 'cx-5',
    heroTitle: 'Mazda CX-5 Pricing Guide',
    overview:
      'Demand for midsize crossovers keeps the Mazda CX-5 a staple on Icelandic classifieds. Buyers prioritise the quiet cabin, AWD availability, and the well-regarded Skyactiv-G petrol engines for daily driving.',
    marketPosition:
      'The CX-5 competes with the Hyundai Tucson, Toyota RAV4, and Kia Sportage. Listings show steady pricing through winter months when AWD demand peaks.',
    buyerHighlights: [
      'Signature trims with Nappa leather list at a 10-15% premium but depreciate slower beyond the five-year mark.',
      'AWD models dominate the market; FWD imports can save upfront cost yet have thinner resale demand.',
      'Mazda Connect infotainment improvements after the 2021 facelift resonate with tech-focused buyers.'
    ],
    considerations: [
      'Inspect for stone chips on the front bumper - dark paint colours show wear quickly.',
      'Skyactiv-D diesels are rare and require careful maintenance history to avoid DPF issues.',
      'Towing packages boost asking price but ensure the hitch is certified for Icelandic regulations.'
    ],
    competitorModels: ['Hyundai Tucson', 'Toyota RAV4', 'Kia Sportage'],
    localized: {
      is: {
        heroTitle: 'Mazda CX-5 verðleiðarvísir',
        overview:
          'Mazda CX-5 heldur áfram að vera stöðugur leikandi á íslenskum markaði þar sem eftirspurn eftir millistórum crossover bílum er mikil. Kaupendur meta hljóðlátt innanrými, fjórhjóladrif og Skyactiv-G bensínvélar sem henta vel í daglegum akstri.',
        marketPosition:
          'CX-5 keppir við Hyundai Tucson, Toyota RAV4 og Kia Sportage. Auglýsingaverð heldur sér vel yfir vetrarmánuðina þegar eftirspurn eftir AWD eykst.',
        buyerHighlights: [
          'Signature útfærslur með Nappa leðri eru 10-15% dýrari en halda verðinu lengur eftir fimm ára notkun.',
          'AWD er yfirgnæfandi á markaðnum; FWD innflutningur getur lækkað kaupverð en sætt minni endursölu eftirspurn.',
          'Mazda Connect kerfið eftir uppfærsluna 2021 höfðar til tækniáhugafólks og styrkir endursölu.',
        ],
        considerations: [
          'Athugaðu fyrir steinskemmdum á framstuðara; dökkir litir sýna slit hratt.',
          'Skyactiv-D dísilvélar eru sjaldgæfar og krefjast vel skráðrar þjónustusögu til að forðast DPF vandamál.',
          'Tjakk og dráttarbeisli hækka verð en vertu viss um að búnaðurinn sé vottaður samkvæmt íslenskum reglum.',
        ],
      },
    },
  },
  {
    makeSlug: 'hyundai',
    modelSlug: 'tucson',
    displayMake: 'Hyundai',
    displayModel: 'Tucson',
    makeQuery: 'hyundai',
    modelQuery: 'tucson',
    heroTitle: 'Hyundai Tucson Buyer Snapshot',
    overview:
      'The Hyundai Tucson offers one of the broadest equipment mixes in the midsize crossover class, from value-oriented petrol models to plug-in hybrids. Icelandic buyers appreciate the long warranty support and readily available parts.',
    marketPosition:
      'The Tucson competes closely with the Kia Sportage and Mazda CX-5. Plug-in hybrid demand surged in 2024, lifting average prices for well-optioned Premium and Ultimate trims.',
    buyerHighlights: [
      'Five-year factory warranty transfers to second owners, adding confidence for used buyers.',
      'Heated steering wheels and remote start packages are highly sought after in Nordic climates.',
      'Plug-in hybrids enjoy favourable company car taxation, sustaining strong resale values.'
    ],
    considerations: [
      'Infotainment systems occasionally ship with region-locked navigation - confirm local map availability.',
      'Check for panel alignment on imports; minor cosmetic transport damage is common but negotiable.',
      'Adaptive cruise sensors require calibration after windshield replacements; verify service receipts.'
    ],
    competitorModels: ['Kia Sportage', 'Mazda CX-5', 'Toyota RAV4'],
    localized: {
      is: {
        heroTitle: 'Hyundai Tucson yfirlit fyrir kaupendur',
        overview:
          'Hyundai Tucson býður eitt fjölbreyttasta búnaðarúrvalið í millistærð crossover flokki, allt frá hagstæðum bensínlíkönum til tengiltvinnbíla. Íslenskir kaupendur kunna að meta langa ábyrgð og auðfáanlega varahluti.',
        marketPosition:
          'Tucson keppir beint við Kia Sportage og Mazda CX-5. Eftirspurn eftir tengiltvinn gerðum jókst árið 2024 og hækkaði meðalverð fyrir vel útbúna Premium og Ultimate útfærslur.',
        buyerHighlights: [
          'Fimm ára verksmiðjuábyrgð fylgir yfir til annarra eigenda og veitir öryggi á notuðum markaði.',
          'Upphituðir stýrisrimlar og fjartenging til ræsis eru mjög eftirsótt í norrænum aðstæðum.',
          'Tengiltvinn gerðir njóta hagstæðrar skattlagningar á fyrirtækjabílum og halda háu endursöluverði.',
        ],
        considerations: [
          'Upplýsingakerfi geta verið læst á ákveðnum markaðssvæðum; staðfestu að Íslandskort séu aðgengileg.',
          'Athugaðu spássíur og samskeyti á innfluttum bílum; smávægilegar flutningsrispur er hægt að nota í verðsamningi.',
          'Skynjarar fyrir aðlögun hraðastillingar þurfa stillingu eftir rúðuskipti; farðu yfir þjónustukvittanir.',
        ],
      },
    },
  },
  {
    makeSlug: 'toyota',
    modelSlug: 'rav4',
    displayMake: 'Toyota',
    displayModel: 'RAV4',
    makeQuery: 'toyota',
    modelQuery: 'rav4',
    heroTitle: 'Toyota RAV4 Used Market Insights',
    overview:
        'Honda Civics remain popular among Icelandic commuters seeking balanced efficiency and driving dynamics. Hatchback body styles dominate listings, while the latest generation\'s cabin upgrades broaden its appeal.',
    marketPosition:
      'RAV4 pricing competes directly with the Hyundai Tucson and Mazda CX-5, with Adventure and Trail trims pulling top-dollar due to rugged styling packages.',
    buyerHighlights: [
      'Toyota Safety Sense driver assists come standard on most imports after 2019, elevating perceived value.',
      'Panoramic roof models are scarce and can command an extra 200,000-300,000 ISK.',
      'Winter-ready accessories - engine block heaters, rubber mats, roof boxes - improve resale prospects.'
    ],
    considerations: [
      'Hybrid battery warranties vary by country of origin; confirm transferable coverage for peace of mind.',
      'Some grey imports lack Icelandic navigation language packs; budget for software updates if needed.',
      'Check for recalls related to fuel pump assemblies on older 2.5-litre models.'
    ],
    competitorModels: ['Hyundai Tucson', 'Mazda CX-5', 'Kia Sportage'],
    localized: {
      is: {
        heroTitle: 'Toyota RAV4 innsýn í notaðan markað',
        overview:
          'Toyota RAV4 er vinsæll fjölskyldubíll meðal þeirra sem þurfa áreiðanlegt fjórhjóladrif og fjölnota innanrými. Tvinnvélar eru ríkjandi í íslenskum auglýsingum og styðja áherslu landsins á sparneytni og lágar losunartölur.',
        marketPosition:
          'RAV4 keppir við Hyundai Tucson og Mazda CX-5 og Adventure samt Trail útfærslur ná hæsta verðinu vegna grófrar hönnunar.',
        buyerHighlights: [
          'Toyota Safety Sense er staðalbúnaður á flestum innfluttum bílum eftir 2019 og hækkar upplifun kaupenda.',
          'Gerðir með glerþaki eru fágætar og geta bætt 200.000-300.000 ISK á auglýsingaverð.',
          'Vetrarbúnaður eins og blokkheitarar, gúmmímottur og toppbox styrkir endursöluverð.',
        ],
        considerations: [
          'Athugaðu hvaðan bíllinn er upprunninn og hvort ábyrgð á tvinnrafhlöðu fylgi áfram.',
          'Sumir gráir innfluttir bílar vantar íslensk tungumálapakka í leiðsögukerfinu; reiknaðu með hugbúnaðaruppfærslu.',
          'Lesu eftirminntar upplýsingar um innköllun vegna eldsneytisdælna á eldri 2.5 lítra módelum.',
        ],
      },
    },
  },
  {
    makeSlug: 'honda',
    modelSlug: 'civic',
    displayMake: 'Honda',
    displayModel: 'Civic',
    makeQuery: 'honda',
    modelQuery: 'civic',
    heroTitle: 'Honda Civic Pricing Outlook',
    overview:
      'Honda Civics remain popular among Icelandic commuters seeking balanced efficiency and driving dynamics. Hatchback body styles dominate listings, while the latest generation\'s cabin upgrades broaden its appeal.',
    marketPosition:
      'The Civic sits between the Toyota Corolla and Mazda3 in both price and equipment. Sport trims with turbo engines attract enthusiasts without the insurance costs of full Type R models.',
    buyerHighlights: [
      'Turbocharged engines benefit from consistent oil change intervals - ask for receipts at 10,000 km intervals.',
      'Honda Sensing driver assists became standard from 2020 onward, reducing the value gap to premium rivals.',
      'Aftermarket wheel upgrades are common; inspect for curb damage and confirm tyre load ratings.'
    ],
    considerations: [
      'Road salt can impact rear subframe bolts - budget for preventative maintenance on older imports.',
      'Infotainment units prior to the 2021 refresh may feel dated; Apple CarPlay availability is a key selling point.',
      'Manual transmission models are rare; confirm service history if you find one.'
    ],
    competitorModels: ['Toyota Corolla', 'Mazda3', 'Volkswagen Golf'],
    localized: {
      is: {
        heroTitle: 'Honda Civic verðhorfur',
        overview:
          'Honda Civic er vinsæll hjá íslenskum farþegum sem vilja sparneytinn og skemmtilegan akstur. Hlaðbaksútfærslur ráða ríkjum í auglýsingum og nýjustu kynslóðin býður upp á uppfært innanrými.',
        marketPosition:
          'Civic situr á milli Toyota Corolla og Mazda3 í verði og búnaði. Sport útfærslur með túrbóvél laða að ökumenn án þess að hækka tryggingagjöld eins og Type R.',
        buyerHighlights: [
          'Túrbóvélar þurfa olíuskipti á 10.000 km fresti; biðja skal um kvittanir.',
          'Honda Sensing öryggispakki varð staðall frá 2020 og minnkar mun á milli Civic og dýrari samkeppnisaðila.',
          'Eftirmarkaðsfelgur eru algengar; skoðaðu nagladótt og hliðar á felgum eftir hnjaski.',
        ],
        considerations: [
          'Vetrarsalt getur haft áhrif á bolta í afturfjöðrun; forvarnarviðhald borgar sig á eldri innflutningi.',
          'Upplýsingakerfi fyrir 2021 geta virst úrelt; Apple CarPlay tenging er lykilatriði fyrir marga.',
          'Beinskiptar útgáfur eru sjaldgæfar; tryggðu góða þjónustusögu ef þú finnur slíkan bíl.',
        ],
      },
    },
  },
  {
    makeSlug: 'nissan',
    modelSlug: 'qashqai',
    displayMake: 'Nissan',
    displayModel: 'Qashqai',
    makeQuery: 'nissan',
    modelQuery: 'qashqai',
    heroTitle: 'Nissan Qashqai Buyer Guide',
    overview:
      'The Nissan Qashqai blends compact dimensions with crossover practicality, making it a frequent sight on Icelandic dealer lots. Recent e-Power hybrids add diesel-like torque without the maintenance overhead.',
    marketPosition:
      'The Qashqai competes with the Kia Sportage and Hyundai Tucson for suburban family buyers. Trim levels vary widely, so pay attention to equipment audits when comparing prices.',
    buyerHighlights: [
      'Tekna trims with 360-degree cameras and ProPILOT assist carry the strongest resale margins.',
      'Winter packages with heated windscreens are especially valuable for morning commuters.',
      'All-wheel-drive models are less common but remain desirable outside Reykjavik.'
    ],
    considerations: [
      'Older 1.2 DIG-T petrol engines can suffer timing chain stretch; inspect maintenance history closely.',
      'Some UK imports have speedometers in miles - verify digital display conversion.',
      'Check panoramic roof seals for water ingress after heavy storms.'
    ],
    competitorModels: ['Kia Sportage', 'Hyundai Tucson', 'Toyota RAV4'],
    localized: {
      is: {
        heroTitle: 'Nissan Qashqai kaupavísir',
        overview:
          'Nissan Qashqai sameinar handhæg mál og crossover eiginleika og er því algengur á íslenskum bílaplönum. Nýlegar e-Power tvinnvélar bjóða dísillíka togkrafta án flókins viðhalds.',
        marketPosition:
          'Qashqai keppir við Kia Sportage og Hyundai Tucson hjá fjölskyldum í úthverfum. Þar sem búnaðarstig eru mjög breytileg er mikilvægt að bera saman listasetningar áður en samið er.',
        buyerHighlights: [
          'Tekna útfærslur með 360 gráðu myndavélum og ProPILOT aðstoð halda hæstu endursölu.',
          'Vetrarbúnaður með upphituðum framrúðum er sérstaklega verðmætur fyrir morgunferðalangana.',
          'Fjórhjóladrifnar gerðir eru sjaldgæfari en eftirsóttar utan Reykjavíkur.',
        ],
        considerations: [
          'Eldri 1.2 DIG-T vélar geta fengið vandamál með tímakeðjur; farðu ítarlega yfir þjónustusögu.',
          'Sumir bílarnir frá Bretlandi hafa hraðamæli í mílum; staðfestu að hægt sé að skipta yfir í kílómetra.',
          'Athugaðu þétti við glerþök; vatnsleka kemur stundum upp eftir miklar rigningar.',
        ],
      },
    },
  },
  {
    makeSlug: 'kia',
    modelSlug: 'sportage',
    displayMake: 'Kia',
    displayModel: 'Sportage',
    makeQuery: 'kia',
    modelQuery: 'sportage',
    heroTitle: 'Kia Sportage Market Summary',
    overview:
      'The latest Kia Sportage resonates with Icelandic families by combining dramatic styling with generous standard equipment. Long warranties and efficient hybrid options drive strong demand on the secondary market.',
    marketPosition:
      'Sportage pricing lines up with the Hyundai Tucson and Toyota RAV4. Plug-in hybrids introduced in 2022 remain scarce and command top-tier asking prices.',
    buyerHighlights: [
      'Kia\'s seven-year warranty (subject to mileage limits) provides reassurance for second-hand buyers.',
      'Integrated roof rails and trailer prep packages are highly valued for weekend adventures.',
      'The curved dual-screen cockpit introduced in the fifth generation is a unique selling point versus rivals.'
    ],
    considerations: [
      'Ensure OTA software updates have been applied to avoid infotainment glitches.',
      'Tow ratings differ between petrol and hybrid variants - confirm paperwork before purchasing.',
      'Some EU imports ship without heated steering wheels; budget for retrofit kits if needed.'
    ],
    competitorModels: ['Hyundai Tucson', 'Toyota RAV4', 'Mazda CX-5'],
    localized: {
      is: {
        heroTitle: 'Kia Sportage markaðsyfirlit',
        overview:
          'Nýjasta kynslóð Kia Sportage höfðar til íslenskra fjölskyldna með áberandi hönnun og ríkulegum staðalbúnaði. Löng ábyrgð og hagkvæmir hybrid valkostir styðja við sterka eftirspurn á notaða markaðnum.',
        marketPosition:
          'Sportage stendur í sama verðflokki og Hyundai Tucson og Toyota RAV4. Tengiltvinn gerðir sem komu 2022 eru enn fátíðar og ná hæstu auglýsingaverðum.',
        buyerHighlights: [
          'Sjö ára ábyrgð Kia (háð kílómetramörkum) veitir notuðum kaupendum aukið öryggi.',
          'Samþættir þakbogar og dráttarbúnaður eru eftirsóttir fyrir helgarferðir og útilegur.',
          'Bogadregin tvískjáa innrétting fimmta kynslóðar Sportage er sérstaða miðað við samkeppni.',
        ],
        considerations: [
          'Vertu viss um að OTA hugbúnaðaruppfærslur hafi verið uppsettar til að forðast vandamál í upplýsingakerfi.',
          'Dráttargeta er mismunandi milli bensín- og hybrid útgáfa; farðu yfir skráningu áður en þú ræður.',
          'Sumar innfluttar gerðir vantar upphituð stýri; meta þarf kostnað við eftirmontering ef þörf er á.',
        ],
      },
    },
  }
];
