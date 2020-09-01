import fs from 'fs';
import { findInDB } from './common';

const toDb = true;

const statesRegion = [
  { state: 'FL', region: 1 },
  { state: 'SC', region: 1 },
  { state: 'GA', region: 1 },
  { state: 'MS', region: 1 },
  { state: 'WV', region: 1 },
  { state: 'VA', region: 1 },
  { state: 'MI', region: 1 },
  { state: 'OH', region: 1 },
  { state: 'IN', region: 1 },
  { state: 'ME', region: 1 },
  { state: 'NH', region: 1 },
  { state: 'VT', region: 1 },
  { state: 'NY', region: 1 },
  { state: 'MA', region: 1 },
  { state: 'RI', region: 1 },
  { state: 'CT', region: 1 },
  { state: 'NJ', region: 1 },
  { state: 'PA', region: 1 },
  { state: 'DE', region: 1 },
  { state: 'MD', region: 1 },
  { state: 'DC', region: 1 },
  { state: 'NC', region: 1 },

  { state: 'WI', region: 2 },
  { state: 'ND', region: 2 },
  { state: 'MN', region: 2 },
  { state: 'SD', region: 2 },
  { state: 'IA', region: 2 },
  { state: 'IL', region: 2 },
  { state: 'KS', region: 2 },
  { state: 'MO', region: 2 },
  { state: 'NE', region: 2 },
  { state: 'KY', region: 2 },
  { state: 'OK', region: 2 },
  { state: 'AR', region: 2 },
  { state: 'TN', region: 2 },
  { state: 'AL', region: 2 },
  { state: 'TX', region: 2 },
  { state: 'LA', region: 2 },

  { state: 'MT', region: 3 },
  { state: 'ID', region: 3 },
  { state: 'WY', region: 3 },
  { state: 'UT', region: 3 },
  { state: 'CO', region: 3 },
  { state: 'AZ', region: 3 },
  { state: 'NM', region: 3 },

  { state: 'WA', region: 4 },
  { state: 'OR', region: 4 },
  { state: 'NV', region: 4 },
  { state: 'CA', region: 4 },
];


(async () => {
  const rawdata = fs.readFileSync('sites.json');
  const sites = JSON.parse(rawdata);
  // console.log(sites.length);
  let newSites = sites.map((oneSite) => {
    const theNewSite = { ...oneSite };
    theNewSite.State = theNewSite.State.replace(' ', '');
    const urlObj = new URL(oneSite.URL);
    const region = statesRegion.find((reg) => reg.state == theNewSite.State);
    theNewSite.URL = urlObj.origin;
    theNewSite.regionId = region ? region.region : 1;
    if (!region) {
      console.error('No region for ', oneSite);
    }
    return theNewSite;
  });
  const seen = new Set();
  newSites = newSites.filter((oneSiete) => {
    const duplicate = seen.has(oneSiete.URL);
    seen.add(oneSiete.URL);
    if (duplicate) {
      console.error('Duplicated: ', oneSiete.URL);
    }
    return !duplicate;
  });
  console.log(
    `Total unique sites ${newSites.length}, duplicates ${
    sites.length - newSites.length
    }`,
  );

  if (toDb) {
    let promises = [];
    for (const oneFSite of newSites) {
      promises.push(saveToDb(oneFSite));
      if (promises.length > 30) {
        await Promise.all(promises);
        console.log(`[INFO] ${promises.length} site(s) inserted`);
        promises = [];
      }
    }
    if (promises.length) {
      await Promise.all(promises);
      console.log(`[INFO] ${promises.length} site(s) inserted`);
      promises = [];
    }
    if (alreadyInDB.length) {
      fs.writeFileSync('alreadyindb-sites.json', JSON.stringify(alreadyInDB));
    }
  }
  const data = JSON.stringify(newSites);
  fs.writeFileSync('proecessed-sites.json', data);
  fs.writeFileSync(
    'sites-list.json',
    JSON.stringify(newSites.map((item) => item.URL)),
  );
})();
