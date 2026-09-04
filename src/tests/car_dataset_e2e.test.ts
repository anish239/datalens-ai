import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseCsvBuffer,
  profileDatasetContent,
} from '../server/datasets/datasetService';
import {
  computeDeterministicColumnStats,
  computeDeterministicCorrelation,
  computeDeterministicGroupBy,
  computeDeterministicOutliers,
} from '../services/deterministicMath';
import {
  validateMlTask,
  trainAndEvaluateModel,
  predictWithModel,
  performWhatIfScenario,
} from '../services/deterministicMl';
import { runAiAnalyst } from '../server/ai/orchestrator';

// Real Car Dekho sample data for End-to-End verification
const SAMPLE_CAR_CSV = `name,year,selling_price,km_driven,fuel,seller_type,transmission,owner,seats
Maruti Swift Dzire VDI,2014,450000,145500,Diesel,Individual,Manual,First Owner,5
Skoda Rapid 1.5 TDI Ambition,2014,370000,120000,Diesel,Individual,Manual,Second Owner,5
Honda City 2017-2020 EXi,2006,158000,140000,Petrol,Individual,Manual,Third Owner,5
Hyundai i20 Sportz Diesel,2010,225000,127000,Diesel,Individual,Manual,First Owner,5
Maruti Swift VXI BSIII,2007,130000,120000,Petrol,Individual,Manual,First Owner,5
Hyundai Verna 1.6 SX,2012,440000,60000,Diesel,Individual,Manual,First Owner,5
Maruti Wagon R LXI DUO BSIII,2010,96000,175000,LPG,Individual,Manual,First Owner,5
Toyota Corolla Altis D-4D GL,2011,500000,120000,Diesel,Individual,Manual,First Owner,5
Hyundai Creta 1.6 CRDi SX Option,2019,1400000,41000,Diesel,Individual,Manual,First Owner,5
Ford EcoSport 1.5 Diesel Titanium BSIV,2017,700000,68000,Diesel,Individual,Manual,First Owner,5
Hyundai Grand i10 Magna,2014,350000,45000,Petrol,Individual,Manual,First Owner,5
BMW 5 Series 520d Luxury Line,2018,3400000,35000,Diesel,Dealer,Automatic,First Owner,5
Toyota Fortuner 2.8 4x2 AT,2017,2600000,70000,Diesel,Dealer,Automatic,First Owner,7
Mahindra Scorpio S10 7 Seater,2015,820000,80000,Diesel,Individual,Manual,First Owner,7
Honda Civic 1.8V AT,2011,280000,90000,Petrol,Individual,Automatic,Second Owner,5
Tata Tiago 1.2 Revotron XZ,2018,480000,32000,Petrol,Individual,Manual,First Owner,5
Audi A6 35 TDI Matrix,2019,4000000,25000,Diesel,Dealer,Automatic,First Owner,5
Mercedes-Benz E-Class E220d,2017,3500000,40000,Diesel,Dealer,Automatic,First Owner,5
Maruti Baleno Delta 1.2,2018,530000,38000,Petrol,Individual,Manual,First Owner,5
Renault Duster 85PS Diesel RxL,2013,380000,110000,Diesel,Individual,Manual,Second Owner,5`;

