import { createRhythm, createTag } from '../db/storage';

interface RhythmData {
  primaryName: string;
  alternateNames: string[];
  regions: string[];
  ethnicGroups: string[];
  languages: string[];
  lyrics: string;
  lyricsTranslation: string;
  notes: string;
}

const rhythmsData: RhythmData[] = [
  {
    primaryName: "Kuku",
    alternateNames: [],
    regions: ["Guinea"],
    ethnicGroups: ["Manya"],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Occasion: Women celebrating good fishing harvest"
  },
  {
    primaryName: "Bassa",
    alternateNames: [],
    regions: ["Liberia"],
    ethnicGroups: [],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Rhythm description: slap slap, tone tone\n\nPrecursor to kuku, very fast"
  },
  {
    primaryName: "Badi",
    alternateNames: ["Didadi"],
    regions: ["Sikasso"],
    ethnicGroups: ["Bamana"],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Occasion: Festivals, general celebration\n\nInstruments: Konkonee, Badi\n\nBadi also the name of the dundunba like drum for didadi (plays solo)"
  },
  {
    primaryName: "Djeli foli",
    alternateNames: ["Lamban", "Sandia"],
    regions: [],
    ethnicGroups: [],
    languages: [],
    lyrics: `A djeli aaa-aa
Ala leka djeli aa-daaa
Ala leka mansa yaaa-daa
Tama tari yaaa tara ahh`,
    lyricsTranslation: `The state of being a djeli
God created the mouth of the djeli
God created the mouth of the king`,
    notes: "Instruments: Balafone, Kora, Djeli dundunba, Djeli ingoni\n\nDjeli (griot), song about being djeli"
  },
  {
    primaryName: "Madan",
    alternateNames: [],
    regions: ["Mali", "Guinea"],
    ethnicGroups: ["Solinke"],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Occasion: Harvest, festivals\n\nRhythm description:\nTa tata toto\nGin toto gin ta\n\nBreak #1"
  },
  {
    primaryName: "Koruduga",
    alternateNames: [],
    regions: [],
    ethnicGroups: [],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Rhythm description: tone slap over and over\n\nChallenging, in 6"
  },
  {
    primaryName: "Gbe gbe",
    alternateNames: [],
    regions: ["Ivory Coast"],
    ethnicGroups: [],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: ""
  },
  {
    primaryName: "Soli",
    alternateNames: ["Suku", "Donba"],
    regions: ["Mali", "Senegal", "Guinea", "Mandingo"],
    ethnicGroups: ["Malinke"],
    languages: [],
    lyrics: `Soooliyayaaa mandeee
Mande soooliyayaaa mandeee`,
    lyricsTranslation: "",
    notes: "Occasion: Started as boys circumcision rhythm, mens rights of passage, now played for lots of celebration (weddings, etc)\n\nRhythm description: Break #2, tatota, left to the right; first, second, marching, offset, 2 bass slaps; Pop goes the weasel; Gin (left) ta tota gin (right) taototota\n\nSuku in Mali, Donba in Senegal, Mali (Malinke), Guinea, Senegal; throughout Mandingo - Mali, Guinea, Senegal; donba means big dance; Different than furasoli/solifura"
  },
  {
    primaryName: "Soli fura",
    alternateNames: ["Fura soli"],
    regions: ["Mali"],
    ethnicGroups: ["Malinke"],
    languages: [],
    lyrics: `Layla, musonya lende
Layla, odentesirana (ends with break)`,
    lyricsTranslation: `There is nothing but God
The son of a good woman should not be scared`,
    notes: "Occasion: Traditionally played for boys right of passage, circumcision\n\nRhythm description:\nBreak #1, Ta tata toto, Toto to gin ta\n\nSolos:\nTatata toto tatata gingin\nTatata toto tatata gintagin\nGin--ta tatoto gin ta--ta"
  },
  {
    primaryName: "Solinke",
    alternateNames: ["Soninke"],
    regions: [],
    ethnicGroups: ["Solinke"],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: ""
  },
  {
    primaryName: "Degu Degu",
    alternateNames: [],
    regions: [],
    ethnicGroups: [],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Rhythm description:\nTatatoto\nTatata toto\nTatatata toto"
  },
  {
    primaryName: "Woloso",
    alternateNames: [],
    regions: ["Mali"],
    ethnicGroups: [],
    languages: [],
    lyrics: `Mabengajonya
Dokahonronya
Neebengajonyaife
Dokahonronya`,
    lyricsTranslation: "",
    notes: "Rhythm description: Totabinta Tatatotota\n\nAbout knowing where you come from; Kai region; Kasonke dundun; Similar region; Maraca (ethnic group)/take"
  },
  {
    primaryName: "Sunu",
    alternateNames: [],
    regions: [],
    ethnicGroups: [],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Named after a woman who was a great dancer, they named rhythm after her when she passed"
  },
  {
    primaryName: "Yamama",
    alternateNames: [],
    regions: ["Guinea"],
    ethnicGroups: [],
    languages: [],
    lyrics: "Yamadu yee Yamadu yee bonsu Yamadu yee bonsu",
    lyricsTranslation: "",
    notes: "Masked dance. Mask represents femininity, protecting of children"
  },
  {
    primaryName: "Sosone",
    alternateNames: [],
    regions: ["Guinea"],
    ethnicGroups: ["Baga people"],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "6 timing; Kakilambe?"
  },
  {
    primaryName: "Tansole",
    alternateNames: [],
    regions: [],
    ethnicGroups: ["Bamana"],
    languages: [],
    lyrics: `Minyennakanuni mana sinyenakamuni denta
Dugu lamini dabora Two birds`,
    lyricsTranslation: "The one who can stay up until midnight should not compare to the one who stays up all night",
    notes: "Rhythm description: Break #1\n\nAdapted from comofoli (como was a mask associated with a secret society of men)"
  },
  {
    primaryName: "Mane",
    alternateNames: [],
    regions: [],
    ethnicGroups: ["Susu"],
    languages: [],
    lyrics: `Iradie...iradie
Gine bere sinera dira`,
    lyricsTranslation: "Daddy's little girl all grown up",
    notes: "Occasion: Often played for weddings"
  },
  {
    primaryName: "Manjani",
    alternateNames: [],
    regions: ["Guinea", "Mali"],
    ethnicGroups: ["Malinke"],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Occasion: Coming of age, pre-adolescence girls\n\nDenadon is precursor dance, girls on men's shoulders dancing; bring to center and then dance manjani"
  },
  {
    primaryName: "Koteba",
    alternateNames: [],
    regions: [],
    ethnicGroups: ["Segu"],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Rhythm description: Tatatatoto\n\nKoteba means big snail"
  },
  {
    primaryName: "Farabakan",
    alternateNames: [],
    regions: [],
    ethnicGroups: [],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Sound of faraban (village). Dekudeku Ngri/ wasolonka - sound of wasolon (village/people)"
  },
  {
    primaryName: "Guinea fare",
    alternateNames: [],
    regions: [],
    ethnicGroups: [],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: "Guinea fare means women dance"
  },
  {
    primaryName: "Egedege",
    alternateNames: [],
    regions: [],
    ethnicGroups: ["Igbo"],
    languages: [],
    lyrics: "",
    lyricsTranslation: "",
    notes: ""
  }
];

