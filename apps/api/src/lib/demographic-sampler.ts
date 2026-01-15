export type TechSavviness = "beginner" | "intermediate" | "advanced";
export type IncomeLevel = "low" | "medium" | "high";
export type AccessibilityNeed =
  | "none"
  | "low_vision"
  | "colorblind"
  | "screen_reader"
  | "motor_reduced";
export type DeviceType = "desktop" | "mobile" | "tablet";
export type Region =
  | "North America"
  | "South America"
  | "Europe"
  | "Africa"
  | "Asia"
  | "Oceania";

export type WeightedOption<T extends string> = {
  value: T;
  weight: number;
};

export type AgeRange = {
  label: string;
  min: number;
  max: number;
  weight: number;
};

export type DemographicDistribution = {
  ageRanges: AgeRange[];
  techSavviness: Array<WeightedOption<TechSavviness>>;
  incomeLevel: Array<WeightedOption<IncomeLevel>>;
  accessibility: Array<WeightedOption<AccessibilityNeed>>;
  device: Array<WeightedOption<DeviceType>>;
  regions: Array<WeightedOption<Region>>;
};

export type DemographicSample = {
  age: number;
  ageRange: AgeRange;
  techSavviness: TechSavviness;
  incomeLevel: IncomeLevel;
  accessibility: AccessibilityNeed;
  device: DeviceType;
  region: Region;
};

const DEFAULT_DISTRIBUTION: DemographicDistribution = {
  ageRanges: [
    { label: "18-25", min: 18, max: 25, weight: 18 },
    { label: "26-35", min: 26, max: 35, weight: 28 },
    { label: "36-50", min: 36, max: 50, weight: 30 },
    { label: "51-65", min: 51, max: 65, weight: 16 },
    { label: "66+", min: 66, max: 80, weight: 8 },
  ],
  techSavviness: [
    { value: "beginner", weight: 25 },
    { value: "intermediate", weight: 50 },
    { value: "advanced", weight: 25 },
  ],
  incomeLevel: [
    { value: "low", weight: 25 },
    { value: "medium", weight: 50 },
    { value: "high", weight: 25 },
  ],
  accessibility: [
    { value: "none", weight: 85 },
    { value: "low_vision", weight: 5 },
    { value: "colorblind", weight: 5 },
    { value: "screen_reader", weight: 3 },
    { value: "motor_reduced", weight: 2 },
  ],
  device: [
    { value: "desktop", weight: 50 },
    { value: "mobile", weight: 40 },
    { value: "tablet", weight: 10 },
  ],
  regions: [
    { value: "North America", weight: 28 },
    { value: "Europe", weight: 24 },
    { value: "Asia", weight: 24 },
    { value: "South America", weight: 10 },
    { value: "Africa", weight: 10 },
    { value: "Oceania", weight: 4 },
  ],
};

function weightedPick<T extends string>(options: Array<WeightedOption<T>>): T {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  const roll = Math.random() * total;
  let current = 0;
  for (const option of options) {
    current += option.weight;
    if (roll <= current) {
      return option.value;
    }
  }
  return options[options.length - 1].value;
}

function weightedPickAgeRange(ranges: AgeRange[]): AgeRange {
  const total = ranges.reduce((sum, range) => sum + range.weight, 0);
  const roll = Math.random() * total;
  let current = 0;
  for (const range of ranges) {
    current += range.weight;
    if (roll <= current) {
      return range;
    }
  }
  return ranges[ranges.length - 1];
}

function randomAgeInRange(range: AgeRange): number {
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

export function mergeDemographicDistribution(
  overrides?: Partial<DemographicDistribution>
): DemographicDistribution {
  if (!overrides) {
    return DEFAULT_DISTRIBUTION;
  }

  return {
    ageRanges: overrides.ageRanges || DEFAULT_DISTRIBUTION.ageRanges,
    techSavviness: overrides.techSavviness || DEFAULT_DISTRIBUTION.techSavviness,
    incomeLevel: overrides.incomeLevel || DEFAULT_DISTRIBUTION.incomeLevel,
    accessibility: overrides.accessibility || DEFAULT_DISTRIBUTION.accessibility,
    device: overrides.device || DEFAULT_DISTRIBUTION.device,
    regions: overrides.regions || DEFAULT_DISTRIBUTION.regions,
  };
}

export function sampleDemographics(
  overrides?: Partial<DemographicDistribution>
): DemographicSample {
  const distribution = mergeDemographicDistribution(overrides);
  const ageRange = weightedPickAgeRange(distribution.ageRanges);
  return {
    age: randomAgeInRange(ageRange),
    ageRange,
    techSavviness: weightedPick(distribution.techSavviness),
    incomeLevel: weightedPick(distribution.incomeLevel),
    accessibility: weightedPick(distribution.accessibility),
    device: weightedPick(distribution.device),
    region: weightedPick(distribution.regions),
  };
}
