import { migrateSitesAndFHFromCSV } from './common';

(async (): Promise<void> => {
  await migrateSitesAndFHFromCSV('../resources/list.csv');
})();