export async function importRhythmsData(): Promise<void> {
  console.log('Starting import of rhythm data...');

  for (const data of rhythmsData) {
    try {
      // Create primary name tag
      const primaryTag = await createTag('rhythmName', data.primaryName);

      // Create alternate name tags
      const alternateTagIds: string[] = [];
      for (const name of data.alternateNames) {
        const tag = await createTag('rhythmName', name);
        alternateTagIds.push(tag.id);
      }

      // Create region tags
      const regionTagIds: string[] = [];
      for (const region of data.regions) {
        const tag = await createTag('region', region);
        regionTagIds.push(tag.id);
      }

      // Create ethnic group tags
      const ethnicGroupTagIds: string[] = [];
      for (const group of data.ethnicGroups) {
        const tag = await createTag('ethnicGroup', group);
        ethnicGroupTagIds.push(tag.id);
      }

      // Create language tags
      const languageTagIds: string[] = [];
      for (const language of data.languages) {
        const tag = await createTag('language', language);
        languageTagIds.push(tag.id);
      }

      // Create the rhythm
      await createRhythm({
        primaryRhythmNameTag: primaryTag.id,
        alternateRhythmNameTags: alternateTagIds,
        regionTags: regionTagIds,
        ethnicGroupTags: ethnicGroupTagIds,
        occasionTags: [], // No longer using occasion tags
        languageTags: languageTagIds,
        lyrics: data.lyrics,
        lyricsTranslation: data.lyricsTranslation,
        notes: data.notes,
        recordingIds: []
      });

      console.log(`✓ Imported: ${data.primaryName}`);
    } catch (error) {
      console.error(`✗ Failed to import ${data.primaryName}:`, error);
    }
  }

  console.log('Import complete!');
}
