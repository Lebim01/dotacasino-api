export interface HistoryApiResponse {
  status: "success" | "error";
  microtime: number;
  dateTime: string;
  error: string;
  content: {
    info: {
      page: number;
      count: number;
      pages: number;
    };
    log: LogEntry[];
  };
}

export interface LogEntry {
  id: number;
  status: number;
  BetInfo: string;
  gameId: string;
  gameName: string;
  gameProvider: string;
  cdn: string;
  before: string;
  bet: string;
  win: string;
  dateTime: string;
  matrix: string;
  winLines: string;
  actionId: string;
}