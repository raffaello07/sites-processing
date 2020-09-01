import { migrateSitesAndFHFromCSV } from './common';

(async (): Promise<void> => {
  const result = await migrateSitesAndFHFromCSV('./resources/list.csv');
  console.log(JSON.stringify(result, null, 2));
})();
