/*
 * Títulos reais da NFL de cada franquia (até o Super Bowl LX, fev/2026), ligados ao time do jogo pelo
 * id (BUF = Buffalo, LAR = LA Vams, NYJ = NY Jits...). Os anos do Super Bowl são o do jogo (o ano
 * seguinte à temporada); os do NFL e AFL são o da temporada. No jogo, o Super Bowl é o QFL Bowl.
 *  - sb:  vencedor do Super Bowl;
 *  - nfl: títulos da liga fora do Super Bowl (era pré-Super Bowl, 1920-65, e as finais de 1968 e 1969);
 *  - afl: títulos da AFL (1960-69).
 */
export interface RealTitles {
  sb: number[];
  nfl: number[];
  afl: number[];
}

const t = (sb: number[] = [], nfl: number[] = [], afl: number[] = []): RealTitles => ({ sb, nfl, afl });

export const REAL_TITLES: Record<string, RealTitles> = {
  buf: t([], [], [1964, 1965]),
  mia: t([1973, 1974]),
  ne: t([2002, 2004, 2005, 2015, 2017, 2019]),
  nyj: t([1969]),
  bal: t([2001, 2013]),
  cin: t(),
  cle: t([], [1950, 1954, 1955, 1964]),
  pit: t([1975, 1976, 1979, 1980, 2006, 2009]),
  hou: t(),
  ind: t([1971, 2007], [1958, 1959, 1968]),
  jax: t(),
  ten: t([], [], [1960, 1961]),
  den: t([1998, 1999, 2016]),
  kc: t([1970, 2020, 2023, 2024], [], [1962, 1966, 1969]),
  lv: t([1977, 1981, 1984], [], [1967]),
  lac: t([], [], [1963]),
  dal: t([1972, 1978, 1993, 1994, 1996]),
  nyg: t([1987, 1991, 2008, 2012], [1927, 1934, 1938, 1956]),
  phi: t([2018, 2025], [1948, 1949, 1960]),
  was: t([1983, 1988, 1992], [1937, 1942]),
  chi: t([1986], [1921, 1932, 1933, 1940, 1941, 1943, 1946, 1963]),
  det: t([], [1935, 1952, 1953, 1957]),
  gb: t([1967, 1968, 1997, 2011], [1929, 1930, 1931, 1936, 1939, 1944, 1961, 1962, 1965]),
  min: t([], [1969]),
  atl: t(),
  car: t(),
  no: t([2010]),
  tb: t([2003, 2021]),
  ari: t([], [1925, 1947]),
  lar: t([2000, 2022], [1945, 1951]),
  sf: t([1982, 1985, 1989, 1990, 1995]),
  sea: t([2014, 2026]),
};

export const realTitles = (id: string): RealTitles => REAL_TITLES[id] ?? t();
