import { describe, expect, it } from 'vitest';
import { parseReports } from '../src/data/reports';
import { groupLocations } from '../src/data/locations';
import { cityOf, citiesOf } from '../src/geo/city';
import { readReportCsv } from './helpers/fixtures';

const { rows } = parseReports(readReportCsv());

describe('city extraction', () => {
  it('reads the leading city token of an exact address', () => {
    expect(cityOf('台南市中西區民生路二段5號3樓')).toBe('台南市');
    expect(cityOf('新竹市東區光復路一段12號')).toBe('新竹市');
    expect(cityOf('台北市中山區南京東路二段101號')).toBe('台北市');
  });

  it('covers all seven cities present in the data', () => {
    const cities = citiesOf(groupLocations(rows));

    expect([...cities].sort()).toEqual(
      ['台中市', '台北市', '台南市', '新北市', '新竹市', '桃園市', '高雄市'].sort(),
    );
  });
});