describe('Part 14: Car Market Dataset End-to-End Acceptance Test', () => {
  const TEST_USER = 'usr_car_analyst_001';
  const DATASET_ID = 'ds_car_dekho_test';
  let carProfile: any;

  beforeEach(() => {
    // 1. Ingestion of raw CSV Buffer
    const buffer = Buffer.from(SAMPLE_CAR_CSV, 'utf-8');
    const rawData = parseCsvBuffer(buffer);
    carProfile = profileDatasetContent(
      DATASET_ID,
      TEST_USER,
      'Car Market Trends Analysis with Car Dekho Data.csv',
      'csv',
      buffer.length,
      rawData
    );
  });

  it('1. Ingests and profiles Car Market dataset with accurate types and statistics', () => {
    expect(carProfile.datasetId).toBe(DATASET_ID);
    expect(carProfile.ownerId).toBe(TEST_USER);
    expect(carProfile.rowCount).toBe(20);
    expect(carProfile.columnCount).toBe(9);
    expect(carProfile.numericColumns).toContain('selling_price');
    expect(carProfile.numericColumns).toContain('km_driven');
    expect(carProfile.numericColumns).toContain('year');
    expect(carProfile.numericColumns).toContain('seats');
    expect(carProfile.categoricalColumns).toContain('fuel');
    expect(carProfile.categoricalColumns).toContain('seller_type');
    expect(carProfile.categoricalColumns).toContain('transmission');
    expect(carProfile.dataQualityScore).toBeGreaterThanOrEqual(90);
  });

  it('2. Computes deterministic summary and column statistics without fabrication', () => {
    const priceStats = computeDeterministicColumnStats(carProfile, 'selling_price');
    expect(priceStats).toBeDefined();
    expect(priceStats?.column).toBe('selling_price');
    expect(priceStats?.numeric?.count).toBe(20);
    expect(priceStats?.numeric?.min).toBe(96000);
    expect(priceStats?.numeric?.max).toBe(4000000);
    expect(priceStats?.numeric?.mean).toBeGreaterThan(0);
    expect(priceStats?.numeric?.median).toBeGreaterThan(0);
    expect(priceStats?.numeric?.std).toBeGreaterThan(0);

    const kmStats = computeDeterministicColumnStats(carProfile, 'km_driven');
    expect(kmStats?.numeric?.min).toBe(25000);
    expect(kmStats?.numeric?.max).toBe(175000);
  });

  it('3. Computes deterministic group-by aggregation on fuel types', () => {
    const fuelGroup = computeDeterministicGroupBy(carProfile, {
      by: ['fuel'],
      aggregations: [{ column: 'selling_price', function: 'mean' }],
    });

    expect(fuelGroup).toBeDefined();
    expect(fuelGroup.groups.length).toBeGreaterThanOrEqual(2);
    const dieselGroup = fuelGroup.groups.find((g) => g.fuel === 'Diesel');
    expect(dieselGroup).toBeDefined();
  });

  it('4. Detects outliers in selling_price deterministically', () => {
    const outliers = computeDeterministicOutliers(carProfile, 'selling_price', 'iqr', 1.5);
    expect(outliers).toBeDefined();
    expect(outliers.totalObservations).toBe(20);
    expect(Array.isArray(outliers.sampleOutliers)).toBe(true);
    // Luxury cars are identified as outliers
    expect(outliers.outlierCount).toBeGreaterThan(0);
  });

  it('5. Validates and trains a regression ML model to predict selling_price', () => {
    const validation = validateMlTask(
      carProfile,
      'selling_price',
      ['year', 'km_driven', 'seats'],
      'regression'
    );
    expect(validation.isValid).toBe(true);
    expect(validation.recommendedTask).toBe('regression');

    const trainedModel = trainAndEvaluateModel({
      profile: carProfile,
      targetColumn: 'selling_price',
      featureColumns: ['year', 'km_driven', 'seats'],
      task: 'regression',
      algorithm: 'linear_regression',
      splitRatio: 0.8,
      ownerId: TEST_USER,
    });

    expect(trainedModel.id).toBeDefined();
    expect(trainedModel.regressionMetrics).toBeDefined();
    expect(trainedModel.regressionMetrics?.mae).toBeGreaterThan(0);
    expect(trainedModel.regressionMetrics?.rmse).toBeGreaterThan(0);
    expect(trainedModel.featureImportance.length).toBe(3);

    // Predict with sample features
    const prediction = predictWithModel(trainedModel.id, {
      year: 2017,
      km_driven: 45000,
      seats: 5,
    });

    expect(prediction.modelId).toBe(trainedModel.id);
    expect(Number(prediction.prediction)).toBeGreaterThan(0);
    expect(prediction.formattedPrediction).toBeDefined();
  });

  it('6. Performs deterministic What-If analysis for mileage impact on price', () => {
    const trainedModel = trainAndEvaluateModel({
      profile: carProfile,
      targetColumn: 'selling_price',
      featureColumns: ['year', 'km_driven', 'seats'],
      task: 'regression',
      algorithm: 'linear_regression',
      splitRatio: 0.8,
      ownerId: TEST_USER,
    });

    const whatIf = performWhatIfScenario(
      trainedModel.id,
      { year: 2016, km_driven: 35000, seats: 5 },
      { year: 2016, km_driven: 70000, seats: 5 }
    );

    expect(Number(whatIf.baselinePrediction)).toBeGreaterThan(0);
    expect(Number(whatIf.scenarioPrediction)).toBeGreaterThan(0);
    expect(typeof whatIf.absoluteDifference).toBe('number');
    expect(typeof whatIf.percentageDifference).toBe('number');
    const kmDelta = whatIf.changedFeatures.find((f) => f.feature === 'km_driven');
    expect(kmDelta).toBeDefined();
    expect(kmDelta?.baselineValue).toBe(35000);
    expect(kmDelta?.scenarioValue).toBe(70000);
  });

  it('7. AI Analyst provides evidence-backed analysis for Car Market queries', async () => {
    const analystResult = await runAiAnalyst(
      {
        datasetId: DATASET_ID,
        message: 'What is the average selling price and km driven for cars in this dataset?',
      },
      carProfile,
      TEST_USER
    );

    expect(analystResult).toBeDefined();
    expect(analystResult.conversationId).toBeDefined();
    expect(analystResult.answer).toBeDefined();
    expect(analystResult.answer.length).toBeGreaterThan(20);
    expect(analystResult.evidence).toBeDefined();
    expect(analystResult.methodology).toBeDefined();
  });
});
