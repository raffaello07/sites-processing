/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { invokeLambda } from '@legacydevteam/adn_wl_common';
import fs from 'fs';
import csv from 'csv-parser';
import { FindAllPayload } from './@types/models';
import { Site, RawSite } from './@types/site';
import { FuneralHome } from './@types/funeralHome';
import { getRegion } from './helpers';
import {
  findAllFunction,
  defaultRegion,
  createFunction,
  findSiteReg,
  saveSiteUrlReg,
  findHttpProtocol,
} from './constants';

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

const MODELS = {
  Site: 'Site',
  FuneralHome: 'FuneralHome',
};

export const findOneBy = async ({
  className,
  where,
}: {
  className: string;
  where: any;
}): Promise<any | null> => {
  const payload = {
    className,
    where,
  };
  const params = {
    functionName: findAllFunction,
    region: defaultRegion,
    payload,
  };
  const result = await invokeLambda(params);
  return result && result.count ? result.rows[0] : null;
};

export const saveRecord = async ({
  className,
  where,
  body,
}: {
  className: string;
  where: any;
  body: any;
}): Promise<any | null> => {
  try {
    console.log('[INFO] saving..', JSON.stringify(body, null, 2));
    const recordInDb = await findOneBy({ className, where });
    if (recordInDb) {
      return recordInDb;
    }
    const payload = {
      className,
      body,
    };
    const params = {
      functionName: createFunction,
      region: defaultRegion,
      payload,
    };
    const response = await invokeLambda(params);
    return response;
  } catch (err) {
    console.error('Error inserting', err);
    console.error(JSON.stringify(body, null, 2));
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
  let [urlToFind] = siteAndFh.site.url.match(new RegExp(findSiteReg));
  urlToFind = urlToFind.replace('www.', '');
  const [urlToSave] = siteAndFh.site.url.match(new RegExp(saveSiteUrlReg));
  const site = await saveRecord({
    body: { ...siteAndFh.site, domain: undefined, url: urlToSave },
    className: MODELS.Site,
    where: { url: { $iRegexp: urlToFind } },
  });

  const funeralHome = await saveRecord({
    body: {
      ...siteAndFh.funeralHome,
      siteId: site.id,
    },
    className: MODELS.FuneralHome,
    where: { legacyFhId: siteAndFh.funeralHome.legacyFhId },
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
    row.Country.trim() === COUNTRIES.USA
  );
const mapSiteAndFHFromRow = (row: RawSiteAndFH): SiteAndFH => ({
  site: {
    city: row.City.trim(),
    designerVersionId: 1,
    domain: row.Domain.trim(),
    legacySiteId: null,
    name: row.Domain.trim(),
    state: row.State_Abbreviation.trim(),
    url: row.URL.match(new RegExp(findHttpProtocol))
      ? row.URL.trim()
      : `http://${row.URL}`,
    regionId: getRegion(row.State_Abbreviation.trim()),
  },
  funeralHome: {
    legacyFhId: row.FHID.trim(),
    city: row.City.trim(),
    name: row.Funeral_Home_Name.trim(),
    state: row.State_Abbreviation.trim(),
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
