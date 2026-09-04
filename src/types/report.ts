export interface Report {
  id: string;
  ownerId: string;
  datasetId?: string;
  analysisId?: string;
  title: string;
  format: 'pdf' | 'html' | 'markdown';
  status: 'draft' | 'generated' | 'archived';
  createdAt: any;
  updatedAt: any;
}
