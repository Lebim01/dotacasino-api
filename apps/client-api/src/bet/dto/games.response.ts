export interface GamesApiResponse {
  gameLabels: string[];
  gameTitles: string[];
  gameList: Game[];
}

export interface Game {
  id: string;
  name: string;
  name_cn: string;
  name_kr: string;
  img: string;
  label: string;
  device: string;
  title: string;
  categories: string;
  flash: string;
  vertical: string;
  bm: string;
  demo: string;
  localhost: string;
  rewriterule: string;
  lines: string;
  width: string;
  wager: string;
  bonus: string;
  exitButton: string;
  disableReload: string;
  menu: string;
  system_name2: string;
}
