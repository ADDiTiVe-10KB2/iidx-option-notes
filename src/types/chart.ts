export type ChartType = "SPN" | "SPH" | "SPA" | "SPL";

export type PlayOption =
  | "REGULAR"
  | "MIRROR"
  | "RANDOM"
  | "S_RANDOM"
  | "R_RANDOM";

export interface ChartMemo {
  id: string;
  title: string;
  aliases: string[];
  chart: ChartType;
  cleared: boolean;
  recommendedOptions: PlayOption[];
  avoidOptions: PlayOption[];
  normalGreenNumber: string;
  startGreenNumber: string;
  changedGreenNumber: string;
  gearChangeNote: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export const CHART_TYPES: ChartType[] = ["SPN", "SPH", "SPA", "SPL"];

export const PLAY_OPTIONS: PlayOption[] = [
  "REGULAR",
  "MIRROR",
  "RANDOM",
  "S_RANDOM",
  "R_RANDOM",
];

export const OPTION_LABELS: Record<PlayOption, string> = {
  REGULAR: "正",
  MIRROR: "M",
  RANDOM: "R",
  S_RANDOM: "SR",
  R_RANDOM: "RR",
};

/** localStorageに保存する形式 */
export interface StoredData {
  schemaVersion: number;
  charts: ChartMemo[];
}

/** バックアップファイルの形式 */
export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  charts: ChartMemo[];
}

/** localStorage破損時の警告情報 */
export interface StorageWarning {
  type: "corrupt" | "unknown_schema";
  recoveryKey?: string;
  message: string;
}
