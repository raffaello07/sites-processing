/* eslint-disable @typescript-eslint/no-unused-vars */
import { invokeLambda } from '@legacydevteam/adn_wl_common';
import fs from 'fs';
import csv from 'csv-parser';
import { FindAllPayload } from './@types/models';
import { Site, RawSite } from './@types/site';
import { FuneralHome } from './@types/funeralHome';
import { getRegion } from './helpers';

interface SiteAndFH {
  site: Site;
  funeralHome: FuneralHome;
}
interface RawSiteAndFH {
  City: string;
  Country: string;
  Domain: string;
  FHID: string;
  Funeral_Home_Name: string;
  State_Abbreviation: string;
  URL: string;
}
interface MigrateFunctions<T, U> {
  insertRow: (row: U) => Promise<U>;
  mapRow: (row: T) => U;
  validateRow: (row: T) => boolean;
}

interface MigrateCSVPayload<T, U> {
  csvPath: string;
  migrateFunctions: MigrateFunctions<T, U>;
}

interface MigrateRecordPayload<T, U> {
  migrateFunctions: MigrateFunctions<T, U>;
  row: T;
}

const COUNTRIES = {
  USA: 'United States',
};

export const findByDomain = async (domain): Promise<Site | null> => {
  const payload = {
    className: 'Site',
    where: { url: { $regexp: domain } },
  };
  const params = {
    functionName: 'adn-wl-data-db-dev-apiGetAllObjects',
    region: 'us-east-1',
    payload,
  };
  const result = await invokeLambda(params);
  return result && result.count ? result.rows[0] : null;
};

export const saveSite = async (site: Site): Promise<Site | null> => {
  try {
    const sitesInDbResponse = await findByDomain(site.domain);
    if (sitesInDbResponse) {
      return sitesInDbResponse;
    }
    const payload = {
      className: 'Site',
      body: { ...site, domain: undefined },
    };
    const params = {
      functionName: 'adn-wl-data-db-dev-apiCreateObject',
      region: 'us-east-1',
      payload,
    };
    const response: Site = await invokeLambda(params);
    return response;
  } catch (err) {
    console.error('Error inserting', site.url, err);
    return null;
  }
};

export const saveFH = async (fh: FuneralHome): Promise<FuneralHome | null> => {
  try {
    const payload = {
      className: 'FuneralHome',
      body: fh,
    };
    const params = {
      functionName: 'adn-wl-data-db-dev-apiCreateObject',
      region: 'us-east-1',
      payload,
    };
    const response: FuneralHome = await invokeLambda(params);
    return response;
  } catch (err) {
    console.error('Error inserting', fh.name, err);
    return null;
  }
};

export const migrateRecord = async <T, U>({
  row,
  migrateFunctions: { validateRow, mapRow, insertRow },
}: MigrateRecordPayload<T, U>): Promise<U> => {
  if (!validateRow(row)) {
    return null;
  }
  const mappedRecord = mapRow(row);
  const instertedRecord = await insertRow(mappedRecord);
  return instertedRecord;
};

export const insertSiteAndFh = async (
  siteAndFh: SiteAndFH,
): Promise<SiteAndFH> => {
  const site = await saveSite(siteAndFh.site);

  const funeralHome = await saveFH({
    ...siteAndFh.funeralHome,
    siteId: site.id,
  });
  return { site, funeralHome };
};

export const getDataFromCSV = async <T, U>({
  csvPath,
  migrateFunctions: { insertRow, mapRow, validateRow },
}: MigrateCSVPayload<T, U>): Promise<U[]> => {
  const rawData: U[] = [];
  await new Promise((resolve) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', async (row: T) => {
        rawData.push(
          await migrateRecord({
            row,
            migrateFunctions: { validateRow, mapRow, insertRow },
          }),
        );
      })
      .on('end', () => {
        resolve();
      });
  });
  return rawData;
};
// LegacyPro	FHID	Funeral Home Name	Address	Address2	City	State	State Abbreviation	Postal Code	Country	URL	Domain	WL id	WL designer version	WL region	WL site	WL city	WL State
const validateFHandSite = (row: RawSiteAndFH): boolean =>
  !!(
    row &&
    row.URL &&
    row.Funeral_Home_Name &&
    row.Domain &&
    row.FHID &&
    row.State_Abbreviation &&
    row.Country.trim() === COUNTRIES.USA &&
    row.Domain.trim() !== 'dignitymemorial.com'
  );
const mapSiteAndFHFromRow = (row: RawSiteAndFH): SiteAndFH => ({
  site: {
    city: row.City,
    designerVersionId: 1,
    domain: row.Domain,
    legacySiteId: null,
    name: row.Domain,
    state: row.State_Abbreviation,
    url: new URL(row.URL).origin,
    regionId: getRegion(row.State_Abbreviation),
  },
  funeralHome: {
    legacyFhId: Number(row.FHID),
    city: row.City,
    name: row.Funeral_Home_Name,
    state: row.State_Abbreviation,
    siteId: 0,
  },
});

export const migrateSitesAndFHFromCSV = async (
  csvPath: string,
): Promise<SiteAndFH[]> => {
  const sitesAndFh = await getDataFromCSV<RawSiteAndFH, SiteAndFH>({
    csvPath,
    migrateFunctions: {
      insertRow: insertSiteAndFh,
      mapRow: mapSiteAndFHFromRow,
      validateRow: validateFHandSite,
    },
  });
  return sitesAndFh;
};
