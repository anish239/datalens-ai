from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NumericStatistics(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    q25: Optional[float] = None
    q75: Optional[float] = None


class CategoricalValueFrequency(BaseModel):
    value: str
    count: int
    percentage: float


class ColumnProfile(BaseModel):
    name: str
    normalizedName: str
    logicalType: str  # 'numeric', 'categorical', 'text', 'boolean', 'datetime', 'unknown'
    pandasDtype: str
    nullCount: int
    nullPercentage: float
    uniqueCount: int
    sampleValues: List[Any] = Field(default_factory=list)
    statistics: Optional[NumericStatistics] = None
    topValues: Optional[List[CategoricalValueFrequency]] = None
    isDateTimeCandidate: bool = False
    isPotentialTarget: bool = False
    targetReason: Optional[str] = None


class PotentialTarget(BaseModel):
    columnName: str
    logicalType: str
    reason: str
    confidence: str  # 'high', 'medium', 'low'


class DatasetProfile(BaseModel):
    datasetId: str
    ownerId: str
    fileName: str
    fileType: str  # 'csv' | 'xlsx'
    fileSizeBytes: int
    rowCount: int
    columnCount: int
    duplicateRowCount: int
    duplicateRowPercentage: float
    missingValueCount: int
    missingDataPercentage: float
    columnsWithMissingValues: int
    dataQualityScore: int  # 0 - 100
    dataQualityExplanation: str
    columns: List[ColumnProfile]
    numericColumns: List[str]
    categoricalColumns: List[str]
    textColumns: List[str]
    booleanColumns: List[str]
    datetimeColumns: List[str]
    potentialTargets: List[PotentialTarget]
    previewRows: List[Dict[str, Any]]
    createdAt: str
    profileStatus: str = "completed"


class DatasetSummary(BaseModel):
    datasetId: str
    ownerId: str
    fileName: str
    fileType: str
    fileSizeBytes: int
    rowCount: int
    columnCount: int
    dataQualityScore: int
    createdAt: str
    profileStatus: str = "completed"


class DatasetListResponse(BaseModel):
    items: List[DatasetSummary]
    total: int


class DatasetUploadResponse(BaseModel):
    dataset: DatasetProfile
    message: str = "Dataset successfully ingested and schema inferred."
